"""
Unit Tests for OR-Tools CVRP Solver (Phase 4B)
==============================================
Tests CVRP model, load accumulation, capacity constraints, baseline calculations,
and error handling. Uses mocked OSRM matrix and route responses.
"""

import unittest
from unittest.mock import patch, AsyncMock, MagicMock
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.algorithms.cvrp_solver import (
    solve_cvrp_ortools,
    solve_cvrp_pipeline,
    validate_cvrp_inputs,
    CVRPCapacityError,
    CVRPRoutingError,
    CVRPSolverError,
    UNREACHABLE_PENALTY_METERS
)


class TestCVRPSolverUnit(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.hub = {"lat": 20.08, "lng": 73.83}
        self.buyer = {"lat": 19.29, "lng": 73.06}
        self.pickup_stops_3 = [
            {"listing_id": "LIST-01", "lat": 20.1704, "lng": 73.9859, "quantity_kg": 650.0},
            {"listing_id": "LIST-02", "lat": 20.2010, "lng": 73.8340, "quantity_kg": 450.0},
            {"listing_id": "LIST-03", "lat": 19.9820, "lng": 73.6840, "quantity_kg": 400.0}
        ]

    # Test A: Single pickup route
    def test_single_pickup_solver(self):
        # 3 locations: Hub (0), Farmer 1 (1), Buyer (2)
        dist_matrix = [
            [0.0, 10.0, 50.0],
            [10.0, 0.0, 45.0],
            [50.0, 45.0, 0.0]
        ]
        demands = [0.0, 500.0, 0.0]
        res = solve_cvrp_ortools(dist_matrix, demands, vehicle_capacity_kg=2500.0, time_limit_seconds=1)
        self.assertEqual(res["ordered_nodes"], [0, 1, 2])
        self.assertIn(res["solver_status"], ("ROUTING_SUCCESS", "ROUTING_OPTIMAL"))

    # Test B: Multiple pickups route
    def test_multiple_pickups_solver(self):
        # 5 locations: Hub (0), Farmer 1 (1), Farmer 2 (2), Farmer 3 (3), Buyer (4)
        dist_matrix = [
            [0.0, 12.0, 15.0, 18.0, 80.0],
            [12.0, 0.0, 8.0, 20.0, 75.0],
            [15.0, 8.0, 0.0, 14.0, 70.0],
            [18.0, 20.0, 14.0, 0.0, 60.0],
            [80.0, 75.0, 70.0, 60.0, 0.0]
        ]
        demands = [0.0, 650.0, 450.0, 400.0, 0.0]
        res = solve_cvrp_ortools(dist_matrix, demands, vehicle_capacity_kg=2500.0, time_limit_seconds=1)
        self.assertEqual(res["ordered_nodes"][0], 0)  # Starts at Hub
        self.assertEqual(res["ordered_nodes"][-1], 4)  # Ends at Buyer
        self.assertEqual(set(res["ordered_nodes"][1:-1]), {1, 2, 3})  # Visits all 3 farmers

    # Test C: Capacity exactly satisfied
    def test_capacity_exactly_satisfied(self):
        dist_matrix = [
            [0.0, 10.0, 50.0],
            [10.0, 0.0, 45.0],
            [50.0, 45.0, 0.0]
        ]
        demands = [0.0, 2500.0, 0.0]
        res = solve_cvrp_ortools(dist_matrix, demands, vehicle_capacity_kg=2500.0)
        self.assertEqual(res["ordered_nodes"], [0, 1, 2])

    # Test D: Capacity exceeded
    def test_capacity_exceeded_validation(self):
        stops = [
            {"listing_id": "LIST-01", "lat": 20.17, "lng": 73.98, "quantity_kg": 1500.0},
            {"listing_id": "LIST-02", "lat": 20.20, "lng": 73.83, "quantity_kg": 1200.0}
        ]
        # Total = 2700 kg > 2500 kg
        with self.assertRaises(CVRPCapacityError) as ctx:
            validate_cvrp_inputs(self.hub, stops, self.buyer, vehicle_capacity_kg=2500.0)
        self.assertIn("exceeds vehicle capacity", str(ctx.exception))

    # Test E, F: Pickup load accumulation & utilization percentage in pipeline
    @patch("app.algorithms.cvrp_solver.get_road_route")
    @patch("app.algorithms.cvrp_solver.get_distance_matrix")
    async def test_pipeline_load_accumulation_and_utilization(self, mock_matrix, mock_route):
        # 5 locations: Hub, Stop1, Stop2, Stop3, Buyer
        mock_matrix.return_value = {
            "distances_km": [
                [0.0, 12.0, 15.0, 18.0, 80.0],
                [12.0, 0.0, 8.0, 20.0, 75.0],
                [15.0, 8.0, 0.0, 14.0, 70.0],
                [18.0, 20.0, 14.0, 0.0, 60.0],
                [80.0, 75.0, 70.0, 60.0, 0.0]
            ],
            "durations_minutes": [[0.0]*5 for _ in range(5)],
            "source": "OSRM",
            "is_estimated": False
        }

        mock_route.return_value = {
            "distance_km": 94.2,
            "duration_minutes": 115.0,
            "geometry": {
                "type": "LineString",
                "coordinates": [[73.83, 20.08], [73.06, 19.29]]
            },
            "source": "OSRM",
            "is_estimated": False
        }

        res = await solve_cvrp_pipeline(
            hub=self.hub,
            pickup_stops=self.pickup_stops_3,
            buyer=self.buyer,
            vehicle_capacity_kg=2500.0,
            time_limit_seconds=1
        )

        self.assertEqual(res["total_load_kg"], 1500.0)
        self.assertEqual(res["vehicle_capacity_kg"], 2500.0)
        self.assertEqual(res["capacity_utilization_pct"], 60.0)
        self.assertEqual(res["source"], "OSRM + Google OR-Tools")
        self.assertFalse(res["is_estimated"])

        # Check waypoint loads
        route = res["optimized_route"]
        self.assertEqual(route[0]["type"], "hub")
        self.assertEqual(route[0]["load_after_stop_kg"], 0.0)

        # Farmer stops accumulate load
        loads = [stop.get("load_after_pickup_kg") for stop in route if stop["type"] == "farmer"]
        self.assertEqual(len(loads), 3)
        self.assertTrue(loads[0] <= loads[1] <= loads[2])
        self.assertEqual(loads[-1], 1500.0)

        # Buyer has final total load
        self.assertEqual(route[-1]["type"], "buyer")
        self.assertEqual(route[-1]["load_after_stop_kg"], 1500.0)

    # Test G: Deterministic result
    def test_deterministic_solver_result(self):
        dist_matrix = [
            [0.0, 12.0, 15.0, 18.0, 80.0],
            [12.0, 0.0, 8.0, 20.0, 75.0],
            [15.0, 8.0, 0.0, 14.0, 70.0],
            [18.0, 20.0, 14.0, 0.0, 60.0],
            [80.0, 75.0, 70.0, 60.0, 0.0]
        ]
        demands = [0.0, 650.0, 450.0, 400.0, 0.0]
        res1 = solve_cvrp_ortools(dist_matrix, demands, vehicle_capacity_kg=2500.0, time_limit_seconds=1)
        res2 = solve_cvrp_ortools(dist_matrix, demands, vehicle_capacity_kg=2500.0, time_limit_seconds=1)
        self.assertEqual(res1["ordered_nodes"], res2["ordered_nodes"])

    # Test H, I: Baseline calculation & Distance savings
    @patch("app.algorithms.cvrp_solver.get_road_route")
    @patch("app.algorithms.cvrp_solver.get_distance_matrix")
    async def test_baseline_and_distance_savings(self, mock_matrix, mock_route):
        mock_matrix.return_value = {
            "distances_km": [
                [0.0, 12.0, 15.0, 18.0, 80.0],
                [12.0, 0.0, 8.0, 20.0, 75.0],
                [15.0, 8.0, 0.0, 14.0, 70.0],
                [18.0, 20.0, 14.0, 0.0, 60.0],
                [80.0, 75.0, 70.0, 60.0, 0.0]
            ],
            "durations_minutes": [[0.0]*5 for _ in range(5)],
            "source": "OSRM",
            "is_estimated": False
        }

        # First call: optimized route (90 km). Second call: baseline route (120 km)
        mock_route.side_effect = [
            {
                "distance_km": 90.0,
                "duration_minutes": 100.0,
                "geometry": {"type": "LineString", "coordinates": []},
                "source": "OSRM",
                "is_estimated": False
            },
            {
                "distance_km": 120.0,
                "duration_minutes": 140.0,
                "geometry": {"type": "LineString", "coordinates": []},
                "source": "OSRM",
                "is_estimated": False
            }
        ]

        res = await solve_cvrp_pipeline(
            hub=self.hub,
            pickup_stops=self.pickup_stops_3,
            buyer=self.buyer,
            vehicle_capacity_kg=2500.0,
            time_limit_seconds=1
        )

        self.assertEqual(res["road_distance_km"], 90.0)
        self.assertEqual(res["baseline_distance_km"], 120.0)
        self.assertEqual(res["distance_savings_km"], 30.0)
        self.assertEqual(res["distance_savings_pct"], 25.0)

    # Test I2: Exact Phase 4C distance reduction sign (+24.3 km / +20.5%)
    @patch("app.algorithms.cvrp_solver.get_road_route")
    @patch("app.algorithms.cvrp_solver.get_distance_matrix")
    async def test_exact_distance_savings_sign_and_pct(self, mock_matrix, mock_route):
        mock_matrix.return_value = {
            "distances_km": [
                [0.0, 12.0, 15.0, 18.0, 80.0],
                [12.0, 0.0, 8.0, 20.0, 75.0],
                [15.0, 8.0, 0.0, 14.0, 70.0],
                [18.0, 20.0, 14.0, 0.0, 60.0],
                [80.0, 75.0, 70.0, 60.0, 0.0]
            ],
            "durations_minutes": [[0.0]*5 for _ in range(5)],
            "source": "OSRM",
            "is_estimated": False
        }

        # Optimized = 94.2 km, Baseline = 118.5 km
        mock_route.side_effect = [
            {
                "distance_km": 94.2,
                "duration_minutes": 115.0,
                "geometry": {"type": "LineString", "coordinates": []},
                "source": "OSRM",
                "is_estimated": False
            },
            {
                "distance_km": 118.5,
                "duration_minutes": 145.0,
                "geometry": {"type": "LineString", "coordinates": []},
                "source": "OSRM",
                "is_estimated": False
            }
        ]

        res = await solve_cvrp_pipeline(
            hub=self.hub,
            pickup_stops=self.pickup_stops_3,
            buyer=self.buyer,
            vehicle_capacity_kg=2500.0,
            time_limit_seconds=1
        )

        self.assertEqual(res["road_distance_km"], 94.2)
        self.assertEqual(res["baseline_distance_km"], 118.5)
        self.assertEqual(res["distance_savings_km"], 24.3)
        self.assertEqual(res["distance_savings_pct"], 20.5)

    # Test I3: Zero savings (optimized == baseline)
    @patch("app.algorithms.cvrp_solver.get_road_route")
    @patch("app.algorithms.cvrp_solver.get_distance_matrix")
    async def test_zero_savings_case(self, mock_matrix, mock_route):
        mock_matrix.return_value = {
            "distances_km": [
                [0.0, 12.0, 15.0, 18.0, 80.0],
                [12.0, 0.0, 8.0, 20.0, 75.0],
                [15.0, 8.0, 0.0, 14.0, 70.0],
                [18.0, 20.0, 14.0, 0.0, 60.0],
                [80.0, 75.0, 70.0, 60.0, 0.0]
            ],
            "durations_minutes": [[0.0]*5 for _ in range(5)],
            "source": "OSRM",
            "is_estimated": False
        }

        # Optimized = 94.2 km, Baseline = 94.2 km
        mock_route.side_effect = [
            {
                "distance_km": 94.2,
                "duration_minutes": 115.0,
                "geometry": {"type": "LineString", "coordinates": []},
                "source": "OSRM",
                "is_estimated": False
            },
            {
                "distance_km": 94.2,
                "duration_minutes": 115.0,
                "geometry": {"type": "LineString", "coordinates": []},
                "source": "OSRM",
                "is_estimated": False
            }
        ]

        res = await solve_cvrp_pipeline(
            hub=self.hub,
            pickup_stops=self.pickup_stops_3,
            buyer=self.buyer,
            vehicle_capacity_kg=2500.0,
            time_limit_seconds=1
        )

        self.assertEqual(res["distance_savings_km"], 0.0)
        self.assertEqual(res["distance_savings_pct"], 0.0)

    # Test I4: Optimized route longer than baseline (savings clamped to 0.0)
    @patch("app.algorithms.cvrp_solver.get_road_route")
    @patch("app.algorithms.cvrp_solver.get_distance_matrix")
    async def test_optimized_longer_than_baseline_clamped(self, mock_matrix, mock_route):
        mock_matrix.return_value = {
            "distances_km": [
                [0.0, 12.0, 15.0, 18.0, 80.0],
                [12.0, 0.0, 8.0, 20.0, 75.0],
                [15.0, 8.0, 0.0, 14.0, 70.0],
                [18.0, 20.0, 14.0, 0.0, 60.0],
                [80.0, 75.0, 70.0, 60.0, 0.0]
            ],
            "durations_minutes": [[0.0]*5 for _ in range(5)],
            "source": "OSRM",
            "is_estimated": False
        }

        # Optimized = 110.0 km, Baseline = 100.0 km
        mock_route.side_effect = [
            {
                "distance_km": 110.0,
                "duration_minutes": 130.0,
                "geometry": {"type": "LineString", "coordinates": []},
                "source": "OSRM",
                "is_estimated": False
            },
            {
                "distance_km": 100.0,
                "duration_minutes": 120.0,
                "geometry": {"type": "LineString", "coordinates": []},
                "source": "OSRM",
                "is_estimated": False
            }
        ]

        res = await solve_cvrp_pipeline(
            hub=self.hub,
            pickup_stops=self.pickup_stops_3,
            buyer=self.buyer,
            vehicle_capacity_kg=2500.0,
            time_limit_seconds=1
        )

        self.assertEqual(res["distance_savings_km"], 0.0)
        self.assertEqual(res["distance_savings_pct"], 0.0)

    # Test J: Zero baseline distance handling
    @patch("app.algorithms.cvrp_solver.get_road_route")
    @patch("app.algorithms.cvrp_solver.get_distance_matrix")
    async def test_zero_baseline_distance_safe(self, mock_matrix, mock_route):
        mock_matrix.return_value = {
            "distances_km": [
                [0.0, 0.0, 0.0],
                [0.0, 0.0, 0.0],
                [0.0, 0.0, 0.0]
            ],
            "durations_minutes": [[0.0]*3 for _ in range(3)],
            "source": "OSRM",
            "is_estimated": False
        }
        mock_route.return_value = {
            "distance_km": 0.0,
            "duration_minutes": 0.0,
            "geometry": {"type": "LineString", "coordinates": []},
            "source": "OSRM",
            "is_estimated": False
        }

        single_stop = [{"listing_id": "LIST-01", "lat": 20.08, "lng": 73.83, "quantity_kg": 100.0}]
        res = await solve_cvrp_pipeline(
            hub=self.hub,
            pickup_stops=single_stop,
            buyer=self.hub,
            vehicle_capacity_kg=2500.0,
            time_limit_seconds=1
        )
        self.assertEqual(res["distance_savings_pct"], 0.0)

    # Test K: Invalid coordinates validation
    def test_invalid_coordinates(self):
        bad_hub = {"lat": 95.0, "lng": 73.83}  # lat > 90
        with self.assertRaises(CVRPSolverError):
            validate_cvrp_inputs(bad_hub, self.pickup_stops_3, self.buyer, 2500.0)

    # Test L: Invalid quantities validation
    def test_invalid_quantities(self):
        bad_stops = [{"listing_id": "LIST-01", "lat": 20.17, "lng": 73.98, "quantity_kg": -50.0}]
        with self.assertRaises(CVRPSolverError) as ctx:
            validate_cvrp_inputs(self.hub, bad_stops, self.buyer, 2500.0)
        self.assertIn("invalid quantity_kg", str(ctx.exception))

    # Test M: Null / unreachable matrix arc error
    def test_unreachable_matrix_arc_error(self):
        # All paths to buyer are None/unreachable
        dist_matrix = [
            [0.0, 10.0, None],
            [10.0, 0.0, None],
            [None, None, 0.0]
        ]
        demands = [0.0, 500.0, 0.0]
        with self.assertRaises(CVRPRoutingError) as ctx:
            solve_cvrp_ortools(dist_matrix, demands, vehicle_capacity_kg=2500.0, time_limit_seconds=1)
        self.assertIn("unreachable road segments", str(ctx.exception))

    # Test N: No solution found
    def test_no_solution_infeasible(self):
        # Empty or broken dimension
        dist_matrix = [
            [0.0, 10.0, 50.0],
            [10.0, 0.0, 45.0],
            [50.0, 45.0, 0.0]
        ]
        # Demands exceed vehicle capacity
        demands = [0.0, 3000.0, 0.0]
        with self.assertRaises(CVRPRoutingError):
            solve_cvrp_ortools(dist_matrix, demands, vehicle_capacity_kg=2500.0, time_limit_seconds=1)

    # Test O: Solver time limit & status report
    def test_solver_time_limit_and_status(self):
        dist_matrix = [
            [0.0, 10.0, 50.0],
            [10.0, 0.0, 45.0],
            [50.0, 45.0, 0.0]
        ]
        demands = [0.0, 500.0, 0.0]
        res = solve_cvrp_ortools(dist_matrix, demands, vehicle_capacity_kg=2500.0, time_limit_seconds=1)
        self.assertEqual(res["time_limit_seconds"], 1)
        self.assertIn(res["solver_status"], ("ROUTING_SUCCESS", "ROUTING_OPTIMAL"))


if __name__ == "__main__":
    unittest.main()
