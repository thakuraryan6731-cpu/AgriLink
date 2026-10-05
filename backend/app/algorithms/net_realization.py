import math

def calculate_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def compute_net_realization(
    offer_price: float,
    distance_km: float,
    quantity_kg: float,
    fuel_cost_per_km: float = 14.0,
    handling_fixed: float = 180.0
) -> dict:
    """
    Implements Master Formula (Section 6.3):
    NR_i = P_offer - ((C_fuel * D_i + C_handling) / Q_farmer) - S(D_i)
    """
    pooled_share = min(1.0, quantity_kg / 1500.0)
    trip_cost = (fuel_cost_per_km * distance_km + handling_fixed) * pooled_share
    transport_per_kg = trip_cost / max(quantity_kg, 1.0)
    decay_penalty = (distance_km / 50.0) * 0.05

    net_per_kg = max(0.0, offer_price - transport_per_kg - decay_penalty)

    return {
        "net_per_kg": round(net_per_kg, 2),
        "transport_per_kg": round(transport_per_kg, 2),
        "decay_penalty_per_kg": round(decay_penalty, 2),
        "total_net": round(net_per_kg * quantity_kg, 2)
    }
