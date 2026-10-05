"""
AgriLink AI - Capacitated Vehicle Routing Problem (CVRP) Solver (Phase 4B)
===========================================================================
Solves single-vehicle milk-run agricultural pickup routing using Google OR-Tools
and OSRM road network distance matrices.

Routing Model:
- Start: Depot / Aggregation Hub (Node 0)
- Intermediate: Multi-farmer pickup stops (Nodes 1 .. N)
- End: Buyer delivery destination (Node N+1)
- Vehicle Capacity: vehicle_capacity_kg (enforced with pickup load accumulation)

LOAD SEMANTICS:
- Vehicle starts empty at Hub (0 kg).
- At each farmer pickup, load increases by farmer quantity (Q_i > 0).
- Total payload reaches sum(Q_i) before reaching Buyer delivery.
- If sum(Q_i) > vehicle_capacity_kg, raises CapacityExceededError.

AUTHORITATIVE DISTANCE:
- Costs and arc transit times are derived from OSRM distance matrices.
- Final route geometry, distance, and duration are retrieved from OSRM road route.
"""

from typing import List, Dict, Tuple, Any, Optional
import math
import logging

from ortools.constraint_solver import pywrapcp
from ortools.constraint_solver import routing_enums_pb2

from app.algorithms.osrm_client import (
    get_distance_matrix,
    get_road_route,
    validate_coordinates,
    OSRMUnavailableError,
    OSRMValidationError,
    OSRMServiceError
)

logger = logging.getLogger(__name__)

UNREACHABLE_PENALTY_METERS = 100_000_000  # 100,000 km penalty for unreachable edges
SOLVER_TIME_LIMIT_SECONDS = 10


class CVRPSolverError(Exception):
    """Base exception for CVRP solver errors."""
    pass


class CVRPCapacityError(CVRPSolverError):
    """Raised when total demand exceeds vehicle capacity or capacity <= 0."""
    pass


class CVRPRoutingError(CVRPSolverError):
    """Raised when OR-Tools cannot find a valid solution or matrix is invalid."""
    pass


def validate_cvrp_inputs(
    hub: Dict[str, float],
    pickup_stops: List[Dict[str, Any]],
    buyer: Dict[str, float],
    vehicle_capacity_kg: float
) -> None:
    """
    Validates CVRP request inputs:
    - Minimum 1 pickup stop
    - Valid latitude and longitude coordinates
    - Positive farmer quantities
    - Positive vehicle capacity
    - Total load <= vehicle capacity
    - Unique non-empty listing IDs
    """
    if vehicle_capacity_kg <= 0:
        raise CVRPCapacityError(f"Vehicle capacity must be greater than 0. Received: {vehicle_capacity_kg}")

    if not isinstance(pickup_stops, list) or len(pickup_stops) < 1:
        raise CVRPSolverError("At least 1 pickup stop is required for CVRP optimization.")

    # Validate coordinates
    all_coords = [(hub.get("lat"), hub.get("lng"))]
    seen_listing_ids = set()
    total_qty = 0.0

    for idx, stop in enumerate(pickup_stops):
        listing_id = stop.get("listing_id")
        if not listing_id:
            raise CVRPSolverError(f"Pickup stop at index {idx} is missing 'listing_id'.")
        if listing_id in seen_listing_ids:
            raise CVRPSolverError(f"Duplicate listing_id '{listing_id}' detected at index {idx}.")
        seen_listing_ids.add(listing_id)

        qty = stop.get("quantity_kg")
        if qty is None or not isinstance(qty, (int, float)) or qty <= 0:
            raise CVRPSolverError(
                f"Pickup stop '{listing_id}' has invalid quantity_kg: {qty}. Must be greater than 0."
            )
        total_qty += float(qty)

        all_coords.append((stop.get("lat"), stop.get("lng")))

    all_coords.append((buyer.get("lat"), buyer.get("lng")))
    try:
        validate_coordinates(all_coords, max_coords=52)
    except OSRMValidationError as e:
        raise CVRPSolverError(str(e)) from e

    if total_qty > vehicle_capacity_kg:
        raise CVRPCapacityError(
            f"Total farmer produce ({total_qty:.1f} kg) exceeds vehicle capacity ({vehicle_capacity_kg:.1f} kg)."
        )


def solve_cvrp_ortools(
    distance_matrix_km: List[List[Optional[float]]],
    demands_kg: List[float],
    vehicle_capacity_kg: float,
    time_limit_seconds: int = SOLVER_TIME_LIMIT_SECONDS
) -> Dict[str, Any]:
    """
    Core OR-Tools solver for single-vehicle milk-run CVRP.
    
    Locations:
      0: Depot / Hub
      1 .. N: Farmer Pickups
      N+1: Buyer Destination
    """
    num_locations = len(distance_matrix_km)
    num_farmers = num_locations - 2
    buyer_index = num_locations - 1

    # Convert distance matrix to integer meters with penalty for unreachable cells
    distance_matrix_meters: List[List[int]] = []
    has_unreachable = False

    for row_idx, row in enumerate(distance_matrix_km):
        row_m: List[int] = []
        for col_idx, d_km in enumerate(row):
            if row_idx == col_idx:
                row_m.append(0)
            elif d_km is None:
                row_m.append(UNREACHABLE_PENALTY_METERS)
                has_unreachable = True
            else:
                row_m.append(int(round(d_km * 1000.0)))
        distance_matrix_meters.append(row_m)

    # 1. Routing Index Manager
    # Vehicle starts at Hub (0) and ends at Buyer (buyer_index)
    manager = pywrapcp.RoutingIndexManager(
        num_locations,
        1,  # 1 vehicle
        [0],  # starts
        [buyer_index]  # ends
    )

    # 2. Routing Model
    routing = pywrapcp.RoutingModel(manager)

    # 3. Distance Transit Callback & Arc Cost
    def distance_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix_meters[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # 4. Capacity & Pickup Load Accumulation
    # Node 0 has demand 0, farmers 1..N have positive demands, buyer (N+1) has demand 0
    int_demands = [int(round(d)) for d in demands_kg]

    def demand_callback(from_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        return int_demands[from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    capacity_dimension_name = "Capacity"
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  # null capacity slack
        [int(round(vehicle_capacity_kg))],  # vehicle capacity
        True,  # start cumul to zero
        capacity_dimension_name
    )

    # 5. Search Parameters
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = time_limit_seconds

    # 6. Solve
    solution = routing.SolveWithParameters(search_parameters)

    if not solution:
        raise CVRPRoutingError("OR-Tools solver could not find a feasible route solution.")

    # 7. Extract Sequence
    route_nodes: List[int] = []
    index = routing.Start(0)
    total_distance_meters = 0

    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        route_nodes.append(node)
        previous_index = index
        index = solution.Value(routing.NextVar(index))
        total_distance_meters += routing.GetArcCostForVehicle(previous_index, index, 0)

    # Add terminal end node (Buyer)
    route_nodes.append(manager.IndexToNode(index))

    # Verify no unreachable arcs were chosen
    if total_distance_meters >= UNREACHABLE_PENALTY_METERS:
        raise CVRPRoutingError(
            "Feasible route requires traversing unreachable road segments according to OSRM."
        )

    solver_status_code = routing.status()
    try:
        solver_status = routing_enums_pb2.RoutingSearchStatus.Name(solver_status_code)
    except Exception:
        status_map = {
            0: "ROUTING_NOT_SOLVED",
            1: "ROUTING_SUCCESS",
            2: "ROUTING_PARTIAL_SUCCESS_LOCAL_OPTIMUM_NOT_REACHED",
            3: "ROUTING_FAIL",
            4: "ROUTING_FAIL_TIMEOUT",
            5: "ROUTING_INVALID",
            6: "ROUTING_INFEASIBLE",
            7: "ROUTING_OPTIMAL"
        }
        solver_status = status_map.get(solver_status_code, f"STATUS_{solver_status_code}")

    return {
        "ordered_nodes": route_nodes,
        "solver_status": solver_status,
        "time_limit_seconds": time_limit_seconds
    }


async def solve_cvrp_pipeline(
    hub: Dict[str, float],
    pickup_stops: List[Dict[str, Any]],
    buyer: Dict[str, float],
    vehicle_capacity_kg: float = 2500.0,
    time_limit_seconds: int = SOLVER_TIME_LIMIT_SECONDS
) -> Dict[str, Any]:
    """
    End-to-End CVRP Pipeline:
    1. Validate input parameters
    2. Build location list [Hub, Farmer_1 ... Farmer_N, Buyer]
    3. Query OSRM table endpoint for all-pairs road distance & duration matrix
    4. Solve CVRP with Google OR-Tools
    5. Order waypoints and calculate pickup load accumulation
    6. Query OSRM route endpoint for the optimized waypoint sequence
    7. Query OSRM route endpoint for the baseline waypoint sequence (Hub -> sorted listing IDs -> Buyer)
    8. Compute road distance savings and return full structured result
    """
    validate_cvrp_inputs(hub, pickup_stops, buyer, vehicle_capacity_kg)

    # 1. Prepare ordered coordinate array for matrix
    # Index 0: Hub
    # Index 1 .. N: Farmers
    # Index N+1: Buyer
    all_locations: List[Tuple[float, float]] = [
        (float(hub["lat"]), float(hub["lng"]))
    ]
    demands_kg: List[float] = [0.0]

    for stop in pickup_stops:
        all_locations.append((float(stop["lat"]), float(stop["lng"])))
        demands_kg.append(float(stop["quantity_kg"]))

    all_locations.append((float(buyer["lat"]), float(buyer["lng"])))
    demands_kg.append(0.0)

    # 2. Fetch OSRM Matrix
    matrix_res = await get_distance_matrix(all_locations)
    distance_matrix_km = matrix_res["distances_km"]

    # 3. Solve with OR-Tools
    ortools_res = solve_cvrp_ortools(
        distance_matrix_km=distance_matrix_km,
        demands_kg=demands_kg,
        vehicle_capacity_kg=vehicle_capacity_kg,
        time_limit_seconds=time_limit_seconds
    )

    ordered_node_indices: List[int] = ortools_res["ordered_nodes"]

    # 4. Construct Structured Route with Load Accumulation
    optimized_route_items: List[Dict[str, Any]] = []
    cumulative_load = 0.0
    optimized_coords: List[Tuple[float, float]] = []

    for node_idx in ordered_node_indices:
        if node_idx == 0:
            # Hub
            optimized_route_items.append({
                "type": "hub",
                "index": 0,
                "lat": float(hub["lat"]),
                "lng": float(hub["lng"]),
                "load_after_stop_kg": 0.0
            })
            optimized_coords.append((float(hub["lat"]), float(hub["lng"])))
        elif node_idx == len(all_locations) - 1:
            # Buyer
            optimized_route_items.append({
                "type": "buyer",
                "index": node_idx,
                "lat": float(buyer["lat"]),
                "lng": float(buyer["lng"]),
                "load_after_stop_kg": round(cumulative_load, 1)
            })
            optimized_coords.append((float(buyer["lat"]), float(buyer["lng"])))
        else:
            # Farmer Pickup
            farmer_stop = pickup_stops[node_idx - 1]
            qty = float(farmer_stop["quantity_kg"])
            cumulative_load += qty
            optimized_route_items.append({
                "type": "farmer",
                "index": node_idx,
                "listing_id": farmer_stop["listing_id"],
                "quantity_kg": qty,
                "lat": float(farmer_stop["lat"]),
                "lng": float(farmer_stop["lng"]),
                "load_after_pickup_kg": round(cumulative_load, 1)
            })
            optimized_coords.append((float(farmer_stop["lat"]), float(farmer_stop["lng"])))

    total_load_kg = round(cumulative_load, 1)
    utilization_pct = round((total_load_kg / vehicle_capacity_kg) * 100, 1)

    # 5. Fetch OSRM Road Route for the Optimized Sequence
    optimized_route_res = await get_road_route(optimized_coords)
    road_distance_km = optimized_route_res["distance_km"]
    road_duration_minutes = optimized_route_res["duration_minutes"]
    geometry = optimized_route_res["geometry"]

    # 6. Compute Baseline (Hub -> Farmers in deterministic listing-id order -> Buyer)
    baseline_stops = sorted(pickup_stops, key=lambda s: str(s["listing_id"]))
    baseline_coords: List[Tuple[float, float]] = [
        (float(hub["lat"]), float(hub["lng"]))
    ]
    for b_stop in baseline_stops:
        baseline_coords.append((float(b_stop["lat"]), float(b_stop["lng"])))
    baseline_coords.append((float(buyer["lat"]), float(buyer["lng"])))

    # Fetch baseline road route
    try:
        baseline_res = await get_road_route(baseline_coords)
        baseline_distance_km = baseline_res["distance_km"]
    except Exception as e:
        logger.warning(f"Could not compute baseline route via OSRM, fallback to matrix sum: {e}")
        baseline_distance_km = road_distance_km

    distance_savings_km = round(max(0.0, baseline_distance_km - road_distance_km), 2)
    distance_savings_pct = (
        round((distance_savings_km / baseline_distance_km) * 100, 1)
        if baseline_distance_km > 0
        else 0.0
    )

    return {
        "optimized_route": optimized_route_items,
        "total_load_kg": total_load_kg,
        "vehicle_capacity_kg": vehicle_capacity_kg,
        "capacity_utilization_pct": utilization_pct,
        "road_distance_km": road_distance_km,
        "road_duration_minutes": road_duration_minutes,
        "baseline_distance_km": baseline_distance_km,
        "distance_savings_km": distance_savings_km,
        "distance_savings_pct": distance_savings_pct,
        "geometry": geometry,
        "solver": {
            "name": "Google OR-Tools",
            "first_solution_strategy": "PATH_CHEAPEST_ARC",
            "local_search_metaheuristic": "GUIDED_LOCAL_SEARCH",
            "status": ortools_res["solver_status"],
            "time_limit_seconds": time_limit_seconds,
            "notice": "OR-Tools optimized route using OSRM road-network distances."
        },
        "source": "OSRM + Google OR-Tools",
        "is_estimated": False
    }
