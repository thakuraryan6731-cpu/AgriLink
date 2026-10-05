"""
AgriLink AI - Backend Test Suite for Demand Forecasting & Market Intelligence (Phase 3A)
Tests TEST-1 through TEST-10
"""

import unittest
import sys
import os

# Add backend root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.algorithms.demand_forecast import (
    generate_demand_forecast,
    SUPPORTED_CROPS,
    SUPPORTED_LOCATIONS,
    MARKET_BASELINES
)

# Optional FastAPI TestClient import
try:
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    HAS_FASTAPI = True
except Exception:
    client = None
    HAS_FASTAPI = False


class TestDemandForecasting(unittest.TestCase):

    def test_1_tomato_nashik_returns_7_predictions(self):
        """TEST-1: Tomato/Nashik forecast returns 7 predictions."""
        res = generate_demand_forecast(crop="Tomato", location="Nashik", horizon_days=7)
        self.assertIsNotNone(res)
        self.assertEqual(len(res["predictions"]), 7)
        self.assertEqual(len(res["forecastPoints"]), 7)
        self.assertEqual(res["horizon_days"], 7)
        self.assertEqual(res["crop"], "Tomato")
        self.assertEqual(res["location"], "Nashik")

    def test_2_deterministic_predictions(self):
        """TEST-2: Predictions are deterministic for the same input/data."""
        res1 = generate_demand_forecast(crop="Tomato", location="Nashik", horizon_days=7)
        res2 = generate_demand_forecast(crop="Tomato", location="Nashik", horizon_days=7)
        
        self.assertEqual(res1["current_price_per_kg"], res2["current_price_per_kg"])
        self.assertEqual(res1["predicted_7d_demand_kg"], res2["predicted_7d_demand_kg"])
        self.assertEqual(res1["supply_demand_gap_kg"], res2["supply_demand_gap_kg"])
        self.assertEqual(res1["demand_change_percent"], res2["demand_change_percent"])
        
        for p1, p2 in zip(res1["predictions"], res2["predictions"]):
            self.assertEqual(p1["predicted_demand_kg"], p2["predicted_demand_kg"])
            self.assertEqual(p1["predicted_price_per_kg"], p2["predicted_price_per_kg"])

    def test_3_no_negative_demand_predictions(self):
        """TEST-3: No negative demand predictions across all crops and locations."""
        for crop in SUPPORTED_CROPS:
            for loc in SUPPORTED_LOCATIONS:
                res = generate_demand_forecast(crop=crop, location=loc, horizon_days=14)
                for p in res["predictions"]:
                    self.assertGreaterEqual(p["predicted_demand_kg"], 0, f"Negative demand found for {crop}/{loc}")
                    self.assertGreaterEqual(p["predicted_price_per_kg"], 0, f"Negative price found for {crop}/{loc}")
                    self.assertGreaterEqual(p["historical_arrival_kg"], 0, f"Negative supply found for {crop}/{loc}")

    def test_4_demand_change_calculation_correct(self):
        """TEST-4: Demand change calculation is mathematically correct."""
        res = generate_demand_forecast(crop="Tomato", location="Nashik", horizon_days=7)
        first_p = res["predictions"][0]["predicted_demand_kg"]
        last_p = res["predictions"][-1]["predicted_demand_kg"]
        expected_pct = round(((last_p - first_p) / first_p) * 100, 1)
        self.assertEqual(res["demand_change_percent"], expected_pct)

    def test_5_supply_demand_gap_calculation_correct(self):
        """TEST-5: Supply-demand gap calculation is correct (supply - demand)."""
        res = generate_demand_forecast(crop="Onion", location="Nashik", horizon_days=7)
        total_supply = sum(p["historical_arrival_kg"] for p in res["predictions"])
        total_demand = sum(p["predicted_demand_kg"] for p in res["predictions"])
        expected_gap = round(total_supply - total_demand, 1)
        self.assertEqual(res["supply_demand_gap_kg"], expected_gap)

    def test_6_price_change_calculation_correct(self):
        """TEST-6: Price change calculation is correct."""
        res = generate_demand_forecast(crop="Potato", location="Nashik", horizon_days=7)
        curr = res["current_price_per_kg"]
        prev = res["previous_price_per_kg"]
        expected_pct = round(((curr - prev) / prev) * 100, 1)
        self.assertEqual(res["price_change_percent"], expected_pct)

    def test_7_unknown_crop_location_returns_error(self):
        """TEST-7: Unknown crop/location returns a proper error / 404."""
        with self.assertRaises(KeyError):
            generate_demand_forecast(crop="Avocado", location="Nashik")
            
        with self.assertRaises(KeyError):
            generate_demand_forecast(crop="Tomato", location="Tokyo")

        if HAS_FASTAPI:
            resp = client.post("/api/market/forecast", json={"crop": "Avocado", "location": "Nashik", "horizon_days": 7})
            self.assertEqual(resp.status_code, 404)
            self.assertIn("not found", resp.json()["detail"].lower())

    def test_8_confidence_reflects_data_availability(self):
        """TEST-8: Insufficient historical data produces lower confidence rather than fabricated certainty."""
        nashik_tomato = generate_demand_forecast(crop="Tomato", location="Nashik", horizon_days=7)
        guntur_wheat = generate_demand_forecast(crop="Wheat", location="Guntur", horizon_days=7)

        # Tomato/Nashik has 90 observations, Wheat/Guntur has 40 observations
        self.assertGreater(nashik_tomato["confidence"], guntur_wheat["confidence"])
        self.assertTrue(0.0 < guntur_wheat["confidence"] < 1.0)
        self.assertTrue(0.0 < nashik_tomato["confidence"] < 1.0)

    def test_9_simulated_data_flag_and_source_badge(self):
        """TEST-9: Response displays 'AgriLink Demo Dataset' and is_simulated=True."""
        res = generate_demand_forecast(crop="Tomato", location="Nashik", horizon_days=7)
        self.assertTrue(res["is_simulated"])
        self.assertEqual(res["source"], "AgriLink Demo Dataset")

    def test_10_fastapi_endpoint_schema(self):
        """TEST-10: Output dictionary adheres to the required schema."""
        data = generate_demand_forecast(crop="Tomato", location="Nashik", horizon_days=7)
        
        required_keys = [
            "crop", "location", "horizon_days", "forecast_date",
            "current_price_per_kg", "price_change_percent", "predicted_7d_demand_kg",
            "demand_change_percent", "supply_demand_gap_kg", "confidence",
            "threat_level", "recommendation", "suggested_destination",
            "predictions", "source", "is_simulated"
        ]
        for k in required_keys:
            self.assertIn(k, data, f"Missing required key: {k}")

        self.assertEqual(len(data["predictions"]), 7)
        first_pred = data["predictions"][0]
        pred_keys = [
            "date", "dayLabel", "predicted_demand_kg", "historical_arrival_kg",
            "predicted_price_per_kg", "price_upper_band", "price_lower_band", "confidence"
        ]
        for pk in pred_keys:
            self.assertIn(pk, first_pred, f"Missing prediction key: {pk}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
