@echo off
echo Compiling Horse Prediction C++ Engine...
g++ -std=c++17 -O3 -Iinclude src/models.cpp src/predictors.cpp src/monte_carlo.cpp src/main.cpp -o horse_predictor.exe
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] horse_predictor.exe compiled successfully!
) else (
    echo [ERROR] Compilation failed!
    exit /b 1
)
