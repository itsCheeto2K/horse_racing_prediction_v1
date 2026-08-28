import unittest
from formfav_client import FormFavClient
from cpp_bridge import CppPredictionBridge

class TestHorseRacingBackend(unittest.TestCase):
    def setUp(self):
        self.client = FormFavClient()
        self.engine = CppPredictionBridge()

    def test_formfav_meetings(self):
        data = self.client.get_meetings(date="2026-08-28", race_code="gallops")
        self.assertIn("meetings", data)
        self.assertGreater(len(data["meetings"]), 0)
        first_meeting = data["meetings"][0]
        self.assertIn("track", first_meeting)
        self.assertIn("races", first_meeting)
        print(f"[TEST PASS] Retrieved {len(data['meetings'])} meetings. First: {first_meeting['track']}")

    def test_formfav_race_form_and_cpp_engine(self):
        # Fetch race form
        form_data = self.client.get_race_form(date="2026-08-28", track="alice-springs", race=1)
        self.assertIn("runners", form_data)
        self.assertGreater(len(form_data["runners"]), 0)

        # Run C++ Engine
        res = self.engine.predict_race(form_data, simulations=5000)
        self.assertIn("predictions", res)
        self.assertIn("topPickName", res)
        self.assertEqual(len(res["predictions"]), len(form_data["runners"]))
        
        top_pick = res["predictions"][0]
        self.assertEqual(top_pick["rank"], 1)
        self.assertGreater(top_pick["winProbability"], 0.0)
        self.assertGreater(top_pick["fairOdds"], 1.0)
        print(f"[TEST PASS] C++ OOP Engine predicted top pick: {res['topPickName']} with Win% = {top_pick['winProbability']*100:.1f}% and Fair Odds = ${top_pick['fairOdds']:.2f}")

    def test_custom_weight_simulation(self):
        form_data = self.client.get_race_form(date="2026-08-28", track="alice-springs", race=1)
        custom_weights = {
            "formWeight": 0.60,
            "conditionWeight": 0.10,
            "distanceWeight": 0.10,
            "jockeyTrainerWeight": 0.10,
            "barrierWeight": 0.10
        }
        res = self.engine.predict_race(form_data, weights=custom_weights, simulations=5000)
        self.assertIn("predictions", res)
        self.assertAlmostEqual(res["appliedWeights"]["formWeight"], 0.60, places=2)
        print(f"[TEST PASS] Custom weight re-simulation executed successfully.")

    def test_dynamic_weights_by_distance(self):
        import os
        import json
        json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cpp_engine", "test_race.json")
        with open(json_path, "r", encoding="utf-8") as f:
            form_data = json.load(f)

        # 1600m test (Mile)
        form_data["distance"] = "1600m"
        res_1600 = self.engine.predict_race(form_data, simulations=1000)
        self.assertEqual(res_1600["distanceCategory"], "Mile (1500-1600m)")
        self.assertAlmostEqual(res_1600["appliedWeights"]["formWeight"], 0.22, places=2)
        self.assertAlmostEqual(res_1600["appliedWeights"]["barrierWeight"], 0.12, places=2)
        self.assertTrue(res_1600["isDynamicWeights"])
        print("[TEST PASS] 1600m Mile dynamic weights verified.")

        # 1000m test (Short Sprint)
        form_data["distance"] = "1000m"
        res_1000 = self.engine.predict_race(form_data, simulations=1000)
        self.assertEqual(res_1000["distanceCategory"], "Short Sprint (<=1100m)")
        self.assertAlmostEqual(res_1000["appliedWeights"]["formWeight"], 0.28, places=2)
        self.assertAlmostEqual(res_1000["appliedWeights"]["barrierWeight"], 0.22, places=2)
        print("[TEST PASS] 1000m Sprint dynamic weights verified.")

        # 2400m test (Staying)
        form_data["distance"] = "2400m"
        res_2400 = self.engine.predict_race(form_data, simulations=1000)
        self.assertEqual(res_2400["distanceCategory"], "Staying (2100m+)")
        self.assertAlmostEqual(res_2400["appliedWeights"]["distanceWeight"], 0.32, places=2)
        self.assertAlmostEqual(res_2400["appliedWeights"]["barrierWeight"], 0.08, places=2)
        print("[TEST PASS] 2400m Staying dynamic weights verified.")

if __name__ == "__main__":
    unittest.main()
