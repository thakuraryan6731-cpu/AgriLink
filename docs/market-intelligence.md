# AgriLink AI — Market Intelligence & Demand Forecasting (Phase 3A)
**Problem Statement ID:** SIH26033 | **Sponsoring Dept:** Department of Consumer Affairs (DoCA)  
**Theme:** Agriculture, FoodTech & Rural Development | **Target:** Smart India Hackathon 2026

---

## 📌 Executive Summary & Methodology Disclaimer
> [!IMPORTANT]
> **Notice on Data Sourcing and Prototype Calibration:**  
> The current forecast is a deterministic prototype baseline and is not a production statistical forecast.  
> All records are sourced from the **AgriLink Demo Dataset** (`is_simulated = True`). Real-time Agmarknet / data.gov.in government API integration is architected and staged for full production rollout.

---

## 🌾 1. Product Goal (Screen 3: Farmer → Market Intelligence)
Screen 3 empowers smallholder farmers and FPO administrators with actionable price intelligence and short-term arrival forecasts before harvesting or committing produce to local APMC middlemen.

### Key Capabilities:
1. **Current Market Price**: Prevailing mandi benchmark rate (₹/kg) across major agricultural trading hubs.
2. **Historical Price Trend**: Daily moving averages, previous-period delta, and percentage movement.
3. **Estimated Short-Term Demand**: 7-day projected urban off-take and bulk procurement pull (kg and metric tonnes).
4. **Supply-Demand Deficit Gap**: Quantification of regional APMC arrivals vs urban demand to identify high-margin opportunities.
5. **Expected Demand Change**: Horizon trajectory (%) tracking acceleration or slowing demand.
6. **Data-Grounded Confidence**: Transparent confidence score calculated from historical observation depth and market volatility.
7. **Actionable Selling Opportunity**: Algorithmic recommendation identifying the optimal consumption corridor.

---

## 🧮 2. Forecasting Algorithm & Mathematical Formulations

### A. Demand Projection Model
For a given commodity $c$, location $l$, and forecast day index $t \in [1, H]$ (where $H = 7$ days):

$$\text{Baseline Demand}_t = D_{\text{base}}(c, l) \times M_{\text{DOW}}(t)$$

$$\text{Trend Multiplier}_t = 1 + \left( r_{\text{trend}}(c, l) \times t \right)$$

$$\hat{D}_t = \max\left(0, \text{round}\left( \text{Baseline Demand}_t \times \text{Trend Multiplier}_t \right)\right)$$

Where:
- $D_{\text{base}}(c, l)$: Calibrated daily baseline demand (kg) from historical records.
- $M_{\text{DOW}}(t)$: Day-of-week multiplier accounting for weekend retail and institutional surges (e.g. Friday $1.08$, Saturday $1.12$, Monday $1.00$).
- $r_{\text{trend}}(c, l)$: Daily compounding trend rate (e.g. $+3.8\%$ for Tomato in Nashik).

---

### B. Supply-Demand Deficit Gap Calculation
The 7-day cumulative gap measures total projected APMC arrivals against consumer demand:

$$\text{Supply-Demand Gap} = \sum_{t=1}^{H} \hat{S}_t - \sum_{t=1}^{H} \hat{D}_t$$

#### Interpretation:
- **$\text{Gap} < 0$ (Deficit)**: Demand exceeds local supply arrivals ($\text{Demand} > \text{Supply}$). Creates an immediate opportunity for farmers to pool lots and sell directly to bulk corporate buyers at a premium over depressed local APMC commission agent rates.
- **$\text{Gap} > 0$ (Surplus)**: Supply exceeds local demand ($\text{Supply} > \text{Demand}$). Suggests routing produce to alternative regional corridors via AgriLink CVRP logistics.

---

### C. Price Trajectory & Confidence Bounds
The expected mandi price trajectory is modeled with volatility bands:

$$\hat{P}_t = \max\left(0.50, P_{\text{current}} \times \left(1 + r_{\text{trend}} \times 0.75 \times t\right)\right)$$

$$\text{Upper Band}_t = \hat{P}_t \times (1 + \sigma)$$

$$\text{Lower Band}_t = \max\left(0.10, \hat{P}_t \times (1 - \sigma)\right)$$

Where $\sigma$ is the calibrated commodity price volatility (e.g. $\sigma = 0.08$ for Tomato).

---

### D. Data-Grounded Confidence Score
Confidence directly reflects the volume of historical observations $N_{\text{obs}}$ and volatility $\sigma$:

$$\text{Confidence} = \min\left(0.90, \max\left(0.45, \frac{N_{\text{obs}}}{100} \times 0.90 - 0.5 \times \sigma\right)\right)$$

- High observation density ($N \ge 90$) with low volatility $\rightarrow$ Confidence $80\% - 88\%$.
- Limited observation density ($N < 50$) $\rightarrow$ Confidence $45\% - 60\%$.

---

## 🌐 3. Backend Architecture & FastAPI Endpoints

### Endpoint: `POST /api/market/forecast`
**Request Body:**
```json
{
  "crop": "Tomato",
  "location": "Nashik",
  "horizon_days": 7
}
```

**Response Schema:**
```json
{
  "crop": "Tomato",
  "location": "Nashik",
  "horizon_days": 7,
  "forecast_date": "2026-09-14",
  "current_price_per_kg": 19.0,
  "price_change_percent": 18.4,
  "predicted_7d_demand_kg": 4354000.0,
  "demand_change_percent": 14.8,
  "supply_demand_gap_kg": -1698000.0,
  "supply_demand_gap_tonnes": -1698.0,
  "confidence": 0.77,
  "threat_level": "HIGH",
  "recommendation": "High urban demand pull in Mumbai-Pune corridor. Aggregate yields for pooled direct B2B delivery to capture +38% realization.",
  "suggested_destination": "Bhiwandi & Pune Megacity Hubs",
  "predictions": [
    {
      "date": "14 Sep",
      "dayLabel": "Mon",
      "predicted_demand_kg": 612420,
      "projectedDemandTonnes": 612.4,
      "historical_arrival_kg": 388800,
      "historicalArrivalTonnes": 388.8,
      "predicted_price_per_kg": 19.54,
      "price_upper_band": 21.10,
      "price_lower_band": 17.98,
      "confidence": 0.77,
      "demandIndex": 73
    }
  ],
  "source": "AgriLink Demo Dataset",
  "is_simulated": true
}
```

### HTTP Error Codes:
- `400 Bad Request`: Invalid `horizon_days` (must be $1 \le \text{horizon} \le 30$)
- `404 Not Found`: Unsupported crop or location combination
- `500 Internal Server Error`: Computation error

---

## 🗃️ 4. Supported Commodities & Trading Locations

### Commodities (6 Core Crops):
1. **Tomato** (Perishable vegetable, high demand elasticity)
2. **Onion** (Semi-perishable bulb, high interstate trading volume)
3. **Potato** (Cold storage staple, snack and processing intake)
4. **Pulses** (Desi Chana / Bengal Gram, protein staple)
5. **Wheat** (Rabi staple grain, mill off-take)
6. **Maize** (Feed and industrial starch feedstock)

### Locations (6 Regional Mandis):
- **Nashik** (Maharashtra — horticulture & onion hub)
- **Pune** (Maharashtra — western consumption & industrial hub)
- **Kolar** (Karnataka — southern tomato & vegetable belt)
- **Azadpur** (Delhi NCR — Asia's largest APMC terminal market)
- **Indore** (Madhya Pradesh — central grain & pulses hub)
- **Guntur** (Andhra Pradesh — coastal maize & agricultural market)

---

## 🔌 5. Future Agmarknet / Data.gov.in Integration Point
When connecting official government feeds:
1. Replace `MARKET_BASELINES` dictionary in `backend/app/algorithms/demand_forecast.py` with dynamic SQL / REST fetches against the **National Agriculture Market (e-NAM) / Agmarknet Mandi API**.
2. Transition `is_simulated` from `True` to `False`.
3. Switch `source` to `"Agmarknet Daily Mandi Price API"`.
4. Plug in pre-trained XGBoost / Prophet time-series models once 365+ continuous daily arrival records are populated in `public.market_observations`.
