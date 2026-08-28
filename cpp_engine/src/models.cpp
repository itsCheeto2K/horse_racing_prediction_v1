#include "models.hpp"
#include <algorithm>
#include <sstream>
#include <cctype>

namespace HorseRacing {

StatsRecord StatsRecord::fromJson(const json& j) {
    StatsRecord record;
    if (j.is_null() || !j.is_object()) return record;
    
    if (j.contains("starts") && !j["starts"].is_null()) record.starts = j["starts"].get<int>();
    if (j.contains("wins") && !j["wins"].is_null()) record.wins = j["wins"].get<int>();
    if (j.contains("places") && !j["places"].is_null()) record.places = j["places"].get<int>();
    if (j.contains("seconds") && !j["seconds"].is_null()) record.seconds = j["seconds"].get<int>();
    if (j.contains("thirds") && !j["thirds"].is_null()) record.thirds = j["thirds"].get<int>();
    if (j.contains("winPercent") && !j["winPercent"].is_null()) record.winPercent = j["winPercent"].get<double>();
    if (j.contains("placePercent") && !j["placePercent"].is_null()) record.placePercent = j["placePercent"].get<double>();
    return record;
}

json StatsRecord::toJson() const {
    return {
        {"starts", starts},
        {"wins", wins},
        {"places", places},
        {"seconds", seconds},
        {"thirds", thirds},
        {"winPercent", winPercent},
        {"placePercent", placePercent}
    };
}

ConditionsBreakdown ConditionsBreakdown::fromJson(const json& j) {
    ConditionsBreakdown cb;
    if (j.is_null() || !j.is_object()) return cb;

    if (j.contains("good")) cb.good = StatsRecord::fromJson(j["good"]);
    if (j.contains("soft")) cb.soft = StatsRecord::fromJson(j["soft"]);
    if (j.contains("heavy")) cb.heavy = StatsRecord::fromJson(j["heavy"]);
    if (j.contains("firm")) cb.firm = StatsRecord::fromJson(j["firm"]);
    if (j.contains("synthetic")) cb.synthetic = StatsRecord::fromJson(j["synthetic"]);
    if (j.contains("fast")) cb.fast = StatsRecord::fromJson(j["fast"]);
    if (j.contains("slow")) cb.slow = StatsRecord::fromJson(j["slow"]);
    return cb;
}

json ConditionsBreakdown::toJson() const {
    return {
        {"good", good.toJson()},
        {"soft", soft.toJson()},
        {"heavy", heavy.toJson()},
        {"firm", firm.toJson()},
        {"synthetic", synthetic.toJson()},
        {"fast", fast.toJson()},
        {"slow", slow.toJson()}
    };
}

const StatsRecord* ConditionsBreakdown::getForCondition(const std::string& condition) const {
    std::string lowerCond = condition;
    std::transform(lowerCond.begin(), lowerCond.end(), lowerCond.begin(), [](unsigned char c) { return std::tolower(c); });

    if (lowerCond.find("good") != std::string::npos) return &good;
    if (lowerCond.find("soft") != std::string::npos || lowerCond.find("yielding") != std::string::npos) return &soft;
    if (lowerCond.find("heavy") != std::string::npos || lowerCond.find("muddy") != std::string::npos) return &heavy;
    if (lowerCond.find("firm") != std::string::npos) return &firm;
    if (lowerCond.find("synthetic") != std::string::npos || lowerCond.find("poly") != std::string::npos || lowerCond.find("tapeta") != std::string::npos) return &synthetic;
    if (lowerCond.find("fast") != std::string::npos) return &fast;
    if (lowerCond.find("slow") != std::string::npos) return &slow;
    return &good; // default
}

RunnerStatsProfile RunnerStatsProfile::fromJson(const json& j) {
    RunnerStatsProfile profile;
    if (j.is_null() || !j.is_object()) return profile;

    if (j.contains("overall")) profile.overall = StatsRecord::fromJson(j["overall"]);
    if (j.contains("track")) profile.track = StatsRecord::fromJson(j["track"]);
    if (j.contains("distance")) profile.distance = StatsRecord::fromJson(j["distance"]);
    if (j.contains("trackDistance")) profile.trackDistance = StatsRecord::fromJson(j["trackDistance"]);
    if (j.contains("firstUp")) profile.firstUp = StatsRecord::fromJson(j["firstUp"]);
    if (j.contains("secondUp")) profile.secondUp = StatsRecord::fromJson(j["secondUp"]);
    if (j.contains("conditions")) profile.conditions = ConditionsBreakdown::fromJson(j["conditions"]);
    return profile;
}

json RunnerStatsProfile::toJson() const {
    return {
        {"overall", overall.toJson()},
        {"track", track.toJson()},
        {"distance", distance.toJson()},
        {"trackDistance", trackDistance.toJson()},
        {"firstUp", firstUp.toJson()},
        {"secondUp", secondUp.toJson()},
        {"conditions", conditions.toJson()}
    };
}

Runner Runner::fromJson(const json& j) {
    Runner r;
    if (j.is_null() || !j.is_object()) return r;

    if (j.contains("number") && !j["number"].is_null()) r.m_number = j["number"].get<int>();
    if (j.contains("name") && !j["name"].is_null()) r.m_name = j["name"].get<std::string>();
    if (j.contains("jockey") && !j["jockey"].is_null()) r.m_jockey = j["jockey"].get<std::string>();
    if (j.contains("trainer") && !j["trainer"].is_null()) r.m_trainer = j["trainer"].get<std::string>();
    
    if (j.contains("weight") && !j["weight"].is_null()) {
        if (j["weight"].is_number()) {
            r.m_weight = j["weight"].get<double>();
        } else if (j["weight"].is_string()) {
            try { r.m_weight = std::stod(j["weight"].get<std::string>()); } catch(...) {}
        }
    }

    if (j.contains("barrier") && !j["barrier"].is_null()) {
        if (j["barrier"].is_number()) {
            r.m_barrier = j["barrier"].get<int>();
        } else if (j["barrier"].is_string()) {
            try { r.m_barrier = std::stoi(j["barrier"].get<std::string>()); } catch(...) {}
        }
    }

    if (j.contains("age") && !j["age"].is_null()) r.m_age = j["age"].get<int>();
    if (j.contains("sex") && !j["sex"].is_null()) r.m_sex = j["sex"].get<std::string>();
    if (j.contains("sire") && !j["sire"].is_null()) r.m_sire = j["sire"].get<std::string>();
    if (j.contains("dam") && !j["dam"].is_null()) r.m_dam = j["dam"].get<std::string>();
    if (j.contains("country") && !j["country"].is_null()) r.m_country = j["country"].get<std::string>();
    if (j.contains("careerPrizeMoney") && !j["careerPrizeMoney"].is_null()) r.m_careerPrizeMoney = j["careerPrizeMoney"].get<std::string>();
    if (j.contains("form") && !j["form"].is_null()) r.m_form = j["form"].get<std::string>();
    if (j.contains("last20Starts") && !j["last20Starts"].is_null()) r.m_last20Starts = j["last20Starts"].get<std::string>();
    if (j.contains("scratched") && !j["scratched"].is_null()) r.m_scratched = j["scratched"].get<bool>();
    
    if (j.contains("stats")) {
        r.m_stats = RunnerStatsProfile::fromJson(j["stats"]);
    }
    return r;
}

json Runner::toJson() const {
    return {
        {"number", m_number},
        {"name", m_name},
        {"jockey", m_jockey},
        {"trainer", m_trainer},
        {"weight", m_weight},
        {"barrier", m_barrier},
        {"age", m_age},
        {"sex", m_sex},
        {"sire", m_sire},
        {"dam", m_dam},
        {"country", m_country},
        {"careerPrizeMoney", m_careerPrizeMoney},
        {"form", m_form},
        {"last20Starts", m_last20Starts},
        {"scratched", m_scratched},
        {"stats", m_stats.toJson()}
    };
}

double Runner::getCareerPrizeMoneyValue() const {
    if (m_careerPrizeMoney.empty()) return 0.0;
    std::string clean;
    for (char c : m_careerPrizeMoney) {
        if (std::isdigit(c) || c == '.') clean += c;
    }
    try {
        return std::stod(clean);
    } catch (...) {
        return 0.0;
    }
}

std::vector<int> Runner::getRecentFormPositions() const {
    std::vector<int> positions;
    std::string src = !m_form.empty() ? m_form : m_last20Starts;
    for (char c : src) {
        if (c >= '1' && c <= '9') {
            positions.push_back(c - '0');
        } else if (c == '0') {
            positions.push_back(10);
        }
    }
    return positions;
}

Race Race::fromJson(const json& j) {
    Race race;
    if (j.is_null() || !j.is_object()) return race;

    if (j.contains("date") && !j["date"].is_null()) race.m_date = j["date"].get<std::string>();
    if (j.contains("track") && !j["track"].is_null()) race.m_track = j["track"].get<std::string>();
    if (j.contains("raceNumber") && !j["raceNumber"].is_null()) race.m_raceNumber = j["raceNumber"].get<int>();
    if (j.contains("raceName") && !j["raceName"].is_null()) race.m_raceName = j["raceName"].get<std::string>();
    if (j.contains("distance") && !j["distance"].is_null()) {
        race.m_distanceStr = j["distance"].get<std::string>();
        std::string numStr;
        for (char c : race.m_distanceStr) {
            if (std::isdigit(c)) numStr += c;
        }
        if (!numStr.empty()) {
            try { race.m_distanceMeters = std::stoi(numStr); } catch(...) {}
        }
    }
    if (j.contains("condition") && !j["condition"].is_null()) race.m_condition = j["condition"].get<std::string>();
    if (j.contains("weather") && !j["weather"].is_null()) race.m_weather = j["weather"].get<std::string>();
    if (j.contains("raceClass") && !j["raceClass"].is_null()) race.m_raceClass = j["raceClass"].get<std::string>();
    if (j.contains("abandoned") && !j["abandoned"].is_null()) race.m_abandoned = j["abandoned"].get<bool>();
    if (j.contains("startTime") && !j["startTime"].is_null()) race.m_startTime = j["startTime"].get<std::string>();
    if (j.contains("timezone") && !j["timezone"].is_null()) race.m_timezone = j["timezone"].get<std::string>();
    if (j.contains("prizeMoney") && !j["prizeMoney"].is_null()) race.m_prizeMoney = j["prizeMoney"].get<std::string>();
    if (j.contains("numberOfRunners") && !j["numberOfRunners"].is_null()) race.m_numberOfRunners = j["numberOfRunners"].get<int>();

    if (j.contains("runners") && j["runners"].is_array()) {
        for (const auto& item : j["runners"]) {
            race.m_runners.push_back(Runner::fromJson(item));
        }
    }
    return race;
}

json Race::toJson() const {
    json runnersJson = json::array();
    for (const auto& r : m_runners) {
        runnersJson.push_back(r.toJson());
    }

    return {
        {"date", m_date},
        {"track", m_track},
        {"raceNumber", m_raceNumber},
        {"raceName", m_raceName},
        {"distance", m_distanceStr},
        {"distanceMeters", m_distanceMeters},
        {"condition", m_condition},
        {"weather", m_weather},
        {"raceClass", m_raceClass},
        {"abandoned", m_abandoned},
        {"startTime", m_startTime},
        {"timezone", m_timezone},
        {"prizeMoney", m_prizeMoney},
        {"numberOfRunners", m_numberOfRunners},
        {"runners", runnersJson}
    };
}

std::vector<Runner> Race::getActiveRunners() const {
    std::vector<Runner> active;
    for (const auto& r : m_runners) {
        if (!r.isScratched()) {
            active.push_back(r);
        }
    }
    return active;
}

ModelWeights ModelWeights::fromJson(const json& j) {
    ModelWeights w;
    if (j.is_null() || !j.is_object()) return w;

    if (j.contains("formWeight")) w.formWeight = j["formWeight"].get<double>();
    if (j.contains("conditionWeight")) w.conditionWeight = j["conditionWeight"].get<double>();
    if (j.contains("distanceWeight")) w.distanceWeight = j["distanceWeight"].get<double>();
    if (j.contains("jockeyTrainerWeight")) w.jockeyTrainerWeight = j["jockeyTrainerWeight"].get<double>();
    if (j.contains("barrierWeight")) w.barrierWeight = j["barrierWeight"].get<double>();
    w.normalize();
    return w;
}

json ModelWeights::toJson() const {
    return {
        {"formWeight", formWeight},
        {"conditionWeight", conditionWeight},
        {"distanceWeight", distanceWeight},
        {"jockeyTrainerWeight", jockeyTrainerWeight},
        {"barrierWeight", barrierWeight}
    };
}

void ModelWeights::normalize() {
    double sum = formWeight + conditionWeight + distanceWeight + jockeyTrainerWeight + barrierWeight;
    if (sum > 0.0001) {
        formWeight /= sum;
        conditionWeight /= sum;
        distanceWeight /= sum;
        jockeyTrainerWeight /= sum;
        barrierWeight /= sum;
    } else {
        formWeight = 0.25;
        conditionWeight = 0.25;
        distanceWeight = 0.20;
        jockeyTrainerWeight = 0.15;
        barrierWeight = 0.15;
    }
}

ModelWeights ModelWeights::getDynamicWeightsForDistance(int distanceMeters) {
    if (distanceMeters <= 0) {
        // Default middle distance profile (1400m)
        ModelWeights w{0.25, 0.21, 0.22, 0.17, 0.15};
        w.normalize();
        return w;
    }

    struct DistanceProfilePoint {
        int dist;
        double form;
        double cond;
        double distW;
        double jt;
        double bar;
    };

    // AU Racing calibrated distance weight milestones from empirical form benchmarks
    const std::vector<DistanceProfilePoint> milestones = {
        {1000, 0.28, 0.18, 0.17, 0.15, 0.22}, // Sprint Short (1000-1100m)
        {1200, 0.27, 0.19, 0.19, 0.15, 0.20}, // Sprint Standard (1200m)
        {1400, 0.25, 0.21, 0.22, 0.17, 0.15}, // Middle Distance (1300-1400m)
        {1600, 0.22, 0.24, 0.25, 0.17, 0.12}, // Mile (1500-1600m)
        {2000, 0.19, 0.25, 0.29, 0.17, 0.10}, // Intermediate / Long (1800-2000m)
        {2400, 0.16, 0.27, 0.32, 0.17, 0.08}  // Staying (2100-2400m+)
    };

    if (distanceMeters <= milestones.front().dist) {
        ModelWeights w{milestones.front().form, milestones.front().cond, milestones.front().distW, milestones.front().jt, milestones.front().bar};
        w.normalize();
        return w;
    }

    if (distanceMeters >= milestones.back().dist) {
        ModelWeights w{milestones.back().form, milestones.back().cond, milestones.back().distW, milestones.back().jt, milestones.back().bar};
        w.normalize();
        return w;
    }

    // Continuous linear interpolation between adjacent distance milestones
    for (size_t i = 0; i < milestones.size() - 1; ++i) {
        if (distanceMeters >= milestones[i].dist && distanceMeters <= milestones[i + 1].dist) {
            double t = static_cast<double>(distanceMeters - milestones[i].dist) / 
                       static_cast<double>(milestones[i + 1].dist - milestones[i].dist);
            
            ModelWeights w;
            w.formWeight = milestones[i].form * (1.0 - t) + milestones[i + 1].form * t;
            w.conditionWeight = milestones[i].cond * (1.0 - t) + milestones[i + 1].cond * t;
            w.distanceWeight = milestones[i].distW * (1.0 - t) + milestones[i + 1].distW * t;
            w.jockeyTrainerWeight = milestones[i].jt * (1.0 - t) + milestones[i + 1].jt * t;
            w.barrierWeight = milestones[i].bar * (1.0 - t) + milestones[i + 1].bar * t;
            w.normalize();
            return w;
        }
    }

    ModelWeights w;
    w.normalize();
    return w;
}

std::string ModelWeights::getDistanceCategory(int distanceMeters) {
    if (distanceMeters <= 0) return "General";
    if (distanceMeters <= 1100) return "Short Sprint (<=1100m)";
    if (distanceMeters <= 1250) return "Sprint (1200m)";
    if (distanceMeters <= 1450) return "Middle Distance (1300-1400m)";
    if (distanceMeters <= 1700) return "Mile (1500-1600m)";
    if (distanceMeters <= 2050) return "Intermediate / Long (1800-2000m)";
    return "Staying (2100m+)";
}

json FeatureScores::toJson() const {
    return {
        {"formScore", formScore},
        {"conditionScore", conditionScore},
        {"distanceScore", distanceScore},
        {"jockeyTrainerScore", jockeyTrainerScore},
        {"barrierScore", barrierScore},
        {"compositeRating", compositeRating}
    };
}

json RunnerPrediction::toJson() const {
    return {
        {"runnerNumber", runnerNumber},
        {"runnerName", runnerName},
        {"jockey", jockey},
        {"trainer", trainer},
        {"barrier", barrier},
        {"weight", weight},
        {"rank", rank},
        {"powerRating", powerRating},
        {"winProbability", winProbability},
        {"placeProbability", placeProbability},
        {"fairOdds", fairOdds},
        {"featureScores", featureScores.toJson()},
        {"badges", badges},
        {"isTopPick", isTopPick},
        {"isValuePick", isValuePick},
        {"isDarkHorse", isDarkHorse},
        {"isScratched", isScratched}
    };
}

json RacePredictionResult::toJson() const {
    json predsJson = json::array();
    for (const auto& p : runnerPredictions) {
        predsJson.push_back(p.toJson());
    }

    return {
        {"date", date},
        {"track", track},
        {"raceNumber", raceNumber},
        {"raceName", raceName},
        {"distance", distance},
        {"distanceCategory", distanceCategory},
        {"condition", condition},
        {"totalSimulations", totalSimulations},
        {"isDynamicWeights", isDynamicWeights},
        {"appliedWeights", appliedWeights.toJson()},
        {"predictions", predsJson},
        {"topPickName", topPickName},
        {"valuePickName", valuePickName},
        {"darkHorseName", darkHorseName}
    };
}

} // namespace HorseRacing
