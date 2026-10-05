# OSRM Road Routing Engine (Phase 4A)

## 1. Overview & Architecture

The **OSRM Road Routing Engine** (`backend/app/algorithms/osrm_client.py`) provides authoritative road network routing, driving travel durations, distance matrices, and GeoJSON LineString geometry for AgriLink AI.

It connects the frontend logistics and mapping interfaces to the Open Source Routing Machine (OSRM) driving profile.

### Architecture Flow

```
┌──────────────────────────────────────────────────┐
│             Frontend UI Components               │
│        (Screen 12, 13, 14, Leaflet Map)          │
└────────────────────────┬─────────────────────────┘
                         │
                         │ 1. Coordinates: [{lat, lng}, ...]
                         ▼
┌──────────────────────────────────────────────────┐
│              logisticsService.ts                 │
└────────────────────────┬─────────────────────────┘
                         │
                         │ 2. POST /api/routing/osrm-route (or /matrix)
                         ▼
┌──────────────────────────────────────────────────┐
│                 FastAPI Gateway                  │
│                   (main.py)                      │
└────────────────────────┬─────────────────────────┘
                         │
                         │ 3. Validate Coordinates & Invert to (lng, lat)
                         ▼
┌──────────────────────────────────────────────────┐
│                 osrm_client.py                   │
└────────────────────────┬─────────────────────────┘
                         │
                         │ 4. HTTP GET /route/v1/driving/{lng,lat;...}
                         ▼
┌──────────────────────────────────────────────────┐
│           Public OSRM Driving Server             │
│          (router.project-osrm.org)               │
└────────────────────────┬─────────────────────────┘
                         │
                         │ 5. Returns real road distance, duration & GeoJSON
                         ▼
┌──────────────────────────────────────────────────┐
│   Backend Normalized Output                      │
│   - distance_km (meters / 1000)                  │
│   - duration_minutes (seconds / 60)              │
│   - GeoJSON LineString coordinates               │
└──────────────────────────────────────────────────┘
```

> **Authoritative Statement**: Road routing is obtained from OSRM when the external routing service is available. All distance and duration calculations are computed exclusively by the backend OSRM client.

---

## 2. API Endpoints & Request Specifications

### A. Point-to-Point Sequential Road Route: `POST /api/routing/osrm-route`

Calculates the actual road trajectory across a sequence of 2 to 50 waypoints.

**Request Body**:
```json
{
  "coordinates": [
    { "lat": 19.9975, "lng": 73.7898 },
    { "lat": 20.1704, "lng": 73.9859 }
  ]
}
```

**Success Response (200 OK)**:
```json
{
  "distance_km": 30.08,
  "duration_minutes": 27.3,
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [73.78981, 19.99748],
      [73.79124, 19.99890],
      [73.98585, 20.17038]
    ]
  },
  "source": "OSRM",
  "is_estimated": false
}
```

---

### B. Distance & Duration Matrix: `POST /api/routing/matrix`

Calculates all-pairs $N \times N$ road distances and driving durations using OSRM Table Service.

**Request Body**:
```json
{
  "coordinates": [
    { "lat": 19.9975, "lng": 73.7898 },
    { "lat": 20.1704, "lng": 73.9859 },
    { "lat": 20.0059, "lng": 73.8012 }
  ]
}
```

**Success Response (200 OK)**:
```json
{
  "distances_km": [
    [0.0, 30.08, 1.84],
    [30.12, 0.0, 29.75],
    [1.85, 29.80, 0.0]
  ],
  "durations_minutes": [
    [0.0, 27.3, 3.2],
    [27.4, 0.0, 26.9],
    [3.2, 27.0, 0.0]
  ],
  "source": "OSRM",
  "is_estimated": false
}
```

---

## 3. Coordinate Ordering & Unit Normalization

### Coordinate Ordering
- **Input to APIs / Python Functions**: `(latitude, longitude)` or `{"lat": ..., "lng": ...}`.
- **OSRM Query String**: `{longitude},{latitude}` (e.g. `73.7898,19.9975;73.9859,20.1704`).
- **GeoJSON Standard Output**: `[longitude, latitude]` inside `geometry.coordinates`.

### Unit Normalization
- **Distance**: OSRM returns meters $\rightarrow$ normalized to **Kilometers (km)** rounded to 2 decimal places.
- **Duration**: OSRM returns seconds $\rightarrow$ normalized to **Minutes (min)** rounded to 1 decimal place.

---

## 4. Input Validation & Limits

- **Minimum Waypoints**: 2 coordinates.
- **Maximum Waypoints**: 50 coordinates (to respect public OSRM URL length and rate constraints).
- **Coordinate Boundaries**:
  - $\text{Latitude} \in [-90.0, 90.0]$
  - $\text{Longitude} \in [-180.0, 180.0]$
- **Strict Numeric Verification**: Rejects `NaN`, $\pm\infty$, `null`, or non-numeric types with HTTP `400 Bad Request` (`OSRMValidationError`).
- **Matrix Unreachable Cells**: If OSRM returns `null` for an unreachable route segment, the matrix preserves `null` rather than fabricating synthetic distances.

---

## 5. Strict "No Silent Fallback" Policy

- **No Synthetic Road Geometry**: When the OSRM server is unreachable, times out, or fails, the backend **does not** compute synthetic straight lines or approximate road distances using arbitrary multipliers (e.g., Haversine $\times$ 1.25).
- **Error Behavior**: Returns `HTTP 503 Service Unavailable`:
  ```json
  {
    "detail": {
      "error": "ROUTING_SERVICE_UNAVAILABLE",
      "message": "OSRM road routing is temporarily unavailable."
    }
  }
  ```
- **Frontend Behavior**: The UI explicitly catches `ROUTING_SERVICE_UNAVAILABLE` and presents an error banner: `"Road Routing Service Unavailable"` with a **Retry** action.
- **Developer-Only Demo Flag**: If offline development or demonstration is ever required without network access, it must be gated behind an explicit compile/runtime flag and visibly labeled: `"Offline prototype route — OSRM unavailable"`.

---

## 6. Known Limitations

1. **Public OSRM Server Dependency**: In the current MVP setup, requests query the public OSRM demo server (`router.project-osrm.org`). For production deployments at scale, a self-hosted OSRM container or dedicated routing instance must be deployed.
2. **Traffic & Real-Time Congestion**: Public OSRM calculates speed-profile-based static road routing and does not incorporate live dynamic traffic congestion telemetry.
