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
    result.distanceCategory = ModelWeights::getDistanceCategory(race.getDistanceMeters());
    result.condition = race.getCondition();
    result.totalSimulations = m_numSimulations;
    result.appliedWeights = predictor.getWeights();

    std::vector<Runner> activeRunners = race.getActiveRunners();
    if (activeRunners.empty()) {
        return result;
    }

    size_t numRunners = activeRunners.size();

    // 1. Race Map & Dynamics Analysis (Tầng 3)
    RaceMapSummary mapSummary = predictor.getMapPredictor().analyzeRaceMap(race);
    result.raceMap = mapSummary;

    // 2. 4-Tier Evaluation: Ability, Race Fit, Race Map and initial Horse Cards
    std::vector<FeatureScores> runnerScores(numRunners);
    std::vector<std::vector<std::string>> runnerBadges(numRunners);
    std::vector<HorseCardData> runnerCards(numRunners);
    std::vector<RunningStyle> runnerStyles(numRunners);
    std::vector<double> baseRatings(numRunners);

    for (size_t i = 0; i < numRunners; ++i) {
        runnerStyles[i] = predictor.getMapPredictor().inferRunningStyle(activeRunners[i], race);
        runnerScores[i] = predictor.evaluate4Tier(
            activeRunners[i],
            race,
            mapSummary,
            runnerStyles[i],
            runnerBadges[i],
            runnerCards[i]
        );
        baseRatings[i] = runnerScores[i].compositeRating;
    }

    // 3. Monte Carlo Stochastic Simulation Loop (10,000 runs)
    std::vector<int> winCounts(numRunners, 0);
    std::vector<int> top3Counts(numRunners, 0);
    std::vector<int> top5Counts(numRunners, 0);

    // Standard Gumbel / extreme-value distribution modeling race performance noise
    std::extreme_value_distribution<double> gumbelDist(0.0, 4.5);
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

        // Top 3 places
        for (size_t p = 0; p < std::min(numRunners, size_t(3)); ++p) {
            top3Counts[simResults[p].second]++;
        }

        // Top 5 places
        for (size_t p = 0; p < std::min(numRunners, size_t(5)); ++p) {
            top5Counts[simResults[p].second]++;
        }
    }

    // 4. Assemble runner predictions & calculate probabilities
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
        pred.top3Probability = static_cast<double>(top3Counts[i]) / static_cast<double>(m_numSimulations);
        pred.placeProbability = pred.top3Probability; // backward compatibility
        pred.top5Probability = static_cast<double>(top5Counts[i]) / static_cast<double>(m_numSimulations);
        
        // Fair Decimal Odds = 1 / P(Win)
        if (pred.winProbability > 0.001) {
            pred.fairOdds = std::round((1.0 / pred.winProbability) * 100.0) / 100.0;
        } else {
            pred.fairOdds = 101.0;
        }

        // 4-Tier metrics
        pred.abilityScore = std::round(runnerScores[i].abilityScore * 10.0) / 10.0;
        pred.raceFitScore = std::round(runnerScores[i].raceFitScore * 10.0) / 10.0;
        pred.raceMapScore = std::round(runnerScores[i].raceMapScore * 10.0) / 10.0;

        switch (runnerStyles[i]) {
            case RunningStyle::Leader: pred.runningStyle = "Leader"; break;
            case RunningStyle::OnPace: pred.runningStyle = "On-pace"; break;
            case RunningStyle::Midfield: pred.runningStyle = "Midfield"; break;
            case RunningStyle::Backmarker: pred.runningStyle = "Backmarker"; break;
        }

        // Tier classification (Section 3 in new_feat.txt)
        if (pred.fairOdds <= 6.0 || pred.top3Probability >= 0.50) {
            pred.tier = "Tier A - Main Contender";
        } else if (pred.fairOdds <= 12.0 || pred.top3Probability >= 0.28) {
            pred.tier = "Tier B - Secondary Contender";
        } else if (pred.fairOdds <= 25.0 && (pred.raceFitScore >= 55.0 || pred.abilityScore >= 55.0)) {
            pred.tier = "Tier C - Value Underdog";
        } else {
            pred.tier = "Tier D - Longshot";
        }

        pred.featureScores = runnerScores[i];
        pred.badges = runnerBadges[i];
        pred.horseCard = runnerCards[i];
        pred.horseCard.marketOdds = pred.fairOdds;
        pred.riskLevel = runnerCards[i].riskLevel;

        preds.push_back(pred);
    }

    // 5. Sort predictions by Top 3 Probability / Win Probability descending
    std::sort(preds.begin(), preds.end(), [](const RunnerPrediction& a, const RunnerPrediction& b) {
        if (std::abs(a.top3Probability - b.top3Probability) > 0.005) {
            return a.top3Probability > b.top3Probability;
        }
        if (std::abs(a.winProbability - b.winProbability) > 0.001) {
            return a.winProbability > b.winProbability;
        }
        return a.powerRating > b.powerRating;
    });

    // 6. Assign ranks, Verdicts and classify picks
    for (size_t r = 0; r < preds.size(); ++r) {
        preds[r].rank = static_cast<int>(r + 1);
    }

    // Identify Top 3 Candidates
    for (size_t r = 0; r < std::min(preds.size(), size_t(3)); ++r) {
        result.top3Candidates.push_back(preds[r].runnerName);
    }

    if (!preds.empty()) {
        // Top Pick is rank 1
        preds[0].isTopPick = true;
        preds[0].verdict = "MAIN CONTENDER";
        preds[0].horseCard.verdict = "MAIN CONTENDER";
        result.topPickName = preds[0].runnerName;

        if (preds.size() > 1) {
            preds[1].verdict = (preds[1].tier == "Tier A - Main Contender") ? "MAIN CONTENDER" : "SECONDARY CONTENDER";
            preds[1].horseCard.verdict = preds[1].verdict;
        }

        // Value Pick / Best Underdog: Tier C with solid Top 3 % or Rank 3-6 with high Race Fit
        for (size_t r = 1; r < preds.size(); ++r) {
            if (preds[r].tier == "Tier C - Value Underdog" || (preds[r].fairOdds >= 6.0 && preds[r].top3Probability >= 0.20 && preds[r].raceFitScore >= 52.0)) {
                preds[r].isBestUnderdog = true;
                preds[r].isValuePick = true;
                preds[r].verdict = "VALUE UNDERDOG";
                preds[r].horseCard.verdict = "VALUE UNDERDOG";
                result.bestUnderdogName = preds[r].runnerName;
                result.valuePickName = preds[r].runnerName;
                break;
            }
        }

        // Fallback for Value Pick if no Tier C qualified
        if (result.valuePickName.empty() && preds.size() > 2) {
            preds[2].isValuePick = true;
            preds[2].verdict = "VALUE UNDERDOG";
            preds[2].horseCard.verdict = "VALUE UNDERDOG";
            result.valuePickName = preds[2].runnerName;
            result.bestUnderdogName = preds[2].runnerName;
        }

        // Best Longshot / Dark Horse: Tier D with high pace fit or condition specialist badge
        for (size_t r = 2; r < preds.size(); ++r) {
            if (!preds[r].isBestUnderdog && !preds[r].isTopPick && (preds[r].fairOdds >= 15.0 || preds[r].tier == "Tier D - Longshot")) {
                preds[r].isBestLongshot = true;
                preds[r].isDarkHorse = true;
                preds[r].verdict = "LONGSHOT";
                preds[r].horseCard.verdict = "LONGSHOT";
                result.bestLongshotName = preds[r].runnerName;
                result.darkHorseName = preds[r].runnerName;
                break;
            }
        }

        // Set default verdicts for remaining runners
        for (auto& p : preds) {
            if (p.verdict.empty() || p.verdict == "CONTENDER") {
                if (p.rank <= 2) p.verdict = "MAIN CONTENDER";
                else if (p.rank <= 4) p.verdict = "SECONDARY CONTENDER";
                else if (p.tier == "Tier C - Value Underdog") p.verdict = "VALUE UNDERDOG";
                else p.verdict = "OUTSIDER";
                p.horseCard.verdict = p.verdict;
            }
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
            spred.top3Probability = 0.0;
            spred.top5Probability = 0.0;
            spred.fairOdds = 0.0;
            spred.tier = "Scratched";
            spred.verdict = "SCRATCHED";
            spred.isScratched = true;
            preds.push_back(spred);
        }
    }

    result.runnerPredictions = preds;
    return result;
}

} // namespace HorseRacing
