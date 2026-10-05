"""
Unit Tests for OSRM Client & Routing Endpoints (Phase 4A)
=========================================================
Tests OSRM client functions and FastAPI endpoints using mocked HTTP responses.
Zero dependency on external public OSRM network availability.
"""

import unittest
from unittest.mock import patch, AsyncMock, MagicMock
import httpx
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.algorithms.osrm_client import (
    get_road_route,
    get_distance_matrix,
    validate_coordinates,
    format_osrm_coordinates_param,
    OSRMError,
    OSRMValidationError,
    OSRMUnavailableError,
    OSRMServiceError,
    MIN_COORDINATES,
    MAX_COORDINATES
)

try:
    from fastapi.testclient import TestClient
    from app.main import app
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False
    app = None


class TestOSRMClientUnit(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.coords_valid = [
            (19.9975, 73.7898),  # Nashik Point A (lat, lng)
            (20.0059, 73.8012)   # Nashik Point B (lat, lng)
        ]

    # Test C: Correct longitude/latitude ordering in URL formatting
    def test_coordinate_formatting_lon_lat_order(self):
        coords = [(19.9975, 73.7898), (20.0059, 73.8012)]
        formatted = format_osrm_coordinates_param(coords)
        # Must be lng,lat;lng,lat
        self.assertEqual(formatted, "73.789800,19.997500;73.801200,20.005900")

    # Test A, B, D, E: Valid route response, GeoJSON, distance conversion, duration conversion
    async def test_valid_route_response(self):
        mock_response_data = {
            "code": "Ok",
            "routes": [
                {
                    "distance": 12345.6,  # meters -> 12.35 km
                    "duration": 1470.0,   # seconds -> 24.5 min
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [73.7898, 19.9975],
                            [73.7950, 20.0010],
                            [73.8012, 20.0059]
                        ]
                    }
                }
            ],
            "waypoints": [{}, {}]
        }

        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_response_data

        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get.return_value = mock_resp

        result = await get_road_route(self.coords_valid, client=mock_client)

        self.assertEqual(result["source"], "OSRM")
        self.assertFalse(result["is_estimated"])
        self.assertEqual(result["distance_km"], 12.35)
        self.assertEqual(result["duration_minutes"], 24.5)
        self.assertEqual(result["geometry"]["type"], "LineString")
        self.assertEqual(len(result["geometry"]["coordinates"]), 3)
        self.assertEqual(result["geometry"]["coordinates"][0], [73.7898, 19.9975])

    # Test F, G: Valid distance and duration matrix parsing & dimensions
    async def test_valid_matrix_parsing_and_dimensions(self):
        coords_3 = [
            (19.99, 73.78),
            (20.01, 73.80),
            (20.03, 73.82)
        ]
        mock_table_data = {
            "code": "Ok",
            "distances": [
                [0.0, 5000.0, 10000.0],
                [5000.0, 0.0, 6000.0],
                [10000.0, 6000.0, 0.0]
            ],
            "durations": [
                [0.0, 600.0, 1200.0],
                [600.0, 0.0, 720.0],
                [1200.0, 720.0, 0.0]
            ]
        }

        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_table_data

        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get.return_value = mock_resp

        result = await get_distance_matrix(coords_3, client=mock_client)

        self.assertEqual(result["source"], "OSRM")
        self.assertFalse(result["is_estimated"])
        self.assertEqual(len(result["distances_km"]), 3)
        self.assertEqual(len(result["durations_minutes"]), 3)
        self.assertEqual(result["distances_km"][0], [0.0, 5.0, 10.0])
        self.assertEqual(result["durations_minutes"][0], [0.0, 10.0, 20.0])

    # Test H: Null / unreachable matrix cells preserved
    async def test_matrix_null_unreachable_cells(self):
        mock_table_data = {
            "code": "Ok",
            "distances": [
                [0.0, None],
                [None, 0.0]
            ],
            "durations": [
                [0.0, None],
                [None, 0.0]
            ]
        }

        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_table_data

        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get.return_value = mock_resp

        result = await get_distance_matrix(self.coords_valid, client=mock_client)
        self.assertIsNone(result["distances_km"][0][1])
        self.assertIsNone(result["durations_minutes"][0][1])
        self.assertEqual(result["distances_km"][0][0], 0.0)

    # Test I: HTTP 4xx / OSRM InvalidQuery error
    async def test_http_4xx_osrm_error(self):
        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.status_code = 400
        mock_resp.json.return_value = {
            "code": "InvalidQuery",
            "message": "Coordinates are outside of the supported area."
        }

        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get.return_value = mock_resp

        with self.assertRaises(OSRMServiceError) as ctx:
            await get_road_route(self.coords_valid, client=mock_client)
        self.assertIn("InvalidQuery", str(ctx.exception))

    # Test J: HTTP 5xx Server Error -> OSRMUnavailableError
    async def test_http_5xx_server_error(self):
        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.status_code = 502

        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get.return_value = mock_resp

        with self.assertRaises(OSRMUnavailableError) as ctx:
            await get_road_route(self.coords_valid, client=mock_client)
        self.assertIn("502", str(ctx.exception))

    # Test K: Timeout handling -> OSRMUnavailableError
    async def test_timeout_handling(self):
        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get.side_effect = httpx.ReadTimeout("Connection timed out")

        with self.assertRaises(OSRMUnavailableError) as ctx:
            await get_road_route(self.coords_valid, client=mock_client)
        self.assertIn("timed out", str(ctx.exception).lower())

    # Test L: Malformed JSON response -> OSRMUnavailableError
    async def test_malformed_json_response(self):
        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.status_code = 200
        mock_resp.json.side_effect = ValueError("Invalid JSON")

        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get.return_value = mock_resp

        with self.assertRaises(OSRMUnavailableError) as ctx:
            await get_road_route(self.coords_valid, client=mock_client)
        self.assertIn("malformed", str(ctx.exception).lower())

    # Test M: Missing required OSRM fields -> OSRMUnavailableError
    async def test_missing_required_fields(self):
        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "code": "Ok",
            "routes": [{"distance": 1000.0}]  # missing duration and geometry
        }

        mock_client = AsyncMock(spec=httpx.AsyncClient)
        mock_client.get.return_value = mock_resp

        with self.assertRaises(OSRMUnavailableError) as ctx:
            await get_road_route(self.coords_valid, client=mock_client)
        self.assertIn("missing required fields", str(ctx.exception).lower())

    # Test N: Invalid coordinate inputs (NaN, infinite, out-of-range, non-numeric)
    def test_invalid_coordinates_validation(self):
        # Out of range latitude
        with self.assertRaises(OSRMValidationError):
            validate_coordinates([(95.0, 73.0), (20.0, 73.0)])

        # Out of range longitude
        with self.assertRaises(OSRMValidationError):
            validate_coordinates([(20.0, 190.0), (20.0, 73.0)])

        # NaN coordinate
        with self.assertRaises(OSRMValidationError):
            validate_coordinates([(float('nan'), 73.0), (20.0, 73.0)])

        # Non-tuple item
        with self.assertRaises(OSRMValidationError):
            validate_coordinates(["invalid", (20.0, 73.0)])  # type: ignore

    # Test O: Too many coordinates (>50)
    def test_too_many_coordinates(self):
        too_many = [(20.0 + i * 0.01, 73.0 + i * 0.01) for i in range(51)]
        with self.assertRaises(OSRMValidationError) as ctx:
            validate_coordinates(too_many)
        self.assertIn("Maximum allowed coordinates is 50", str(ctx.exception))

    # Test P: Fewer than 2 coordinates
    def test_fewer_than_two_coordinates(self):
        with self.assertRaises(OSRMValidationError) as ctx:
            validate_coordinates([(20.0, 73.0)])
        self.assertIn("At least 2 coordinates are required", str(ctx.exception))


@unittest.skipUnless(HAS_FASTAPI, "fastapi not installed in test environment")
class TestOSRMEndpoints(unittest.TestCase):

    def setUp(self):
        if not HAS_FASTAPI:
            self.skipTest("fastapi not installed")
        self.client = TestClient(app)

    @patch("app.main.get_road_route")
    def test_endpoint_osrm_route_success(self, mock_get_route):
        mock_get_route.return_value = {
            "distance_km": 15.42,
            "duration_minutes": 28.3,
            "geometry": {
                "type": "LineString",
                "coordinates": [[73.78, 19.99], [73.80, 20.01]]
            },
            "source": "OSRM",
            "is_estimated": False
        }

        payload = {
            "coordinates": [
                {"lat": 19.99, "lng": 73.78},
                {"lat": 20.01, "lng": 73.80}
            ]
        }
        res = self.client.post("/api/routing/osrm-route", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["distance_km"], 15.42)
        self.assertEqual(data["duration_minutes"], 28.3)
        self.assertEqual(data["source"], "OSRM")
        self.assertFalse(data["is_estimated"])

    @patch("app.main.get_road_route")
    def test_endpoint_osrm_route_unavailable_503(self, mock_get_route):
        mock_get_route.side_effect = OSRMUnavailableError("OSRM is unreachable")

        payload = {
            "coordinates": [
                {"lat": 19.99, "lng": 73.78},
                {"lat": 20.01, "lng": 73.80}
            ]
        }
        res = self.client.post("/api/routing/osrm-route", json=payload)
        self.assertEqual(res.status_code, 503)
        data = res.json()
        self.assertEqual(data["detail"]["error"], "ROUTING_SERVICE_UNAVAILABLE")

    def test_endpoint_osrm_route_invalid_coordinates_400(self):
        # Fewer than 2 coordinates rejected by Pydantic / validation
        payload = {
            "coordinates": [
                {"lat": 19.99, "lng": 73.78}
            ]
        }
        res = self.client.post("/api/routing/osrm-route", json=payload)
        self.assertEqual(res.status_code, 422)  # Pydantic min_length validation

    @patch("app.main.get_distance_matrix")
    def test_endpoint_matrix_success(self, mock_get_matrix):
        mock_get_matrix.return_value = {
            "distances_km": [[0.0, 12.5], [12.5, 0.0]],
            "durations_minutes": [[0.0, 25.0], [25.0, 0.0]],
            "source": "OSRM",
            "is_estimated": False
        }

        payload = {
            "coordinates": [
                {"lat": 19.99, "lng": 73.78},
                {"lat": 20.01, "lng": 73.80}
            ]
        }
        res = self.client.post("/api/routing/matrix", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["distances_km"], [[0.0, 12.5], [12.5, 0.0]])
        self.assertEqual(data["source"], "OSRM")


if __name__ == "__main__":
    unittest.main()
