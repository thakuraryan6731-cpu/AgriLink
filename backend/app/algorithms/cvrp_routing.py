from typing import List, Dict
import math

def solve_milkrun_cvrp(
    hub_coords: tuple,
    pickup_stops: List[Dict],
    dropoff_coords: tuple,
    vehicle_capacity_kg: float = 2500.0
) -> Dict:
    """
    Solves Capacitated Vehicle Routing Problem for milk-run multi-farmer pickups.
    """
    total_load = sum(p["quantity_kg"] for p in pickup_stops)
    if total_load > vehicle_capacity_kg:
        raise ValueError(f"Total load {total_load}kg exceeds vehicle capacity {vehicle_capacity_kg}kg")

    # Sequential ordering using nearest-neighbor heuristic
    ordered_stops = []
    unvisited = list(pickup_stops)
    curr_lat, curr_lng = hub_coords

    while unvisited:
        nearest_idx = 0
        min_dist = float("inf")
        for idx, stop in enumerate(unvisited):
            d = math.hypot(stop["lat"] - curr_lat, stop["lng"] - curr_lng) * 111.0
            if d < min_dist:
                min_dist = d
                nearest_idx = idx

        next_stop = unvisited.pop(nearest_idx)
        ordered_stops.append(next_stop)
        curr_lat, curr_lng = next_stop["lat"], next_stop["lng"]

    # Calculate total milkrun route distance
    total_km = 0.0
    all_points = [hub_coords] + [(s["lat"], s["lng"]) for s in ordered_stops] + [dropoff_coords]
    for i in range(len(all_points) - 1):
        d = math.hypot(all_points[i+1][0] - all_points[i][0], all_points[i+1][1] - all_points[i][1]) * 111.0 * 1.25
        total_km += d

    return {
        "ordered_pickups": ordered_stops,
        "total_distance_km": round(total_km, 1),
        "current_load_kg": total_load,
        "capacity_utilization_pct": round((total_load / vehicle_capacity_kg) * 100, 1),
        "fuel_cost_inr": round(total_km * 16.5, 2)
    }
