#pragma once

#include "models.hpp"
#include <memory>
#include <vector>
#include <string>

namespace HorseRacing {

// Abstract Strategy Interface for Feature Predictors (Polymorphism)
class IPredictor {
public:
    virtual ~IPredictor() = default;

    // Evaluates a single runner in the context of a race, returning a score from [0.0, 100.0]
    virtual double evaluate(const Runner& runner, const Race& race) const = 0;

    // Returns identifier name of the strategy
    virtual std::string getName() const = 0;

    // Returns an optional badge title if the runner excels in this specific metric
    virtual std::string generateBadge(const Runner& runner, const Race& race, double score) const {
        return "";
    }
};

// Evaluates recency of form, finishing momentum, career strike rate
class RecentFormPredictor : public IPredictor {
public:
    double evaluate(const Runner& runner, const Race& race) const override;
    std::string getName() const override { return "RecentForm"; }
    std::string generateBadge(const Runner& runner, const Race& race, double score) const override;
};

// Evaluates runner affinity for the current ground/track condition (Good, Soft, Heavy, etc.)
class TrackConditionPredictor : public IPredictor {
public:
    double evaluate(const Runner& runner, const Race& race) const override;
    std::string getName() const override { return "TrackCondition"; }
    std::string generateBadge(const Runner& runner, const Race& race, double score) const override;
};

// Evaluates distance suitability, track-distance history, and weight adjustments
class DistanceSuitabilityPredictor : public IPredictor {
public:
    double evaluate(const Runner& runner, const Race& race) const override;
    std::string getName() const override { return "DistanceSuitability"; }
    std::string generateBadge(const Runner& runner, const Race& race, double score) const override;
};

// Evaluates jockey & trainer partnership and strike rates
class JockeyTrainerPredictor : public IPredictor {
public:
    double evaluate(const Runner& runner, const Race& race) const override;
    std::string getName() const override { return "JockeyTrainer"; }
    std::string generateBadge(const Runner& runner, const Race& race, double score) const override;
};

// Evaluates gate/barrier draw advantage based on race distance, field size, and running style
class BarrierBiasPredictor : public IPredictor {
public:
    double evaluate(const Runner& runner, const Race& race) const override;
    double evaluateWithStyle(const Runner& runner, const Race& race, RunningStyle style) const;
    std::string getName() const override { return "BarrierBias"; }
    std::string generateBadge(const Runner& runner, const Race& race, double score) const override;
};

// Evaluates Race Map & Pace dynamics (Tầng 3)
class RaceMapPredictor {
public:
    RunningStyle inferRunningStyle(const Runner& runner, const Race& race) const;
    RaceMapSummary analyzeRaceMap(const Race& race) const;
    double evaluatePaceFit(const Runner& runner, const Race& race, RunningStyle style, const RaceMapSummary& mapSummary) const;
};

// Composite Ensemble Predictor aggregating 4-Tier modular pipeline
class CompositeEnsemblePredictor : public IPredictor {
private:
    std::unique_ptr<RecentFormPredictor> m_formPred;
    std::unique_ptr<TrackConditionPredictor> m_condPred;
    std::unique_ptr<DistanceSuitabilityPredictor> m_distPred;
    std::unique_ptr<JockeyTrainerPredictor> m_jtPred;
    std::unique_ptr<BarrierBiasPredictor> m_barPred;
    std::unique_ptr<RaceMapPredictor> m_mapPred;
    ModelWeights m_weights;

public:
    CompositeEnsemblePredictor(const ModelWeights& weights = ModelWeights());

    void setWeights(const ModelWeights& weights) {
        m_weights = weights;
        m_weights.normalize();
    }

    const ModelWeights& getWeights() const { return m_weights; }
    const RaceMapPredictor& getMapPredictor() const { return *m_mapPred; }

    double evaluate(const Runner& runner, const Race& race) const override;
    std::string getName() const override { return "CompositeEnsemble"; }

    // Evaluates all individual feature components and populates FeatureScores and badges
    FeatureScores evaluateDetailed(const Runner& runner, const Race& race, std::vector<std::string>& outBadges) const;

    // 4-Tier comprehensive evaluation with full HorseCard generation
    FeatureScores evaluate4Tier(
        const Runner& runner,
        const Race& race,
        const RaceMapSummary& mapSummary,
        RunningStyle style,
        std::vector<std::string>& outBadges,
        HorseCardData& outCard
    ) const;
};

} // namespace HorseRacing

