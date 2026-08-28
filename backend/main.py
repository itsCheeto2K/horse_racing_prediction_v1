import os
from datetime import date
from typing import Optional, Dict, Any
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from formfav_client import FormFavClient
from cpp_bridge import CppPredictionBridge
from composite_scorer import (
    enrich_predictions_with_composite_score,
    validate_composite_weights,
    load_default_weights
)

load_dotenv()

app = FastAPI(
    title="Horse Racing Live Prediction API",
    description="Full-stack Horse Racing Prediction Platform powered by FormFav API, C++ OOP Monte Carlo Engine, and Composite Statistical Ensemble.",
    version="1.1.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

formfav = FormFavClient()
cpp_engine = CppPredictionBridge()


class CustomSimulationRequest(BaseModel):
    date: str
    track: str
    race: int
    race_code: str = "gallops"
    country: Optional[str] = None
    timezone: Optional[str] = None
    simulations: int = 10000
    weights: Optional[Dict[str, float]] = None
    composite_weights: Optional[Dict[str, float]] = None
    market_odds: Optional[Dict[int, float]] = None


@app.get("/api/health")
def health_check():
    engine_exists = os.path.exists(cpp_engine.binary_path)
    return {
        "status": "online",
        "cpp_engine_available": engine_exists,
        "cpp_engine_path": cpp_engine.binary_path,
        "api_key_configured": bool(formfav.api_key),
        "default_composite_weights": load_default_weights()
    }


@app.get("/api/venues")
def get_venues(
    race_type: Optional[str] = Query(None, alias="raceType"),
    country: Optional[str] = Query(None)
):
    try:
        data = formfav.get_venues(race_type=race_type, country=country)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/meetings")
def get_meetings(
    meeting_date: Optional[str] = Query(None, alias="date"),
    race_code: str = Query("gallops"),
    timezone: Optional[str] = Query(None)
):
    if not meeting_date:
        meeting_date = date.today().isoformat()
    try:
        data = formfav.get_meetings(date=meeting_date, race_code=race_code, timezone=timezone)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/race")
def get_race_and_predict(
    race_date: str = Query(..., alias="date"),
    track: str = Query(...),
    race: int = Query(..., ge=1, le=20),
    race_code: str = Query("gallops"),
    country: Optional[str] = Query(None),
    timezone: Optional[str] = Query(None),
    simulations: int = Query(10000, ge=500, le=50000)
):
    """
    Fetches official race form data from FormFav, runs the C++ OOP Monte Carlo Engine,
    and applies the Composite Ensemble statistical scoring layer (Form, Class, Track/Dist, Connections, Consistency).
    """
    try:
        form_data = formfav.get_race_form(
            date=race_date,
            track=track,
            race=race,
            race_code=race_code,
            country=country,
            timezone=timezone
        )

        if not form_data or "runners" not in form_data:
            raise HTTPException(status_code=404, detail="Race form data not found")

        # Run C++ OOP Monte Carlo Engine
        mc_predictions = cpp_engine.predict_race(form_data, simulations=simulations)

        # Apply Composite Ensemble Prediction Layer
        predictions = enrich_predictions_with_composite_score(
            form_data=form_data,
            mc_prediction=mc_predictions
        )

        return {
            "form": form_data,
            "prediction": predictions
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/race/simulate")
def simulate_custom_weights(req: CustomSimulationRequest):
    """
    Re-runs the C++ OOP Monte Carlo simulation and Composite Ensemble with custom user-tuned weights.
    Validates that composite_weights sum to 1.0 (±0.001).
    """
    try:
        # Validate composite weights if provided
        if req.composite_weights:
            is_valid, err_msg = validate_composite_weights(req.composite_weights)
            if not is_valid:
                raise HTTPException(status_code=400, detail=err_msg)

        form_data = formfav.get_race_form(
            date=req.date,
            track=req.track,
            race=req.race,
            race_code=req.race_code,
            country=req.country,
            timezone=req.timezone
        )

        # Run C++ Monte Carlo Engine
        mc_predictions = cpp_engine.predict_race(
            race_form=form_data,
            weights=req.weights,
            simulations=req.simulations
        )

        # Apply Composite Ensemble Prediction Layer
        predictions = enrich_predictions_with_composite_score(
            form_data=form_data,
            mc_prediction=mc_predictions,
            custom_composite_weights=req.composite_weights,
            market_odds_map=req.market_odds
        )

        return {
            "form": form_data,
            "prediction": predictions
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
