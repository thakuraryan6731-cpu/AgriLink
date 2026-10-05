"""
AgriLink AI - Backend Test Suite: Order State Machine (Phase 3C)
Tests all valid/invalid transitions, terminal state, and error messages.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.algorithms.order_state_machine import (
    OrderStatus,
    validate_transition,
    can_transition,
    get_allowed_next_states,
    InvalidStateTransitionError,
    InvalidOrderStateError,
    VALID_TRANSITIONS,
)


class TestOrderStateMachine(unittest.TestCase):

    # ── A: Every valid transition ─────────────────────────────────────────────

    def test_a_valid_transition_matched_to_aggregating(self):
        result = validate_transition("MATCHED", "AGGREGATING")
        self.assertEqual(result, OrderStatus.AGGREGATING)

    def test_a_valid_transition_aggregating_to_buyer_confirmed(self):
        result = validate_transition("AGGREGATING", "BUYER_CONFIRMED")
        self.assertEqual(result, OrderStatus.BUYER_CONFIRMED)

    def test_a_valid_transition_aggregating_rollback_to_matched(self):
        result = validate_transition("AGGREGATING", "MATCHED")
        self.assertEqual(result, OrderStatus.MATCHED)

    def test_a_valid_transition_buyer_confirmed_to_pickup_scheduled(self):
        result = validate_transition("BUYER_CONFIRMED", "PICKUP_SCHEDULED")
        self.assertEqual(result, OrderStatus.PICKUP_SCHEDULED)

    def test_a_valid_transition_pickup_scheduled_to_in_transit(self):
        result = validate_transition("PICKUP_SCHEDULED", "IN_TRANSIT")
        self.assertEqual(result, OrderStatus.IN_TRANSIT)

    def test_a_valid_transition_in_transit_to_delivered(self):
        result = validate_transition("IN_TRANSIT", "DELIVERED")
        self.assertEqual(result, OrderStatus.DELIVERED)

    def test_a_valid_transition_delivered_to_payment_confirmed(self):
        result = validate_transition("DELIVERED", "PAYMENT_CONFIRMED")
        self.assertEqual(result, OrderStatus.PAYMENT_CONFIRMED)

    # ── B: Every invalid transition ───────────────────────────────────────────

    def test_b_invalid_matched_to_delivered(self):
        with self.assertRaises(InvalidStateTransitionError):
            validate_transition("MATCHED", "DELIVERED")

    def test_b_invalid_matched_to_payment_confirmed(self):
        with self.assertRaises(InvalidStateTransitionError):
            validate_transition("MATCHED", "PAYMENT_CONFIRMED")

    def test_b_invalid_matched_to_in_transit(self):
        with self.assertRaises(InvalidStateTransitionError):
            validate_transition("MATCHED", "IN_TRANSIT")

    def test_b_invalid_delivered_to_matched(self):
        with self.assertRaises(InvalidStateTransitionError):
            validate_transition("DELIVERED", "MATCHED")

    def test_b_invalid_buyer_confirmed_to_aggregating(self):
        with self.assertRaises(InvalidStateTransitionError):
            validate_transition("BUYER_CONFIRMED", "AGGREGATING")

    def test_b_invalid_in_transit_to_matched(self):
        with self.assertRaises(InvalidStateTransitionError):
            validate_transition("IN_TRANSIT", "MATCHED")

    def test_b_invalid_pickup_scheduled_to_buyer_confirmed(self):
        with self.assertRaises(InvalidStateTransitionError):
            validate_transition("PICKUP_SCHEDULED", "BUYER_CONFIRMED")

    # ── C: Terminal PAYMENT_CONFIRMED ─────────────────────────────────────────

    def test_c_payment_confirmed_is_terminal(self):
        """PAYMENT_CONFIRMED must not allow any further transitions."""
        for target in OrderStatus:
            with self.assertRaises(InvalidStateTransitionError):
                validate_transition("PAYMENT_CONFIRMED", target.value)

    def test_c_payment_confirmed_allowed_next_is_empty(self):
        allowed = get_allowed_next_states("PAYMENT_CONFIRMED")
        self.assertEqual(allowed, [])

    # ── D: Invalid state ──────────────────────────────────────────────────────

    def test_d_invalid_state_name_raises(self):
        with self.assertRaises(InvalidOrderStateError):
            validate_transition("INVALID_STATE", "MATCHED")

    def test_d_invalid_target_state_raises(self):
        with self.assertRaises(InvalidOrderStateError):
            validate_transition("MATCHED", "FLYING_MONKEYS")

    def test_d_empty_string_raises(self):
        with self.assertRaises(InvalidOrderStateError):
            validate_transition("", "MATCHED")

    def test_d_none_state_raises(self):
        with self.assertRaises(InvalidOrderStateError):
            validate_transition(None, "MATCHED")

    # ── E: Transition error messages ──────────────────────────────────────────

    def test_e_error_message_contains_states(self):
        """Error message should mention both current and attempted next state."""
        try:
            validate_transition("MATCHED", "DELIVERED")
            self.fail("Should have raised InvalidStateTransitionError")
        except InvalidStateTransitionError as e:
            msg = str(e)
            self.assertIn("MATCHED", msg)
            self.assertIn("DELIVERED", msg)

    def test_e_terminal_error_message_is_clear(self):
        """Terminal state error must say 'terminal'."""
        try:
            validate_transition("PAYMENT_CONFIRMED", "MATCHED")
            self.fail("Should have raised InvalidStateTransitionError")
        except InvalidStateTransitionError as e:
            self.assertIn("terminal", str(e).lower())

    def test_e_can_transition_returns_bool(self):
        """can_transition helper returns correct booleans."""
        self.assertTrue(can_transition("MATCHED", "AGGREGATING"))
        self.assertFalse(can_transition("MATCHED", "DELIVERED"))
        self.assertFalse(can_transition("PAYMENT_CONFIRMED", "MATCHED"))
        self.assertFalse(can_transition("INVALID", "MATCHED"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
