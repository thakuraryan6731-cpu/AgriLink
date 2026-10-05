# Google OR-Tools CVRP Route Optimization (Phase 4B)

## 1. Overview & Architecture

The **Capacitated Vehicle Routing Problem (CVRP) Solver** (`backend/app/algorithms/cvrp_solver.py`) models and optimizes multi-stop milk-run agricultural pickup routes across distributed smallholder farmers, an aggregation hub, and a bulk buyer destination.

It consumes real road network distance and duration matrices from **OSRM** and optimizes the sequence using **Google OR-Tools** constraint programming.

### System Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Input Parameters                          │
│   Hub Location + Farmer Pickups (Q_i) + Buyer Destination   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ 1. Assemble Coordinates [Hub, Farmer_1..N, Buyer]
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 OSRM Road Distance Matrix                   │
│               POST /api/routing/matrix                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ 2. Scaled Integer Cost Matrix (meters)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Google OR-Tools CVRP Engine                 │
│   - RoutingIndexManager (starts=[Hub], ends=[Buyer])        │
│   - AddDimensionWithVehicleCapacity                         │
│   - FirstSolution: PATH_CHEAPEST_ARC                        │
│   - LocalSearch: GUIDED_LOCAL_SEARCH                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ 3. Optimized Waypoint Node Sequence
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 OSRM Road Route Query                       │
│             POST /api/routing/osrm-route                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ 4. Extract Real Road Distance, Duration & GeoJSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            Final Output & Baseline Comparison               │
│   - Optimized Route with Pickup Load Progression            │
│   - Road Distance Reduction vs Deterministic Baseline       │
│   - Real Road-Following GeoJSON LineString                  │
└─────────────────────────────────────────────────────────────┘
```

> **Authoritative Statement**: Route optimization is performed by Google OR-Tools using OSRM road-network distances. The returned route is the best solution found within the configured solver time limit; it is not claimed to be globally optimal unless proven by the solver.

---

## 2. Milk-Run Load Semantics

AgriLink AI routes agricultural **pickups**, meaning cargo load accumulates during the transit:

1. **Depot / Hub (Node 0)**: Vehicle starts empty ($\text{Load} = 0\text{ kg}$).
2. **Farmer Pickups (Nodes $1 \dots N$)**: At each stop $i$, the vehicle loads $Q_i > 0\text{ kg}$.
   $$\text{Load}_{\text{after stop } k} = \sum_{j=1}^k Q_{\pi(j)}$$
3. **Buyer Delivery (Node $N+1$)**: Vehicle arrives with total pooled produce ($\text{Load} = \sum_{i=1}^N Q_i\text{ kg}$) and unloads.

### Capacity Enforcement
- **Constraint**: Total pickup payload must not exceed vehicle capacity:
  $$\sum_{i=1}^N Q_i \le \text{vehicle\_capacity\_kg}$$
- If total produce exceeds capacity, the system rejects the request with `HTTP 400 Bad Request` (`CAPACITY_EXCEEDED`).

---

## 3. OR-Tools Solver Configuration

### Routing Model Setup
```python
manager = pywrapcp.RoutingIndexManager(
    num_locations,      # M = N + 2
    1,                  # 1 vehicle
    [0],                # Start at Hub
    [buyer_index]       # End at Buyer
)
routing = pywrapcp.RoutingModel(manager)
```

### Search Parameters & Strategies
- **First Solution Strategy**: `routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC` (Deterministic greedy initial path construction).
- **Local Search Metaheuristic**: `routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH` (Escapes local minima to discover shorter road loops).
- **Time Limit**: Configurable bounded search time (default: 10 seconds).

---

## 4. OSRM Matrix Integration & Arc Costs

1. **Integer Arc Scaling**: OR-Tools requires integer arc transit costs. OSRM kilometer distances are converted to integer meters:
   $$\text{cost}(u, v) = \text{round}(\text{distance\_km}(u, v) \times 1000)$$
2. **Unreachable Matrix Cells Handling**: If OSRM returns `null` for an unreachable pair, the arc cost is set to a heavy penalty:
   $$\text{UNREACHABLE\_PENALTY} = 100,000,000\text{ meters } (100,000\text{ km})$$
   If the extracted solution contains any penalized arc, the solver raises `CVRPRoutingError` ("Feasible route requires traversing unreachable road segments").

---

## 5. Baseline Comparison & Distance Reduction

To quantify logistics optimization, the pipeline evaluates a deterministic **Baseline Route**:
- **Baseline Sequence**: Hub $\rightarrow$ Farmer pickups ordered deterministically by `listing_id` ascending $\rightarrow$ Buyer Destination.
- **Metrics**:
  $$\text{distance\_savings\_km} = \max(0.0, \text{baseline\_distance\_km} - \text{road\_distance\_km})$$
  $$\text{distance\_savings\_pct} = \left(\frac{\text{distance\_savings\_km}}{\text{baseline\_distance\_km}}\right) \times 100$$

> **Terminology Note**: This metric is strictly labeled **Road Distance Reduction (km / %)** rather than financial savings, preventing unverified monetary claims until contractual freight rates are attached.

---

## 6. API Interface: `POST /api/routing/cvrp-solve`

**Request Body**:
```json
{
  "hub": { "lat": 20.08, "lng": 73.83 },
  "pickup_stops": [
    { "listing_id": "LIST-01", "lat": 20.1704, "lng": 73.9859, "quantity_kg": 650.0 },
    { "listing_id": "LIST-02", "lat": 20.2010, "lng": 73.8340, "quantity_kg": 450.0 },
    { "listing_id": "LIST-03", "lat": 19.9820, "lng": 73.6840, "quantity_kg": 400.0 }
  ],
  "buyer": { "lat": 19.29, "lng": 73.06 },
  "vehicle_capacity_kg": 2500.0
}
```

**Response Body (200 OK)**:
```json
{
  "optimized_route": [
    { "type": "hub", "index": 0, "lat": 20.08, "lng": 73.83, "load_after_stop_kg": 0.0 },
    { "type": "farmer", "index": 2, "listing_id": "LIST-02", "quantity_kg": 450.0, "lat": 20.201, "lng": 73.834, "load_after_pickup_kg": 450.0 },
    { "type": "farmer", "index": 1, "listing_id": "LIST-01", "quantity_kg": 650.0, "lat": 20.1704, "lng": 73.9859, "load_after_pickup_kg": 1100.0 },
    { "type": "farmer", "index": 3, "listing_id": "LIST-03", "quantity_kg": 400.0, "lat": 19.982, "lng": 73.684, "load_after_pickup_kg": 1500.0 },
    { "type": "buyer", "index": 4, "lat": 19.29, "lng": 73.06, "load_after_stop_kg": 1500.0 }
  ],
  "total_load_kg": 1500.0,
  "vehicle_capacity_kg": 2500.0,
  "capacity_utilization_pct": 60.0,
  "road_distance_km": 94.2,
  "road_duration_minutes": 115.0,
  "baseline_distance_km": 118.5,
  "distance_savings_km": 24.3,
  "distance_savings_pct": 20.5,
  "geometry": {
    "type": "LineString",
    "coordinates": [[73.83, 20.08], [73.06, 19.29]]
  },
  "solver": {
    "name": "Google OR-Tools",
    "first_solution_strategy": "PATH_CHEAPEST_ARC",
    "local_search_metaheuristic": "GUIDED_LOCAL_SEARCH",
    "status": "ROUTING_SUCCESS",
    "time_limit_seconds": 10,
    "notice": "OR-Tools optimized route using OSRM road-network distances."
  },
  "source": "OSRM + Google OR-Tools",
  "is_estimated": false
}
```

---

## 7. Known Limitations

1. **Single-Vehicle Fleet Model**: In Phase 4B, the solver optimizes a single milk-run vehicle. Heterogeneous multi-vehicle fleet optimization is scheduled for future scale enhancements.
2. **Static Traffic Assumptions**: Transit times and road distances use static OSRM driving profiles and do not incorporate live traffic congestion telemetry.
3. **External OSRM Service**: Network availability of the upstream OSRM routing server is required for end-to-end matrix generation and route geometry extraction.
