#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include "json.hpp"

namespace HorseRacing {

using json = nlohmann::json;

// Statistical sub-record (starts, wins, places, win %, place %)
struct StatsRecord {
    int starts = 0;
    int wins = 0;
    int places = 0;
    int seconds = 0;
    int thirds = 0;
    double winPercent = 0.0;
    double placePercent = 0.0;

    static StatsRecord fromJson(const json& j);
    json toJson() const;
};

// Condition statistics for different track conditions
struct ConditionsBreakdown {
    StatsRecord good;
    StatsRecord soft;
    StatsRecord heavy;
    StatsRecord firm;
    StatsRecord synthetic;
    StatsRecord fast;
    StatsRecord slow;

    static ConditionsBreakdown fromJson(const json& j);
    json toJson() const;
    const StatsRecord* getForCondition(const std::string& condition) const;
};

// Aggregated statistical profile of a runner
struct RunnerStatsProfile {
    StatsRecord overall;
    StatsRecord track;
    StatsRecord distance;
    StatsRecord trackDistance;
    StatsRecord firstUp;
    StatsRecord secondUp;
    ConditionsBreakdown conditions;

    static RunnerStatsProfile fromJson(const json& j);
    json toJson() const;
};

// Domain entity representing a horse/runner in a race
class Runner {
private:
    int m_number = 0;
    std::string m_name;
    std::string m_jockey;
    std::string m_trainer;
    double m_weight = 0.0;
    int m_barrier = 0;
    int m_age = 0;
    std::string m_sex;
    std::string m_sire;
    std::string m_dam;
    std::string m_country;
    std::string m_careerPrizeMoney;
    std::string m_form;
    std::string m_last20Starts;
    bool m_scratched = false;
    RunnerStatsProfile m_stats;

public:
    Runner() = default;
    static Runner fromJson(const json& j);
    json toJson() const;

    // Getters
    int getNumber() const { return m_number; }
    const std::string& getName() const { return m_name; }
    const std::string& getJockey() const { return m_jockey; }
    const std::string& getTrainer() const { return m_trainer; }
    double getWeight() const { return m_weight; }
    int getBarrier() const { return m_barrier; }
    int getAge() const { return m_age; }
    const std::string& getSex() const { return m_sex; }
    const std::string& getSire() const { return m_sire; }
    const std::string& getDam() const { return m_dam; }
    const std::string& getCountry() const { return m_country; }
    const std::string& getCareerPrizeMoney() const { return m_careerPrizeMoney; }
    const std::string& getForm() const { return m_form; }
    const std::string& getLast20Starts() const { return m_last20Starts; }
    bool isScratched() const { return m_scratched; }
    const RunnerStatsProfile& getStats() const { return m_stats; }

    // Helpers
    double getCareerPrizeMoneyValue() const;
    std::vector<int> getRecentFormPositions() const;
};

// Domain entity representing a scheduled or completed race
class Race {
private:
    std::string m_date;
    std::string m_track;
    int m_raceNumber = 1;
    std::string m_raceName;
    std::string m_distanceStr;
    int m_distanceMeters = 0;
    std::string m_condition;
    std::string m_weather;
    std::string m_raceClass;
    bool m_abandoned = false;
    std::string m_startTime;
    std::string m_timezone;
    std::string m_prizeMoney;
    int m_numberOfRunners = 0;
    std::vector<Runner> m_runners;

public:
    Race() = default;
    static Race fromJson(const json& j);
    json toJson() const;

    // Getters
    const std::string& getDate() const { return m_date; }
    const std::string& getTrack() const { return m_track; }
    int getRaceNumber() const { return m_raceNumber; }
    const std::string& getRaceName() const { return m_raceName; }
    const std::string& getDistanceStr() const { return m_distanceStr; }
    int getDistanceMeters() const { return m_distanceMeters; }
    const std::string& getCondition() const { return m_condition; }
    const std::string& getWeather() const { return m_weather; }
    const std::string& getRaceClass() const { return m_raceClass; }
    bool isAbandoned() const { return m_abandoned; }
    const std::string& getStartTime() const { return m_startTime; }
    const std::string& getTimezone() const { return m_timezone; }
    const std::string& getPrizeMoney() const { return m_prizeMoney; }
    int getNumberOfRunners() const { return m_numberOfRunners; }
    const std::vector<Runner>& getRunners() const { return m_runners; }
    std::vector<Runner> getActiveRunners() const;
};

// Configurable weights for the OOP composite model
struct ModelWeights {
    double formWeight = 0.25;
    double conditionWeight = 0.25;
    double distanceWeight = 0.20;
    double jockeyTrainerWeight = 0.15;
    double barrierWeight = 0.15;

    static ModelWeights fromJson(const json& j);
    json toJson() const;
    void normalize();

    // Auto-calculate dynamic weights interpolated by race distance (AU Racing standards)
    static ModelWeights getDynamicWeightsForDistance(int distanceMeters);
    static std::string getDistanceCategory(int distanceMeters);
};

// Breakdown of individual feature ratings for transparency
struct FeatureScores {
    double formScore = 0.0;
    double conditionScore = 0.0;
    double distanceScore = 0.0;
    double jockeyTrainerScore = 0.0;
    double barrierScore = 0.0;
    double compositeRating = 0.0;

    json toJson() const;
};

// Output prediction for an individual runner
struct RunnerPrediction {
    int runnerNumber = 0;
    std::string runnerName;
    std::string jockey;
    std::string trainer;
    int barrier = 0;
    double weight = 0.0;
    int rank = 0;
    double powerRating = 0.0;
    double winProbability = 0.0;
    double placeProbability = 0.0;
    double fairOdds = 0.0;
    FeatureScores featureScores;
    std::vector<std::string> badges;
    bool isTopPick = false;
    bool isValuePick = false;
    bool isDarkHorse = false;
    bool isScratched = false;

    json toJson() const;
};

// Overall race prediction output container
struct RacePredictionResult {
    std::string date;
    std::string track;
    int raceNumber = 1;
    std::string raceName;
    std::string distance;
    std::string distanceCategory;
    std::string condition;
    int totalSimulations = 10000;
    bool isDynamicWeights = false;
    ModelWeights appliedWeights;
    std::vector<RunnerPrediction> runnerPredictions;
    std::string topPickName;
    std::string valuePickName;
    std::string darkHorseName;

    json toJson() const;
};

} // namespace HorseRacing
