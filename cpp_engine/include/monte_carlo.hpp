#pragma once

#include "models.hpp"
#include "predictors.hpp"
#include <random>

namespace HorseRacing {

// High-performance Monte Carlo Stochastic Race Simulator
class MonteCarloSimulator {
private:
    int m_numSimulations;
    mutable std::mt19937 m_rng;

public:
    explicit MonteCarloSimulator(int numSimulations = 10000, unsigned int seed = 42);

    void setSimulations(int count) { m_numSimulations = count > 100 ? count : 10000; }
    int getSimulations() const { return m_numSimulations; }

    // Executes the complete simulation workflow for a race
    RacePredictionResult simulateRace(const Race& race, const CompositeEnsemblePredictor& predictor) const;
};

} // namespace HorseRacing
