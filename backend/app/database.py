from functools import lru_cache

from supabase import create_client, Client

from app.config import settings


@lru_cache
def get_anon_client() -> Client:
    """Client that respects Row Level Security — use for normal user-scoped requests."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@lru_cache
def get_service_client() -> Client:
    """Admin client that bypasses RLS — use ONLY for trusted server-side operations
    (e.g. issuing tokens via the issue_next_token() function, sending notifications).
    NEVER expose this client or its key to the frontend."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
