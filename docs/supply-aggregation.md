# Supply Aggregation Engine (Phase 3C)

## 1. Overview & Architecture

The **Supply Aggregation Engine** (`backend/app/algorithms/supply_aggregation.py`) groups fragmented smallholder farmer crop lots into standardized, multi-farmer aggregated orders to fulfill high-volume buyer requirements.

Smallholder farmers often produce 100 kg to 500 kg lots, whereas institutional and bulk buyers require 2,000 kg to 10,000+ kg lots. The aggregation engine builds a consolidated supply pool while strictly respecting geographic proximity, harvest time synchronicity, and quality bounds.

### System Architecture Flow

```
┌──────────────────────────────────────┐
│        Buyer Screen 10 (UI)          │
│     (MatchedSupplyBuilder.tsx)       │
└──────────────────┬───────────────────┘
                   │
                   │ 1. Fetch Real Listings & Selected Requirement (Supabase DB)
                   ▼
┌──────────────────────────────────────┐
│        aggregationService.ts         │
└──────────────────┬───────────────────┘
                   │
                   │ 2. POST /api/aggregation/preview
                   ▼
┌──────────────────────────────────────┐
│          FastAPI Gateway             │
│            (main.py)                 │
└──────────────────┬───────────────────┘
                   │
                   │ 3. Execute Deterministic 7-Step Algorithm
                   ▼
┌──────────────────────────────────────┐
│     supply_aggregation.py Engine     │
│  - 15 km Haversine Radius Filter     │
│  - 24-Hour Harvest Window Rolling    │
│  - Deterministic Seed Selection      │
│  - Bounded Greedy Allocation         │
└──────────────────┬───────────────────┘
                   │
                   │ 4. Return Cluster Metrics, Lot Allocations & Diagnostics
                   ▼
┌──────────────────────────────────────┐
│   Screen 10: Aggregation Preview     │
│   (Cluster Map, Lot Allocations,     │
│    Fulfillment Status, Diagnostics)  │
└──────────────────────────────────────┘
```

> **Authoritative Backend Requirement**: All aggregation clustering, filtering, and quantity allocation calculations execute exclusively in Python (`backend/app/algorithms/supply_aggregation.py`). The frontend does not calculate authoritative pool contributions or cluster boundaries.

---

## 2. Trust Boundary & Authorization Architecture

### Current Endpoint Limitation
- **Stateless Mathematical Calculation Endpoint**: `POST /api/aggregation/preview` is a **pure calculation endpoint**. It accepts requirement and listing payloads and deterministically computes the optimal pooling cluster.
- **No Client Authorization Proof**: Client-supplied `farmer_id`, `listing_id`, or `requirement_id` values are processed strictly as calculation inputs. **No database records are created or modified, and no authorization decision is made based on these values.**
- **Future Authenticated Creation**: When order confirmation (`POST /api/aggregation/create` or state transitions) is connected with authentication:
  - The backend will verify the caller's Supabase JWT identity (`auth.uid()`).
  - The backend will verify that the user holds an authorized role (`buyer`, `fpo`, `admin`).
  - authoritative `crop_inventory` lots will be loaded directly from Supabase to prevent spoofing.

---

## 3. Deterministic 7-Step Aggregation Algorithm

The aggregation engine processes input listings according to the following deterministic rules:

### Step 1: Crop Name Filter
Matches candidate listings to the buyer requirement using case-insensitive normalization:
$$\text{candidate.crop\_name.strip().lower()} == \text{requirement.crop\_name.strip().lower()}$$

### Step 2: Valid Coordinates & Quantity Validation
- Requires valid numerical `latitude` and `longitude` coordinates. Listings missing coordinates are placed in `excluded_no_coords`.
- Requires `quantity_kg > 0`. Zero or negative quantities are placed in `excluded_bad_qty`.

### Step 3: Harvest Date Presence Validation
- Harvest dates are mandatory for pooling synchronicity.
- Any listing with `harvest_date is None` is immediately rejected into `excluded_no_harvest_date`.

### Step 4: Deterministic Seed Selection
- Candidate listings that pass initial filters are sorted by `listing_id` ascending.
- The first listing in this deterministic order is designated as the **Seed Farmer** (defining the initial geographic and temporal cluster center).

### Step 5: Haversine Geographic Distance Constraint ($\le 15.0\text{ km}$)
- The geographic distance between every candidate listing and the Seed Farmer is calculated using the Haversine formula:
$$d = 2 R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
  Where $R = 6371.0\text{ km}$.
- Listings with $d > 15.0\text{ km}$ are rejected into `excluded_too_far`.

> **Note on Distance Metrics**: Haversine distance represents straight-line geographic proximity. Road network routing, travel time, and turn-by-turn waypoints are handled downstream in Phase 4 (Logistics Optimization / CVRP).

### Step 6: Harvest Date Rolling Time Window ($\le 24.0\text{ hours}$)
- Candidate listings are evaluated against the cluster harvest window.
- The difference between the latest and earliest harvest date within the cluster must not exceed 24 hours:
$$\max(T_{\text{cluster}} \cup \{t_{\text{candidate}}\}) - \min(T_{\text{cluster}} \cup \{t_{\text{candidate}}\}) \le 24.0\text{ hours}$$
- Listings falling outside this rolling window are excluded from the pool.

### Step 7: Bounded Greedy Quantity Allocation
- Included candidates are sorted by proximity to the Seed Farmer ($d$ ascending), then by `listing_id` ascending.
- The engine greedily allocates quantities up to the buyer requirement target:
$$\text{allocated\_qty}_i = \min(\text{available\_qty}_i, \text{remaining\_target\_qty})$$
- Once the target quantity is met ($\text{remaining} = 0$), remaining farmers are not allocated quantities.

---

## 4. Fulfillment Statuses

The result contains an overall fulfillment state:
- **`full`**: Total pooled quantity $\ge$ Buyer target quantity ($100\%$ fulfilled).
- **`partial`**: $0 <$ Total pooled quantity $<$ Buyer target quantity.
- **`unfulfilled`**: Total pooled quantity $= 0$ (no qualifying supply found).

---

## 5. Summary Metrics & Contribution Records

For every cluster, the engine returns:
- **Cluster Radius**: Maximum Haversine distance from the Seed Farmer to any contributing farmer.
- **Harvest Window (Hours)**: Temporal spread across all contributing farmers.
- **Weighted Average Price**:
$$\bar{P} = \frac{\sum (\text{allocated\_qty}_i \times \text{price}_i)}{\sum \text{allocated\_qty}_i}$$
- **Contributing Farmers**: Array of allocations with `allocated_quantity_kg`, `price_per_kg`, `distance_from_hub_km`, `harvest_date`, and `is_seed_farmer`.
- **Exclusion Breakdown**: Exact list and rationale for all excluded supply lots.
