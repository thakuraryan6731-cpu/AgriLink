"""
OSRM Road Routing & Distance Matrix Client (Phase 4A)
=====================================================
Queries the Open Source Routing Machine (OSRM) public API for real road network routing,
driving durations, distance matrices, and GeoJSON LineString geometry.

OSRM Public API Endpoints:
- Route: https://router.project-osrm.org/route/v1/driving/{coordinates}
- Table: https://router.project-osrm.org/table/v1/driving/{coordinates}

CRITICAL RULES:
1. Coordinate Order for OSRM URL: `{longitude},{latitude}` (NOT lat,lng).
2. Input parameters to functions use `(latitude, longitude)` tuples.
3. No silent fallback: If OSRM fails, raises OSRMUnavailableError / OSRMServiceError.
4. Units: Distance returned in km, Duration returned in minutes.
"""

from typing import List, Tuple, Dict, Any, Optional
import httpx
import logging
import math

logger = logging.getLogger(__name__)

OSRM_ROUTE_BASE_URL = "https://router.project-osrm.org/route/v1/driving"
OSRM_TABLE_BASE_URL = "https://router.project-osrm.org/table/v1/driving"

# Request limits
MIN_COORDINATES = 2
MAX_COORDINATES = 50
DEFAULT_TIMEOUT_SECONDS = 10.0


class OSRMError(Exception):
    """Base exception for all OSRM errors."""
    pass


class OSRMValidationError(OSRMError):
    """Raised when coordinate inputs fail validation."""
    pass


class OSRMUnavailableError(OSRMError):
    """Raised when OSRM server is unreachable, times out, or returns a 5xx error."""
    pass


class OSRMServiceError(OSRMError):
    """Raised when OSRM returns an error response (e.g. InvalidQuery, NoRoute)."""
    pass


def validate_coordinates(coordinates: List[Tuple[float, float]], max_coords: int = MAX_COORDINATES) -> None:
    """
    Validates a list of (latitude, longitude) coordinate tuples.
    - Must have at least 2 coordinates
    - Must not exceed max_coords
    - Latitude in [-90, 90]
    - Longitude in [-180, 180]
    - No NaN or infinite values
    """
    if not isinstance(coordinates, list):
        raise OSRMValidationError("Coordinates must be provided as a list of (lat, lng) tuples.")

    if len(coordinates) < MIN_COORDINATES:
        raise OSRMValidationError(
            f"At least {MIN_COORDINATES} coordinates are required for routing. Received {len(coordinates)}."
        )

    if len(coordinates) > max_coords:
        raise OSRMValidationError(
            f"Maximum allowed coordinates is {max_coords}. Received {len(coordinates)}."
        )

    for idx, coord in enumerate(coordinates):
        if not isinstance(coord, (tuple, list)) or len(coord) != 2:
            raise OSRMValidationError(
                f"Coordinate at index {idx} must be a (latitude, longitude) pair. Received: {coord}"
            )
        lat, lng = coord
        if lat is None or lng is None:
            raise OSRMValidationError(f"Coordinate at index {idx} contains None.")

        if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
            raise OSRMValidationError(f"Coordinate at index {idx} must contain numeric values. Received: {coord}")

        if math.isnan(lat) or math.isinf(lat) or math.isnan(lng) or math.isinf(lng):
            raise OSRMValidationError(f"Coordinate at index {idx} contains NaN or Infinity: ({lat}, {lng})")

        if lat < -90.0 or lat > 90.0:
            raise OSRMValidationError(
                f"Latitude at index {idx} ({lat}) is out of valid range [-90.0, 90.0]."
            )
        if lng < -180.0 or lng > 180.0:
            raise OSRMValidationError(
                f"Longitude at index {idx} ({lng}) is out of valid range [-180.0, 180.0]."
            )


def format_osrm_coordinates_param(coordinates: List[Tuple[float, float]]) -> str:
    """
    Formats (lat, lng) tuples into OSRM URL format: '{lng1},{lat1};{lng2},{lat2};...'
    NOTE: OSRM expects LONGITUDE FIRST, then LATITUDE.
    """
    return ";".join(f"{lng:.6f},{lat:.6f}" for lat, lng in coordinates)


async def get_road_route(
    coordinates: List[Tuple[float, float]],
    client: Optional[httpx.AsyncClient] = None,
    timeout: float = DEFAULT_TIMEOUT_SECONDS
) -> Dict[str, Any]:
    """
    Fetches the road route from OSRM for a sequence of (lat, lng) waypoints.

    Parameters:
        coordinates: List of (lat, lng) tuples in sequence. Minimum 2.
        client: Optional httpx.AsyncClient for connection reuse / mocking.
        timeout: Request timeout in seconds.

    Returns:
        Dict:
        {
            "distance_km": float,
            "duration_minutes": float,
            "geometry": {
                "type": "LineString",
                "coordinates": [[lng, lat], ...]
            },
            "source": "OSRM",
            "is_estimated": False
        }
    """
    validate_coordinates(coordinates)
    coords_param = format_osrm_coordinates_param(coordinates)
    url = f"{OSRM_ROUTE_BASE_URL}/{coords_param}"
    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "false"
    }

    should_close_client = False
    if client is None:
        client = httpx.AsyncClient(timeout=timeout)
        should_close_client = True

    try:
        response = await client.get(url, params=params)
    except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout) as e:
        logger.error(f"OSRM route request timed out: {e}")
        raise OSRMUnavailableError("OSRM road routing service request timed out.") from e
    except httpx.NetworkError as e:
        logger.error(f"OSRM network error: {e}")
        raise OSRMUnavailableError(f"Network error communicating with OSRM: {str(e)}") from e
    except Exception as e:
        logger.error(f"Unexpected error calling OSRM: {e}")
        raise OSRMUnavailableError(f"Failed to communicate with OSRM service: {str(e)}") from e
    finally:
        if should_close_client:
            await client.aclose()

    if response.status_code >= 500:
        raise OSRMUnavailableError(
            f"OSRM server returned status code {response.status_code}."
        )

    try:
        data = response.json()
    except Exception as e:
        raise OSRMUnavailableError("OSRM returned a malformed non-JSON response.") from e

    code = data.get("code")
    if code != "Ok":
        msg = data.get("message", "Unknown OSRM error")
        if response.status_code == 400 or code in ("InvalidQuery", "NoRoute", "NoSegment"):
            raise OSRMServiceError(f"OSRM routing failed ({code}): {msg}")
        raise OSRMUnavailableError(f"OSRM service returned error code: {code} ({msg})")

    routes = data.get("routes")
    if not routes or not isinstance(routes, list) or len(routes) == 0:
        raise OSRMServiceError("OSRM response did not contain any valid route paths.")

    primary_route = routes[0]
    if "distance" not in primary_route or "duration" not in primary_route or "geometry" not in primary_route:
        raise OSRMUnavailableError("OSRM route response missing required fields (distance, duration, geometry).")

    distance_meters = primary_route["distance"]
    duration_seconds = primary_route["duration"]
    geometry = primary_route["geometry"]

    if not isinstance(geometry, dict) or geometry.get("type") != "LineString" or "coordinates" not in geometry:
        raise OSRMUnavailableError("OSRM route returned invalid geometry format.")

    return {
        "distance_km": round(distance_meters / 1000.0, 2),
        "duration_minutes": round(duration_seconds / 60.0, 1),
        "geometry": geometry,
        "source": "OSRM",
        "is_estimated": False
    }


async def get_distance_matrix(
    coordinates: List[Tuple[float, float]],
    client: Optional[httpx.AsyncClient] = None,
    timeout: float = DEFAULT_TIMEOUT_SECONDS
) -> Dict[str, Any]:
    """
    Fetches N x N distance (km) and duration (minutes) matrices from OSRM.

    Parameters:
        coordinates: List of (lat, lng) tuples. Minimum 2.
        client: Optional httpx.AsyncClient for connection reuse / mocking.
        timeout: Request timeout in seconds.

    Returns:
        Dict:
        {
            "distances_km": [[float or None, ...], ...],
            "durations_minutes": [[float or None, ...], ...],
            "source": "OSRM",
            "is_estimated": False
        }
    """
    validate_coordinates(coordinates)
    n = len(coordinates)
    coords_param = format_osrm_coordinates_param(coordinates)
    url = f"{OSRM_TABLE_BASE_URL}/{coords_param}"
    params = {
        "annotations": "distance,duration"
    }

    should_close_client = False
    if client is None:
        client = httpx.AsyncClient(timeout=timeout)
        should_close_client = True

    try:
        response = await client.get(url, params=params)
    except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout) as e:
        logger.error(f"OSRM table request timed out: {e}")
        raise OSRMUnavailableError("OSRM distance matrix service request timed out.") from e
    except httpx.NetworkError as e:
        logger.error(f"OSRM table network error: {e}")
        raise OSRMUnavailableError(f"Network error communicating with OSRM: {str(e)}") from e
    except Exception as e:
        logger.error(f"Unexpected error calling OSRM table: {e}")
        raise OSRMUnavailableError(f"Failed to communicate with OSRM service: {str(e)}") from e
    finally:
        if should_close_client:
            await client.aclose()

    if response.status_code >= 500:
        raise OSRMUnavailableError(
            f"OSRM server returned status code {response.status_code}."
        )

    try:
        data = response.json()
    except Exception as e:
        raise OSRMUnavailableError("OSRM returned a malformed non-JSON response.") from e

    code = data.get("code")
    if code != "Ok":
        msg = data.get("message", "Unknown OSRM error")
        if response.status_code == 400 or code in ("InvalidQuery", "NoTable"):
            raise OSRMServiceError(f"OSRM table failed ({code}): {msg}")
        raise OSRMUnavailableError(f"OSRM table service returned error code: {code} ({msg})")

    distances_raw = data.get("distances")
    durations_raw = data.get("durations")

    if not isinstance(distances_raw, list) or not isinstance(durations_raw, list):
        raise OSRMUnavailableError("OSRM table response missing distances or durations array.")

    if len(distances_raw) != n or len(durations_raw) != n:
        raise OSRMUnavailableError(
            f"Expected {n}x{n} matrix, but received {len(distances_raw)} rows."
        )

    distances_km: List[List[Optional[float]]] = []
    durations_minutes: List[List[Optional[float]]] = []

    for row_idx in range(n):
        dist_row = distances_raw[row_idx]
        dur_row = durations_raw[row_idx]

        if not isinstance(dist_row, list) or not isinstance(dur_row, list) or len(dist_row) != n or len(dur_row) != n:
            raise OSRMUnavailableError(
                f"Row {row_idx} matrix dimensions do not match expected size {n}."
            )

        row_km: List[Optional[float]] = []
        row_dur: List[Optional[float]] = []

        for col_idx in range(n):
            d = dist_row[col_idx]
            t = dur_row[col_idx]

            # Null / unreachable handling: retain None if unreachable
            if d is None:
                row_km.append(None)
            else:
                row_km.append(round(d / 1000.0, 2))

            if t is None:
                row_dur.append(None)
            else:
                row_dur.append(round(t / 60.0, 1))

        distances_km.append(row_km)
        durations_minutes.append(row_dur)

    return {
        "distances_km": distances_km,
        "durations_minutes": durations_minutes,
        "source": "OSRM",
        "is_estimated": False
    }
