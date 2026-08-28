@echo off
title Horse Racing Live Prediction System
echo ========================================================
echo   HorseRacing Live - C++ OOP & FormFav Prediction Platform
echo ========================================================

:: 1. Check C++ Binary
if not exist "cpp_engine\horse_predictor.exe" (
    echo [1/3] Compiling C++ OOP Prediction Engine...
    cd cpp_engine
    call build.bat
    cd ..
) else (
    echo [1/3] C++ OOP Engine is compiled and ready.
)

:: 2. Launch FastAPI Backend in background
echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "HorseRacing Backend" cmd /k "cd backend && python main.py"

:: 3. Launch Vite React Frontend
echo [3/3] Starting React Vite Frontend on http://localhost:5173 ...
cd frontend
npm run dev

pause
