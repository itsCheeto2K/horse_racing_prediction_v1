#include "predictors.hpp"
#include <cmath>
#include <algorithm>

namespace HorseRacing {

// 1. RecentFormPredictor
double RecentFormPredictor::evaluate(const Runner& runner, const Race& race) const {
    const auto& stats = runner.getStats().overall;
    double baseScore = 40.0;

    // Career win & place rate contributions
    if (stats.starts > 0) {
        double winContribution = stats.winPercent * 50.0;
        double placeContribution = (stats.placePercent - stats.winPercent) * 25.0;
        baseScore = 20.0 + winContribution + placeContribution;
    }

    // Recent form recency decay analysis
    std::vector<int> positions = runner.getRecentFormPositions();
    if (!positions.empty()) {
        double recentScore = 0.0;
        double weightTotal = 0.0;
        double currentWeight = 1.0;

        // Iterate backwards from most recent
        for (int i = static_cast<int>(positions.size()) - 1; i >= 0 && i >= static_cast<int>(positions.size()) - 5; --i) {
            int pos = positions[i];
            double posScore = 0.0;
            if (pos == 1) posScore = 100.0;
            else if (pos == 2) posScore = 80.0;
            else if (pos == 3) posScore = 65.0;
            else if (pos == 4) posScore = 45.0;
            else if (pos <= 6) posScore = 25.0;
            else posScore = 10.0;

            recentScore += posScore * currentWeight;
            weightTotal += currentWeight;
            currentWeight *= 0.75; // decay for older races
        }

        if (weightTotal > 0.0) {
            double weightedRecent = recentScore / weightTotal;
            baseScore = (baseScore * 0.4) + (weightedRecent * 0.6);
        }
    }

    return std::clamp(baseScore, 5.0, 99.0);
}

std::string RecentFormPredictor::generateBadge(const Runner& runner, const Race& race, double score) const {
    std::vector<int> positions = runner.getRecentFormPositions();
    if (!positions.empty() && positions.back() == 1) {
        return "Last Start Winner";
    }
    if (score >= 75.0) {
        return "Peak Form";
    }
    return "";
}

// 2. TrackConditionPredictor
double TrackConditionPredictor::evaluate(const Runner& runner, const Race& race) const {
    const auto* condStats = runner.getStats().conditions.getForCondition(race.getCondition());
    const auto& trackStats = runner.getStats().track;
    
    double score = 45.0; // neutral default

    // If horse has history under this condition
    if (condStats && condStats->starts > 0) {
        double winContrib = condStats->winPercent * 60.0;
        double placeContrib = (condStats->placePercent - condStats->winPercent) * 30.0;
        double condScore = 20.0 + winContrib + placeContrib;

        // Give extra confidence if sample size is solid
        double confidenceFactor = std::min(1.0, condStats->starts / 4.0);
        score = (45.0 * (1.0 - confidenceFactor)) + (condScore * confidenceFactor);
    } else {
        // Fallback to overall win rate if no condition starts
        const auto& overall = runner.getStats().overall;
        if (overall.starts > 0) {
            score = 30.0 + (overall.winPercent * 40.0);
        }
    }

    // Combine with track venue history
    if (trackStats.starts > 0) {
        double trackScore = 20.0 + (trackStats.winPercent * 50.0) + (trackStats.placePercent * 25.0);
        double trackConfidence = std::min(1.0, trackStats.starts / 3.0);
        score = (score * 0.7) + (trackScore * 0.3 * trackConfidence) + (score * 0.3 * (1.0 - trackConfidence));
    }

    return std::clamp(score, 5.0, 99.0);
}

std::string TrackConditionPredictor::generateBadge(const Runner& runner, const Race& race, double score) const {
    const auto* condStats = runner.getStats().conditions.getForCondition(race.getCondition());
    if (condStats && condStats->starts >= 2 && condStats->winPercent >= 0.40) {
        return "Condition Specialist";
    }
    const auto& trackStats = runner.getStats().track;
    if (trackStats.starts >= 2 && trackStats.winPercent >= 0.40) {
        return "Track Specialist";
    }
    return "";
}

// 3. DistanceSuitabilityPredictor
double DistanceSuitabilityPredictor::evaluate(const Runner& runner, const Race& race) const {
    const auto& distStats = runner.getStats().distance;
    const auto& trackDistStats = runner.getStats().trackDistance;
    double score = 45.0;

    if (trackDistStats.starts > 0) {
        // Best specific metric: Track + Distance combo
        score = 25.0 + (trackDistStats.winPercent * 50.0) + (trackDistStats.placePercent * 25.0);
    } else if (distStats.starts > 0) {
        score = 20.0 + (distStats.winPercent * 50.0) + (distStats.placePercent * 25.0);
    } else {
        const auto& overall = runner.getStats().overall;
        score = 30.0 + (overall.winPercent * 35.0);
    }

    // Weight penalty / advantage
    if (runner.getWeight() > 0.0) {
        // Average weight is ~56.5kg. Less weight = slight boost, heavy weight = slight penalty
        double weightDiff = 56.5 - runner.getWeight();
        score += weightDiff * 1.5; // +- 3-5 points
    }

    return std::clamp(score, 5.0, 99.0);
}

std::string DistanceSuitabilityPredictor::generateBadge(const Runner& runner, const Race& race, double score) const {
    const auto& distStats = runner.getStats().distance;
    if (distStats.starts >= 2 && distStats.winPercent >= 0.45) {
        return "Distance Specialist";
    }
    return "";
}

// 4. JockeyTrainerPredictor
double JockeyTrainerPredictor::evaluate(const Runner& runner, const Race& race) const {
    double score = 50.0;

    // In FormFav race form, jockey/trainer text exists.
    // Quality jockeys have higher expectations.
    if (!runner.getJockey().empty() && runner.getJockey() != "TBA") {
        score += 5.0;
    }
    if (!runner.getTrainer().empty()) {
        score += 5.0;
    }

    // First Up / Second Up state performance
    const auto& firstUp = runner.getStats().firstUp;
    const auto& secondUp = runner.getStats().secondUp;
    if (firstUp.starts > 0 && firstUp.winPercent > 0.3) {
        score += 8.0;
    }
    if (secondUp.starts > 0 && secondUp.winPercent > 0.3) {
        score += 6.0;
    }

    return std::clamp(score, 10.0, 95.0);
}

std::string JockeyTrainerPredictor::generateBadge(const Runner& runner, const Race& race, double score) const {
    if (!runner.getJockey().empty() && (runner.getJockey().find("McDonald") != std::string::npos || 
                                       runner.getJockey().find("Bowman") != std::string::npos ||
                                       runner.getJockey().find("Lane") != std::string::npos ||
                                       runner.getJockey().find("Kah") != std::string::npos ||
                                       runner.getJockey().find("Pike") != std::string::npos)) {
        return "Star Jockey";
    }
    return "";
}

// 5. BarrierBiasPredictor
double BarrierBiasPredictor::evaluate(const Runner& runner, const Race& race) const {
    int barrier = runner.getBarrier();
    int fieldSize = race.getNumberOfRunners() > 0 ? race.getNumberOfRunners() : static_cast<int>(race.getRunners().size());
    if (fieldSize <= 1) fieldSize = 8;
    if (barrier <= 0) barrier = 4;

    double score = 50.0;
    int distance = race.getDistanceMeters();

    // Sprints (< 1400m): Low barriers (1-4) generally have shorter ground to cover
    if (distance > 0 && distance <= 1300) {
        if (barrier <= 3) score = 70.0 - (barrier * 3.0);
        else if (barrier <= 6) score = 55.0;
        else score = 40.0 - ((barrier - 6) * 2.0);
    } 
    // Middle distances (1400 - 1800m): Middle/low barriers are balanced
    else if (distance > 1300 && distance <= 1800) {
        if (barrier <= 5) score = 65.0 - (barrier * 2.0);
        else score = 50.0 - ((barrier - 5) * 1.5);
    }
    // Staying races (> 1800m): Barrier has less direct bias
    else {
        score = 55.0 - (barrier * 0.8);
    }

    return std::clamp(score, 15.0, 85.0);
}

std::string BarrierBiasPredictor::generateBadge(const Runner& runner, const Race& race, double score) const {
    if (runner.getBarrier() == 1 || runner.getBarrier() == 2) {
        return "Inside Draw Advantage";
    }
    return "";
}

// CompositeEnsemblePredictor Implementation
CompositeEnsemblePredictor::CompositeEnsemblePredictor(const ModelWeights& weights)
    : m_formPred(std::make_unique<RecentFormPredictor>()),
      m_condPred(std::make_unique<TrackConditionPredictor>()),
      m_distPred(std::make_unique<DistanceSuitabilityPredictor>()),
      m_jtPred(std::make_unique<JockeyTrainerPredictor>()),
      m_barPred(std::make_unique<BarrierBiasPredictor>()),
      m_weights(weights)
{
    m_weights.normalize();
}

double CompositeEnsemblePredictor::evaluate(const Runner& runner, const Race& race) const {
    double fScore = m_formPred->evaluate(runner, race);
    double cScore = m_condPred->evaluate(runner, race);
    double dScore = m_distPred->evaluate(runner, race);
    double jtScore = m_jtPred->evaluate(runner, race);
    double bScore = m_barPred->evaluate(runner, race);

    double total = (fScore * m_weights.formWeight) +
                   (cScore * m_weights.conditionWeight) +
                   (dScore * m_weights.distanceWeight) +
                   (jtScore * m_weights.jockeyTrainerWeight) +
                   (bScore * m_weights.barrierWeight);

    return std::clamp(total, 1.0, 100.0);
}

FeatureScores CompositeEnsemblePredictor::evaluateDetailed(const Runner& runner, const Race& race, std::vector<std::string>& outBadges) const {
    FeatureScores scores;
    scores.formScore = m_formPred->evaluate(runner, race);
    scores.conditionScore = m_condPred->evaluate(runner, race);
    scores.distanceScore = m_distPred->evaluate(runner, race);
    scores.jockeyTrainerScore = m_jtPred->evaluate(runner, race);
    scores.barrierScore = m_barPred->evaluate(runner, race);

    scores.compositeRating = (scores.formScore * m_weights.formWeight) +
                             (scores.conditionScore * m_weights.conditionWeight) +
                             (scores.distanceScore * m_weights.distanceWeight) +
                             (scores.jockeyTrainerScore * m_weights.jockeyTrainerWeight) +
                             (scores.barrierScore * m_weights.barrierWeight);

    // Badges collection
    std::string b;
    if (!(b = m_formPred->generateBadge(runner, race, scores.formScore)).empty()) outBadges.push_back(b);
    if (!(b = m_condPred->generateBadge(runner, race, scores.conditionScore)).empty()) outBadges.push_back(b);
    if (!(b = m_distPred->generateBadge(runner, race, scores.distanceScore)).empty()) outBadges.push_back(b);
    if (!(b = m_jtPred->generateBadge(runner, race, scores.jockeyTrainerScore)).empty()) outBadges.push_back(b);
    if (!(b = m_barPred->generateBadge(runner, race, scores.barrierScore)).empty()) outBadges.push_back(b);

    return scores;
}

} // namespace HorseRacing
