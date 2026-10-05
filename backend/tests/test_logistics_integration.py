"""
Unit Tests for Logistics Integration & Route Persistence (Phase 4C)
====================================================================
Tests route persistence endpoint (POST /api/routing/routes) and
order state transitions (POST /api/orders/{id}/transition).
"""

import unittest
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from fastapi.testclient import TestClient
    from app.main import app
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False
    app = None


@unittest.skipUnless(HAS_FASTAPI, "fastapi not installed in test runner")
class TestLogisticsIntegrationEndpoints(unittest.TestCase):

    def setUp(self):
        if not HAS_FASTAPI:
            self.skipTest("fastapi not installed")
        self.client = TestClient(app)
        self.valid_geometry = {
            "type": "LineString",
            "coordinates": [
                [73.83, 20.08],
                [73.98, 20.17],
                [73.06, 19.29]
            ]
        }
        self.valid_waypoints = [
            {"type": "hub", "index": 0, "lat": 20.08, "lng": 73.83, "load_after_stop_kg": 0.0},
            {"type": "farmer", "index": 1, "listing_id": "LIST-01", "quantity_kg": 650.0, "lat": 20.17, "lng": 73.98, "load_after_pickup_kg": 650.0},
            {"type": "buyer", "index": 2, "lat": 19.29, "lng": 73.06, "load_after_stop_kg": 650.0}
        ]

    # Test A, B: Successful route creation & payload validation
    @patch("app.main.supabase_available", return_value=True)
    @patch("app.main.get_supabase")
    def test_create_confirmed_route_success(self, mock_get_sb, mock_sb_avail):
        mock_table = MagicMock()
        mock_sb = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_table.insert.return_value.execute.return_value = MagicMock(data=[{"id": "test-route-id"}])
        mock_get_sb.return_value = mock_sb

        payload = {
            "aggregated_order_id": "ORD-MH-TM-01",
            "transporter_id": "usr-transporter-01",
            "vehicle_number": "MH-15-EG-4829",
            "vehicle_type": "Eicher Pro 2049 (2.5T)",
            "vehicle_capacity_kg": 2500.0,
            "current_load_kg": 650.0,
            "route_waypoints": self.valid_waypoints,
            "road_distance_km": 94.2,
            "road_duration_minutes": 115.0,
            "baseline_distance_km": 118.5,
            "distance_savings_km": 24.3,
            "geometry": self.valid_geometry
        }
        res = self.client.post("/api/routing/routes", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["is_persisted"])
        self.assertEqual(data["status"], "SCHEDULED")
        self.assertEqual(data["total_distance_km"], 94.2)
        self.assertEqual(data["estimated_time_minutes"], 115)
        self.assertTrue(data["route_code"].startswith("MH-MILKRUN-"))

    # Test C: Missing / invalid OSRM geometry rejection
    def test_create_route_invalid_geometry_rejected(self):
        payload = {
            "aggregated_order_id": "ORD-MH-TM-01",
            "vehicle_capacity_kg": 2500.0,
            "current_load_kg": 650.0,
            "route_waypoints": self.valid_waypoints,
            "road_distance_km": 94.2,
            "road_duration_minutes": 115.0,
            "geometry": {"type": "Point", "coordinates": [73.83, 20.08]}  # Invalid type
        }
        res = self.client.post("/api/routing/routes", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["detail"]["error"], "INVALID_GEOMETRY")

    # Test D: Capacity exceeded rejection
    def test_create_route_capacity_exceeded_rejected(self):
        payload = {
            "aggregated_order_id": "ORD-MH-TM-01",
            "vehicle_capacity_kg": 2000.0,
            "current_load_kg": 2500.0,  # 2500 > 2000
            "route_waypoints": self.valid_waypoints,
            "road_distance_km": 94.2,
            "road_duration_minutes": 115.0,
            "geometry": self.valid_geometry
        }
        res = self.client.post("/api/routing/routes", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["detail"]["error"], "CAPACITY_EXCEEDED")

    # Test E: Invalid order transition rejection (skipping states)
    def test_invalid_order_transition_skipping_states(self):
        # Cannot jump from PICKUP_SCHEDULED directly to DELIVERED
        payload = {
            "current_state": "PICKUP_SCHEDULED",
            "to_state": "DELIVERED"
        }
        res = self.client.post("/api/orders/ORD-01/transition", json=payload)
        self.assertEqual(res.status_code, 409)
        data = res.json()["detail"]
        self.assertEqual(data["error"], "INVALID_STATE_TRANSITION")
        self.assertEqual(data["allowed_next_states"], ["IN_TRANSIT"])

    # Test F: Valid PICKUP_SCHEDULED -> IN_TRANSIT
    def test_valid_pickup_scheduled_to_in_transit(self):
        payload = {
            "current_state": "PICKUP_SCHEDULED",
            "to_state": "IN_TRANSIT"
        }
        res = self.client.post("/api/orders/ORD-01/transition", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["previous_state"], "PICKUP_SCHEDULED")
        self.assertEqual(data["current_state"], "IN_TRANSIT")
        self.assertEqual(data["allowed_next_states"], ["DELIVERED"])

    # Test G: Valid IN_TRANSIT -> DELIVERED
    def test_valid_in_transit_to_delivered(self):
        payload = {
            "current_state": "IN_TRANSIT",
            "to_state": "DELIVERED"
        }
        res = self.client.post("/api/orders/ORD-01/transition", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["previous_state"], "IN_TRANSIT")
        self.assertEqual(data["current_state"], "DELIVERED")
    # Test H: Invalid/unknown state string rejection
    def test_unknown_order_state_rejected(self):
        payload = {
            "current_state": "PICKUP_SCHEDULED",
            "to_state": "FLYING_IN_SPACE"
        }
        res = self.client.post("/api/orders/ORD-01/transition", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["detail"]["error"], "INVALID_ORDER_STATE")

    # Test I: Intermediate farmer waypoint validation (missing listing_id)
    def test_farmer_waypoint_missing_listing_id_rejected(self):
        bad_waypoints = [
            {"type": "hub", "index": 0, "lat": 20.08, "lng": 73.83, "load_after_stop_kg": 0.0},
            {"type": "farmer", "index": 1, "quantity_kg": 650.0, "lat": 20.17, "lng": 73.98},  # Missing listing_id
            {"type": "buyer", "index": 2, "lat": 19.29, "lng": 73.06, "load_after_stop_kg": 650.0}
        ]
        payload = {
            "vehicle_capacity_kg": 2500.0,
            "current_load_kg": 650.0,
            "route_waypoints": bad_waypoints,
            "road_distance_km": 94.2,
            "road_duration_minutes": 115.0,
            "geometry": self.valid_geometry
        }
        res = self.client.post("/api/routing/routes", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["detail"]["error"], "INVALID_ROUTE_DATA")

    # Test J: Mocked Supabase route insertion success
    @patch("app.main.supabase_available", return_value=True)
    @patch("app.main.get_supabase")
    def test_create_route_supabase_insert_success(self, mock_get_sb, mock_sb_avail):
        mock_table = MagicMock()
        mock_sb = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_table.insert.return_value.execute.return_value = MagicMock(data=[{"id": "test-route-id"}])
        mock_get_sb.return_value = mock_sb

        payload = {
            "aggregated_order_id": "a0000000-0000-0000-0000-000000000001",
            "transporter_id": "t0000000-0000-0000-0000-000000000002",
            "vehicle_number": "MH-15-EG-4829",
            "vehicle_type": "Eicher Pro 2049 (2.5T)",
            "vehicle_capacity_kg": 2500.0,
            "current_load_kg": 650.0,
            "route_waypoints": self.valid_waypoints,
            "road_distance_km": 94.2,
            "road_duration_minutes": 115.0,
            "baseline_distance_km": 118.5,
            "distance_savings_km": 24.3,
            "geometry": self.valid_geometry
        }
        res = self.client.post("/api/routing/routes", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["is_persisted"])
        self.assertIsNone(data["persistence_error"])
        mock_table.insert.assert_called_once()

    # Test K: Mocked Supabase route insertion failure handling
    @patch("app.main.supabase_available", return_value=True)
    @patch("app.main.get_supabase")
    def test_create_route_supabase_insert_db_error(self, mock_get_sb, mock_sb_avail):
        mock_table = MagicMock()
        mock_sb = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_table.insert.return_value.execute.side_effect = Exception("FK constraint violation: order does not exist")
        mock_get_sb.return_value = mock_sb

        payload = {
            "aggregated_order_id": "invalid-order-uuid",
            "vehicle_capacity_kg": 2500.0,
            "current_load_kg": 650.0,
            "route_waypoints": self.valid_waypoints,
            "road_distance_km": 94.2,
            "road_duration_minutes": 115.0,
            "geometry": self.valid_geometry
        }
        res = self.client.post("/api/routing/routes", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["is_persisted"])
        self.assertIn("FK constraint violation", data["persistence_error"])

    # Test L: Mocked Supabase order state transition read & update
    @patch("app.main.supabase_available", return_value=True)
    @patch("app.main.get_supabase")
    def test_order_transition_db_read_and_update(self, mock_get_sb, mock_sb_avail):
        mock_table = MagicMock()
        mock_sb = MagicMock()
        mock_sb.table.return_value = mock_table
        # SELECT returns order with status 'PICKUP_SCHEDULED'
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "ORD-01", "status": "PICKUP_SCHEDULED"}]
        )
        # UPDATE returns updated row
        mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "ORD-01", "status": "IN_TRANSIT"}]
        )
        mock_get_sb.return_value = mock_sb

        # No current_state supplied in request payload -> reads from DB
        payload = {"to_state": "IN_TRANSIT"}
        res = self.client.post("/api/orders/ORD-01/transition", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["previous_state"], "PICKUP_SCHEDULED")
        self.assertEqual(data["current_state"], "IN_TRANSIT")
        self.assertTrue(data["is_persisted"])
        mock_table.update.assert_called_once()


if __name__ == "__main__":
    unittest.main()

