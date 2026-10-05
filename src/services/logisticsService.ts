/**
 * AgriLink AI - Logistics & Road Routing Service (Phase 4A & 4C)
 *
 * Architecture Flow:
 *   Frontend Components (Screens 12, 13, 14)
 *     ↓
 *   logisticsService.ts
 *     ↓
 *   FastAPI (POST /api/routing/cvrp-solve, /api/routing/routes, /api/orders/{id}/transition)
 *     ↓
 *   cvrp_solver.py / osrm_client.py / order_state_machine.py
 *     ↓
 *   Public OSRM Service (router.project-osrm.org) + Google OR-Tools + Supabase
 *
 * POLICY:
 * - Authoritative road routing, CVRP optimization, and order transitions execute on the Python backend.
 * - NO SILENT FALLBACK: If OSRM or the backend is unavailable, throws an explicit error
 *   with message "Route Optimization Service Unavailable".
 * - Never fabricates road geometry or synthetic road distances.
 */

import {
  RoutingCoordinate,
  RoadRouteResponse,
  DistanceMatrixResponse,
  CVRPSolvePayload,
  CVRPSolveResponse,
  CreateConfirmedRouteInput,
  PersistedRouteResponse,
  OrderStateTransitionResponse
} from '../types';

const BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) || 'http://localhost:8000';


export class RoutingServiceError extends Error {
  public code: string;
  public status?: number;

  constructor(message: string, code: string = 'ROUTING_SERVICE_ERROR', status?: number) {
    super(message);
    this.name = 'RoutingServiceError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Calls FastAPI CVRP solver (Google OR-Tools + OSRM) for multi-stop milk-run optimization.
 *
 * @param payload Hub coordinates, farmer pickup stops, buyer destination, and vehicle capacity
 * @returns CVRPSolveResponse with optimized stop sequence, load progression, savings, and road GeoJSON
 */
export async function getCVRPRoute(
  payload: CVRPSolvePayload
): Promise<CVRPSolveResponse> {
  const endpoint = `${BACKEND_URL}/api/routing/cvrp-solve`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 503) {
      const errorBody = await response.json().catch(() => ({}));
      throw new RoutingServiceError(
        errorBody.detail?.message || 'Route Optimization Service Unavailable',
        'ROUTING_SERVICE_UNAVAILABLE',
        503
      );
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message =
        errorBody.detail?.message ||
        errorBody.detail ||
        `HTTP error ${response.status}: Failed to optimize CVRP route.`;
      throw new RoutingServiceError(
        typeof message === 'string' ? message : JSON.stringify(message),
        errorBody.detail?.error || 'CVRP_ERROR',
        response.status
      );
    }

    const data: CVRPSolveResponse = await response.json();
    return data;
  } catch (err: any) {
    if (err instanceof RoutingServiceError) {
      throw err;
    }
    console.error('[logisticsService] CVRP solve request failed:', err);
    throw new RoutingServiceError(
      'Route Optimization Service Unavailable. Failed to connect to optimization backend.',
      'NETWORK_FAILURE'
    );
  }
}

/**
 * Persists a user-confirmed route record in the backend.
 *
 * @param routeData Validated route attributes, waypoints, and OSRM GeoJSON
 * @returns PersistedRouteResponse
 */
export async function createConfirmedRoute(
  routeData: CreateConfirmedRouteInput
): Promise<PersistedRouteResponse> {
  const endpoint = `${BACKEND_URL}/api/routing/routes`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(routeData),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message =
        errorBody.detail?.message ||
        errorBody.detail ||
        `HTTP error ${response.status}: Failed to persist route.`;
      throw new RoutingServiceError(
        typeof message === 'string' ? message : JSON.stringify(message),
        errorBody.detail?.error || 'PERSISTENCE_ERROR',
        response.status
      );
    }

    const data: PersistedRouteResponse = await response.json();
    return data;
  } catch (err: any) {
    if (err instanceof RoutingServiceError) {
      throw err;
    }
    console.error('[logisticsService] Route persistence request failed:', err);
    throw new RoutingServiceError(
      'Failed to persist route to database.',
      'PERSISTENCE_NETWORK_FAILURE'
    );
  }
}

/**
 * Requests an order lifecycle state transition from the backend state machine.
 *
 * @param orderId Target order ID
 * @param toState Target lifecycle state (e.g. 'IN_TRANSIT', 'DELIVERED')
 * @param currentState Optional known current state
 * @returns OrderStateTransitionResponse
 */
export async function transitionOrderStatus(
  orderId: string,
  toState: string,
  currentState?: string
): Promise<OrderStateTransitionResponse> {
  const endpoint = `${BACKEND_URL}/api/orders/${orderId}/transition`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        current_state: currentState,
        to_state: toState
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message =
        errorBody.detail?.message ||
        errorBody.detail ||
        `HTTP error ${response.status}: Failed to transition order state.`;
      throw new RoutingServiceError(
        typeof message === 'string' ? message : JSON.stringify(message),
        errorBody.detail?.error || 'TRANSITION_ERROR',
        response.status
      );
    }

    const data: OrderStateTransitionResponse = await response.json();
    return data;
  } catch (err: any) {
    if (err instanceof RoutingServiceError) {
      throw err;
    }
    console.error('[logisticsService] Order transition request failed:', err);
    throw new RoutingServiceError(
      'Failed to execute order state transition on backend.',
      'TRANSITION_NETWORK_FAILURE'
    );
  }
}

/**
 * Fetches authoritative OSRM road route with real road distance (km), duration (minutes),
 * and GeoJSON LineString geometry connecting the coordinates sequentially.
 */
export async function getRoadRoute(
  coordinates: RoutingCoordinate[]
): Promise<RoadRouteResponse> {
  if (!coordinates || coordinates.length < 2) {
    throw new RoutingServiceError(
      'At least 2 coordinates are required for road routing.',
      'INVALID_COORDINATES'
    );
  }

  const endpoint = `${BACKEND_URL}/api/routing/osrm-route`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates }),
    });

    if (response.status === 503) {
      const errorBody = await response.json().catch(() => ({}));
      throw new RoutingServiceError(
        errorBody.detail?.message || 'Road Routing Service Unavailable',
        'ROUTING_SERVICE_UNAVAILABLE',
        503
      );
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message =
        errorBody.detail?.message ||
        errorBody.detail ||
        `HTTP error ${response.status}: Failed to calculate road route.`;
      throw new RoutingServiceError(
        typeof message === 'string' ? message : JSON.stringify(message),
        errorBody.detail?.error || 'ROUTING_ERROR',
        response.status
      );
    }

    const data: RoadRouteResponse = await response.json();
    return data;
  } catch (err: any) {
    if (err instanceof RoutingServiceError) {
      throw err;
    }
    console.error('[logisticsService] Road routing request failed:', err);
    throw new RoutingServiceError(
      'Road Routing Service Unavailable. Failed to connect to routing backend.',
      'NETWORK_FAILURE'
    );
  }
}

/**
 * Fetches N x N OSRM road distance (km) and driving duration (minutes) matrices.
 */
export async function getRoadDistanceMatrix(
  coordinates: RoutingCoordinate[]
): Promise<DistanceMatrixResponse> {
  if (!coordinates || coordinates.length < 2) {
    throw new RoutingServiceError(
      'At least 2 coordinates are required for distance matrix.',
      'INVALID_COORDINATES'
    );
  }

  const endpoint = `${BACKEND_URL}/api/routing/matrix`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates }),
    });

    if (response.status === 503) {
      const errorBody = await response.json().catch(() => ({}));
      throw new RoutingServiceError(
        errorBody.detail?.message || 'Road Routing Service Unavailable',
        'ROUTING_SERVICE_UNAVAILABLE',
        503
      );
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message =
        errorBody.detail?.message ||
        errorBody.detail ||
        `HTTP error ${response.status}: Failed to calculate distance matrix.`;
      throw new RoutingServiceError(
        typeof message === 'string' ? message : JSON.stringify(message),
        errorBody.detail?.error || 'MATRIX_ERROR',
        response.status
      );
    }

    const data: DistanceMatrixResponse = await response.json();
    return data;
  } catch (err: any) {
    if (err instanceof RoutingServiceError) {
      throw err;
    }
    console.error('[logisticsService] Distance matrix request failed:', err);
    throw new RoutingServiceError(
      'Road Routing Service Unavailable. Failed to connect to routing backend.',
      'NETWORK_FAILURE'
    );
  }
}
