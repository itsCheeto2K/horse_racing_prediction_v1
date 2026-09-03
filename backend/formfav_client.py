import os
import json
import time
import copy
import logging
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("formfav_client")

class FormFavClient:
    """
    Client for interacting with the FormFav Horse Racing REST API.
    Includes in-memory TTL caching to optimize performance and prevent rate limit exhaustion.
    Includes automatic Mock/Demo fallback when FormFav API key is unconfigured or returns 401 Unauthorized.
    """
    BASE_URL = "https://api.formfav.com/v1"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("FORMFAV_API_KEY", os.getenv("FORMFAT_API_KEY", ""))
        self.session = requests.Session()
        self.session.headers.update({
            "X-API-Key": self.api_key,
            "Accept": "application/json",
            "User-Agent": "HorseRacingLive-Engine/1.0"
        })
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._demo_race_template = self._load_demo_race_template()

    def _load_demo_race_template(self) -> Dict[str, Any]:
        """Loads baseline test race JSON to use as fallback template."""
        try:
            sample_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "cpp_engine",
                "test_race.json"
            )
            if os.path.exists(sample_path):
                with open(sample_path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load demo race template: {e}")
        return {}

    def _get_cached(self, key: str, ttl_seconds: int = 300) -> Optional[Any]:
        if key in self._cache:
            entry = self._cache[key]
            if time.time() - entry["timestamp"] < ttl_seconds:
                return entry["data"]
        return None

    def _set_cache(self, key: str, data: Any):
        self._cache[key] = {
            "timestamp": time.time(),
            "data": data
        }

    def _get_demo_meetings(self, date: str) -> Dict[str, Any]:
        """Generates fallback demo racing meetings across popular tracks."""
        tracks = [
            {"track": "Alice Springs", "slug": "alice-springs", "country": "au", "state": "NT", "races_count": 5},
            {"track": "Flemington", "slug": "flemington", "country": "au", "state": "VIC", "races_count": 6},
            {"track": "Randwick", "slug": "randwick", "country": "au", "state": "NSW", "races_count": 6},
            {"track": "Ascot", "slug": "ascot", "country": "gb", "state": "ENG", "races_count": 5},
            {"track": "Sha Tin", "slug": "sha-tin", "country": "hk", "state": "HK", "races_count": 5},
        ]
        meetings = []
        for t in tracks:
            races = []
            for r_num in range(1, t["races_count"] + 1):
                races.append({
                    "raceNumber": r_num,
                    "raceName": f"Demo Handicap R{r_num}",
                    "distance": 1200 + (r_num * 100),
                    "startTime": f"{date}T{4 + r_num:02d}:30:00Z",
                    "status": "Normal"
                })
            meetings.append({
                "track": t["track"],
                "slug": t["slug"],
                "country": t["country"],
                "state": t["state"],
                "date": date,
                "races": races,
                "is_demo_mode": True
            })
        return {"date": date, "meetings": meetings, "demo_notice": "Running in Demo Mode (Configure FORMFAV_API_KEY for live data)"}

    def _get_demo_race_form(self, date: str, track: str, race: int) -> Dict[str, Any]:
        """Generates realistic race form data using template."""
        if self._demo_race_template:
            race_data = copy.deepcopy(self._demo_race_template)
            race_data["date"] = date
            race_data["track"] = track.title()
            race_data["raceNumber"] = race
            race_data["raceName"] = f"{track.title()} Trophy R{race}"
            race_data["is_demo_mode"] = True
            return race_data
        
        # Fallback if test_race.json was not found
        return {
            "date": date,
            "track": track.title(),
            "raceNumber": race,
            "raceName": f"{track.title()} Race {race}",
            "distance": "1400m",
            "condition": "Good",
            "weather": "Fine",
            "raceClass": "BM-64",
            "numberOfRunners": 4,
            "runners": [
                {
                    "number": 1, "name": "Thunder Strike", "jockey": "J. McDonald", "trainer": "C. Waller",
                    "weight": 58.5, "barrier": 2, "form": "1214", "last20Starts": "211214", "stats": {"overall": {"starts": 10, "wins": 3, "places": 6}}
                },
                {
                    "number": 2, "name": "Golden Glory", "jockey": "D. Lane", "trainer": "M. Price",
                    "weight": 56.0, "barrier": 1, "form": "3122", "last20Starts": "13122", "stats": {"overall": {"starts": 12, "wins": 2, "places": 7}}
                },
                {
                    "number": 3, "name": "Shadow Hunter", "jockey": "B. Shinn", "trainer": "T. Dabernig",
                    "weight": 55.0, "barrier": 4, "form": "4513", "last20Starts": "54513", "stats": {"overall": {"starts": 8, "wins": 1, "places": 3}}
                },
                {
                    "number": 4, "name": "Ocean King", "jockey": "C. Williams", "trainer": "P. Moody",
                    "weight": 54.0, "barrier": 3, "form": "6235", "last20Starts": "36235", "stats": {"overall": {"starts": 15, "wins": 2, "places": 5}}
                }
            ],
            "is_demo_mode": True
        }

    def get_venues(self, race_type: Optional[str] = None, country: Optional[str] = None) -> Dict[str, Any]:
        """List available venues/tracks."""
        cache_key = f"venues:{race_type}:{country}"
        cached = self._get_cached(cache_key, ttl_seconds=3600)
        if cached:
            return cached

        if not self.api_key:
            return {"venues": ["Alice Springs", "Flemington", "Randwick", "Ascot", "Sha Tin"]}

        params = {}
        if race_type:
            params["raceType"] = race_type
        if country:
            params["country"] = country

        url = f"{self.BASE_URL}/form/venues"
        try:
            response = self.session.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                self._set_cache(cache_key, data)
                return data
        except Exception as e:
            logger.warning(f"FormFav API get_venues error: {e}, falling back to demo venues")

        return {"venues": ["Alice Springs", "Flemington", "Randwick", "Ascot", "Sha Tin"]}

    def get_meetings(self, date: str, race_code: str = "gallops", timezone: Optional[str] = None) -> Dict[str, Any]:
        """List all racing meetings and their scheduled races for a date."""
        cache_key = f"meetings:{date}:{race_code}:{timezone or 'all'}"
        cached = self._get_cached(cache_key, ttl_seconds=300)
        if cached:
            return cached

        if not self.api_key:
            demo_data = self._get_demo_meetings(date)
            self._set_cache(cache_key, demo_data)
            return demo_data

        params = {
            "date": date,
            "race_code": race_code
        }
        if timezone:
            params["timezone"] = timezone

        url = f"{self.BASE_URL}/form/meetings"
        try:
            response = self.session.get(url, params=params, timeout=12)
            if response.status_code == 200:
                data = response.json()
                self._set_cache(cache_key, data)
                return data
            elif response.status_code == 401:
                logger.warning("FormFav API returned 401 Unauthorized. Using Demo mode fallback.")
                demo_data = self._get_demo_meetings(date)
                self._set_cache(cache_key, demo_data)
                return demo_data
            else:
                response.raise_for_status()
        except requests.exceptions.RequestException as e:
            if "401" in str(e) or not self.api_key:
                logger.warning(f"FormFav API auth issue ({e}). Returning demo meetings.")
                demo_data = self._get_demo_meetings(date)
                self._set_cache(cache_key, demo_data)
                return demo_data
            raise e

    def get_race_form(
        self,
        date: str,
        track: str,
        race: int,
        race_code: str = "gallops",
        country: Optional[str] = None,
        timezone: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get full race form and runner statistics for a specific race.
        Includes multi-strategy parameter fallback and automatic demo race fallback.
        """
        clean_track = track.strip()
        cache_key = f"race:{date}:{clean_track.lower()}:{race}:{race_code}:{country or 'all'}:{timezone or 'default'}"
        cached = self._get_cached(cache_key, ttl_seconds=600)
        if cached:
            return cached

        if not self.api_key:
            demo_race = self._get_demo_race_form(date, clean_track, race)
            self._set_cache(cache_key, demo_race)
            return demo_race

        slug_track = clean_track.lower().replace(" ", "-")
        raw_track = clean_track
        
        strategies = []
        if country and timezone:
            strategies.append({"date": date, "track": slug_track, "race": race, "race_code": race_code, "country": country.lower(), "timezone": timezone})
            if raw_track != slug_track:
                strategies.append({"date": date, "track": raw_track, "race": race, "race_code": race_code, "country": country.lower(), "timezone": timezone})
        if country:
            strategies.append({"date": date, "track": slug_track, "race": race, "race_code": race_code, "country": country.lower()})
            if raw_track != slug_track:
                strategies.append({"date": date, "track": raw_track, "race": race, "race_code": race_code, "country": country.lower()})
        strategies.append({"date": date, "track": slug_track, "race": race, "race_code": race_code})
        if raw_track != slug_track:
            strategies.append({"date": date, "track": raw_track, "race": race, "race_code": race_code})

        last_err = None
        for strat in strategies:
            try:
                url = f"{self.BASE_URL}/form"
                response = self.session.get(url, params=strat, timeout=12)
                if response.status_code == 200:
                    data = response.json()
                    if data and ("runners" in data or "raceName" in data or "track" in data):
                        self._set_cache(cache_key, data)
                        return data
                elif response.status_code == 401:
                    logger.warning("FormFav API 401 Unauthorized. Using demo race form fallback.")
                    demo_race = self._get_demo_race_form(date, clean_track, race)
                    self._set_cache(cache_key, demo_race)
                    return demo_race
            except requests.exceptions.RequestException as e:
                last_err = e
                continue

        # If live API fails, fallback to demo race seamlessly
        logger.warning(f"Could not load live race from FormFav ({last_err}). Providing fallback demo form.")
        demo_race = self._get_demo_race_form(date, clean_track, race)
        self._set_cache(cache_key, demo_race)
        return demo_race


formfav_client = FormFavClient()
