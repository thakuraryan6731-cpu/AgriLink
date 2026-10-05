# Logistics UI, Route Persistence & Order State Integration (Phase 4C)

## 1. Architecture Overview

Phase 4C completes the end-to-end integration between AgriLink AI's frontend logistics dashboards (Screens 12, 13, 14), the backend routing optimization pipeline (**OSRM + Google OR-Tools**), the **7-State Order Lifecycle Machine**, and **Supabase Database Persistence**.

### End-to-End Logistics Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Screen 12: Transporter Fleet Hub               │
│   - Fetches CVRP Optimization (POST /api/routing/cvrp-solve)│
│   - Displays OSRM Road Distance & OR-Tools Savings          │
└──────────────────────────────┬──────────────────────────────┘
                               │ Navigate (Screen 13)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Screen 13: Interactive CVRP Map                 │
│   - Inverts GeoJSON [lng, lat] -> Leaflet [lat, lng]        │
│   - Renders Real OSRM Road-Following Polyline               │
│   - Displays Ordered Stops Progression                      │
│   - "Confirm & Dispatch Route" Action                       │
└──────────────────────────────┬──────────────────────────────┘
                               │ POST /api/routing/routes (Persist)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend Route Persistence                   │
│   - Generates Unique Route Code (MH-MILKRUN-...)            │
│   - Validates OSRM LineString Geometry & Capacity           │
│   - Associates with public.aggregated_orders                │
└──────────────────────────────┬──────────────────────────────┘
                               │ Navigate (Screen 14)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          Screen 14: Order State & Delivery Tracker          │
│   - Order State Lifecycle (PICKUP_SCHEDULED -> IN_TRANSIT)  │
│   - Final Dropoff Verification (IN_TRANSIT -> DELIVERED)    │
│   - POST /api/orders/{id}/transition                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Screen Specifications & Implementation

### Screen 12: Transporter Fleet Hub (`TransporterHub.tsx`)
- **Backend Connection**: Queries `POST /api/routing/cvrp-solve` via `getCVRPRoute()`.
- **KPI Metrics**:
  - `Truck Capacity Utilization`: e.g. `60.0%` (`1,500 kg / 2,500 kg`).
  - `OSRM Road Distance`: e.g. `94.2 km` (labeled `"OSRM Road Network Distance"`).
  - `Road Distance Reduction`: e.g. `-24.3 km (-20.5%)` vs unoptimized baseline.
  - `Driving Duration`: e.g. `115 min` (`OR-Tools Optimized`).
- **Error Handling**: Displays `"Route Optimization Service Unavailable"` with a manual **Retry** button if the backend is unreachable — **zero silent mock fallbacks**.

---

### Screen 13: Interactive CVRP Map (`CVRPRouteMapView.tsx`)
- **GeoJSON Coordinate Inversion**: Inverts OSRM GeoJSON `[longitude, latitude]` to Leaflet `[latitude, longitude]` for rendering inside `<Polyline positions={leafletPolylinePositions} />`.
- **Waypoint Markers**:
  - **Hub**: Cyan marker (`lat: 20.08, lng: 73.83`).
  - **Farmer Pickups**: Green markers showing stop index, listing ID, and accumulated load.
  - **Buyer Distribution Center**: Blue marker (`lat: 19.29, lng: 73.06`).
- **Route Confirmation Action**: User clicks `"Confirm & Lock Route Dispatch"` to call `POST /api/routing/routes` and transition to Screen 14.

---

### Screen 14: Order State Execution & Delivery Tracker (`DeliveryStatusTracker.tsx`)
- **Removal of Fake Authoritative Telemetry**: GPS speed (58 km/h) and temperature (18.2°C) are explicitly categorized as `"Demo telemetry — simulated for UI visualization"`.
- **Order State Machine Progression**:
  - Active lifecycle status is verified by `POST /api/orders/{order_id}/transition`.
  - Allowed forward transitions:
    $$\text{PICKUP\_SCHEDULED} \xrightarrow{\text{Start Transit}} \text{IN\_TRANSIT} \xrightarrow{\text{Confirm Delivery}} \text{DELIVERED}$$
  - Illegal transitions (e.g. attempting to jump from `PICKUP_SCHEDULED` directly to `DELIVERED`) are rejected with `HTTP 409 Conflict` (`INVALID_STATE_TRANSITION`).

---

## 3. Route Preview vs. Route Confirmation

| Concept | API Endpoint | Purpose | Side Effects |
| :--- | :--- | :--- | :--- |
| **Route Preview** | `POST /api/routing/cvrp-solve` | Computes optimal sequence, load progression, savings, and geometry for evaluation. | **Stateless**: No database write, order state unchanged. |
| **Route Confirmation** | `POST /api/routing/routes` | Persists the confirmed route record, assigns route code, and commits dispatch details. | **Stateful**: Generates `route_code`, stores GeoJSON and waypoints. |

---

## 4. Operational Route Status vs. Canonical Order Lifecycle

To prevent semantic conflicts between logistics operations and business contracts:

- **Canonical Order Lifecycle (`public.aggregated_orders.status`)**:
  `MATCHED` $\rightarrow$ `AGGREGATING` $\rightarrow$ `BUYER_CONFIRMED` $\rightarrow$ `PICKUP_SCHEDULED` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `DELIVERED` $\rightarrow$ `PAYMENT_CONFIRMED`.
- **Logistics Route Status (`public.logistics_routes.status`)**:
  `SCHEDULED` $\rightarrow$ `PICKING_UP` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `COMPLETED`.

---

## 5. Security & Trust Boundaries

- **Authoritative Calculations**: All CVRP optimizations and OSRM road geometry parsing execute on the FastAPI backend.
- **Client Route Submission**: Client-supplied payloads are validated for geometry validity (GeoJSON LineString with $\ge 2$ coordinates), load bounds ($\text{current\_load} \le \text{capacity}$), and waypoint consistency.
- **RLS Configuration**: Supabase Row-Level Security ensures only authorized roles (`transporter`, `fpo_admin`, `doca_admin`) can create and manage route dispatches.

---

## 6. Known Limitations

1. **Simulated Telemetry**: IoT sensors (cold chain temperature, GPS speed) remain simulated demo indicators until physical OBD-II / IoT gateway integration.
2. **Single-Transporter Dispatch**: Routes represent a single vehicle milk run per aggregation order.
