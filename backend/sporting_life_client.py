import time
import re
import logging
import requests
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


def clean_name(name: str) -> str:
    """Normalizes horse or track names by removing punctuation and extra spaces."""
    if not name:
        return ""
    s = re.sub(r"[^\w\s]", "", name.lower())
    return re.sub(r"\s+", " ", s).strip()


class SportingLifeClient:
    """
    Client for querying the free, open Sporting Life Horse Racing JSON API.
    Provides real historical past performances (real previous distance, going, course, position, and commentary).
    Includes in-memory TTL caching to avoid unnecessary network traffic.
    """
    BASE_URL = "https://www.sportinglife.com/api/horse-racing"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json"
        })
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _get_cached(self, key: str, ttl_seconds: int = 600) -> Optional[Any]:
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

    def get_racecards(self, date_str: str) -> List[Dict[str, Any]]:
        """Fetches all meetings and races for a specific date (e.g. '2026-09-02')."""
        cache_key = f"sl:racecards:{date_str}"
        cached = self._get_cached(cache_key, ttl_seconds=600)
        if cached is not None:
            return cached

        url = f"{self.BASE_URL}/racing/racecards/{date_str}"
        try:
            resp = self.session.get(url, timeout=4)
            if resp.status_code == 200:
                data = resp.json()
                meetings = data if isinstance(data, list) else []
                self._set_cache(cache_key, meetings)
                return meetings
        except Exception as e:
            logger.debug(f"Sporting Life racecards error for {date_str}: {e}")

        return []

    def get_race_detail(self, race_id: int) -> Optional[Dict[str, Any]]:
        """Fetches full race detail with rides and previous results."""
        cache_key = f"sl:race:{race_id}"
        cached = self._get_cached(cache_key, ttl_seconds=900)
        if cached is not None:
            return cached

        url = f"{self.BASE_URL}/race/{race_id}"
        try:
            resp = self.session.get(url, timeout=4)
            if resp.status_code == 200:
                data = resp.json()
                self._set_cache(cache_key, data)
                return data
        except Exception as e:
            logger.debug(f"Sporting Life race detail error for {race_id}: {e}")

        return None

    def enrich_race_runners(
        self,
        date_str: str,
        track_name: str,
        race_number: int,
        runners: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Looks up the meeting in Sporting Life and extracts real past performance
        for each runner (keyed by normalized runner name).
        """
        enriched_map: Dict[str, Dict[str, Any]] = {}
        if not date_str or not track_name:
            return enriched_map

        clean_track = clean_name(track_name)
        meetings = self.get_racecards(date_str)
        if not meetings:
            return enriched_map

        target_meeting = None
        for m in meetings:
            m_course = m.get("meeting_summary", {}).get("course", {}).get("name", "")
            if clean_name(m_course) in clean_track or clean_track in clean_name(m_course):
                target_meeting = m
                break

        if not target_meeting:
            return enriched_map

        races = target_meeting.get("races", [])
        if not races:
            return enriched_map

        target_race_id = None
        if 1 <= race_number <= len(races):
            target_race_id = races[race_number - 1].get("race_summary_reference", {}).get("id")
        if not target_race_id and races:
            target_race_id = races[0].get("race_summary_reference", {}).get("id")

        if not target_race_id:
            return enriched_map

        race_detail = self.get_race_detail(target_race_id)
        if not race_detail:
            return enriched_map

        rides = race_detail.get("rides", [])
        for ride in rides:
            horse = ride.get("horse", {})
            h_name = horse.get("name", "")
            h_clean = clean_name(h_name)
            prev_results = horse.get("previous_results", [])

            if h_clean and prev_results:
                # Find the true LAST START (strictly prior to current race)
                target_p = None
                for p in prev_results:
                    # Skip if it's the current race itself
                    if p.get("race_id") == target_race_id or (p.get("date") == date_str and p.get("course_name") and clean_name(p.get("course_name")) in clean_track):
                        continue
                    target_p = p
                    break

                if target_p:
                    pos_num = target_p.get("position")
                    runner_count = target_p.get("runner_count")

                    pos_str = f"{pos_num}th" if pos_num else "N/A"
                    if pos_num == 1:
                        pos_str = "1st"
                    elif pos_num == 2:
                        pos_str = "2nd"
                    elif pos_num == 3:
                        pos_str = "3rd"
                    if runner_count and pos_num:
                        pos_str += f" of {runner_count}"

                    enriched_map[h_clean] = {
                        "recentRunPosition": pos_str,
                        "recentRunDistance": target_p.get("distance", ""),
                        "recentRunGoing": target_p.get("going", ""),
                        "recentRunCourse": target_p.get("course_name", ""),
                        "recentRunDate": target_p.get("date", ""),
                        "recentRunOdds": target_p.get("odds", ""),
                        "recentRunDescription": target_p.get("ride_description", "")
                    }

        return enriched_map


sporting_life_enricher = SportingLifeClient()
