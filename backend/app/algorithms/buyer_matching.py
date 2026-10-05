"""
AgriLink AI - Buyer Matching & Net Realization Algorithm (Phase 3B)
Problem Statement ID: SIH26033
Ministry of Consumer Affairs, Food & Public Distribution (DoCA)

Authoritative implementation of:
1. Multi-factor weighted buyer matching score S_match:
   S_match = 0.30 * C_crop + 0.20 * S_qty + 0.20 * S_price + 0.15 * S_dist + 0.10 * S_qual + 0.05 * S_feas
   (When S_dist is unavailable / None, weights are dynamically renormalized over the 5 available factors)
2. True Net Realization per kg (NR_i):
   NR_i = P_offer,i - ((C_transport * D_i + C_handling) / Q_farmer) - S(D_i)
   Where C_transport is the prototype estimated transport operating cost per km (not live fuel pricing).
"""

from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
import math

# Weight distribution strictly adhering to Section 1
WEIGHT_CROP = 0.30
WEIGHT_QTY = 0.20
WEIGHT_PRICE = 0.20
WEIGHT_DIST = 0.15
WEIGHT_QUAL = 0.10
WEIGHT_FEAS = 0.05

# Default logistics constants
DEFAULT_TRANSPORT_COST_PER_KM = 15.0   # INR/km prototype estimated transport operating cost per km (not live fuel pricing)
DEFAULT_HANDLING_FIXED = 180.0         # INR loading/crates
MAX_ECONOMIC_DISTANCE_KM = 300.0       # Max distance normalization radius
PERISHABILITY_RATE_PER_50KM = 0.05     # INR/kg decay penalty per 50 km


def calculate_haversine_distance(
    lat1: Optional[float],
    lon1: Optional[float],
    lat2: Optional[float],
    lon2: Optional[float]
) -> Optional[float]:
    """
    Computes Great-Circle Geographic Distance between two GPS coordinates in Kilometers.
    Returns None if any coordinate is missing or invalid.
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    except (ValueError, TypeError):
        return None

    if not (-90.0 <= lat1 <= 90.0 and -90.0 <= lat2 <= 90.0 and -180.0 <= lon1 <= 180.0 and -180.0 <= lon2 <= 180.0):
        return None

    r_earth_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return round(r_earth_km * c, 2)


def compute_factor_crop(farmer_crop: Optional[str], buyer_crop: Optional[str]) -> float:
    """Factor 1: Crop Compatibility C_crop. 1.0 if identical crop, 0.0 otherwise."""
    if not farmer_crop or not buyer_crop:
        return 0.0
    return 1.0 if farmer_crop.strip().lower() == buyer_crop.strip().lower() else 0.0


def compute_factor_quantity(farmer_qty_kg: float, buyer_req_qty_kg: float) -> float:
    """Factor 2: Quantity Fit S_qty. Normalized [0, 1]."""
    if farmer_qty_kg <= 0 or buyer_req_qty_kg <= 0:
        return 0.0
    ratio = float(farmer_qty_kg) / float(buyer_req_qty_kg)
    return round(min(1.0, max(0.0, ratio)), 4)


def compute_factor_price(farmer_asking_price: float, buyer_max_price: float) -> float:
    """Factor 3: Price Fit S_price. Normalized [0, 1]."""
    if farmer_asking_price <= 0 or buyer_max_price <= 0:
        return 0.0

    if buyer_max_price >= farmer_asking_price:
        surplus_ratio = (buyer_max_price - farmer_asking_price) / farmer_asking_price
        score = 0.85 + 0.15 * min(1.0, surplus_ratio)
    else:
        deficit_ratio = (farmer_asking_price - buyer_max_price) / farmer_asking_price
        score = max(0.0, 1.0 - deficit_ratio)

    return round(min(1.0, max(0.0, score)), 4)


def compute_factor_distance(
    distance_km: Optional[float],
    max_dist_km: float = MAX_ECONOMIC_DISTANCE_KM
) -> Optional[float]:
    """
    Factor 4: Distance Fit S_dist. Normalized [0, 1].
    Returns None if distance is unavailable, allowing dynamic weight renormalization.
    """
    if distance_km is None:
        return None

    if distance_km < 0:
        return 0.0

    score = 1.0 - (distance_km / max_dist_km)
    return round(min(1.0, max(0.0, score)), 4)


def compute_factor_quality(farmer_grade: Optional[str], buyer_grade: Optional[str]) -> float:
    """Factor 5: Quality Fit S_qual. Normalized [0, 1]."""
    if not farmer_grade or not buyer_grade:
        return 0.50  # Neutral fallback when quality data is absent

    f_g = farmer_grade.strip()
    b_g = buyer_grade.strip()

    grade_ranks = {"Grade A": 3, "Grade B": 2, "Grade C": 1}
    f_rank = grade_ranks.get(f_g, 2)
    b_rank = grade_ranks.get(b_g, 2)

    if f_rank >= b_rank:
        return 1.0
    elif f_rank == 2 and b_rank == 3:
        return 0.65
    elif f_rank == 1 and b_rank == 2:
        return 0.50
    elif f_rank == 1 and b_rank == 3:
        return 0.30
    return 0.50


def compute_factor_feasibility(
    farmer_qty_kg: float,
    harvest_date: Optional[str] = None,
    delivery_deadline: Optional[str] = None
) -> float:
    """Factor 6: Feasibility S_feas. Considers timeline constraint and minimum lot size."""
    qty_feas = min(1.0, max(0.0, farmer_qty_kg / 50.0)) if farmer_qty_kg > 0 else 0.0

    timeline_feas = 1.0
    if harvest_date and delivery_deadline:
        try:
            h_dt = datetime.fromisoformat(harvest_date.replace("Z", "+00:00")).date()
            d_dt = datetime.fromisoformat(delivery_deadline.replace("Z", "+00:00")).date()
            if h_dt > d_dt:
                timeline_feas = 0.20
            else:
                timeline_feas = 1.0
        except Exception:
            timeline_feas = 0.80

    return round(qty_feas * timeline_feas, 4)


def compute_match_score(
    c_crop: float,
    s_qty: float,
    s_price: float,
    s_dist: Optional[float],
    s_qual: float,
    s_feas: float
) -> float:
    """
    Computes final weighted match score S_match:
    When distance is available:
      S_match = 0.30*C_crop + 0.20*S_qty + 0.20*S_price + 0.15*S_dist + 0.10*S_qual + 0.05*S_feas
    When distance is unavailable (s_dist is None):
      Dynamically renormalizes weights across the remaining 5 factors:
      effective_weight_sum = 0.30 + 0.20 + 0.20 + 0.10 + 0.05 = 0.85
      S_match = (0.30*C_crop + 0.20*S_qty + 0.20*S_price + 0.10*S_qual + 0.05*S_feas) / 0.85
    """
    if s_dist is None:
        effective_weight_sum = WEIGHT_CROP + WEIGHT_QTY + WEIGHT_PRICE + WEIGHT_QUAL + WEIGHT_FEAS
        raw_score = (
            WEIGHT_CROP * c_crop +
            WEIGHT_QTY * s_qty +
            WEIGHT_PRICE * s_price +
            WEIGHT_QUAL * s_qual +
            WEIGHT_FEAS * s_feas
        )
        score = raw_score / effective_weight_sum if effective_weight_sum > 0 else 0.0
    else:
        score = (
            WEIGHT_CROP * c_crop +
            WEIGHT_QTY * s_qty +
            WEIGHT_PRICE * s_price +
            WEIGHT_DIST * s_dist +
            WEIGHT_QUAL * s_qual +
            WEIGHT_FEAS * s_feas
        )
    return round(min(1.0, max(0.0, score)), 4)


def compute_net_realization(
    buyer_offer_price: float,
    distance_km: Optional[float],
    farmer_qty_kg: float,
    mandi_benchmark_price: float = 19.0,
    transport_cost_per_km: float = DEFAULT_TRANSPORT_COST_PER_KM,
    handling_fixed_cost: float = DEFAULT_HANDLING_FIXED
) -> Dict[str, Any]:
    """
    Calculates True Net Realization (NR_i) per kg:
    NR_i = P_offer,i - ((C_transport * D_i + C_handling) / Q_farmer) - S(D_i)
    Where:
      C_transport = Prototype estimated transport operating cost per km (₹15.00/km, not live fuel pricing).
      S(D_i) = 0.05 * (D_i / 50) per kg perishability transit decay.
    """
    if farmer_qty_kg <= 0 or buyer_offer_price <= 0:
        return {
            "net_realization_per_kg": 0.0,
            "total_net_realization_inr": 0.0,
            "transport_cost_per_kg": 0.0,
            "fuel_cost_per_kg": 0.0,
            "handling_cost_per_kg": 0.0,
            "perishability_decay_per_kg": 0.0,
            "traditional_mandi_net_per_kg": 0.0,
            "profit_gain_percentage": 0.0,
            "extra_income_inr": 0.0,
            "is_distance_available": distance_km is not None
        }

    if distance_km is None:
        handling_per_kg = round(max(0.0, handling_fixed_cost) / farmer_qty_kg, 2)
        net_realization_per_kg = max(0.0, round(buyer_offer_price - handling_per_kg, 2))
        total_net_inr = round(net_realization_per_kg * farmer_qty_kg, 2)

        mandi_gross = max(0.0, mandi_benchmark_price)
        mandi_deductions = (mandi_gross * 0.14) + 2.20
        traditional_mandi_net_per_kg = max(0.0, round(mandi_gross - mandi_deductions, 2))
        traditional_total = traditional_mandi_net_per_kg * farmer_qty_kg
        extra_income_inr = max(0.0, round(total_net_inr - traditional_total, 2))
        profit_gain_pct = (
            round(((net_realization_per_kg - traditional_mandi_net_per_kg) / max(traditional_mandi_net_per_kg, 0.01)) * 100, 1)
            if traditional_mandi_net_per_kg > 0 else 0.0
        )

        return {
            "net_realization_per_kg": net_realization_per_kg,
            "total_net_realization_inr": total_net_inr,
            "transport_cost_per_kg": 0.0,
            "fuel_cost_per_kg": 0.0,
            "handling_cost_per_kg": handling_per_kg,
            "perishability_decay_per_kg": 0.0,
            "traditional_mandi_net_per_kg": traditional_mandi_net_per_kg,
            "profit_gain_percentage": profit_gain_pct,
            "extra_income_inr": extra_income_inr,
            "is_distance_available": False
        }

    d = max(0.0, float(distance_km))
    offer = max(0.0, float(buyer_offer_price))
    c_transport = max(0.0, float(transport_cost_per_km))
    c_handling = max(0.0, float(handling_fixed_cost))

    # Pooled truckload share: normalized against standard 1.5-tonne (1500 kg) vehicle
    pooled_share = min(1.0, max(0.01, farmer_qty_kg / 1500.0))
    total_trip_transport_cost = (c_transport * d + c_handling) * pooled_share

    transport_cost_per_kg = round(total_trip_transport_cost / farmer_qty_kg, 2)
    handling_cost_per_kg = round((c_handling * pooled_share) / farmer_qty_kg, 2)

    # Perishability decay S(D_i): ₹0.05/kg per 50 km
    decay_penalty = round((d / 50.0) * PERISHABILITY_RATE_PER_50KM, 2)

    net_realization_per_kg = max(0.0, round(offer - transport_cost_per_kg - decay_penalty, 2))
    total_net_inr = round(net_realization_per_kg * farmer_qty_kg, 2)

    # Traditional Mandi Baseline Comparison:
    mandi_gross = max(0.0, mandi_benchmark_price)
    mandi_deductions = (mandi_gross * 0.14) + 2.20
    traditional_mandi_net_per_kg = max(0.0, round(mandi_gross - mandi_deductions, 2))
    traditional_total = traditional_mandi_net_per_kg * farmer_qty_kg

    extra_income_inr = max(0.0, round(total_net_inr - traditional_total, 2))
    profit_gain_pct = (
        round(((net_realization_per_kg - traditional_mandi_net_per_kg) / max(traditional_mandi_net_per_kg, 0.01)) * 100, 1)
        if traditional_mandi_net_per_kg > 0 else 0.0
    )

    return {
        "net_realization_per_kg": net_realization_per_kg,
        "total_net_realization_inr": total_net_inr,
        "transport_cost_per_kg": transport_cost_per_kg,
        "fuel_cost_per_kg": transport_cost_per_kg,
        "handling_cost_per_kg": handling_cost_per_kg,
        "perishability_decay_per_kg": decay_penalty,
        "traditional_mandi_net_per_kg": traditional_mandi_net_per_kg,
        "profit_gain_percentage": profit_gain_pct,
        "extra_income_inr": extra_income_inr,
        "is_distance_available": True
    }


def match_listing_against_requirements(
    listing: Dict[str, Any],
    buyer_requirements: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Evaluates a farmer crop listing against a list of open buyer requirements,
    computing factor scores, weighted match score, distance, and net realization.
    Returns ranked results descending by match_score.
    """
    results = []

    f_crop = listing.get("crop_name") or listing.get("cropName", "")
    f_qty = float(listing.get("quantity_kg") or listing.get("quantityKg") or 0.0)
    f_price = float(listing.get("asking_price_per_kg") or listing.get("askingPricePerKg") or 0.0)
    f_mandi = float(listing.get("mandi_benchmark_price") or listing.get("mandiBenchmarkPrice") or 19.0)
    f_grade = listing.get("quality_grade") or listing.get("qualityGrade", "Grade A")
    f_lat = listing.get("latitude")
    f_lng = listing.get("longitude")
    f_harvest = listing.get("harvest_date") or listing.get("harvestDate")

    for req in buyer_requirements:
        req_id = req.get("id", "")
        b_crop = req.get("crop_name") or req.get("cropName", "")
        b_qty = float(req.get("required_quantity_kg") or req.get("requiredQuantityKg") or 0.0)
        b_price = float(req.get("max_price_per_kg") or req.get("maxPricePerKg") or 0.0)
        b_grade = req.get("preferred_quality_grade") or req.get("preferredQualityGrade", "Grade A")
        b_lat = req.get("destination_lat") or req.get("destinationLat")
        b_lng = req.get("destination_lng") or req.get("destinationLng")
        b_deadline = req.get("delivery_deadline") or req.get("deliveryDeadline")
        b_name = req.get("buyer_name") or req.get("buyerName") or "Verified Bulk Buyer"
        b_type = req.get("buyer_type") or req.get("buyerType") or "Modern Retailer"
        b_dest = req.get("destination_name") or req.get("destinationName") or "Distribution Center"

        # 1. Distance (None if coordinates missing)
        dist_km = calculate_haversine_distance(f_lat, f_lng, b_lat, b_lng)

        # 2. Six Factors (Distance factor is None when distance is missing)
        c_crop = compute_factor_crop(f_crop, b_crop)
        s_qty = compute_factor_quantity(f_qty, b_qty)
        s_price = compute_factor_price(f_price, b_price)
        s_dist = compute_factor_distance(dist_km)
        s_qual = compute_factor_quality(f_grade, b_grade)
        s_feas = compute_factor_feasibility(f_qty, f_harvest, b_deadline)

        # 3. Weighted Match Score (with dynamic weight renormalization if s_dist is None)
        score = compute_match_score(c_crop, s_qty, s_price, s_dist, s_qual, s_feas)

        # 4. Net Realization
        net_calc = compute_net_realization(
            buyer_offer_price=b_price,
            distance_km=dist_km,
            farmer_qty_kg=f_qty,
            mandi_benchmark_price=f_mandi
        )

        results.append({
            "buyer_requirement_id": req_id,
            "buyer_name": b_name,
            "buyer_type": b_type,
            "destination_name": b_dest,
            "crop": b_crop,
            "required_quantity_kg": b_qty,
            "offer_price_per_kg": b_price,
            "match_score": score,
            "match_percentage": int(round(score * 100)),
            "factor_scores": {
                "crop": c_crop,
                "quantity": s_qty,
                "price": s_price,
                "distance": s_dist,
                "quality": s_qual,
                "feasibility": s_feas
            },
            "distance_km": dist_km,
            "estimated_net_realization_per_kg": net_calc["net_realization_per_kg"],
            "total_net_realization_inr": net_calc["total_net_realization_inr"],
            "profit_gain_percentage": net_calc["profit_gain_percentage"],
            "extra_income_inr": net_calc["extra_income_inr"],
            "transport_cost_per_kg": net_calc["transport_cost_per_kg"],
            "fuel_cost_per_kg": net_calc["fuel_cost_per_kg"],
            "handling_cost_per_kg": net_calc["handling_cost_per_kg"],
            "perishability_decay_per_kg": net_calc["perishability_decay_per_kg"],
            "traditional_mandi_net_per_kg": net_calc["traditional_mandi_net_per_kg"]
        })

    # Sort descending by match_score
    results.sort(key=lambda x: (x["match_score"], x["estimated_net_realization_per_kg"]), reverse=True)
    return results
