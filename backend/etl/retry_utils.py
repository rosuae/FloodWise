"""Retry helpers for resilient API calls."""

from __future__ import annotations

from typing import Any

import requests

try:
    from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

    TENACITY_AVAILABLE = True
except ModuleNotFoundError:
    TENACITY_AVAILABLE = False


RETRYABLE_EXCEPTIONS: tuple[type[BaseException], ...] = (
    requests.exceptions.Timeout,
    requests.exceptions.ConnectionError,
    requests.exceptions.HTTPError,
)


def default_retry() -> Any:
    """Default retry decorator for flaky network calls.

    If tenacity is missing in the current environment, return a no-op decorator.
    """
    if not TENACITY_AVAILABLE:
        def _no_retry(func: Any) -> Any:
            return func

        return _no_retry

    return retry(
        reraise=True,
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=1, min=1, max=12),
        retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
    )
