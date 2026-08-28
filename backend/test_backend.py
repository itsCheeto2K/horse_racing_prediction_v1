import unittest
import os
import json
from formfav_client import FormFavClient
from cpp_bridge import CppPredictionBridge
from composite_scorer import (
    calculate_recent_form_score,
    calculate_track_distance_condition_score,
    calculate_class_score,
    calculate_consistency_score,
    calculate_connections_score,
    validate_composite_weights,
    enrich_predictions_with_composite_score,
    shrink_rate
)


class TestHorseRacingBackend(unittest.TestCase):
    def setUp(self):
        self.client = FormFavClient()
        self.engine = CppPredictionBridge()
        json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cpp_engine", "test_race.json")
        with open(json_path, "r", encoding="utf-8") as f:
            self.test_race_form = json.load(f)

    def test_bayesian_shrink_rate(self):
        # 1 start 1 win should not be 100% when prior is 10%
        rate_1_of_1 = shrink_rate(starts=1, wins=1, prior_rate=0.10, k=5.0)
        self.assertAlmostEqual(rate_1_of_1, (1 + 5.0 * 0.10) / (1 + 5.0), places=3)
        self.assertLess(rate_1_of_1, 0.30)  # Shrunk from 1.0 down to 0.25

        # 20 starts 10 wins should stay close to 50%
        rate_10_of_20 = shrink_rate(starts=20, wins=10, prior_rate=0.10, k=5.0)
        self.assertAlmostEqual(rate_10_of_20, (10 + 0.5) / 25, places=3)
        self.assertGreater(rate_10_of_20, 0.40)
        print("[TEST PASS] Bayesian Shrinkage calculations verified.")

    def test_subscore_recent_form(self):
        runner_winning = {"form": "1111", "last20Starts": "1111", "stats": {}}
        score_win = calculate_recent_form_score(runner_winning, {})
        self.assertEqual(score_win, 100.0)

        runner_poor = {"form": "8908", "last20Starts": "8908", "stats": {}}
        score_poor = calculate_recent_form_score(runner_poor, {})
        self.assertEqual(score_poor, 5.0)

        # Recency decay test: 128 is better than 821 when reading right-to-left
        runner_improving = {"last20Starts": "8521", "stats": {}}  # 1 is most recent
        score_imp = calculate_recent_form_score(runner_improving, {})
        self.assertGreater(score_imp, 50.0)
        print(f"[TEST PASS] Recent Form subscore verified (Win: {score_win}, Poor: {score_poor}, Improving: {score_imp:.1f}).")

    def test_subscore_track_distance_condition(self):
        runner = self.test_race_form["runners"][1]  # Valley Prince (active runner)
        combined, td_score, cond_score = calculate_track_distance_condition_score(runner, self.test_race_form)
        self.assertGreaterEqual(combined, 0.0)
        self.assertLessEqual(combined, 100.0)
        self.assertGreater(td_score, 0.0)
        self.assertGreater(cond_score, 0.0)
        print(f"[TEST PASS] Track/Distance/Condition subscore verified: {combined:.2f} (TD: {td_score:.2f}, Cond: {cond_score:.2f})")

    def test_subscore_class(self):
        active_runners = [r for r in self.test_race_form["runners"] if not r.get("scratched")]
        # Valley Prince has highest prize money in test data
        vp = next(r for r in active_runners if r["name"] == "Valley Prince")
        class_score = calculate_class_score(vp, active_runners)
        self.assertGreaterEqual(class_score, 75.0)
        print(f"[TEST PASS] Class percentile rank subscore verified: {class_score:.1f}%")

    def test_subscore_consistency(self):
        runner = self.test_race_form["runners"][1]
        cons_score = calculate_consistency_score(runner)
        self.assertGreaterEqual(cons_score, 0.0)
        self.assertLessEqual(cons_score, 100.0)
        print(f"[TEST PASS] Consistency subscore verified: {cons_score:.2f}")

    def test_subscore_connections(self):
        runner = self.test_race_form["runners"][1]
        conn_score, low_conf = calculate_connections_score(runner)
        self.assertEqual(conn_score, 50.0)
        self.assertTrue(low_conf)
        print("[TEST PASS] Connections fallback and confidence flag verified.")

    def test_weight_validation(self):
        valid_weights = {
            "monteCarlo": 0.30,
            "recentForm": 0.20,
            "trackDistance": 0.15,
            "class": 0.15,
            "connections": 0.10,
            "consistency": 0.10,
            "softmaxTemperature": 15.0
        }
        ok, msg = validate_composite_weights(valid_weights)
        self.assertTrue(ok)

        invalid_weights = dict(valid_weights)
        invalid_weights["recentForm"] = 0.50  # Sum becomes 1.30
        ok, msg = validate_composite_weights(invalid_weights)
        self.assertFalse(ok)
        self.assertIn("Sum of weights must equal 1.0", msg)
        print("[TEST PASS] Weight sum validation verified.")

    def test_composite_ensemble_enrichment_and_scratched_exclusion(self):
        mc_res = self.engine.predict_race(self.test_race_form, simulations=2000)
        enriched = enrich_predictions_with_composite_score(self.test_race_form, mc_res)

        self.assertIn("predictions", enriched)
        self.assertIn("compositeWeights", enriched)
        self.assertIn("compositeTopPickName", enriched)

        preds = enriched["predictions"]
        self.assertEqual(len(preds), len(self.test_race_form["runners"]))

        active_preds = [p for p in preds if not p.get("isScratched")]
        scratched_preds = [p for p in preds if p.get("isScratched")]

        # Check that scratched runners have compositeScore = None
        for sp in scratched_preds:
            self.assertIsNone(sp["compositeScore"])
            self.assertEqual(sp["compositeWinProbability"], 0.0)

        # Check that sum of compositeWinProbability for active runners equals 1.0 (±0.01)
        total_active_prob = sum(p["compositeWinProbability"] for p in active_preds)
        self.assertAlmostEqual(total_active_prob, 1.0, places=2)

        # Check subScores breakdown is present
        for ap in active_preds:
            self.assertIsNotNone(ap["subScores"])
            self.assertIn("monteCarloScore", ap["subScores"])
            self.assertIn("recentFormScore", ap["subScores"])
            self.assertIn("classScore", ap["subScores"])
            self.assertIn("consistencyScore", ap["subScores"])
            self.assertGreater(ap["compositeFairOdds"], 1.0)

        print(f"[TEST PASS] Composite ensemble probabilities sum = {total_active_prob:.4f}. Top Pick: {enriched['compositeTopPickName']}")


if __name__ == "__main__":
    unittest.main()
