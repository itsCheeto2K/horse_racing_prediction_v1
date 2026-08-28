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

if __name__ == "__main__":
    unittest.main()
