import os
import json
import time
import uuid
import logging
from typing import Dict, Any, List, Optional
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ai_service")
logging.basicConfig(level=logging.INFO)

MEMORY_FILE_PATH = os.path.join(os.path.dirname(__file__), "ai_memory.json")


class GeminiAIService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
        self._ensure_memory_file()

    def _ensure_memory_file(self):
        """Initializes the persistent memory storage if it doesn't exist."""
        if not os.path.exists(MEMORY_FILE_PATH):
            initial_data = {
                "system_rules": [
                    "Always consider track condition (Good, Soft, Heavy) and weight carried when assessing stamina.",
                    "Horses stepping up in distance with strong closing speed at shorter distances often perform well.",
                    "High early pace often collapses in heavy ground, favoring late closers."
                ],
                "lessons": [],
                "stats": {
                    "total_evaluated": 0,
                    "win_hits": 0,
                    "top3_hits": 0,
                    "accuracy_rate": 0.0
                }
            }
            try:
                with open(MEMORY_FILE_PATH, "w", encoding="utf-8") as f:
                    json.dump(initial_data, f, indent=2, ensure_ascii=False)
            except Exception as e:
                logger.error(f"Failed to initialize memory file: {e}")

    def get_memory(self) -> Dict[str, Any]:
        """Reads stored memory (lessons, rules, stats) from disk."""
        self._ensure_memory_file()
        try:
            with open(MEMORY_FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading memory: {e}")
            return {"system_rules": [], "lessons": [], "stats": {}}

    def save_memory(self, memory_data: Dict[str, Any]):
        """Persists memory data back to disk."""
        try:
            with open(MEMORY_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump(memory_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving memory: {e}")

    def _parse_dist(self, val: Any) -> int:
        """Safely parses distance from string like '1400m', '1400', or int to integer meters."""
        if isinstance(val, (int, float)):
            return int(val)
        if isinstance(val, str):
            digits = "".join([c for c in val if c.isdigit()])
            if digits:
                try:
                    return int(digits)
                except ValueError:
                    pass
        return 0

    def _find_relevant_lessons(self, track_condition: str, distance: Any, track_name: str) -> List[Dict[str, Any]]:
        """Retrieves past lessons that match current race conditions (RAG-like retrieval)."""
        memory = self.get_memory()
        lessons = memory.get("lessons", [])
        if not lessons:
            return []

        relevant = []
        track_cond_lower = (track_condition or "").lower()
        track_name_lower = (track_name or "").lower()
        curr_dist = self._parse_dist(distance)

        for lesson in reversed(lessons):
            score = 0
            l_cond = (lesson.get("condition") or "").lower()
            l_track = (lesson.get("track") or "").lower()
            l_dist = self._parse_dist(lesson.get("distance", 0))

            # Match track condition (e.g. Heavy, Soft, Good)
            if l_cond and (l_cond in track_cond_lower or track_cond_lower in l_cond):
                score += 2
            # Match track venue
            if l_track and (l_track in track_name_lower or track_name_lower in l_track):
                score += 2
            # Match distance range (within 300m)
            if curr_dist > 0 and l_dist > 0 and abs(curr_dist - l_dist) <= 300:
                score += 1

            if score > 0 or len(relevant) < 3:
                relevant.append({
                    "lesson": lesson.get("lesson_learned"),
                    "mistake": lesson.get("mistake_analysis"),
                    "context": f"Race at {lesson.get('track')} ({lesson.get('distance')}m, {lesson.get('condition')})"
                })

            if len(relevant) >= 5:
                break

        return relevant

    def _clean_and_parse_json(self, text: str) -> Dict[str, Any]:
        """Robustly parses JSON text from Gemini responses."""
        import re
        clean_text = text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        clean_text = clean_text.strip()

        try:
            return json.loads(clean_text)
        except json.JSONDecodeError:
            pass

        # Try extracting outer JSON block
        match = re.search(r"(\{.*\})", clean_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # Fix trailing commas
        fixed = re.sub(r",\s*([\]}])", r"\1", clean_text)
        return json.loads(fixed)

    def _call_gemini(self, prompt: str, system_instruction: Optional[str] = None, json_mode: bool = True) -> Dict[str, Any]:
        """Calls Gemini API with failover models."""
        models_to_try = [self.model, "gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"]
        last_err = None

        for m in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={self.api_key}"
            payload: Dict[str, Any] = {
                "contents": [{"parts": [{"text": prompt}]}]
            }
            if system_instruction:
                payload["systemInstruction"] = {
                    "parts": [{"text": system_instruction}]
                }
            if json_mode:
                payload["generationConfig"] = {
                    "responseMimeType": "application/json",
                    "temperature": 0.2
                }
            else:
                payload["generationConfig"] = {
                    "temperature": 0.4
                }

            try:
                response = requests.post(url, json=payload, timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if json_mode:
                            return self._clean_and_parse_json(text)
                        return {"raw_text": text}
                else:
                    logger.warning(f"Model {m} returned {response.status_code}: {response.text[:150]}")
                    last_err = response.text
            except Exception as e:
                logger.warning(f"Failed calling model {m}: {e}")
                last_err = str(e)

        raise Exception(f"Gemini API request failed on all models. Last error: {last_err}")

    def analyze_race(self, form_data: Dict[str, Any], prediction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Performs in-depth tactical analysis of the race, generates personalized runner interpretations,
        and applies past memory lessons.
        """
        track = form_data.get("track", "Unknown Track")
        race_num = form_data.get("raceNumber", 1)
        distance = form_data.get("distance", 1200)
        condition = form_data.get("going", form_data.get("condition", "Good 4"))
        race_title = form_data.get("raceName", f"Race {race_num}")

        # Retrieve relevant past lessons
        relevant_lessons = self._find_relevant_lessons(condition, distance, track)
        memory = self.get_memory()
        system_rules = memory.get("system_rules", [])

        # Prepare runners summary for the prompt
        predictions_list = prediction_data.get("predictions", [])
        runners_summary = []
        for p in predictions_list:
            if p.get("isScratched"):
                continue
            r_name = p.get("runnerName", "")
            r_num = p.get("runnerNumber", 0)
            win_prob = round((p.get("compositeWinProbability") or p.get("winProbability", 0.0)) * 100, 1)
            place_prob = round((p.get("compositePlaceProbability") or p.get("placeProbability", 0.0)) * 100, 1)
            rank = p.get("compositeRank") or p.get("rank", 99)
            odds = p.get("marketOdds") or p.get("compositeFairOdds") or p.get("fairOdds", 0.0)
            verdict = p.get("verdict", "")
            tier = p.get("tier", "")
            card = p.get("horseCard", {})
            form_str = card.get("careerRecord", "")
            recent_pos = card.get("recentRunPosition", "")
            dist_status = card.get("distanceStatus", "")

            runners_summary.append({
                "runnerNumber": r_num,
                "runnerName": r_name,
                "rank": rank,
                "winProb": f"{win_prob}%",
                "placeProb": f"{place_prob}%",
                "marketOdds": odds,
                "verdict": verdict,
                "tier": tier,
                "recentRun": recent_pos,
                "distanceStatus": dist_status,
                "jockey": p.get("jockeyName", card.get("jockey", "")),
                "trainer": p.get("trainerName", card.get("trainer", ""))
            })

        system_instruction = (
            "You are the Master Quantitative Engine & AI Form Expert for Thoroughbred Horse Racing. "
            "You are tasked with executing the mathematical Composite Ensemble Scoring model while dynamically "
            "calibrating subscores, probabilities, and ranks based on accumulated Past Memory Lessons & Track Bias.\n\n"
            "FORMULA SPECIFICATIONS TO APPLY & CALIBRATE:\n"
            "1. Recent Form (20-30% weight): Exponential recency decay (0.85^i) on last finishing positions.\n"
            "2. Track & Distance & Ground Condition (15-30% weight): Bayesian shrinkage adjusted win/place rates on this course/distance/going.\n"
            "3. Class (15-20% weight): Prize money percentile and race grade suitability.\n"
            "4. Consistency (10-15% weight): Overall place % and career starts reliability.\n"
            "5. Connections (10-15% weight): Jockey and Trainer strike rates and synergy.\n\n"
            "CRITICAL: You MUST factor in the Past Lessons from Memory to adjust weights (e.g. wet ground penalties, distance progression, lightweight edges)."
        )

        prompt = f"""
Race Information:
- Track / Venue: {track}
- Race Number: R{race_num} ({race_title})
- Distance: {distance}m
- Track Condition / Going: {condition}

Memory - Learned Rules & Past Mistakes to AVOID:
{json.dumps(system_rules, ensure_ascii=False, indent=1)}

Past Lessons Learned from Similar Races:
{json.dumps(relevant_lessons, ensure_ascii=False, indent=1) if relevant_lessons else "No historical failure records for this exact condition yet."}

Runners Form, Statistics & Baseline Data:
{json.dumps(runners_summary, ensure_ascii=False, indent=1)}

TASK:
1. Apply the 5 Subscore formulas (Recent Form, Track/Dist, Class, Consistency, Connections) to every active runner (0-100 scale).
2. Dynamically calibrate the final Composite Win Probability (must sum to 1.0 across all active runners) and Place Probability based on the formulas and Memory Lessons.
3. Determine accurate Fair Odds (= 1 / WinProb), Composite Rank (1 to N), Tier, and Verdict for each runner.
4. Output the complete JSON matching EXACTLY this structure:
{{
  "raceTacticalSummary": "A concise 2-3 sentence strategic breakdown of pace, track condition suitability, and race shape.",
  "topPicks": [
    {{
      "rank": 1,
      "runnerNumber": 1,
      "runnerName": "Horse Name",
      "reasoning": "Clear justification why this runner has the highest win probability or optimal race setup."
    }},
    {{
      "rank": 2,
      "runnerNumber": 2,
      "runnerName": "Horse Name",
      "reasoning": "Why this runner is prime contender for 2nd/exacta."
    }},
    {{
      "rank": 3,
      "runnerNumber": 3,
      "runnerName": "Horse Name",
      "reasoning": "Key strengths securing top 3 place."
    }}
  ],
  "valueBet": {{
    "runnerNumber": 0,
    "runnerName": "Dark Horse / Value Horse Name",
    "edgeReason": "Why market odds undervalue this horse (e.g., favorable weight, wet track capability, draw)."
  }},
  "appliedMemoryInsights": [
    "Specific explanation of how past memory lessons directly calibrated the formula weights and runner scores for this race."
  ],
  "calibratedRunners": [
    {{
      "runnerNumber": 1,
      "runnerName": "Horse Name",
      "compositeWinProbability": 0.35,
      "compositePlaceProbability": 0.65,
      "compositeFairOdds": 2.85,
      "compositeRank": 1,
      "tier": "Tier A - Main Contender",
      "verdict": "MAIN CONTENDER",
      "subScores": {{
        "recentForm": 85.0,
        "trackDistance": 80.0,
        "class": 75.0,
        "consistency": 70.0,
        "connections": 65.0
      }}
    }}
  ],
  "runnerInterpretations": {{
    "RUNNER_NAME_HERE": {{
      "interpretation": "A rich, specific 1-2 sentence assessment of recent form and suitability for today's {distance}m at {condition}.",
      "keyAdvantage": "Primary competitive edge",
      "keyRisk": "Main vulnerability",
      "tacticalRole": "e.g. Front-runner / Late Closer / Stalker / Midfield"
    }}
  }}
}}

Ensure EVERY active runner is included in BOTH 'calibratedRunners' and 'runnerInterpretations'.
Keep descriptions sharp, professional, realistic, and insightful in English.
"""

        ai_response = self._call_gemini(prompt, system_instruction=system_instruction, json_mode=True)
        return ai_response

    def post_mortem_learning(
        self,
        race_info: Dict[str, Any],
        predicted_top3: List[Dict[str, Any]],
        actual_top3: List[Dict[str, Any]],
        all_predictions: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Compares predictions with actual results, conducts an AI root-cause analysis of mistakes,
        synthesizes concrete lessons, and stores them in persistent memory.
        """
        track = race_info.get("track", "Unknown Track")
        race_num = race_info.get("raceNumber", 1)
        distance = race_info.get("distance", 1200)
        condition = race_info.get("going", race_info.get("condition", "Good 4"))

        pred_p1 = predicted_top3[0]["runnerName"] if len(predicted_top3) > 0 else "N/A"
        pred_p2 = predicted_top3[1]["runnerName"] if len(predicted_top3) > 1 else "N/A"
        pred_p3 = predicted_top3[2]["runnerName"] if len(predicted_top3) > 2 else "N/A"

        act_p1 = actual_top3[0]["runnerName"] if len(actual_top3) > 0 else "N/A"
        act_p2 = actual_top3[1]["runnerName"] if len(actual_top3) > 1 else "N/A"
        act_p3 = actual_top3[2]["runnerName"] if len(actual_top3) > 2 else "N/A"

        act_names = [act_p1.lower(), act_p2.lower(), act_p3.lower()]
        pred_names = [pred_p1.lower(), pred_p2.lower(), pred_p3.lower()]

        # Evaluate performance
        win_hit = (pred_p1.lower() == act_p1.lower())
        top3_hits = len(set(pred_names).intersection(set(act_names)))
        is_exact = (pred_p1.lower() == act_p1.lower() and pred_p2.lower() == act_p2.lower() and pred_p3.lower() == act_p3.lower())

        system_instruction = (
            "You are an Elite Horse Racing Strategy Auditor. "
            "Your objective is to diagnose why a prediction succeeded or failed, identify the decisive race variables "
            "(e.g. pace collapse, track bias, ground condition, weight advantage, barrier draw), "
            "and extract permanent strategic rules to make future AI predictions more accurate."
        )

        prompt = f"""
Post-Race Outcome Audit:
- Race: {track} R{race_num} ({distance}m, Condition: {condition})
- Pre-Race Predicted Top 3:
  1st: {pred_p1}
  2nd: {pred_p2}
  3rd: {pred_p3}
- Actual Top 3 Finishers:
  1st (WINNER): {act_p1}
  2nd: {act_p2}
  3rd: {act_p3}

Evaluation Summary:
- Winner Predicted Correctly: {"YES" if win_hit else "NO"}
- Top 3 Finishers in Selection: {top3_hits}/3
- Perfect Trifecta: {"YES" if is_exact else "NO"}

Full Field Predictions & Context:
{json.dumps(all_predictions[:6] if all_predictions else [], ensure_ascii=False, indent=1)}

TASK:
Perform a deep post-mortem analysis. Return a JSON object matching this structure:
{{
  "outcomeVerdict": "e.g. WIN_ACCURATE | UPSET_MISSED | PLACED_PARTIAL | MINOR_DRIFT",
  "rootCauseAnalysis": "Detailed analysis of why the winner won and why the top predicted pick(s) underperformed or missed (analyze track condition, pace, weight, distance fit, or form trap).",
  "keyMissedFactors": [
    "Factor 1 (e.g. Underestimated wet track proficiency of runner #3)",
    "Factor 2 (e.g. Excessive weight penalty for top favorite over 1600m)"
  ],
  "lessonLearned": "A clear, actionable, permanent strategic heuristic/rule for future races under similar conditions.",
  "recommendedWeightAdjustment": "e.g. Increase Track/Condition Weight by +0.05 on Soft/Heavy tracks, reduce recent form recency bias."
}}
"""

        audit_result = self._call_gemini(prompt, system_instruction=system_instruction, json_mode=True)

        # Store lesson into memory
        new_lesson = {
            "id": str(uuid.uuid4())[:8],
            "date": race_info.get("date", time.strftime("%Y-%m-%d")),
            "track": track,
            "raceNumber": race_num,
            "distance": distance,
            "condition": condition,
            "predicted_top3": [pred_p1, pred_p2, pred_p3],
            "actual_top3": [act_p1, act_p2, act_p3],
            "win_hit": win_hit,
            "top3_hits": top3_hits,
            "outcomeVerdict": audit_result.get("outcomeVerdict", "EVALUATED"),
            "rootCauseAnalysis": audit_result.get("rootCauseAnalysis", ""),
            "keyMissedFactors": audit_result.get("keyMissedFactors", []),
            "lesson_learned": audit_result.get("lessonLearned", ""),
            "recommendedWeightAdjustment": audit_result.get("recommendedWeightAdjustment", ""),
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        memory = self.get_memory()
        lessons = memory.get("lessons", [])
        lessons.append(new_lesson)
        memory["lessons"] = lessons

        # Update stats
        stats = memory.get("stats", {})
        total = stats.get("total_evaluated", 0) + 1
        win_hits = stats.get("win_hits", 0) + (1 if win_hit else 0)
        top3_sum = stats.get("top3_hits", 0) + (1 if top3_hits >= 2 else 0)

        stats["total_evaluated"] = total
        stats["win_hits"] = win_hits
        stats["top3_hits"] = top3_sum
        stats["win_accuracy_rate"] = round((win_hits / total) * 100, 1) if total > 0 else 0.0
        stats["place_accuracy_rate"] = round((top3_sum / total) * 100, 1) if total > 0 else 0.0
        memory["stats"] = stats

        self.save_memory(memory)

        return {
            "evaluation": {
                "win_hit": win_hit,
                "top3_hits": top3_hits,
                "is_exact": is_exact
            },
            "post_mortem": audit_result,
            "saved_lesson": new_lesson,
            "updated_stats": stats
        }

    def delete_lesson(self, lesson_id: str) -> bool:
        """Deletes a lesson from memory by ID."""
        memory = self.get_memory()
        lessons = memory.get("lessons", [])
        new_lessons = [l for l in lessons if l.get("id") != lesson_id]
        if len(new_lessons) != len(lessons):
            memory["lessons"] = new_lessons
            self.save_memory(memory)
            return True
        return False

    def reset_memory(self):
        """Clears all stored lessons and resets stats."""
        self._ensure_memory_file()
        initial_data = {
            "system_rules": [
                "Always consider track condition (Good, Soft, Heavy) and weight carried when assessing stamina.",
                "Horses stepping up in distance with strong closing speed at shorter distances often perform well.",
                "High early pace often collapses in heavy ground, favoring late closers."
            ],
            "lessons": [],
            "stats": {
                "total_evaluated": 0,
                "win_hits": 0,
                "top3_hits": 0,
                "win_accuracy_rate": 0.0,
                "place_accuracy_rate": 0.0
            }
        }
        self.save_memory(initial_data)


ai_service = GeminiAIService()
