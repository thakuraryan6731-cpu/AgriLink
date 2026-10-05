# Buyer Matching & Net Realization Engine (Phase 3B)

## 1. Overview & Architecture

The **Buyer Matching and Net Realization Engine** is AgriLink AI's authoritative matching sub-system. It connects smallholder farmers to high-intent institutional, bulk, and retail buyer requirements by evaluating multi-dimensional compatibility and computing the exact post-logistics Net Realization ($NR$).

### Architecture Flow

```
┌─────────────────────────────────┐
│     Farmer Screen 4 (UI)        │
│    (RecommendedBuyers.tsx)      │
└────────────────┬────────────────┘
                 │
                 │ 1. Fetch Listings & Requirements (Supabase DB)
                 ▼
┌─────────────────────────────────┐
│       matchingService.ts        │
└────────────────┬────────────────┘
                 │
                 │ 2. POST /api/matching/recommendations
                 ▼
┌─────────────────────────────────┐
│        FastAPI Gateway          │
│        (main.py)                │
└────────────────┬────────────────┘
                 │
                 │ 3. Execute Deterministic Evaluation
                 ▼
┌─────────────────────────────────┐
│    buyer_matching.py Engine     │
│  - 6 Factor Normalizations      │
│  - Dynamic Weight Normalization │
│  - Net Realization (NR) Model   │
└────────────────┬────────────────┘
                 │
                 │ 4. Deterministic Ranked Matches
                 ▼
┌─────────────────────────────────┐
│   Screen 4: Match Breakdown     │
│   & Estimated Net Realization   │
└─────────────────────────────────┘
```

> **Authoritative Backend Requirement**: All matching calculations and net realization equations execute exclusively in Python (`backend/app/algorithms/buyer_matching.py`). The frontend does not calculate authoritative matching scores.

---

## 2. Trust Boundary & Authorization Architecture

### Current Endpoint Limitation
- **Pure Calculation Endpoint**: In Phase 3B, `POST /api/matching/recommendations` operates strictly as a **stateless mathematical calculation engine**.
- **No Client Authorization Proof**: Client-supplied `farmer_id`, listing attributes, or buyer fields are processed strictly as calculation inputs. **No authorization decision or record ownership is granted based on client-supplied IDs.**
- **Future Authenticated Flow**: When backend authentication is finalized in future integration phases, the backend will verify the caller's Supabase JWT identity (`auth.uid()`), retrieve the farmer's authoritative `crop_inventory` records directly from Supabase, and discard any untrusted client-supplied identity parameters.

---

## 3. Multi-Factor Buyer Matching Model

### Base Formula (When All Factors are Present)

The match score $S_{\text{match}} \in [0, 1]$ is a convex combination of six normalized factor scores:

$$S_{\text{match}} = 0.30 \cdot C_{\text{crop}} + 0.20 \cdot S_{\text{qty}} + 0.20 \cdot S_{\text{price}} + 0.15 \cdot S_{\text{dist}} + 0.10 \cdot S_{\text{qual}} + 0.05 \cdot S_{\text{feas}}$$

### Missing Distance & Dynamic Weight Renormalization
When GPS coordinates for either the farmer or buyer are missing or unparseable:
- $S_{\text{dist}} = \text{None}$ (**Distance is NOT assigned an artificial 0.50 score**).
- The remaining 5 factors are dynamically renormalized across their effective weight sum:

$$\text{effective\_weight\_sum} = 0.30 + 0.20 + 0.20 + 0.10 + 0.05 = 0.85$$

$$S_{\text{match}} = \frac{0.30 \cdot C_{\text{crop}} + 0.20 \cdot S_{\text{qty}} + 0.20 \cdot S_{\text{price}} + 0.10 \cdot S_{\text{qual}} + 0.05 \cdot S_{\text{feas}}}{0.85}$$

### Factor Normalization Rules

| Factor | Weight | Formula / Rule | Boundary & Edge Handling |
| :--- | :--- | :--- | :--- |
| **$C_{\text{crop}}$** (Crop Fit) | 30% | $C_{\text{crop}} = 1.0$ if normalized crop names match, else $0.0$ | Case-insensitive and trimmed string comparison. If mismatch, match is invalidated. |
| **$S_{\text{qty}}$** (Quantity Fit) | 20% | $S_{\text{qty}} = \min\left(1.0, \frac{Q_{\text{farmer}}}{Q_{\text{req}}}\right)$ | If $Q_{\text{req}} \le 0$ or $Q_{\text{farmer}} \le 0$, returns $0.0$. Rewards meeting or exceeding requested volume. |
| **$S_{\text{price}}$** (Price Fit) | 20% | If $P_{\text{offer}} \ge P_{\text{ask}}$: $S_{\text{price}} = \min(1.0, 0.85 + 0.15 \cdot \frac{P_{\text{offer}} - P_{\text{ask}}}{P_{\text{ask}}})$<br>If $P_{\text{offer}} < P_{\text{ask}}$: $S_{\text{price}} = \max(0.0, 0.85 - 1.50 \cdot \frac{P_{\text{ask}} - P_{\text{offer}}}{P_{\text{ask}}})$ | If $P_{\text{ask}} \le 0$ or $P_{\text{offer}} \le 0$, returns $0.0$. Buyers paying a premium receive up to $1.00$; steep discount drops score rapidly. |
| **$S_{\text{dist}}$** (Distance Fit) | 15% | $S_{\text{dist}} = \max\left(0.0, 1.0 - \frac{D}{D_{\text{max}}}\right)$ where $D_{\text{max}} = 300\text{ km}$ | Geographic distance via Great-Circle Haversine formula. If coordinates are missing, returns $\text{None}$ (triggers weight renormalization). |
| **$S_{\text{qual}}$** (Quality Fit) | 10% | Grade mapping: $\text{Grade A} = 3$, $\text{Grade B} = 2$, $\text{Grade C} = 1$<br>$\Delta G = G_{\text{farmer}} - G_{\text{req}}$<br>If $\Delta G \ge 0 \implies 1.0$; if $\Delta G = -1 \implies 0.65$; if $\Delta G = -2 \implies 0.30$ | If quality grade is missing or invalid, returns neutral low-confidence score $0.50$. |
| **$S_{\text{feas}}$** (Feasibility) | 5% | Start with baseline $1.0$.<br>- Deduct $0.30$ if $Q_{\text{farmer}} < 50\text{ kg}$ (sub-economic lot size).<br>- Deduct $0.40$ if delivery deadline is before harvest date. | Clamped to $[0.0, 1.0]$. Evaluates temporal and physical fulfillment feasibility. |

---

## 4. Net Realization Engine

The authoritative **Net Realization** ($NR_i$) computes the true take-home earnings per kilogram for a farmer after accounting for transport costs, handling, and perishability transit decay.

### Master Net Realization Equation

$$NR_i = P_{\text{offer}, i} - \left( \frac{C_{\text{transport}} \cdot D_i + C_{\text{handling}}}{Q_{\text{farmer}}} \right) - S(D_i)$$

Where:
- $P_{\text{offer}, i}$: Buyer offer price per kg (₹/kg)
- $C_{\text{transport}}$: **Prototype estimated transport operating cost per km (₹15.00/km)**. *(Note: This is an estimated standard operational benchmark, not live fuel pricing).*
- $D_i$: Great-circle transit distance between farmer location and buyer destination (km)
- $C_{\text{handling}}$: Terminal loading/unloading and mandi gate handling fee (Default: ₹180.00 fixed)
- $Q_{\text{farmer}}$: Available farmer lot size (kg)
- $S(D_i)$: Distance perishability and quality decay rate (₹/kg)

### Distance Decay Model

$$S(D_i) = 0.05 \cdot \left( \frac{D_i}{50} \right)$$

*Rate*: ₹0.05 per kg per 50 km of transit distance ($₹0.001 / \text{kg} \cdot \text{km}$).

### Edge-Case Handling & Boundary Safeguards

1. **Zero / Negative Quantity ($Q_{\text{farmer}} \le 0$)**:
   - Engine returns $NR = 0.0$ to prevent division-by-zero.
2. **Missing Distance ($D_i = \text{None}$)**:
   - When distance coordinates are missing, returns `is_distance_available: False`, `transport_cost_per_kg: 0.0`, `perishability_decay_per_kg: 0.0`, and bases net realization on gross offer minus fixed handling fee.
3. **Negative Costs**:
   - Transport and handling costs are clamped to non-negative values ($\ge 0$).

---

## 5. API Specification

### `POST /api/matching/recommendations`

#### Request Payload
```json
{
  "listing": {
    "id": "list-tomato-001",
    "crop_name": "Tomato",
    "quantity_kg": 500,
    "asking_price_per_kg": 30.0,
    "mandi_benchmark_price": 19.0,
    "quality_grade": "Grade A",
    "latitude": 20.0059,
    "longitude": 73.7898,
    "harvest_date": "2026-09-15"
  },
  "buyer_requirements": [
    {
      "id": "req-001",
      "buyer_id": "buyer-uuid-1",
      "buyer_name": "Reliance Fresh DC",
      "buyer_type": "Modern Retailer",
      "crop_name": "Tomato",
      "required_quantity_kg": 600,
      "max_price_per_kg": 34.0,
      "preferred_quality_grade": "Grade A",
      "destination_lat": 19.2968,
      "destination_lng": 73.0631,
      "delivery_deadline": "2026-09-20"
    }
  ]
}
```

#### Response Payload
```json
{
  "source": "AgriLink Supabase + AgriLink Matching Engine",
  "is_estimated": true,
  "listing_id": "list-tomato-001",
  "crop": "Tomato",
  "quantity_kg": 500,
  "asking_price_per_kg": 30.0,
  "total_matches_evaluated": 1,
  "total_matches_found": 1,
  "results": [
    {
      "buyer_requirement_id": "req-001",
      "buyer_name": "Reliance Fresh DC",
      "buyer_type": "Modern Retailer",
      "destination_name": "Distribution Center",
      "crop": "Tomato",
      "required_quantity_kg": 600,
      "offer_price_per_kg": 34.0,
      "match_score": 0.89,
      "match_percentage": 89,
      "factor_scores": {
        "crop": 1.0,
        "quantity": 0.8333,
        "price": 0.9382,
        "distance": 0.723,
        "quality": 1.0,
        "feasibility": 1.0
      },
      "distance_km": 83.1,
      "estimated_net_realization_per_kg": 32.85,
      "total_net_realization_inr": 16425.0,
      "profit_gain_percentage": 132.3,
      "extra_income_inr": 9355.0,
      "transport_cost_per_kg": 1.07,
      "fuel_cost_per_kg": 1.07,
      "handling_cost_per_kg": 0.12,
      "perishability_decay_per_kg": 0.08,
      "traditional_mandi_net_per_kg": 14.14
    }
  ]
}
```

---

## 6. UI Integration & Diagnostics (Screen 4)

1. **6-Factor Breakdown**:
   - Progress chips display exact percentages for $C_{\text{crop}}, S_{\text{qty}}, S_{\text{price}}, S_{\text{dist}}, S_{\text{qual}}, S_{\text{feas}}$.
   - If distance coordinates are unverified, displays `N/A*` with the banner: `* Distance coordinates unverified — weights dynamically renormalized across 5 available factors.`
2. **True Net Realization**:
   - Compares gross buyer offer against net payout after logistics deduction ($C_{\text{transport}}$ + handling) and perishability decay ($S(D_i)$).
3. **Empty States**:
   - *No crop inventory*: Displays `"No produce listings available. Create your first crop listing to discover matching buyers."`
   - *No open requirements*: Displays `"No open buyer requirements found."`
4. **Service Unavailable**:
   - When FastAPI is offline, shows `"Buyer Matching Service Unavailable"` with diagnostic backend start instructions, a Retry button, and an explicit offline developer sandbox.

---

## 7. What is Real vs Estimated / Prototype Disclaimers

- **Real Data**:
  - Farmer crop inventory and buyer requirements fetched from Supabase PostgreSQL tables.
  - Great-Circle Haversine geographic distance between genuine latitude/longitude coordinates.
- **Prototype Estimates**:
  - $C_{\text{transport}} = ₹15/\text{km}$ is a prototype estimated operating cost per km, not live fuel pricing.
  - Perishability transit decay is an empirical benchmark ($₹0.05/\text{kg}$ per 50 km).
  - All estimates are transparently labeled in the UI as **"AI Matching — Prototype/Estimated"**. No claims of real-time government spot market guarantees are made.
