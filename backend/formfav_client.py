import os
import time
import requests
from typing import Dict, Any, Optional

class FormFavClient:
    """
    Client for interacting with the FormFav Horse Racing REST API.
    Includes in-memory TTL caching to optimize performance and prevent rate limit exhaustion.
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

    def get_venues(self, race_type: Optional[str] = None, country: Optional[str] = None) -> Dict[str, Any]:
        """List available venues/tracks."""
        cache_key = f"venues:{race_type}:{country}"
        cached = self._get_cached(cache_key, ttl_seconds=3600)
        if cached:
            return cached

        params = {}
        if race_type:
            params["raceType"] = race_type
        if country:
            params["country"] = country

        url = f"{self.BASE_URL}/form/venues"
        response = self.session.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        self._set_cache(cache_key, data)
        return data

    def get_meetings(self, date: str, race_code: str = "gallops", timezone: Optional[str] = None) -> Dict[str, Any]:
        """List all racing meetings and their scheduled races for a date."""
        cache_key = f"meetings:{date}:{race_code}:{timezone or 'all'}"
        cached = self._get_cached(cache_key, ttl_seconds=300)
        if cached:
            return cached

        params = {
            "date": date,
            "race_code": race_code
        }
        if timezone:
            params["timezone"] = timezone

        url = f"{self.BASE_URL}/form/meetings"
        response = self.session.get(url, params=params, timeout=12)
        response.raise_for_status()
        data = response.json()
        self._set_cache(cache_key, data)
        return data

    def get_race_form(
        self,
        date: str,
        track: str,
        race: int,
        race_code: str = "gallops",
        country: Optional[str] = None,
        timezone: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get full race form and runner statistics for a specific race across any country/timezone."""
        cache_key = f"race:{date}:{track}:{race}:{race_code}:{country or 'all'}:{timezone or 'default'}"
        cached = self._get_cached(cache_key, ttl_seconds=600)
        if cached:
            return cached

        params = {
            "date": date,
            "track": track,
            "race": race,
            "race_code": race_code
        }
        if country:
            params["country"] = country.lower()
        if timezone:
            params["timezone"] = timezone

        url = f"{self.BASE_URL}/form"
        response = self.session.get(url, params=params, timeout=12)
        response.raise_for_status()
        data = response.json()
        self._set_cache(cache_key, data)
        return data

