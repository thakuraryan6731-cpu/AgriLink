"""
AgriLink AI - Supply Aggregation Algorithm (Phase 3C)
Problem Statement ID: SIH26033
Ministry of Consumer Affairs, Food & Public Distribution (DoCA)

Implements deterministic supply aggregation of multiple farmer crop lots into
a buyer requirement using:
  - Crop match filter
  - 15 km geographic radius (Haversine distance from cluster seed)
  - 24-hour harvest window alignment
  - Bounded quantity optimization (greedy subset selection)
  - Deterministic tie-breaking (proximity first, then listing ID)

IMPORTANT GEOGRAPHIC DEFINITIONS:
  - All distance comparisons use the Great-Circle Haversine formula.
  - "Distance from cluster seed" = Haversine(farmer_lat/lng, seed_farmer_lat/lng).
  - This is geographic as-the-crow-flies distance, NOT road distance.
  - Road distance will be handled later by CVRP + OSRM (Phase 4).
"""

from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import math


# ─── Algorithm constants ────────────────────────────────────────────────────
MAX_CLUSTER_RADIUS_KM = 15.0       # Maximum Haversine distance from seed farmer to any candidate
MAX_HARVEST_WINDOW_HOURS = 24.0    # Maximum hours between earliest and latest harvest date in cluster
MIN_QUANTITY_KG = 0.0              # Listings with qty <= MIN_QUANTITY_KG are excluded


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Returns Great-Circle geographic distance in km between two GPS coordinates."""
    r = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return round(r * c, 3)


def _parse_harvest_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parses ISO date/datetime string. Returns None if missing or unparseable."""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ",
                "%Y-%m-%dT%H:%M:%S+00:00"):
        try:
            return datetime.strptime(date_str[:19], "%Y-%m-%dT%H:%M:%S" if "T" in date_str else "%Y-%m-%d")
        except ValueError:
            continue
    return None


def _normalize_crop(name: Optional[str]) -> str:
    """Case-insensitive and stripped crop name normalization."""
    if not name:
        return ""
    return name.strip().lower()


def _compute_harvest_window_hours(harvest_dates: List[datetime]) -> float:
    """Returns hours between earliest and latest harvest date in the candidate list."""
    if not harvest_dates or len(harvest_dates) < 2:
        return 0.0
    earliest = min(harvest_dates)
    latest = max(harvest_dates)
    return (latest - earliest).total_seconds() / 3600.0


def aggregate_supply_preview(
    requirement: Dict[str, Any],
    crop_listings: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Calculates a deterministic aggregation preview — does NOT persist.

    Algorithm:
    1. Normalize crop names; filter only listings with matching crop.
    2. Exclude listings with missing/invalid coordinates or zero/negative quantity.
    3. Listings with missing harvest_date are excluded from automated aggregation (explained).
    4. Sort eligible candidates by geographic distance from the seed farmer (closest first).
       Tie-break deterministically by listing id.
    5. Select the closest listing as the cluster seed.
    6. Filter all remaining candidates within MAX_CLUSTER_RADIUS_KM of the seed.
    7. Enforce 24-hour harvest window across all cluster members.
    8. Run bounded greedy subset selection to fill buyer requirement without exceeding it.

    Args:
        requirement: buyer requirement dict (crop_name, required_quantity_kg, max_price_per_kg,
                     destination_lat, destination_lng, delivery_deadline, ...)
        crop_listings: list of available farmer crop inventory dicts.

    Returns:
        Aggregation preview dict with selected_farmers, totals, and diagnostic info.
    """
    req_crop = _normalize_crop(requirement.get("crop_name") or requirement.get("cropName", ""))
    req_qty = float(requirement.get("required_quantity_kg") or requirement.get("requiredQuantityKg") or 0.0)
    req_id = requirement.get("id", "")
    req_deadline = requirement.get("delivery_deadline") or requirement.get("deliveryDeadline")

    if req_qty <= 0:
        return _empty_result(req_id, req_crop, req_qty, "Buyer requirement quantity must be > 0.")

    # ── Step 1: Filter by crop match and valid coordinates ────────────────────
    crop_matched = []
    excluded_no_coords = []
    excluded_bad_qty = []

    for listing in crop_listings:
        l_crop = _normalize_crop(listing.get("crop_name") or listing.get("cropName", ""))
        if l_crop != req_crop:
            continue  # Crop mismatch

        l_qty = float(listing.get("quantity_kg") or listing.get("quantityKg") or 0.0)
        if l_qty <= MIN_QUANTITY_KG:
            excluded_bad_qty.append(listing.get("id", "?"))
            continue

        l_lat = listing.get("latitude")
        l_lng = listing.get("longitude")
        if l_lat is None or l_lng is None:
            excluded_no_coords.append(listing.get("id", "?"))
            continue

        crop_matched.append(listing)

    if not crop_matched:
        return _empty_result(req_id, req_crop, req_qty,
                             f"No eligible listings match crop '{req_crop}' with valid coordinates.")

    # ── Step 2: Separate listings by harvest date availability ────────────────
    with_harvest = []
    excluded_no_harvest = []

    for listing in crop_matched:
        harvest_str = listing.get("harvest_date") or listing.get("harvestDate")
        if _parse_harvest_date(harvest_str) is None:
            excluded_no_harvest.append(listing.get("id", "?"))
        else:
            with_harvest.append(listing)

    if not with_harvest:
        return _empty_result(
            req_id, req_crop, req_qty,
            "All crop-matched listings are missing harvest dates. "
            "Automated aggregation requires harvest_date. Excluded listings: " +
            ", ".join(excluded_no_harvest)
        )

    # ── Step 3: Select cluster seed = listing with smallest ID (deterministic) ─
    # Sort by listing id for determinism when no destination coordinates are available.
    # In a future authenticated flow, the seed would come from the first matched farmer.
    with_harvest.sort(key=lambda l: str(l.get("id", "")))
    seed = with_harvest[0]
    seed_lat = float(seed["latitude"])
    seed_lng = float(seed["longitude"])

    # ── Step 4: Filter candidates within 15 km of seed ───────────────────────
    candidates = []
    excluded_too_far = []

    for listing in with_harvest:
        l_lat = float(listing["latitude"])
        l_lng = float(listing["longitude"])
        dist = _haversine_km(seed_lat, seed_lng, l_lat, l_lng)
        listing_with_dist = {**listing, "_dist_from_seed_km": dist}

        if dist <= MAX_CLUSTER_RADIUS_KM:
            candidates.append(listing_with_dist)
        else:
            excluded_too_far.append({"id": listing.get("id", "?"), "dist_km": dist})

    if not candidates:
        return _empty_result(req_id, req_crop, req_qty,
                             f"No listings within {MAX_CLUSTER_RADIUS_KM} km of cluster seed.")

    # ── Step 5: Sort candidates by distance then listing ID (deterministic) ───
    candidates.sort(key=lambda l: (l["_dist_from_seed_km"], str(l.get("id", ""))))

    # ── Step 6: Enforce 24-hour harvest window (rolling inclusion) ─────────────
    # Start with seed harvest date, include subsequent candidates only if the overall
    # window from earliest to latest does not exceed 24 hours.
    eligible = []
    harvest_dates_in_cluster = []

    for listing in candidates:
        harvest_str = listing.get("harvest_date") or listing.get("harvestDate")
        h_dt = _parse_harvest_date(harvest_str)
        trial_dates = harvest_dates_in_cluster + [h_dt]
        window_hours = _compute_harvest_window_hours(trial_dates)
        if window_hours <= MAX_HARVEST_WINDOW_HOURS:
            eligible.append(listing)
            harvest_dates_in_cluster.append(h_dt)

    if not eligible:
        return _empty_result(req_id, req_crop, req_qty,
                             "No candidates fit within the 24-hour harvest window.")

    # ── Step 7: Bounded greedy subset selection (quantity optimization) ────────
    # Goal: fill buyer requirement without exceeding it.
    # Strategy: Greedy selection sorted by proximity (nearest first).
    # If a candidate would cause total to exceed requirement, still include it
    # if it's the last eligible candidate needed. Clamp contribution at remaining.
    selected = []
    total_selected_kg = 0.0
    remaining_kg = req_qty

    for listing in eligible:
        if remaining_kg <= 0:
            break
        l_qty = float(listing.get("quantity_kg") or listing.get("quantityKg") or 0.0)
        contribution = min(l_qty, remaining_kg)
        selected.append({
            "listing_id": str(listing.get("id", "")),
            "farmer_id": str(listing.get("farmer_id") or listing.get("farmerId") or ""),
            "farmer_name": listing.get("farmer_name") or listing.get("farmerName") or "Farmer",
            "crop_name": listing.get("crop_name") or listing.get("cropName", ""),
            "quantity_kg": l_qty,
            "contribution_kg": round(contribution, 2),
            "asking_price_per_kg": float(listing.get("asking_price_per_kg") or listing.get("askingPricePerKg") or 0.0),
            "quality_grade": listing.get("quality_grade") or listing.get("qualityGrade", "Grade A"),
            "latitude": float(listing["latitude"]),
            "longitude": float(listing["longitude"]),
            "harvest_date": listing.get("harvest_date") or listing.get("harvestDate"),
            "distance_from_seed_km": round(listing["_dist_from_seed_km"], 2),
            "location_name": listing.get("location_name") or listing.get("locationName") or ""
        })
        total_selected_kg += contribution
        remaining_kg -= contribution

    total_selected_kg = round(total_selected_kg, 2)
    remaining_kg = round(max(0.0, req_qty - total_selected_kg), 2)

    # ── Step 8: Harvest window stats ──────────────────────────────────────────
    selected_harvest_dates = [
        _parse_harvest_date(f["harvest_date"]) for f in selected if f["harvest_date"]
    ]
    harvest_window_hours = round(_compute_harvest_window_hours(selected_harvest_dates), 1)

    # ── Step 9: Cluster radius (max dist from seed among selected) ────────────
    actual_radius_km = max(
        (f["distance_from_seed_km"] for f in selected), default=0.0
    )

    # Weighted average price
    avg_price = (
        sum(f["contribution_kg"] * f["asking_price_per_kg"] for f in selected) / total_selected_kg
        if total_selected_kg > 0 else 0.0
    )

    is_fully_satisfied = remaining_kg == 0.0

    return {
        "requirement_id": req_id,
        "crop": req_crop,
        "required_quantity_kg": req_qty,
        "total_selected_kg": total_selected_kg,
        "remaining_kg": remaining_kg,
        "is_fully_satisfied": is_fully_satisfied,
        "fulfillment_percentage": round((total_selected_kg / req_qty) * 100, 1) if req_qty > 0 else 0.0,
        "selected_farmers": selected,
        "farmer_count": len(selected),
        "cluster_seed_listing_id": str(seed.get("id", "")),
        "cluster_radius_km": round(actual_radius_km, 2),
        "max_allowed_radius_km": MAX_CLUSTER_RADIUS_KM,
        "harvest_window_hours": harvest_window_hours,
        "max_allowed_harvest_window_hours": MAX_HARVEST_WINDOW_HOURS,
        "avg_price_per_kg": round(avg_price, 2),
        "excluded_no_harvest_date": excluded_no_harvest,
        "excluded_too_far": excluded_too_far,
        "excluded_no_coords": excluded_no_coords,
        "excluded_bad_qty": excluded_bad_qty,
        "status": "AGGREGATING" if is_fully_satisfied else "MATCHED",
        "notice": "Aggregation preview only. Not persisted. Distance is Haversine geographic, not road distance.",
        "is_estimated": True
    }


def _empty_result(req_id: str, crop: str, req_qty: float, reason: str) -> Dict[str, Any]:
    """Returns a no-result aggregation response with an explanation."""
    return {
        "requirement_id": req_id,
        "crop": crop,
        "required_quantity_kg": req_qty,
        "total_selected_kg": 0.0,
        "remaining_kg": req_qty,
        "is_fully_satisfied": False,
        "fulfillment_percentage": 0.0,
        "selected_farmers": [],
        "farmer_count": 0,
        "cluster_seed_listing_id": None,
        "cluster_radius_km": 0.0,
        "max_allowed_radius_km": MAX_CLUSTER_RADIUS_KM,
        "harvest_window_hours": 0.0,
        "max_allowed_harvest_window_hours": MAX_HARVEST_WINDOW_HOURS,
        "avg_price_per_kg": 0.0,
        "excluded_no_harvest_date": [],
        "excluded_too_far": [],
        "excluded_no_coords": [],
        "excluded_bad_qty": [],
        "status": "MATCHED",
        "notice": reason,
        "is_estimated": True
    }
