"""
AgriLink AI - Backend Supabase Client (Phase 4C)
=================================================
Provides authenticated Supabase client for database persistence.

Environment Variables:
    SUPABASE_URL: Supabase project URL
    SUPABASE_SERVICE_KEY: Service role key (server-side, bypasses RLS)
    SUPABASE_ANON_KEY: Anon key (respects RLS, fallback for dev)

Falls back to VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY for local development.

IMPORTANT:
- Service role key bypasses RLS and should NEVER be exposed to the client.
- Anon key is used as a fallback for development when service key is unavailable.
- If neither URL nor key is configured, is_available() returns False and all
  persistence operations must fail explicitly (no silent fallback).
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Try loading .env from project root
try:
    from dotenv import load_dotenv
    # Load from backend/.env first, then project root .env
    _backend_env = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    load_dotenv(_backend_env, override=False)
    load_dotenv(override=False)
except ImportError:
    pass

_supabase_url: Optional[str] = (
    os.getenv("SUPABASE_URL")
    or os.getenv("VITE_SUPABASE_URL")
)

_supabase_key: Optional[str] = (
    os.getenv("SUPABASE_SERVICE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
    or os.getenv("VITE_SUPABASE_ANON_KEY")
)

_client = None
_init_attempted = False
_init_error: Optional[str] = None


def _init_client():
    """Lazily initialize the Supabase client on first use."""
    global _client, _init_attempted, _init_error
    if _init_attempted:
        return
    _init_attempted = True

    if not _supabase_url or 'placeholder' in (_supabase_url or ''):
        _init_error = "SUPABASE_URL is not configured or contains placeholder value."
        logger.warning(f"Supabase client not initialized: {_init_error}")
        return

    if not _supabase_key or 'placeholder' in (_supabase_key or ''):
        _init_error = "SUPABASE_KEY (service or anon) is not configured or contains placeholder value."
        logger.warning(f"Supabase client not initialized: {_init_error}")
        return

    try:
        from supabase import create_client
        _client = create_client(_supabase_url, _supabase_key)
        logger.info(f"Supabase client initialized for URL: {_supabase_url[:40]}...")
    except ImportError:
        _init_error = "supabase Python package is not installed. Run: pip install supabase"
        logger.warning(f"Supabase client not initialized: {_init_error}")
    except Exception as e:
        _init_error = f"Failed to create Supabase client: {str(e)}"
        logger.error(f"Supabase client initialization error: {_init_error}")


def get_client():
    """
    Returns the Supabase client instance.
    Raises RuntimeError if client is not available.
    """
    _init_client()
    if _client is None:
        raise RuntimeError(
            f"Supabase client is not available. {_init_error or 'No configuration found.'} "
            f"Database persistence is disabled."
        )
    return _client


def is_available() -> bool:
    """Returns True if the Supabase client can be initialized successfully."""
    _init_client()
    return _client is not None


def get_status() -> dict:
    """Returns diagnostic status for the Supabase connection."""
    _init_client()
    return {
        "available": _client is not None,
        "url_configured": bool(_supabase_url and 'placeholder' not in _supabase_url),
        "key_configured": bool(_supabase_key and 'placeholder' not in _supabase_key),
        "error": _init_error
    }
