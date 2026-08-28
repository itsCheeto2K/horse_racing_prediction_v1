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
        """
        Get full race form and runner statistics for a specific race across any country/timezone.
        Uses multi-strategy parameter fallback to resolve international tracks (e.g. Goodwood GB, Sha Tin HK)
        where FormFav API might 404 on strict timezone or country parameter combinations.
        """
        clean_track = track.strip()
        cache_key = f"race:{date}:{clean_track.lower()}:{race}:{race_code}:{country or 'all'}:{timezone or 'default'}"
        cached = self._get_cached(cache_key, ttl_seconds=600)
        if cached:
            return cached

        # Prepare list of query parameter strategies to try in order
        slug_track = clean_track.lower().replace(" ", "-")
        raw_track = clean_track
        
        strategies = []
        
        # Strategy 1: Slug track + country + timezone
        if country and timezone:
            strategies.append({
                "date": date, "track": slug_track, "race": race, "race_code": race_code,
                "country": country.lower(), "timezone": timezone
            })
            if raw_track != slug_track:
                strategies.append({
                    "date": date, "track": raw_track, "race": race, "race_code": race_code,
                    "country": country.lower(), "timezone": timezone
                })

        # Strategy 2: Without timezone (timezone formatting differences often cause 404)
        if country:
            strategies.append({
                "date": date, "track": slug_track, "race": race, "race_code": race_code,
                "country": country.lower()
            })
            if raw_track != slug_track:
                strategies.append({
                    "date": date, "track": raw_track, "race": race, "race_code": race_code,
                    "country": country.lower()
                })

        # Strategy 3: Without country (some venue names are unique globally)
        strategies.append({
            "date": date, "track": slug_track, "race": race, "race_code": race_code
        })
        if raw_track != slug_track:
            strategies.append({
                "date": date, "track": raw_track, "race": race, "race_code": race_code
            })

        # Deduplicate strategies while maintaining order
        seen_strategies = []
        unique_strategies = []
        for s in strategies:
            strat_tuple = tuple(sorted(s.items()))
            if strat_tuple not in seen_strategies:
                seen_strategies.append(strat_tuple)
                unique_strategies.append(s)

        last_err = None
        for strat in unique_strategies:
            try:
                url = f"{self.BASE_URL}/form"
                response = self.session.get(url, params=strat, timeout=12)
                if response.status_code == 200:
                    data = response.json()
                    if data and ("runners" in data or "raceName" in data or "track" in data):
                        self._set_cache(cache_key, data)
                        return data
                elif response.status_code != 404:
                    response.raise_for_status()
            except requests.exceptions.RequestException as e:
                last_err = e
                continue

        # If all strategies fail, raise the last exception or a clear 404
        if last_err:
            raise last_err
        raise requests.exceptions.HTTPError(
            f"404 Client Error: Not Found for race form at track '{track}' (Race {race}) on {date}"
        )

