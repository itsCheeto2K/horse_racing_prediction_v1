import os
import json
import math
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

DEFAULT_WEIGHTS = {
    "monteCarlo": 0.30,
    "recentForm": 0.20,
    "trackDistance": 0.15,
    "class": 0.15,
    "connections": 0.10,
    "consistency": 0.10,
    "softmaxTemperature": 15.0
}

WEIGHT_KEYS = ["monteCarlo", "recentForm", "trackDistance", "class", "connections", "consistency"]


def load_default_weights() -> Dict[str, float]:
    """Loads weights from weights.json if present, otherwise returns DEFAULT_WEIGHTS."""
    weights_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "weights.json")
    if os.path.exists(weights_path):
        try:
            with open(weights_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {**DEFAULT_WEIGHTS, **data}
        except Exception as e:
            logger.warning(f"Failed to load weights.json: {e}. Using defaults.")
    return dict(DEFAULT_WEIGHTS)


def validate_composite_weights(weights: Dict[str, float]) -> Tuple[bool, Optional[str]]:
    """
    Validates that the 6 core weights sum to 1.0 (within ±0.001 tolerance).
    """
    missing = [k for k in WEIGHT_KEYS if k not in weights]
    if missing:
        return False, f"Missing weight keys: {', '.join(missing)}"

    total_weight = sum(weights[k] for k in WEIGHT_KEYS)
    if abs(total_weight - 1.0) > 0.001:
        return False, f"Sum of weights must equal 1.0 (current sum: {total_weight:.4f})"

    for k in WEIGHT_KEYS:
        if weights[k] < 0:
            return False, f"Weight '{k}' cannot be negative (got {weights[k]})"

    return True, None


def parse_positions(form_str: str) -> List[int]:
    """
    Extracts numerical finishing positions from form or last20Starts string.
    '1'-'9' -> 1..9, '0' -> 10.
    """
    if not form_str:
        return []
    positions = []
    for c in form_str:
        if '1' <= c <= '9':
            positions.append(int(c))
        elif c == '0':
            positions.append(10)
    return positions


def parse_prize_money(prize_str: Any) -> float:
    """Parses prize money string (e.g. '$126,065.00') to float."""
    if not prize_str:
        return 0.0
    if isinstance(prize_str, (int, float)):
        return float(prize_str)
    cleaned = ''.join(c for c in str(prize_str) if c.isdigit() or c == '.')
    try:
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


def shrink_rate(starts: int, wins: int, prior_rate: float, k: float = 5.0) -> float:
    """
    Bayesian shrinkage calculation: (wins + k * prior_rate) / (starts + k)
    Prevents 1/1 starts from being treated as 100% true skill.
    """
    return (wins + k * prior_rate) / (starts + k)


def calculate_recent_form_score(runner: Dict[str, Any], race_info: Dict[str, Any]) -> float:
    """
    Recent Form Score (0-100) using exponential recency decay w_i = 0.85^i.
    Considers up to the 8 most recent starts.
    """
    form_source = runner.get("last20Starts") or runner.get("form") or ""
    positions = parse_positions(form_source)

    if not positions:
        return 50.0  # Neutral fallback

    # Take up to last 8 starts (most recent at index 0)
    recent = positions[-8:][::-1]

    total_weight = 0.0
    weighted_points = 0.0

    for i, pos in enumerate(recent):
        w_i = math.pow(0.85, i)

        if pos == 1:
            points = 100.0
        elif pos == 2:
            points = 80.0
        elif pos == 3:
            points = 65.0
        elif 4 <= pos <= 6:
            points = 40.0 - 5.0 * (pos - 4)
        else:
            points = 5.0

        weighted_points += w_i * points
        total_weight += w_i

    form_score = weighted_points / total_weight if total_weight > 0 else 50.0

    # Layoff / Spell adjustment (First-Up / Second-Up)
    stats = runner.get("stats", {})
    first_up = stats.get("firstUp", {})
    second_up = stats.get("secondUp", {})

    # Check if form indicates a spell 'X' immediately prior to current campaign
    if "X" in form_source:
        last_x_idx = form_source.rfind("X")
        starts_since_x = len(parse_positions(form_source[last_x_idx:]))
        if starts_since_x == 0 and first_up.get("starts", 0) >= 2:
            fu_win_pct = first_up.get("winPercent", 0.0) * 100.0
            form_score = form_score * 0.6 + fu_win_pct * 0.4
        elif starts_since_x == 1 and second_up.get("starts", 0) >= 2:
            su_win_pct = second_up.get("winPercent", 0.0) * 100.0
            form_score = form_score * 0.6 + su_win_pct * 0.4

    return max(0.0, min(100.0, form_score))


def calculate_track_distance_condition_score(runner: Dict[str, Any], race_info: Dict[str, Any]) -> Tuple[float, float, float]:
    """
    Computes Bayesian-shrunk Track/Distance and Condition score.
    Returns: (combined_score, track_distance_subscore, condition_subscore)
    """
    stats = runner.get("stats", {})
    overall = stats.get("overall", {})
    overall_starts = overall.get("starts", 0)
    overall_wins = overall.get("wins", 0)
    overall_win_rate = (overall_wins / overall_starts) if overall_starts > 0 else 0.10

    # Track / Distance / TrackDistance shrinkage
    track_stats = stats.get("track", {})
    track_rate = shrink_rate(track_stats.get("starts", 0), track_stats.get("wins", 0), overall_win_rate, k=5.0)

    dist_stats = stats.get("distance", {})
    dist_rate = shrink_rate(dist_stats.get("starts", 0), dist_stats.get("wins", 0), overall_win_rate, k=5.0)

    td_stats = stats.get("trackDistance", {})
    td_rate = shrink_rate(td_stats.get("starts", 0), td_stats.get("wins", 0), overall_win_rate, k=8.0)

    track_distance_score = 100.0 * (0.30 * track_rate + 0.30 * dist_rate + 0.40 * td_rate)

    # Condition shrinkage
    current_condition = str(race_info.get("condition", "good")).lower()
    conditions_dict = stats.get("conditions", {})

    cond_key = "good"
    for k in conditions_dict.keys():
        if k.lower() in current_condition or current_condition in k.lower():
            cond_key = k
            break

    cond_stats = conditions_dict.get(cond_key, {})
    cond_rate = shrink_rate(cond_stats.get("starts", 0), cond_stats.get("wins", 0), overall_win_rate, k=5.0)
    condition_score = 100.0 * cond_rate

    # Combined Track/Distance/Condition score
    combined = 0.60 * track_distance_score + 0.40 * condition_score
    return max(0.0, min(100.0, combined)), max(0.0, min(100.0, track_distance_score)), max(0.0, min(100.0, condition_score))


def calculate_class_score(runner: Dict[str, Any], all_active_runners: List[Dict[str, Any]]) -> float:
    """
    Class Score (0-100): Percentile rank of average career earnings per start
    compared to all active runners in the race.
    """
    def get_avg_earnings(r: Dict[str, Any]) -> float:
        prize = parse_prize_money(r.get("careerPrizeMoney", 0))
        starts = r.get("stats", {}).get("overall", {}).get("starts", 0)
        return prize / max(starts, 1)

    runner_earnings = get_avg_earnings(runner)
    all_earnings = [get_avg_earnings(r) for r in all_active_runners]

    if len(all_earnings) <= 1:
        return 50.0

    # Percentile ranking
    count_lower = sum(1 for e in all_earnings if e < runner_earnings)
    count_equal = sum(1 for e in all_earnings if e == runner_earnings)
    percentile = (count_lower + 0.5 * count_equal) / len(all_earnings) * 100.0

    return max(0.0, min(100.0, percentile))


def calculate_consistency_score(runner: Dict[str, Any]) -> float:
    """
    Consistency Score (0-100): High place % rewarded, high finish position variance penalised.
    """
    form_source = runner.get("last20Starts") or runner.get("form") or ""
    positions = parse_positions(form_source)

    if not positions:
        return 50.0

    recent = positions[-8:]
    mean_pos = sum(recent) / len(recent)
    variance = sum((p - mean_pos) ** 2 for p in recent) / len(recent)
    stdev = math.sqrt(variance)

    stats = runner.get("stats", {})
    overall = stats.get("overall", {})
    place_percent = overall.get("placePercent", 0.0)

    # If placePercent is 0 but places exist
    if place_percent == 0.0 and overall.get("starts", 0) > 0:
        place_percent = overall.get("places", 0) / overall.get("starts", 1)

    # Base place score minus standard deviation penalty
    penalty_factor = 4.0
    consistency = (place_percent * 100.0) - (stdev * penalty_factor)

    return max(0.0, min(100.0, consistency))


def calculate_connections_score(runner: Dict[str, Any]) -> Tuple[float, bool]:
    """
    Connections Score (0-100): Jockey & Trainer strike rate.
    Returns (score, low_confidence_flag).
    """
    jockey_sr = runner.get("jockeyStrikeRate")
    trainer_sr = runner.get("trainerStrikeRate")

    if jockey_sr is not None and trainer_sr is not None:
        score = 100.0 * (float(jockey_sr) * 0.5 + float(trainer_sr) * 0.5)
        return max(0.0, min(100.0, score)), False

    # Fallback when detailed 12m strike rate is unavailable
    return 50.0, True


def log_prediction_for_backtest(form_data: Dict[str, Any], enriched_prediction: Dict[str, Any]):
    """
    Logs prediction input/output for backtesting and model calibration.
    """
    try:
        log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, "composite_predictions.jsonl")

        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "date": form_data.get("date"),
            "track": form_data.get("track"),
            "raceNumber": form_data.get("raceNumber"),
            "raceName": form_data.get("raceName"),
            "distance": form_data.get("distance"),
            "condition": form_data.get("condition"),
            "appliedWeights": enriched_prediction.get("compositeWeights"),
            "topPick": enriched_prediction.get("compositeTopPickName"),
            "valuePick": enriched_prediction.get("compositeValuePickName"),
            "predictions": [
                {
                    "number": p.get("runnerNumber"),
                    "name": p.get("runnerName"),
                    "compositeRank": p.get("compositeRank"),
                    "compositeWinProbability": p.get("compositeWinProbability"),
                    "compositePlaceProbability": p.get("compositePlaceProbability"),
                    "compositeFairOdds": p.get("compositeFairOdds"),
                    "subScores": p.get("subScores")
                }
                for p in enriched_prediction.get("predictions", [])
            ]
        }

        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
    except Exception as e:
        logger.warning(f"Failed to log prediction record: {e}")


def enrich_predictions_with_composite_score(
    form_data: Dict[str, Any],
    mc_prediction: Dict[str, Any],
    custom_composite_weights: Optional[Dict[str, float]] = None,
    market_odds_map: Optional[Dict[int, float]] = None
) -> Dict[str, Any]:
    """
    Combines C++ Monte Carlo 4-Tier pipeline with independent statistical sub-scores
    and normalized Market Probability / Value Edge analysis.
    Maintains 100% backward compatibility with all original fields while adding new 4-tier pipeline metrics.
    """
    weights = load_default_weights()
    if custom_composite_weights:
        weights.update(custom_composite_weights)

    is_valid, err_msg = validate_composite_weights(weights)
    if not is_valid:
        raise ValueError(err_msg)

    temperature = float(weights.get("softmaxTemperature", 15.0))
    if temperature <= 0:
        temperature = 15.0

    runners = form_data.get("runners", [])
    mc_preds = mc_prediction.get("predictions", [])
    mc_pred_lookup = {p["runnerNumber"]: p for p in mc_preds}

    # Filter active runners for class percentile ranking & softmax
    active_runners = [r for r in runners if not r.get("scratched", False)]

    # Normalized Market Odds Probability calculation (Section 17, 18 in new_feat.txt)
    # P_market = 1 / Odds, P_normal = P_market / sum(P_market)
    effective_odds_map: Dict[int, float] = {}
    for r in active_runners:
        r_num = r.get("number", 0)
        if market_odds_map and r_num in market_odds_map and market_odds_map[r_num] > 1.0:
            effective_odds_map[r_num] = market_odds_map[r_num]
        elif r_num in mc_pred_lookup and mc_pred_lookup[r_num].get("fairOdds", 0) > 1.0:
            # Fallback to model fair odds with simulated bookmaker 15% overround
            effective_odds_map[r_num] = round(mc_pred_lookup[r_num]["fairOdds"] * 0.88, 2)

    sum_market_p = sum(1.0 / o for o in effective_odds_map.values() if o > 0)
    normalized_market_p: Dict[int, float] = {}
    implied_top3_p: Dict[int, float] = {}

    if sum_market_p > 0:
        for r_num, o in effective_odds_map.items():
            raw_p = 1.0 / o
            norm_p = raw_p / sum_market_p
            normalized_market_p[r_num] = norm_p
            # Harville approximation for Top 3 place probability: ~ min(0.95, norm_p * 2.6)
            implied_top3_p[r_num] = min(0.95, norm_p * 2.6)

    runner_results = []
    active_raw_scores = []
    active_indices = []

    for idx, r in enumerate(runners):
        r_num = r.get("number", idx + 1)
        r_name = r.get("name", f"Runner {r_num}")
        is_scratched = r.get("scratched", False)
        mc_item = mc_pred_lookup.get(r_num, {})

        if is_scratched or mc_item.get("isScratched", False):
            runner_results.append({
                "runnerNumber": r_num,
                "isScratched": True,
                "compositeScore": None,
                "compositeWinProbability": 0.0,
                "compositePlaceProbability": 0.0,
                "compositeTop3Probability": 0.0,
                "compositeFairOdds": None,
                "subScores": None,
                "valueEdge": None,
                "kellyFraction": None,
                "valueGrade": "Scratched",
                "mc_item": mc_item
            })
            continue

        # 1. Monte Carlo Score (0-100)
        mc_win_prob = float(mc_item.get("winProbability", 0.0))
        mc_score = mc_win_prob * 100.0

        # 2. Recent Form Score
        form_score = calculate_recent_form_score(r, form_data)

        # 3. Track/Distance/Condition Score
        track_dist_cond_score, td_subscore, cond_subscore = calculate_track_distance_condition_score(r, form_data)

        # 4. Class Score
        class_score = calculate_class_score(r, active_runners)

        # 5. Connections Score
        conn_score, low_conf_conn = calculate_connections_score(r)

        # 6. Consistency Score
        cons_score = calculate_consistency_score(r)

        # Composite Raw Score
        raw_composite = (
            weights["monteCarlo"] * mc_score +
            weights["recentForm"] * form_score +
            weights["trackDistance"] * track_dist_cond_score +
            weights["class"] * class_score +
            weights["connections"] * conn_score +
            weights["consistency"] * cons_score
        )

        sub_scores = {
            "monteCarloScore": round(mc_score, 2),
            "recentFormScore": round(form_score, 2),
            "trackDistanceScore": round(td_subscore, 2),
            "conditionScore": round(cond_subscore, 2),
            "combinedTrackDistCondScore": round(track_dist_cond_score, 2),
            "classScore": round(class_score, 2),
            "connectionsScore": round(conn_score, 2),
            "consistencyScore": round(cons_score, 2),
            "abilityScore": mc_item.get("abilityScore", round(form_score * 0.65 + class_score * 0.35, 1)),
            "raceFitScore": mc_item.get("raceFitScore", round(track_dist_cond_score * 0.6 + form_score * 0.4, 1)),
            "raceMapScore": mc_item.get("raceMapScore", 60.0),
            "lowConfidenceConnections": low_conf_conn
        }

        active_indices.append(len(runner_results))
        active_raw_scores.append(raw_composite)

        runner_results.append({
            "runnerNumber": r_num,
            "isScratched": False,
            "compositeScore": round(raw_composite, 2),
            "subScores": sub_scores,
            "mc_item": mc_item
        })

    # Softmax probabilities for active runners: P_win_i = exp(score_i / T) / sum(exp(score_j / T))
    if active_raw_scores:
        max_score = max(active_raw_scores)  # Numerical stability
        exp_scores = [math.exp((s - max_score) / temperature) for s in active_raw_scores]
        sum_exp = sum(exp_scores)
        win_probs = [e / sum_exp for e in exp_scores]

        # Normalized rank scores for place probability calculation
        sorted_active_scores = sorted(active_raw_scores, reverse=True)
        num_active = len(active_raw_scores)

        for i, res_idx in enumerate(active_indices):
            win_p = win_probs[i]
            r_num = runner_results[res_idx]["runnerNumber"]
            
            runner_results[res_idx]["compositeWinProbability"] = round(win_p, 4)
            runner_results[res_idx]["compositeFairOdds"] = round(1.0 / win_p, 2) if win_p > 0 else 999.0

            # Rank Score in [0, 1]
            raw_s = active_raw_scores[i]
            rank_in_active = sorted_active_scores.index(raw_s) + 1
            norm_rank_score = max(0.0, 1.0 - (rank_in_active - 1) / max(num_active - 1, 1))

            # Composite Place Prob & Top 3 Prob
            mc_place_p = float(runner_results[res_idx]["mc_item"].get("top3Probability") or runner_results[res_idx]["mc_item"].get("placeProbability", 0.0))
            place_p = max(0.0, min(1.0, 0.6 * mc_place_p + 0.4 * norm_rank_score))
            runner_results[res_idx]["compositePlaceProbability"] = round(place_p, 4)
            runner_results[res_idx]["compositeTop3Probability"] = round(place_p, 4)

            # Value Edge calculation: Top 3 Model Prob vs Market Implied Top 3 Prob
            impl_top3 = implied_top3_p.get(r_num)
            if impl_top3 is not None and impl_top3 > 0:
                edge = place_p - impl_top3
                runner_results[res_idx]["valueEdge"] = round(edge, 4)
                
                # Value Grade
                if edge >= 0.10:
                    runner_results[res_idx]["valueGrade"] = "HIGH VALUE"
                elif edge >= 0.03:
                    runner_results[res_idx]["valueGrade"] = "POSITIVE VALUE"
                elif edge >= -0.03:
                    runner_results[res_idx]["valueGrade"] = "FAIR VALUE"
                else:
                    runner_results[res_idx]["valueGrade"] = "UNDERPRICED"

                m_odds = effective_odds_map.get(r_num, 0.0)
                if edge > 0.03 and m_odds > 1.0:
                    kelly = max(0.0, min(0.05, edge / (m_odds - 1.0)))
                    runner_results[res_idx]["kellyFraction"] = round(kelly, 4)
                else:
                    runner_results[res_idx]["kellyFraction"] = 0.0
            else:
                runner_results[res_idx]["valueEdge"] = None
                runner_results[res_idx]["kellyFraction"] = None
                runner_results[res_idx]["valueGrade"] = "Fair"

    # Rank active runners by compositeWinProbability
    active_runner_res = [r for r in runner_results if not r["isScratched"]]
    active_runner_res.sort(key=lambda x: x["compositeWinProbability"], reverse=True)

    for rank, item in enumerate(active_runner_res, start=1):
        item["compositeRank"] = rank

    # Top Pick & Value selections
    top_pick_name = active_runner_res[0]["mc_item"].get("runnerName", "") if active_runner_res else ""
    value_pick_name = mc_prediction.get("valuePickName", "")
    dark_horse_name = mc_prediction.get("darkHorseName", "")
    best_underdog_name = mc_prediction.get("bestUnderdogName", value_pick_name)
    best_longshot_name = mc_prediction.get("bestLongshotName", dark_horse_name)

    # Check for highest value edge pick if available
    for r in active_runner_res:
        if r.get("valueEdge") is not None and r["valueEdge"] > 0.05:
            best_underdog_name = r["mc_item"].get("runnerName", best_underdog_name)
            value_pick_name = best_underdog_name
            break

    # Build backward-compatible predictions array
    enriched_predictions_list = []
    res_map_by_num = {r["runnerNumber"]: r for r in runner_results}

    for mc_item in mc_preds:
        num = mc_item.get("runnerNumber")
        extra = res_map_by_num.get(num, {})

        merged_item = dict(mc_item)
        merged_item["compositeScore"] = extra.get("compositeScore")
        merged_item["compositeWinProbability"] = extra.get("compositeWinProbability", 0.0)
        merged_item["compositePlaceProbability"] = extra.get("compositePlaceProbability", 0.0)
        merged_item["compositeTop3Probability"] = extra.get("compositeTop3Probability", merged_item.get("top3Probability", 0.0))
        merged_item["compositeFairOdds"] = extra.get("compositeFairOdds")
        merged_item["compositeRank"] = extra.get("compositeRank")
        merged_item["subScores"] = extra.get("subScores")
        merged_item["valueEdge"] = extra.get("valueEdge") if extra.get("valueEdge") is not None else merged_item.get("valueEdge")
        merged_item["valueGrade"] = extra.get("valueGrade", merged_item.get("valueGrade", "Fair"))
        merged_item["kellyFraction"] = extra.get("kellyFraction")

        # Update horse card with enriched probabilities and verdicts
        if "horseCard" in merged_item and isinstance(merged_item["horseCard"], dict):
            if merged_item.get("compositeFairOdds"):
                merged_item["horseCard"]["marketOdds"] = merged_item["compositeFairOdds"]
            if merged_item.get("verdict"):
                merged_item["horseCard"]["verdict"] = merged_item["verdict"]

        enriched_predictions_list.append(merged_item)

    # Sort predictions array by composite rank for active runners, then scratched
    enriched_predictions_list.sort(
        key=lambda x: (
            1 if x.get("isScratched", False) else 0,
            x.get("compositeRank") or 999
        )
    )

    enriched_prediction_output = dict(mc_prediction)
    enriched_prediction_output["predictions"] = enriched_predictions_list
    enriched_prediction_output["compositeWeights"] = weights
    enriched_prediction_output["compositeTopPickName"] = top_pick_name
    enriched_prediction_output["compositeValuePickName"] = value_pick_name
    enriched_prediction_output["compositeDarkHorseName"] = dark_horse_name
    enriched_prediction_output["bestUnderdogName"] = best_underdog_name
    enriched_prediction_output["bestLongshotName"] = best_longshot_name
    enriched_prediction_output["top3Candidates"] = [p["runnerName"] for p in enriched_predictions_list if not p.get("isScratched")][:3]

    # Log prediction for future backtesting
    log_prediction_for_backtest(form_data, enriched_prediction_output)

    return enriched_prediction_output
