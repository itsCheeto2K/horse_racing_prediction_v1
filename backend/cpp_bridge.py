import os
import json
import subprocess
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class CppPredictionBridge:
    """
    Bridge communicating with the compiled C++ Object-Oriented Prediction & Monte Carlo Engine.
    """
    def __init__(self, binary_path: Optional[str] = None):
        if binary_path:
            self.binary_path = binary_path
        elif os.environ.get("CPP_BINARY_PATH"):
            self.binary_path = os.environ["CPP_BINARY_PATH"]
        else:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            # Check for Linux binary, Windows exe, or relative fallbacks
            candidates = [
                os.path.join(base_dir, "cpp_engine", "horse_predictor"),
                os.path.join(base_dir, "cpp_engine", "horse_predictor.exe"),
                os.path.abspath("../cpp_engine/horse_predictor"),
                os.path.abspath("../cpp_engine/horse_predictor.exe"),
            ]
            self.binary_path = candidates[0]
            for path in candidates:
                if os.path.exists(path):
                    self.binary_path = path
                    break

    def predict_race(
        self,
        race_form: Dict[str, Any],
        weights: Optional[Dict[str, float]] = None,
        simulations: int = 10000
    ) -> Dict[str, Any]:
        """
        Executes the C++ engine to perform OOP feature scoring and Monte Carlo race simulations.
        """
        if not os.path.exists(self.binary_path):
            raise FileNotFoundError(f"C++ prediction engine binary not found at: {self.binary_path}")

        args = [
            self.binary_path,
            "--stdin",
            "--simulations", str(simulations)
        ]

        if weights:
            args.extend(["--weights-json", json.dumps(weights)])

        payload = json.dumps(race_form)

        try:
            process = subprocess.run(
                args,
                input=payload,
                capture_output=True,
                text=True,
                check=True,
                timeout=15
            )
            prediction_result = json.loads(process.stdout)
            return prediction_result
        except subprocess.CalledProcessError as e:
            logger.error(f"C++ Engine execution failed (code {e.returncode}): {e.stderr}")
            raise RuntimeError(f"C++ Engine Error: {e.stderr}")
        except Exception as e:
            logger.error(f"Error bridging to C++ engine: {e}")
            raise
