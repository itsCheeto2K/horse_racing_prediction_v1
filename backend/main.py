import os
from datetime import date
from typing import Optional, Dict, Any
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from formfav_client import FormFavClient
from cpp_bridge import CppPredictionBridge

load_dotenv()

app = FastAPI(
    title="Horse Racing Live Prediction API",
    description="Full-stack Horse Racing Prediction Platform powered by FormFav API and a C++ OOP Monte Carlo Engine.",
    version="1.0.0"
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
    country: str = "au"
    simulations: int = 10000
    weights: Optional[Dict[str, float]] = None

@app.get("/api/health")
def health_check():
    engine_exists = os.path.exists(cpp_engine.binary_path)
    return {
        "status": "online",
        "cpp_engine_available": engine_exists,
        "cpp_engine_path": cpp_engine.binary_path,
        "api_key_configured": bool(formfav.api_key)
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
    timezone: str = Query("Australia/Sydney")
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
    country: str = Query("au"),
    timezone: str = Query("Australia/Sydney"),
    simulations: int = Query(10000, ge=500, le=50000)
):
    """
    Fetches official race form data from FormFav and runs the C++ OOP Monte Carlo Engine
    to compute horse ratings, Win/Place probabilities, fair value odds, and key factor badges.
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
        predictions = cpp_engine.predict_race(form_data, simulations=simulations)

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
    Re-runs the C++ OOP Monte Carlo simulation with custom user-tuned model weights
    (Form, Condition, Distance, Jockey/Trainer, Barrier).
    """
    try:
        form_data = formfav.get_race_form(
            date=req.date,
            track=req.track,
            race=req.race,
            race_code=req.race_code,
            country=req.country
        )

        predictions = cpp_engine.predict_race(
            race_form=form_data,
            weights=req.weights,
            simulations=req.simulations
        )

        return {
            "form": form_data,
            "prediction": predictions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
