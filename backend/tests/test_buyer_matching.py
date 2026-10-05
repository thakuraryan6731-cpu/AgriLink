"""
AgriLink AI - Backend Test Suite for Buyer Matching & Net Realization Engine (Phase 3B Hardened)
Tests cases A through O, plus Hardening Tests A through F:
- Case A: Exact crop match
- Case B: Crop mismatch
- Case C: Quantity fit
- Case D: Price fit
- Case E: Distance fit
- Case F: Quality fit
- Case G: Feasibility
- Case H: Weighted final score
- Case I: Net realization calculation
- Case J: Distance decay
- Case K: Zero quantity
- Case L: Negative quantity
- Case M: Invalid price
- Case N: Missing distance
- Case O: Deterministic ranking
- Hardening A: Missing farmer coordinates
- Hardening B: Missing buyer coordinates
- Hardening C: Missing distance does not produce 0.50 distance score (returns None)
- Hardening D: Weight renormalization when distance is unavailable
- Hardening E: Transport cost naming & metadata
"""

import unittest
import sys
import os

# Add backend root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.algorithms.buyer_matching import (
    compute_factor_crop,
    compute_factor_quantity,
    compute_factor_price,
    compute_factor_distance,
    compute_factor_quality,
    compute_factor_feasibility,
    compute_match_score,
    compute_net_realization,
    calculate_haversine_distance,
    match_listing_against_requirements,
    WEIGHT_CROP,
    WEIGHT_QTY,
    WEIGHT_PRICE,
    WEIGHT_DIST,
    WEIGHT_QUAL,
    WEIGHT_FEAS,
    DEFAULT_TRANSPORT_COST_PER_KM
)


class TestBuyerMatchingEngine(unittest.TestCase):

    # -------------------------------------------------------------------------
    # Phase 3B Base Tests (Cases A through O)
    # -------------------------------------------------------------------------

    def test_a_exact_crop_match(self):
        """A. Exact crop match returns 1.0."""
        self.assertEqual(compute_factor_crop("Tomato", "Tomato"), 1.0)
        self.assertEqual(compute_factor_crop(" tomato ", "TOMATO"), 1.0)
        self.assertEqual(compute_factor_crop("Onion", "Onion"), 1.0)

    def test_b_crop_mismatch(self):
        """B. Crop mismatch returns 0.0."""
        self.assertEqual(compute_factor_crop("Tomato", "Potato"), 0.0)
        self.assertEqual(compute_factor_crop("Onion", "Tomato"), 0.0)
        self.assertEqual(compute_factor_crop(None, "Tomato"), 0.0)
        self.assertEqual(compute_factor_crop("", "Tomato"), 0.0)

    def test_c_quantity_fit(self):
        """C. Quantity fit calculates correct proportions and caps at 1.0."""
        # Farmer has 500kg, Buyer wants 1000kg -> 0.50
        self.assertEqual(compute_factor_quantity(500, 1000), 0.5)
        # Farmer has 1500kg, Buyer wants 1000kg -> 1.0 (capped)
        self.assertEqual(compute_factor_quantity(1500, 1000), 1.0)
        # Farmer has 1000kg, Buyer wants 1000kg -> 1.0
        self.assertEqual(compute_factor_quantity(1000, 1000), 1.0)

    def test_d_price_fit(self):
        """D. Price fit gives high score when offer >= asking and degrades when offer < asking."""
        # Buyer offers 30, asking is 25 (surplus) -> >= 0.85
        score_surplus = compute_factor_price(25.0, 30.0)
        self.assertGreaterEqual(score_surplus, 0.85)
        self.assertLessEqual(score_surplus, 1.0)

        # Buyer offers 20, asking is 25 (deficit 20%) -> 0.80
        score_deficit = compute_factor_price(25.0, 20.0)
        self.assertEqual(score_deficit, 0.80)

        # Buyer offers 10, asking is 25 (deficit 60%) -> 0.40
        self.assertEqual(compute_factor_price(25.0, 10.0), 0.40)

    def test_e_distance_fit(self):
        """E. Distance fit scores closer distances higher."""
        # 0 km -> 1.0
        self.assertEqual(compute_factor_distance(0.0), 1.0)
        # 150 km -> 0.50
        self.assertEqual(compute_factor_distance(150.0), 0.50)
        # 300 km -> 0.0
        self.assertEqual(compute_factor_distance(300.0), 0.0)
        # > 300 km -> 0.0
        self.assertEqual(compute_factor_distance(350.0), 0.0)

    def test_f_quality_fit(self):
        """F. Quality fit rewards exact/higher grades and handles missing data safely."""
        self.assertEqual(compute_factor_quality("Grade A", "Grade A"), 1.0)
        self.assertEqual(compute_factor_quality("Grade A", "Grade B"), 1.0)
        self.assertEqual(compute_factor_quality("Grade B", "Grade A"), 0.65)
        self.assertEqual(compute_factor_quality("Grade C", "Grade A"), 0.30)
        self.assertEqual(compute_factor_quality(None, "Grade A"), 0.50)

    def test_g_feasibility(self):
        """G. Feasibility scores minimum lot size and timeline constraint."""
        # 750kg lot, harvest before deadline -> 1.0
        self.assertEqual(compute_factor_feasibility(750, "2026-09-15", "2026-09-18"), 1.0)
        # Harvest after deadline -> penalty
        self.assertEqual(compute_factor_feasibility(750, "2026-09-20", "2026-09-18"), 0.20)
        # Small lot < 50kg -> proportional penalty
        self.assertEqual(compute_factor_feasibility(25, "2026-09-15", "2026-09-18"), 0.50)

    def test_h_weighted_final_score(self):
        """H. Weighted final score matches exact formula with distance."""
        c_crop = 1.0
        s_qty = 0.80
        s_price = 0.90
        s_dist = 0.70
        s_qual = 1.0
        s_feas = 1.0

        expected = (
            0.30 * c_crop +
            0.20 * s_qty +
            0.20 * s_price +
            0.15 * s_dist +
            0.10 * s_qual +
            0.05 * s_feas
        )
        actual = compute_match_score(c_crop, s_qty, s_price, s_dist, s_qual, s_feas)
        self.assertEqual(actual, round(expected, 4))
        self.assertEqual(actual, 0.895)

    def test_i_net_realization_calculation(self):
        """I. Net realization calculates transport, handling, decay, and returns positive net."""
        res = compute_net_realization(
            buyer_offer_price=29.50,
            distance_km=40.0,
            farmer_qty_kg=750.0,
            mandi_benchmark_price=19.0
        )
        self.assertGreater(res["net_realization_per_kg"], 0)
        self.assertGreater(res["total_net_realization_inr"], 0)
        self.assertGreater(res["profit_gain_percentage"], 0)
        self.assertTrue(res["is_distance_available"])

    def test_j_distance_decay(self):
        """J. Distance decay matches formula S(D) = 0.05 * (D / 50)."""
        # 50 km -> 0.05/kg
        res50 = compute_net_realization(buyer_offer_price=30.0, distance_km=50.0, farmer_qty_kg=1000.0)
        self.assertEqual(res50["perishability_decay_per_kg"], 0.05)

        # 100 km -> 0.10/kg
        res100 = compute_net_realization(buyer_offer_price=30.0, distance_km=100.0, farmer_qty_kg=1000.0)
        self.assertEqual(res100["perishability_decay_per_kg"], 0.10)

    def test_k_zero_quantity(self):
        """K. Zero quantity is handled safely without division by zero."""
        res = compute_net_realization(buyer_offer_price=30.0, distance_km=50.0, farmer_qty_kg=0.0)
        self.assertEqual(res["net_realization_per_kg"], 0.0)
        self.assertEqual(res["total_net_realization_inr"], 0.0)

    def test_l_negative_quantity(self):
        """L. Negative quantity is handled safely."""
        res = compute_net_realization(buyer_offer_price=30.0, distance_km=50.0, farmer_qty_kg=-100.0)
        self.assertEqual(res["net_realization_per_kg"], 0.0)

    def test_m_invalid_price(self):
        """M. Invalid / zero price handling."""
        self.assertEqual(compute_factor_price(0.0, 30.0), 0.0)
        self.assertEqual(compute_factor_price(25.0, -10.0), 0.0)

    def test_n_missing_distance(self):
        """N. Missing distance returns is_distance_available=False and safe fallback net realization."""
        res = compute_net_realization(buyer_offer_price=30.0, distance_km=None, farmer_qty_kg=500.0)
        self.assertFalse(res["is_distance_available"])
        self.assertEqual(res["transport_cost_per_kg"], 0.0)
        self.assertEqual(res["perishability_decay_per_kg"], 0.0)
        self.assertGreater(res["net_realization_per_kg"], 0.0)

    def test_o_deterministic_ranking(self):
        """O. Deterministic ranking sorts higher match score and net realization first."""
        listing = {
            "crop_name": "Tomato",
            "quantity_kg": 750,
            "asking_price_per_kg": 24.5,
            "mandi_benchmark_price": 19.0,
            "quality_grade": "Grade A",
            "latitude": 20.0059,
            "longitude": 73.7898
        }
        requirements = [
            {
                "id": "REQ-01",
                "buyer_name": "Potato Processor",
                "crop_name": "Potato",
                "required_quantity_kg": 2000,
                "max_price_per_kg": 18.0,
                "preferred_quality_grade": "Grade A",
                "destination_lat": 19.2968,
                "destination_lng": 73.0631
            },
            {
                "id": "REQ-02",
                "buyer_name": "Reliance Fresh DC",
                "crop_name": "Tomato",
                "required_quantity_kg": 1500,
                "max_price_per_kg": 29.5,
                "preferred_quality_grade": "Grade A",
                "destination_lat": 19.2968,
                "destination_lng": 73.0631
            }
        ]
        results = match_listing_against_requirements(listing, requirements)
        self.assertEqual(len(results), 2)
        # Tomato buyer should be ranked first ahead of Potato buyer
        self.assertEqual(results[0]["buyer_requirement_id"], "REQ-02")
        self.assertGreater(results[0]["match_score"], results[1]["match_score"])

    # -------------------------------------------------------------------------
    # Hardening Tests (A through F)
    # -------------------------------------------------------------------------

    def test_hardening_a_missing_farmer_coordinates(self):
        """Hardening A: Missing farmer coordinates returns None distance."""
        dist = calculate_haversine_distance(None, None, 19.2968, 73.0631)
        self.assertIsNone(dist)
        s_dist = compute_factor_distance(dist)
        self.assertIsNone(s_dist)

    def test_hardening_b_missing_buyer_coordinates(self):
        """Hardening B: Missing buyer coordinates returns None distance."""
        dist = calculate_haversine_distance(20.0059, 73.7898, None, None)
        self.assertIsNone(dist)
        s_dist = compute_factor_distance(dist)
        self.assertIsNone(s_dist)

    def test_hardening_c_missing_distance_does_not_produce_0_50(self):
        """Hardening C: Missing distance produces None, NOT 0.50."""
        s_dist = compute_factor_distance(None)
        self.assertIsNone(s_dist)
        self.assertNotEqual(s_dist, 0.50)

    def test_hardening_d_weight_renormalization_when_distance_unavailable(self):
        """
        Hardening D: Weight renormalization when distance is unavailable.
        effective_weight_sum = 0.30 + 0.20 + 0.20 + 0.10 + 0.05 = 0.85
        score = (0.30*crop + 0.20*quantity + 0.20*price + 0.10*quality + 0.05*feasibility) / 0.85
        """
        c_crop = 1.0
        s_qty = 0.80
        s_price = 0.90
        s_dist = None  # Missing distance
        s_qual = 1.0
        s_feas = 1.0

        effective_weights = WEIGHT_CROP + WEIGHT_QTY + WEIGHT_PRICE + WEIGHT_QUAL + WEIGHT_FEAS
        self.assertEqual(round(effective_weights, 2), 0.85)

        expected = (
            WEIGHT_CROP * c_crop +
            WEIGHT_QTY * s_qty +
            WEIGHT_PRICE * s_price +
            WEIGHT_QUAL * s_qual +
            WEIGHT_FEAS * s_feas
        ) / effective_weights

        actual = compute_match_score(c_crop, s_qty, s_price, s_dist, s_qual, s_feas)
        self.assertEqual(actual, round(expected, 4))
        # 1.0 when all 5 available factors are 1.0:
        perfect_actual = compute_match_score(1.0, 1.0, 1.0, None, 1.0, 1.0)
        self.assertEqual(perfect_actual, 1.0)

    def test_hardening_e_transport_cost_naming_metadata(self):
        """Hardening E: Transport operating cost constant C_transport = 15.0/km (not live fuel price)."""
        self.assertEqual(DEFAULT_TRANSPORT_COST_PER_KM, 15.0)
        res = compute_net_realization(buyer_offer_price=30.0, distance_km=50.0, farmer_qty_kg=1000.0)
        self.assertIn("transport_cost_per_kg", res)
        self.assertIn("is_distance_available", res)


if __name__ == "__main__":
    unittest.main(verbosity=2)
