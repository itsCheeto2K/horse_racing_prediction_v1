#include "predictors.hpp"
#include <cmath>
#include <algorithm>
#include <sstream>
#include <iomanip>

namespace HorseRacing {

// 1. RecentFormPredictor (Tầng 1 - Base Ability component)
double RecentFormPredictor::evaluate(const Runner& runner, const Race& race) const {
    const auto& stats = runner.getStats().overall;
    double baseScore = 40.0;

    // Career win & place rate contributions
    if (stats.starts > 0) {
        double winContribution = stats.winPercent * 50.0;
        double placeContribution = (stats.placePercent - stats.winPercent) * 25.0;
        baseScore = 20.0 + winContribution + placeContribution;
    }

    // Recent form recency decay analysis w_i = 0.85^i
    std::vector<int> positions = runner.getRecentFormPositions();
    if (!positions.empty()) {
        double recentScore = 0.0;
        double weightTotal = 0.0;
        double currentWeight = 1.0;

        // Iterate backwards from most recent start
        for (int i = static_cast<int>(positions.size()) - 1; i >= 0 && i >= static_cast<int>(positions.size()) - 6; --i) {
            int pos = positions[i];
            double posScore = 0.0;
            if (pos == 1) posScore = 100.0;
            else if (pos == 2) posScore = 80.0;
            else if (pos == 3) posScore = 65.0;
            else if (pos == 4) posScore = 45.0;
            else if (pos <= 6) posScore = 30.0;
            else posScore = 10.0;

            recentScore += posScore * currentWeight;
            weightTotal += currentWeight;
            currentWeight *= 0.80; // exponential recency decay
        }

        if (weightTotal > 0.0) {
            double weightedRecent = recentScore / weightTotal;
            baseScore = (baseScore * 0.35) + (weightedRecent * 0.65);
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

// 2. TrackConditionPredictor (Tầng 2 - Race Fit Ground Affinity with Bayesian Shrinkage)
double TrackConditionPredictor::evaluate(const Runner& runner, const Race& race) const {
    const auto* condStats = runner.getStats().conditions.getForCondition(race.getCondition());
    const auto& trackStats = runner.getStats().track;
    const auto& overall = runner.getStats().overall;
    
    double priorWinRate = (overall.starts > 0) ? overall.winPercent : 0.10;
    double priorPlaceRate = (overall.starts > 0) ? overall.placePercent : 0.30;
    double kPrior = 5.0;

    double score = 45.0; // neutral default

    // If horse has history under this condition, apply Bayesian shrinkage
    if (condStats && condStats->starts > 0) {
        double shrunkWinRate = (condStats->wins + kPrior * priorWinRate) / (condStats->starts + kPrior);
        double shrunkPlaceRate = (condStats->places + kPrior * priorPlaceRate) / (condStats->starts + kPrior);
        
        score = 20.0 + (shrunkWinRate * 60.0) + (shrunkPlaceRate * 30.0);
    } else {
        // Fallback to overall performance
        score = 30.0 + (priorWinRate * 45.0) + (priorPlaceRate * 25.0);
    }

    // Combine with track venue history (Bayesian shrunk with k=4)
    if (trackStats.starts > 0) {
        double trackWinShrunk = (trackStats.wins + 4.0 * priorWinRate) / (trackStats.starts + 4.0);
        double trackPlaceShrunk = (trackStats.places + 4.0 * priorPlaceRate) / (trackStats.starts + 4.0);
        double trackScore = 20.0 + (trackWinShrunk * 55.0) + (trackPlaceShrunk * 25.0);
        
        double trackWeight = std::min(0.35, trackStats.starts * 0.08);
        score = (score * (1.0 - trackWeight)) + (trackScore * trackWeight);
    }

    return std::clamp(score, 5.0, 99.0);
}

std::string TrackConditionPredictor::generateBadge(const Runner& runner, const Race& race, double score) const {
    const auto* condStats = runner.getStats().conditions.getForCondition(race.getCondition());
    if (condStats && condStats->starts >= 2 && condStats->winPercent >= 0.35) {
        return "Condition Specialist";
    }
    const auto& trackStats = runner.getStats().track;
    if (trackStats.starts >= 2 && trackStats.winPercent >= 0.35) {
        return "Track Specialist";
    }
    return "";
}

// 3. DistanceSuitabilityPredictor (Tầng 2 - Proven vs Untested Positive vs Unsuitable)
double DistanceSuitabilityPredictor::evaluate(const Runner& runner, const Race& race) const {
    const auto& distStats = runner.getStats().distance;
    const auto& trackDistStats = runner.getStats().trackDistance;
    const auto& overall = runner.getStats().overall;
    std::vector<int> recentPos = runner.getRecentFormPositions();
    int raceDist = race.getDistanceMeters();

    double score = 50.0;

    // A. Proven at Distance
    if (distStats.starts >= 2 && (distStats.wins > 0 || distStats.places >= 1)) {
        score = 30.0 + (distStats.winPercent * 45.0) + (distStats.placePercent * 25.0);
        if (trackDistStats.starts > 0 && trackDistStats.places > 0) {
            score += 10.0;
        }
    } 
    // B. Proven Unsuitable (e.g. 3+ starts at distance with 0 places and poor recent form)
    else if (distStats.starts >= 3 && distStats.places == 0) {
        score = 25.0 + (distStats.winPercent * 20.0);
    } 
    // C. Untested / Limited starts (Wrexham Logic from new_feat.txt)
    else {
        // If untested, check recent run momentum & career stamina
        double baseline = 45.0;
        if (overall.starts > 0) {
            baseline = 35.0 + (overall.placePercent * 30.0);
        }

        // Stepping stone bonus: if horse ran 1st, 2nd or 3rd in recent starts, progression to middle distance is positive
        if (!recentPos.empty() && recentPos.back() <= 3) {
            baseline += 12.0; // Positive progression bonus, do NOT penalize 0 distance starts!
        } else if (!recentPos.empty() && recentPos.back() <= 5) {
            baseline += 5.0;
        }
        score = baseline;
    }

    // Weight penalty / advantage
    if (runner.getWeight() > 0.0) {
        double weightDiff = 56.5 - runner.getWeight();
        score += weightDiff * 1.2;
    }

    return std::clamp(score, 10.0, 95.0);
}

std::string DistanceSuitabilityPredictor::generateBadge(const Runner& runner, const Race& race, double score) const {
    const auto& distStats = runner.getStats().distance;
    if (distStats.starts >= 2 && distStats.winPercent >= 0.40) {
        return "Distance Specialist";
    }
    return "";
}

// 4. JockeyTrainerPredictor (Tầng 2)
double JockeyTrainerPredictor::evaluate(const Runner& runner, const Race& race) const {
    double score = 50.0;

    if (!runner.getJockey().empty() && runner.getJockey() != "TBA") {
        score += 5.0;
    }
    if (!runner.getTrainer().empty()) {
        score += 5.0;
    }

    // Elite jockey detection
    std::string j = runner.getJockey();
    if (j.find("McDonald") != std::string::npos || j.find("Bowman") != std::string::npos ||
        j.find("Lane") != std::string::npos || j.find("Kah") != std::string::npos ||
        j.find("Pike") != std::string::npos || j.find("Zahra") != std::string::npos) {
        score += 10.0;
    }

    // First Up / Second Up state performance
    const auto& firstUp = runner.getStats().firstUp;
    const auto& secondUp = runner.getStats().secondUp;
    if (firstUp.starts > 0 && firstUp.winPercent > 0.25) {
        score += 6.0;
    }
    if (secondUp.starts > 0 && secondUp.winPercent > 0.25) {
        score += 5.0;
    }

    return std::clamp(score, 15.0, 95.0);
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

// 5. BarrierBiasPredictor (Tầng 2 - Dynamic Barrier Model)
double BarrierBiasPredictor::evaluate(const Runner& runner, const Race& race) const {
    return evaluateWithStyle(runner, race, RunningStyle::Midfield);
}

double BarrierBiasPredictor::evaluateWithStyle(const Runner& runner, const Race& race, RunningStyle style) const {
    int barrier = runner.getBarrier();
    int fieldSize = race.getNumberOfRunners() > 0 ? race.getNumberOfRunners() : static_cast<int>(race.getRunners().size());
    if (fieldSize <= 1) fieldSize = 8;
    if (barrier <= 0) barrier = 4;

    double score = 50.0;
    int distance = race.getDistanceMeters();

    // Sprints (<= 1300m)
    if (distance > 0 && distance <= 1300) {
        if (barrier <= 3) {
            score = (style == RunningStyle::Leader || style == RunningStyle::OnPace) ? 75.0 - (barrier * 2.0) : 65.0;
        } else if (barrier <= 6) {
            score = 55.0;
        } else {
            // Wide draw penalty scaled by field size
            double penalty = (barrier - 6) * (fieldSize > 12 ? 3.0 : 2.0);
            score = (style == RunningStyle::Backmarker) ? 45.0 - penalty * 0.5 : 45.0 - penalty;
        }
    } 
    // Middle distances (1301 - 1800m)
    else if (distance > 1300 && distance <= 1800) {
        if (barrier <= 5) score = 65.0 - (barrier * 1.5);
        else if (barrier <= 9) score = 55.0 - ((barrier - 5) * 1.2);
        else score = 48.0 - ((barrier - 9) * 1.8);
    } 
    // Staying races (> 1800m)
    else {
        score = 58.0 - (barrier * 0.7);
    }

    return std::clamp(score, 15.0, 85.0);
}

std::string BarrierBiasPredictor::generateBadge(const Runner& runner, const Race& race, double score) const {
    if (runner.getBarrier() == 1 || runner.getBarrier() == 2) {
        return "Inside Draw Advantage";
    }
    return "";
}

// 6. RaceMapPredictor (Tầng 3 - Race Map & Pace Dynamics)
RunningStyle RaceMapPredictor::inferRunningStyle(const Runner& runner, const Race& race) const {
    std::vector<int> positions = runner.getRecentFormPositions();
    int barrier = runner.getBarrier();
    
    // Heuristic running style classification based on form and barrier
    if (!positions.empty()) {
        int recentTopCount = 0;
        for (int p : positions) {
            if (p == 1 || p == 2) recentTopCount++;
        }
        double topRatio = static_cast<double>(recentTopCount) / static_cast<double>(positions.size());

        if (topRatio >= 0.40 && barrier <= 6) {
            return RunningStyle::Leader;
        } else if (topRatio >= 0.25 || barrier <= 4) {
            return RunningStyle::OnPace;
        } else if (positions.back() <= 5) {
            return RunningStyle::Midfield;
        } else {
            return RunningStyle::Backmarker;
        }
    }

    // Default fallback based on barrier
    if (barrier <= 2) return RunningStyle::Leader;
    if (barrier <= 5) return RunningStyle::OnPace;
    if (barrier <= 9) return RunningStyle::Midfield;
    return RunningStyle::Backmarker;
}

RaceMapSummary RaceMapPredictor::analyzeRaceMap(const Race& race) const {
    RaceMapSummary summary;
    std::vector<Runner> activeRunners = race.getActiveRunners();
    
    for (const auto& r : activeRunners) {
        RunningStyle style = inferRunningStyle(r, race);
        if (style == RunningStyle::Leader) {
            summary.leaderCount++;
            summary.leaders.push_back(r.getName());
        } else if (style == RunningStyle::OnPace) {
            summary.onPaceCount++;
            summary.onPaceRunners.push_back(r.getName());
        } else if (style == RunningStyle::Midfield) {
            summary.midfieldCount++;
            summary.midfieldRunners.push_back(r.getName());
        } else {
            summary.backmarkerCount++;
            summary.backmarkers.push_back(r.getName());
        }
    }

    // Pace Scenario evaluation (from Section 12 in new_feat.txt)
    if (summary.leaderCount >= 3 || (summary.leaderCount >= 2 && summary.onPaceCount >= 2)) {
        summary.paceScenario = "Fast / Contested Pace";
        summary.paceDescription = "High early pressure with 3+ contesting front-runners. Race shape strongly favors closers and patient mid-fielders as leaders risk late fatigue.";
    } else if (summary.leaderCount <= 1 && summary.onPaceCount <= 1) {
        summary.paceScenario = "Slow / Tactical Pace";
        summary.paceDescription = "Lone leader or uncontested tempo. Pacesetters can dictate a moderate crawl and sprint home, creating significant disadvantage for deep backmarkers.";
    } else {
        summary.paceScenario = "Moderate / True Pace";
        summary.paceDescription = "Evenly run race with established tempo. All tactical running styles have a fair opportunity without extreme pace bias.";
    }

    // Effective competitive field size (runners with reasonable prospects)
    summary.effectiveFieldCount = std::max(1, static_cast<int>(activeRunners.size()));

    return summary;
}

double RaceMapPredictor::evaluatePaceFit(const Runner& runner, const Race& race, RunningStyle style, const RaceMapSummary& mapSummary) const {
    double score = 50.0;

    if (mapSummary.paceScenario == "Fast / Contested Pace") {
        if (style == RunningStyle::Backmarker) {
            score = 75.0; // Backmarkers relish fast pace
        } else if (style == RunningStyle::Midfield) {
            score = 65.0;
        } else if (style == RunningStyle::OnPace) {
            score = 45.0;
        } else {
            score = 35.0; // Leaders penalized by hot speed contest
        }
    } else if (mapSummary.paceScenario == "Slow / Tactical Pace") {
        if (style == RunningStyle::Leader) {
            score = 80.0; // Soft lead advantage
        } else if (style == RunningStyle::OnPace) {
            score = 68.0;
        } else if (style == RunningStyle::Midfield) {
            score = 48.0;
        } else {
            score = 30.0; // Backmarkers struggle in sprint finishes
        }
    } else {
        // Moderate / True Pace
        if (style == RunningStyle::OnPace || style == RunningStyle::Midfield) score = 60.0;
        else score = 52.0;
    }

    return std::clamp(score, 10.0, 95.0);
}

// CompositeEnsemblePredictor Implementation
CompositeEnsemblePredictor::CompositeEnsemblePredictor(const ModelWeights& weights)
    : m_formPred(std::make_unique<RecentFormPredictor>()),
      m_condPred(std::make_unique<TrackConditionPredictor>()),
      m_distPred(std::make_unique<DistanceSuitabilityPredictor>()),
      m_jtPred(std::make_unique<JockeyTrainerPredictor>()),
      m_barPred(std::make_unique<BarrierBiasPredictor>()),
      m_mapPred(std::make_unique<RaceMapPredictor>()),
      m_weights(weights)
{
    m_weights.normalize();
}

double CompositeEnsemblePredictor::evaluate(const Runner& runner, const Race& race) const {
    FeatureScores fs;
    std::vector<std::string> dummyBadges;
    fs = evaluateDetailed(runner, race, dummyBadges);
    return fs.compositeRating;
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

    std::string b;
    if (!(b = m_formPred->generateBadge(runner, race, scores.formScore)).empty()) outBadges.push_back(b);
    if (!(b = m_condPred->generateBadge(runner, race, scores.conditionScore)).empty()) outBadges.push_back(b);
    if (!(b = m_distPred->generateBadge(runner, race, scores.distanceScore)).empty()) outBadges.push_back(b);
    if (!(b = m_jtPred->generateBadge(runner, race, scores.jockeyTrainerScore)).empty()) outBadges.push_back(b);
    if (!(b = m_barPred->generateBadge(runner, race, scores.barrierScore)).empty()) outBadges.push_back(b);

    return scores;
}

FeatureScores CompositeEnsemblePredictor::evaluate4Tier(
    const Runner& runner,
    const Race& race,
    const RaceMapSummary& mapSummary,
    RunningStyle style,
    std::vector<std::string>& outBadges,
    HorseCardData& outCard
) const {
    FeatureScores scores;
    
    // 1. Feature Sub-scores
    scores.formScore = m_formPred->evaluate(runner, race);
    scores.conditionScore = m_condPred->evaluate(runner, race);
    scores.distanceScore = m_distPred->evaluate(runner, race);
    scores.jockeyTrainerScore = m_jtPred->evaluate(runner, race);
    scores.barrierScore = m_barPred->evaluateWithStyle(runner, race, style);
    scores.raceMapScore = m_mapPred->evaluatePaceFit(runner, race, style, mapSummary);

    // 2. 4-Tier Layer Aggregations
    // Tầng 1: Horse Ability (Form + Career Record + Class)
    const auto& overall = runner.getStats().overall;
    double careerWinPlace = (overall.starts > 0) ? (overall.winPercent * 50.0 + overall.placePercent * 30.0 + 20.0) : 40.0;
    scores.abilityScore = (scores.formScore * 0.65) + (careerWinPlace * 0.35);

    // Tầng 2: Race Fit (Distance + Going + Barrier + Weight + Jockey)
    scores.raceFitScore = (scores.distanceScore * 0.35) + 
                          (scores.conditionScore * 0.30) + 
                          (scores.barrierScore * 0.20) + 
                          (scores.jockeyTrainerScore * 0.15);

    // Combined Power Rating combining Tầng 1, 2, 3
    scores.compositeRating = (scores.abilityScore * m_weights.abilityLayerWeight) +
                             (scores.raceFitScore * m_weights.raceFitLayerWeight) +
                             (scores.raceMapScore * m_weights.raceMapLayerWeight);

    // Badges collection
    std::string b;
    if (!(b = m_formPred->generateBadge(runner, race, scores.formScore)).empty()) outBadges.push_back(b);
    if (!(b = m_condPred->generateBadge(runner, race, scores.conditionScore)).empty()) outBadges.push_back(b);
    if (!(b = m_distPred->generateBadge(runner, race, scores.distanceScore)).empty()) outBadges.push_back(b);
    if (!(b = m_jtPred->generateBadge(runner, race, scores.jockeyTrainerScore)).empty()) outBadges.push_back(b);
    if (!(b = m_barPred->generateBadge(runner, race, scores.barrierScore)).empty()) outBadges.push_back(b);

    // 3. Build HorseCardData matching Section 22 in new_feat.txt
    outCard.runnerName = runner.getName();
    outCard.runnerNumber = runner.getNumber();
    outCard.barrier = runner.getBarrier();
    outCard.weight = runner.getWeight();
    outCard.rtg = !runner.getForm().empty() ? runner.getForm() : "N/A";

    // Ability Stars (1-5)
    if (scores.abilityScore >= 78.0) outCard.abilityStars = 5;
    else if (scores.abilityScore >= 64.0) outCard.abilityStars = 4;
    else if (scores.abilityScore >= 48.0) outCard.abilityStars = 3;
    else if (scores.abilityScore >= 32.0) outCard.abilityStars = 2;
    else outCard.abilityStars = 1;

    // Recent Form Verdict
    std::vector<int> positions = runner.getRecentFormPositions();
    if (!positions.empty() && positions.back() <= 2) {
        outCard.recentFormVerdict = "Positive (Strong Late Momentum)";
    } else if (!positions.empty() && positions.back() <= 4) {
        outCard.recentFormVerdict = "Competitive";
    } else {
        outCard.recentFormVerdict = "Mixed / Work to do";
    }

    // Recent Run details
    if (!positions.empty()) {
        outCard.recentRunPosition = std::to_string(positions.back());
        if (positions.back() == 1) outCard.recentRunPosition += "st";
        else if (positions.back() == 2) outCard.recentRunPosition += "nd";
        else if (positions.back() == 3) outCard.recentRunPosition += "rd";
        else outCard.recentRunPosition += "th";
    } else {
        outCard.recentRunPosition = "N/A";
    }
    outCard.recentRunMargin = (!positions.empty() && positions.back() <= 3) ? "< 1.5L" : "2.5L+";
    outCard.recentRunDistance = race.getDistanceStr();
    outCard.recentRunGoing = race.getCondition();
    
    if (!positions.empty() && positions.back() <= 3) {
        outCard.recentRunInterpretation = "Close finish, demonstrated strong closing stamina and current campaign fitness.";
    } else {
        outCard.recentRunInterpretation = "Fair run, will need to improve finishing acceleration in this field.";
    }

    // Distance Status
    const auto& distStats = runner.getStats().distance;
    if (distStats.starts >= 2 && distStats.places >= 1) {
        outCard.distanceStatus = "Proven";
        outCard.distanceEvidence = std::to_string(distStats.wins) + " wins / " + std::to_string(distStats.places) + " places at distance";
    } else if (distStats.starts == 0 && !positions.empty() && positions.back() <= 3) {
        outCard.distanceStatus = "Untested (Positive Progression)";
        outCard.distanceEvidence = "Solid performance at adjacent distance indicates stamina progression";
    } else if (distStats.starts >= 3 && distStats.places == 0) {
        outCard.distanceStatus = "Unsuitable";
        outCard.distanceEvidence = "Multiple starts without placing; tendency to fade";
    } else {
        outCard.distanceStatus = "Untested (Neutral)";
        outCard.distanceEvidence = "Limited distance data available";
    }

    // Track / Going status
    const auto* condStats = runner.getStats().conditions.getForCondition(race.getCondition());
    if (condStats && condStats->starts >= 2 && condStats->places >= 1) {
        outCard.trackGoingStatus = "Proven on Ground";
        outCard.trackGoingEvidence = std::to_string(condStats->wins) + " wins from " + std::to_string(condStats->starts) + " starts on " + race.getCondition();
    } else {
        outCard.trackGoingStatus = "Limited Evidence / Neutral";
        outCard.trackGoingEvidence = "Condition profile shows standard adaptability";
    }

    // Barrier assessment
    int fieldSize = race.getNumberOfRunners() > 0 ? race.getNumberOfRunners() : 8;
    if (runner.getBarrier() <= 3) {
        outCard.barrierAssessment = "Inside draw advantage (saves ground on turn)";
    } else if (runner.getBarrier() <= (fieldSize / 2 + 1)) {
        outCard.barrierAssessment = "Mid barrier, balanced tactical positioning";
    } else {
        outCard.barrierAssessment = "Wide gate (requires early speed or patient run)";
    }

    // Running style & pace fit
    switch (style) {
        case RunningStyle::Leader: outCard.runningStyle = "Leader / Front-runner"; break;
        case RunningStyle::OnPace: outCard.runningStyle = "On-pace / Prominent"; break;
        case RunningStyle::Midfield: outCard.runningStyle = "Midfield"; break;
        case RunningStyle::Backmarker: outCard.runningStyle = "Backmarker / Closer"; break;
    }

    if (mapSummary.paceScenario == "Fast / Contested Pace") {
        outCard.paceFit = (style == RunningStyle::Backmarker || style == RunningStyle::Midfield)
            ? "Positive (benefits from fast contested lead)"
            : "High Pressure (risk of late fade if contesting pace)";
    } else if (mapSummary.paceScenario == "Slow / Tactical Pace") {
        outCard.paceFit = (style == RunningStyle::Leader || style == RunningStyle::OnPace)
            ? "Positive (soft lead tempo control)"
            : "Challenging (tempo against deep closers)";
    } else {
        outCard.paceFit = "Even conditions across tactical styles";
    }

    // Jockey & Trainer status
    outCard.jockeyTrainerStatus = (scores.jockeyTrainerScore >= 65.0) ? "Positive / High Strike Rate" : "Neutral / Standard";

    // 0-10 ratings
    outCard.abilityRating10 = std::round((scores.abilityScore / 10.0) * 10.0) / 10.0;
    outCard.raceFitRating10 = std::round((scores.raceFitScore / 10.0) * 10.0) / 10.0;
    outCard.riskLevel = (scores.raceFitScore >= 65.0 && scores.abilityScore >= 60.0) ? "Low" : (scores.raceFitScore >= 45.0 ? "Medium" : "High");

    return scores;
}

} // namespace HorseRacing
