#include "models.hpp"
#include "predictors.hpp"
#include "monte_carlo.hpp"
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>

using namespace HorseRacing;

void printUsage() {
    std::cout << "Horse Prediction C++ OOP Engine\n"
              << "Usage: horse_predictor [options]\n"
              << "Options:\n"
              << "  --race-json <path>      Path to race form JSON file\n"
              << "  --stdin                 Read race form JSON from standard input\n"
              << "  --simulations <n>       Number of Monte Carlo simulations (default: 10000)\n"
              << "  --w-form <val>          Weight for Recent Form (default: 0.25)\n"
              << "  --w-cond <val>          Weight for Track Condition (default: 0.25)\n"
              << "  --w-dist <val>          Weight for Distance Fit (default: 0.20)\n"
              << "  --w-jt <val>            Weight for Jockey/Trainer (default: 0.15)\n"
              << "  --w-barrier <val>       Weight for Barrier Draw (default: 0.15)\n"
              << "  --weights-json <json>   JSON string with custom weights\n"
              << "  --output <path>         Output JSON file path (default: stdout)\n"
              << "  --help                  Show this help message\n";
}

int main(int argc, char* argv[]) {
    std::string raceJsonPath = "";
    std::string outputJsonPath = "";
    bool readStdin = false;
    int simulations = 10000;
    ModelWeights weights;
    bool customWeightsProvided = false;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--race-json" && i + 1 < argc) {
            raceJsonPath = argv[++i];
        } else if (arg == "--stdin") {
            readStdin = true;
        } else if (arg == "--simulations" && i + 1 < argc) {
            simulations = std::stoi(argv[++i]);
        } else if (arg == "--w-form" && i + 1 < argc) {
            weights.formWeight = std::stod(argv[++i]);
            customWeightsProvided = true;
        } else if (arg == "--w-cond" && i + 1 < argc) {
            weights.conditionWeight = std::stod(argv[++i]);
            customWeightsProvided = true;
        } else if (arg == "--w-dist" && i + 1 < argc) {
            weights.distanceWeight = std::stod(argv[++i]);
            customWeightsProvided = true;
        } else if (arg == "--w-jt" && i + 1 < argc) {
            weights.jockeyTrainerWeight = std::stod(argv[++i]);
            customWeightsProvided = true;
        } else if (arg == "--w-barrier" && i + 1 < argc) {
            weights.barrierWeight = std::stod(argv[++i]);
            customWeightsProvided = true;
        } else if (arg == "--weights-json" && i + 1 < argc) {
            try {
                json wj = json::parse(argv[++i]);
                weights = ModelWeights::fromJson(wj);
                customWeightsProvided = true;
            } catch (const std::exception& e) {
                std::cerr << "Warning: Failed to parse weights-json: " << e.what() << "\n";
            }
        } else if (arg == "--auto-weights") {
            customWeightsProvided = false;
        } else if (arg == "--output" && i + 1 < argc) {
            outputJsonPath = argv[++i];
        } else if (arg == "--help" || arg == "-h") {
            printUsage();
            return 0;
        }
    }

    std::string inputContent;
    if (readStdin || (raceJsonPath.empty() && argc == 1)) {
        std::string line;
        while (std::getline(std::cin, line)) {
            inputContent += line + "\n";
        }
    } else if (!raceJsonPath.empty()) {
        std::ifstream file(raceJsonPath);
        if (!file.is_open()) {
            std::cerr << "Error: Could not open race JSON file: " << raceJsonPath << "\n";
            return 1;
        }
        std::stringstream buffer;
        buffer << file.rdbuf();
        inputContent = buffer.str();
    } else {
        printUsage();
        return 1;
    }

    if (inputContent.empty()) {
        std::cerr << "Error: Empty input JSON\n";
        return 1;
    }

    try {
        json raceRaw = json::parse(inputContent);
        Race race = Race::fromJson(raceRaw);

        if (!customWeightsProvided) {
            weights = ModelWeights::getDynamicWeightsForDistance(race.getDistanceMeters());
        }

        CompositeEnsemblePredictor ensemble(weights);
        MonteCarloSimulator simulator(simulations);

        RacePredictionResult result = simulator.simulateRace(race, ensemble);
        result.isDynamicWeights = !customWeightsProvided;
        json outJson = result.toJson();

        if (!outputJsonPath.empty()) {
            std::ofstream outFile(outputJsonPath);
            if (outFile.is_open()) {
                outFile << outJson.dump(2) << "\n";
            } else {
                std::cerr << "Error: Could not open output file: " << outputJsonPath << "\n";
                return 1;
            }
        } else {
            std::cout << outJson.dump(2) << "\n";
        }
    } catch (const std::exception& e) {
        std::cerr << "Prediction Engine Error: " << e.what() << "\n";
        return 1;
    }

    return 0;
}
