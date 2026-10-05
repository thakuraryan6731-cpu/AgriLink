"""
AgriLink AI - Backend Test Suite: Supply Aggregation Algorithm (Phase 3C)
Tests cases A through M.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.algorithms.supply_aggregation import (
    aggregate_supply_preview,
    MAX_CLUSTER_RADIUS_KM,
    MAX_HARVEST_WINDOW_HOURS,
)


def _make_req(crop="Tomato", qty=1000.0, req_id="REQ-01"):
    return {
        "id": req_id,
        "crop_name": crop,
        "required_quantity_kg": qty,
        "max_price_per_kg": 35.0,
        "destination_lat": 20.0,
        "destination_lng": 74.0,
        "delivery_deadline": "2026-09-20"
    }


def _make_listing(lid, crop="Tomato", qty=300.0,
                  lat=20.0059, lng=73.7898,
                  harvest_date="2026-09-16", price=28.0):
    return {
        "id": lid,
        "farmer_id": f"farmer-{lid}",
        "farmer_name": f"Farmer {lid}",
        "crop_name": crop,
        "quantity_kg": qty,
        "asking_price_per_kg": price,
        "quality_grade": "Grade A",
        "latitude": lat,
        "longitude": lng,
        "harvest_date": harvest_date,
        "location_name": "Nashik"
    }


class TestSupplyAggregation(unittest.TestCase):

    # ── A: Exact crop match ──────────────────────────────────────────────────

    def test_a_exact_crop_match(self):
        """A. Exact crop match: listings with matching crop are included."""
        req = _make_req(crop="Tomato", qty=500)
        listings = [
            _make_listing("L1", crop="Tomato", qty=300),
            _make_listing("L2", crop="Tomato", qty=300, lat=20.01, lng=73.80),
        ]
        result = aggregate_supply_preview(req, listings)
        self.assertGreater(result["farmer_count"], 0)
        self.assertEqual(result["crop"], "tomato")

    # ── B: Crop mismatch ──────────────────────────────────────────────────────

    def test_b_crop_mismatch(self):
        """B. Listings with wrong crop are excluded."""
        req = _make_req(crop="Tomato", qty=500)
        listings = [
            _make_listing("L1", crop="Potato", qty=400),
            _make_listing("L2", crop="Onion", qty=400),
        ]
        result = aggregate_supply_preview(req, listings)
        self.assertEqual(result["farmer_count"], 0)
        self.assertFalse(result["is_fully_satisfied"])

    # ── C: 15 km boundary ────────────────────────────────────────────────────

    def test_c_15km_boundary_exactly_included(self):
        """C. A listing exactly at 15 km radius should be included."""
        seed_lat, seed_lng = 20.0059, 73.7898
        # Create a listing approximately 15 km away (~0.135 degrees lat)
        far_lat = seed_lat + 0.134  # ~14.9 km
        req = _make_req(crop="Tomato", qty=600)
        listings = [
            _make_listing("L1", crop="Tomato", qty=300, lat=seed_lat, lng=seed_lng),
            _make_listing("L2", crop="Tomato", qty=300, lat=far_lat, lng=seed_lng),
        ]
        result = aggregate_supply_preview(req, listings)
        selected_ids = {f["listing_id"] for f in result["selected_farmers"]}
        self.assertIn("L1", selected_ids)
        # L2 should be included since it's within 15 km
        self.assertIn("L2", selected_ids)

    # ── D: >15 km rejection ───────────────────────────────────────────────────

    def test_d_beyond_15km_rejected(self):
        """D. A listing beyond 15 km radius is excluded from the cluster."""
        seed_lat, seed_lng = 20.0059, 73.7898
        far_lat = seed_lat + 0.5  # ~55 km away
        req = _make_req(crop="Tomato", qty=600)
        listings = [
            _make_listing("L1", crop="Tomato", qty=300, lat=seed_lat, lng=seed_lng),
            _make_listing("L2", crop="Tomato", qty=300, lat=far_lat, lng=seed_lng),
        ]
        result = aggregate_supply_preview(req, listings)
        selected_ids = {f["listing_id"] for f in result["selected_farmers"]}
        self.assertNotIn("L2", selected_ids)
        self.assertGreater(len(result["excluded_too_far"]), 0)

    # ── E: 24-hour harvest boundary ───────────────────────────────────────────

    def test_e_24hour_harvest_boundary_included(self):
        """E. Listings within 24-hour harvest window are all included."""
        req = _make_req(crop="Tomato", qty=600)
        listings = [
            _make_listing("L1", crop="Tomato", qty=300, harvest_date="2026-09-16T00:00:00"),
            _make_listing("L2", crop="Tomato", qty=300, lat=20.01, lng=73.80,
                          harvest_date="2026-09-16T23:59:59"),
        ]
        result = aggregate_supply_preview(req, listings)
        self.assertLessEqual(result["harvest_window_hours"], 24.0)
        self.assertGreater(result["farmer_count"], 1)

    # ── F: >24-hour rejection ─────────────────────────────────────────────────

    def test_f_beyond_24hour_rejected(self):
        """F. Listing that pushes harvest window beyond 24 hours is excluded."""
        req = _make_req(crop="Tomato", qty=900)
        listings = [
            _make_listing("L1", crop="Tomato", qty=300, harvest_date="2026-09-16T00:00:00"),
            _make_listing("L2", crop="Tomato", qty=300, lat=20.01, lng=73.80,
                          harvest_date="2026-09-16T12:00:00"),
            _make_listing("L3", crop="Tomato", qty=300, lat=20.02, lng=73.81,
                          harvest_date="2026-09-17T12:00:01"),  # > 24h from L1
        ]
        result = aggregate_supply_preview(req, listings)
        selected_ids = {f["listing_id"] for f in result["selected_farmers"]}
        # L3 would push window to 36h+ so it should be excluded
        self.assertNotIn("L3", selected_ids)
        self.assertLessEqual(result["harvest_window_hours"], 24.0)

    # ── G: Missing harvest date ────────────────────────────────────────────────

    def test_g_missing_harvest_date_excluded(self):
        """G. Listings with missing harvest_date are excluded from auto-aggregation."""
        req = _make_req(crop="Tomato", qty=500)
        listings = [
            _make_listing("L1", crop="Tomato", qty=300, harvest_date=None),
            _make_listing("L2", crop="Tomato", qty=300, lat=20.01, lng=73.80),
        ]
        # L1 has no harvest date, L2 has one
        result = aggregate_supply_preview(req, listings)
        self.assertIn("L1", result["excluded_no_harvest_date"])
        selected_ids = {f["listing_id"] for f in result["selected_farmers"]}
        self.assertNotIn("L1", selected_ids)

    # ── H: Exact quantity fulfillment ─────────────────────────────────────────

    def test_h_exact_quantity_fulfillment(self):
        """H. Exact fulfillment when combined lots equal required quantity."""
        req = _make_req(crop="Tomato", qty=1000)
        listings = [
            _make_listing("L1", crop="Tomato", qty=350),
            _make_listing("L2", crop="Tomato", qty=280, lat=20.005, lng=73.79),
            _make_listing("L3", crop="Tomato", qty=220, lat=20.006, lng=73.79),
            _make_listing("L4", crop="Tomato", qty=150, lat=20.007, lng=73.79),
        ]
        result = aggregate_supply_preview(req, listings)
        self.assertEqual(result["remaining_kg"], 0.0)
        self.assertTrue(result["is_fully_satisfied"])
        self.assertEqual(result["total_selected_kg"], 1000.0)

    # ── I: Partial fulfillment ────────────────────────────────────────────────

    def test_i_partial_fulfillment(self):
        """I. Partial fulfillment is returned when not enough supply exists."""
        req = _make_req(crop="Tomato", qty=2000)
        listings = [
            _make_listing("L1", crop="Tomato", qty=350),
            _make_listing("L2", crop="Tomato", qty=280, lat=20.005, lng=73.79),
        ]
        result = aggregate_supply_preview(req, listings)
        self.assertFalse(result["is_fully_satisfied"])
        self.assertEqual(result["total_selected_kg"], 630.0)
        self.assertEqual(result["remaining_kg"], 1370.0)

    # ── J: Quantity optimization (no overshoot) ───────────────────────────────

    def test_j_quantity_does_not_exceed_requirement(self):
        """J. Aggregation does not exceed buyer requirement quantity."""
        req = _make_req(crop="Tomato", qty=500)
        listings = [
            _make_listing("L1", crop="Tomato", qty=400),
            _make_listing("L2", crop="Tomato", qty=300, lat=20.005, lng=73.79),
        ]
        result = aggregate_supply_preview(req, listings)
        self.assertLessEqual(result["total_selected_kg"], 500.0)

    # ── K: Deterministic ordering ─────────────────────────────────────────────

    def test_k_deterministic_ordering(self):
        """K. Same input always produces same output order."""
        req = _make_req(crop="Tomato", qty=600)
        listings = [
            _make_listing("L3", crop="Tomato", qty=300, lat=20.008, lng=73.80),
            _make_listing("L1", crop="Tomato", qty=200),
            _make_listing("L2", crop="Tomato", qty=200, lat=20.002, lng=73.79),
        ]
        result1 = aggregate_supply_preview(req, listings)
        result2 = aggregate_supply_preview(req, listings)
        ids1 = [f["listing_id"] for f in result1["selected_farmers"]]
        ids2 = [f["listing_id"] for f in result2["selected_farmers"]]
        self.assertEqual(ids1, ids2)

    # ── L: Missing coordinates ────────────────────────────────────────────────

    def test_l_missing_coordinates_excluded(self):
        """L. Listings with missing lat/lng are excluded."""
        req = _make_req(crop="Tomato", qty=500)
        listings = [
            {
                "id": "L1", "farmer_id": "F1", "crop_name": "Tomato",
                "quantity_kg": 300, "asking_price_per_kg": 28.0,
                "quality_grade": "Grade A", "harvest_date": "2026-09-16",
                "latitude": None, "longitude": None
            },
            _make_listing("L2", crop="Tomato", qty=300, lat=20.01, lng=73.80),
        ]
        result = aggregate_supply_preview(req, listings)
        self.assertIn("L1", result["excluded_no_coords"])
        selected_ids = {f["listing_id"] for f in result["selected_farmers"]}
        self.assertNotIn("L1", selected_ids)

    # ── M: Zero / negative quantities ────────────────────────────────────────

    def test_m_zero_negative_quantities_excluded(self):
        """M. Listings with zero or negative quantities are excluded."""
        req = _make_req(crop="Tomato", qty=500)
        listings = [
            _make_listing("L1", crop="Tomato", qty=0.0),
            _make_listing("L2", crop="Tomato", qty=-100.0),
            _make_listing("L3", crop="Tomato", qty=300, lat=20.01, lng=73.80),
        ]
        result = aggregate_supply_preview(req, listings)
        selected_ids = {f["listing_id"] for f in result["selected_farmers"]}
        self.assertNotIn("L1", selected_ids)
        self.assertNotIn("L2", selected_ids)
        self.assertIn("L3", selected_ids)


if __name__ == "__main__":
    unittest.main(verbosity=2)
