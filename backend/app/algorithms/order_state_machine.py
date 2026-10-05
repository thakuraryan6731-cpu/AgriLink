"""
AgriLink AI - Authoritative Order State Machine (Phase 3C)
Problem Statement ID: SIH26033
Ministry of Consumer Affairs, Food & Public Distribution (DoCA)

Enforces strict, unidirectional lifecycle transitions for consolidated aggregation lots:
MATCHED -> AGGREGATING -> BUYER_CONFIRMED -> PICKUP_SCHEDULED -> IN_TRANSIT -> DELIVERED -> PAYMENT_CONFIRMED
"""

from enum import Enum
from typing import Dict, List, Set, Optional


class OrderStatus(str, Enum):
    MATCHED = "MATCHED"
    AGGREGATING = "AGGREGATING"
    BUYER_CONFIRMED = "BUYER_CONFIRMED"
    PICKUP_SCHEDULED = "PICKUP_SCHEDULED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED"


# Strict transition graph definition
VALID_TRANSITIONS: Dict[OrderStatus, Set[OrderStatus]] = {
    OrderStatus.MATCHED: {
        OrderStatus.AGGREGATING
    },
    OrderStatus.AGGREGATING: {
        OrderStatus.BUYER_CONFIRMED,
        OrderStatus.MATCHED  # Rollback if cluster expires or farmers withdraw
    },
    OrderStatus.BUYER_CONFIRMED: {
        OrderStatus.PICKUP_SCHEDULED
    },
    OrderStatus.PICKUP_SCHEDULED: {
        OrderStatus.IN_TRANSIT
    },
    OrderStatus.IN_TRANSIT: {
        OrderStatus.DELIVERED
    },
    OrderStatus.DELIVERED: {
        OrderStatus.PAYMENT_CONFIRMED
    },
    OrderStatus.PAYMENT_CONFIRMED: set()  # Terminal state: cannot transition to anything
}


class InvalidStateTransitionError(ValueError):
    """Raised when an illegal or out-of-order state transition is attempted."""
    pass


class InvalidOrderStateError(ValueError):
    """Raised when an unrecognized state name is provided."""
    pass


def normalize_state(state: str) -> OrderStatus:
    """Normalizes string state to OrderStatus enum, case-insensitively."""
    if not state or not isinstance(state, str):
        raise InvalidOrderStateError(f"Invalid state value: '{state}'. Must be a non-empty string.")
    
    clean_state = state.strip().upper()
    try:
        return OrderStatus(clean_state)
    except ValueError:
        valid_states = [s.value for s in OrderStatus]
        raise InvalidOrderStateError(
            f"Unrecognized order state '{state}'. Valid states are: {', '.join(valid_states)}"
        )


def can_transition(current_state: str, next_state: str) -> bool:
    """Returns True if transition from current_state to next_state is valid, False otherwise."""
    try:
        curr_enum = normalize_state(current_state)
        next_enum = normalize_state(next_state)
        return next_enum in VALID_TRANSITIONS.get(curr_enum, set())
    except (InvalidOrderStateError, ValueError):
        return False


def validate_transition(current_state: str, next_state: str) -> OrderStatus:
    """
    Validates state transition. Returns next OrderStatus if valid.
    Raises InvalidStateTransitionError or InvalidOrderStateError if invalid.
    """
    curr_enum = normalize_state(current_state)
    next_enum = normalize_state(next_state)

    allowed_next = VALID_TRANSITIONS.get(curr_enum, set())
    if next_enum not in allowed_next:
        if curr_enum == OrderStatus.PAYMENT_CONFIRMED:
            raise InvalidStateTransitionError(
                f"Cannot transition from terminal state '{curr_enum.value}' to '{next_enum.value}'."
            )
        allowed_str = ", ".join(s.value for s in allowed_next) if allowed_next else "None (Terminal State)"
        raise InvalidStateTransitionError(
            f"Illegal state transition from '{curr_enum.value}' to '{next_enum.value}'. "
            f"Allowed next transitions are: [{allowed_str}]."
        )

    return next_enum


def get_allowed_next_states(current_state: str) -> List[str]:
    """Returns list of permitted subsequent state strings for a given state."""
    curr_enum = normalize_state(current_state)
    return [s.value for s in VALID_TRANSITIONS.get(curr_enum, set())]
