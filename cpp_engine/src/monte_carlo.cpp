#include "monte_carlo.hpp"
#include <algorithm>
#include <cmath>
#include <iomanip>

namespace HorseRacing {

MonteCarloSimulator::MonteCarloSimulator(int numSimulations, unsigned int seed)
    : m_numSimulations(numSimulations > 100 ? numSimulations : 10000),
      m_rng(seed)
{
}

RacePredictionResult MonteCarloSimulator::simulateRace(const Race& race, const CompositeEnsemblePredictor& predictor) const {
    RacePredictionResult result;
    result.date = race.getDate();
    result.track = race.getTrack();
    result.raceNumber = race.getRaceNumber();
    result.raceName = race.getRaceName();
    result.distance = race.getDistanceStr();
    result.condition = race.getCondition();
    result.totalSimulations = m_numSimulations;
    result.appliedWeights = predictor.getWeights();

    std::vector<Runner> activeRunners = race.getActiveRunners();
    if (activeRunners.empty()) {
        return result;
    }

    size_t numRunners = activeRunners.size();

    // 1. Evaluate baseline power ratings & feature scores for each runner
    std::vector<FeatureScores> runnerScores(numRunners);
    std::vector<std::vector<std::string>> runnerBadges(numRunners);
    std::vector<double> baseRatings(numRunners);

    for (size_t i = 0; i < numRunners; ++i) {
        runnerScores[i] = predictor.evaluateDetailed(activeRunners[i], race, runnerBadges[i]);
        baseRatings[i] = runnerScores[i].compositeRating;
    }

    // 2. Monte Carlo Stochastic Simulation Loop
    // Track 1st, 2nd, 3rd place finishes
    std::vector<int> winCounts(numRunners, 0);
    std::vector<int> placeCounts(numRunners, 0);

    // Standard Gumbel / extreme-value distribution modeling race performance noise
    std::extreme_value_distribution<double> gumbelDist(0.0, 4.5);

    // Scratch buffer for each simulation run: pairs of (simulated_performance, runner_index)
    std::vector<std::pair<double, size_t>> simResults(numRunners);

    for (int sim = 0; sim < m_numSimulations; ++sim) {
        for (size_t i = 0; i < numRunners; ++i) {
            double noise = gumbelDist(m_rng);
            double simScore = baseRatings[i] + noise;
            simResults[i] = {simScore, i};
        }

        // Sort descending: highest performance wins
        std::sort(simResults.begin(), simResults.end(), [](const auto& a, const auto& b) {
            return a.first > b.first;
        });

        // 1st place
        winCounts[simResults[0].second]++;
        placeCounts[simResults[0].second]++;

        // 2nd place (if >= 2 runners)
        if (numRunners >= 2) {
            placeCounts[simResults[1].second]++;
        }

        // 3rd place (if >= 3 runners)
        if (numRunners >= 3) {
            placeCounts[simResults[2].second]++;
        }
    }

    // 3. Assemble runner predictions
    std::vector<RunnerPrediction> preds;
    preds.reserve(numRunners);

    for (size_t i = 0; i < numRunners; ++i) {
        RunnerPrediction pred;
        pred.runnerNumber = activeRunners[i].getNumber();
        pred.runnerName = activeRunners[i].getName();
        pred.jockey = activeRunners[i].getJockey();
        pred.trainer = activeRunners[i].getTrainer();
        pred.barrier = activeRunners[i].getBarrier();
        pred.weight = activeRunners[i].getWeight();
        pred.powerRating = std::round(baseRatings[i] * 10.0) / 10.0;
        
        pred.winProbability = static_cast<double>(winCounts[i]) / static_cast<double>(m_numSimulations);
        pred.placeProbability = static_cast<double>(placeCounts[i]) / static_cast<double>(m_numSimulations);
        
        // Fair Decimal Odds = 1 / P(Win)
        if (pred.winProbability > 0.001) {
            pred.fairOdds = std::round((1.0 / pred.winProbability) * 100.0) / 100.0;
        } else {
            pred.fairOdds = 101.0;
        }

        pred.featureScores = runnerScores[i];
        pred.badges = runnerBadges[i];
        preds.push_back(pred);
    }

    // 4. Sort predictions by Win Probability descending
    std::sort(preds.begin(), preds.end(), [](const RunnerPrediction& a, const RunnerPrediction& b) {
        if (std::abs(a.winProbability - b.winProbability) > 0.0001) {
            return a.winProbability > b.winProbability;
        }
        return a.powerRating > b.powerRating;
    });

    // 5. Assign ranks and classify special picks
    for (size_t r = 0; r < preds.size(); ++r) {
        preds[r].rank = static_cast<int>(r + 1);
    }

    if (!preds.empty()) {
        // Top Pick is rank 1
        preds[0].isTopPick = true;
        result.topPickName = preds[0].runnerName;

        // Value Pick: runner in top 4 with good rating & odds > $3.50
        for (size_t r = 1; r < std::min(preds.size(), size_t(4)); ++r) {
            if (preds[r].fairOdds >= 3.5 && preds[r].powerRating >= 50.0) {
                preds[r].isValuePick = true;
                result.valuePickName = preds[r].runnerName;
                break;
            }
        }
        if (result.valuePickName.empty() && preds.size() > 1) {
            preds[1].isValuePick = true;
            result.valuePickName = preds[1].runnerName;
        }

        // Dark Horse: ranks 3 to 6 with condition or form specialist badge
        for (size_t r = 2; r < std::min(preds.size(), size_t(6)); ++r) {
            if (!preds[r].badges.empty() && !preds[r].isValuePick) {
                preds[r].isDarkHorse = true;
                result.darkHorseName = preds[r].runnerName;
                break;
            }
        }
        if (result.darkHorseName.empty() && preds.size() > 2) {
            preds[2].isDarkHorse = true;
            result.darkHorseName = preds[2].runnerName;
        }
    }

    // Append any scratched runners to the prediction list for complete UI display
    for (const auto& r : race.getRunners()) {
        if (r.isScratched()) {
            RunnerPrediction spred;
            spred.runnerNumber = r.getNumber();
            spred.runnerName = r.getName();
            spred.jockey = r.getJockey();
            spred.trainer = r.getTrainer();
            spred.barrier = r.getBarrier();
            spred.weight = r.getWeight();
            spred.rank = 0;
            spred.powerRating = 0.0;
            spred.winProbability = 0.0;
            spred.placeProbability = 0.0;
            spred.fairOdds = 0.0;
            spred.isScratched = true;
            preds.push_back(spred);
        }
    }

    result.runnerPredictions = preds;
    return result;
}

} // namespace HorseRacing
