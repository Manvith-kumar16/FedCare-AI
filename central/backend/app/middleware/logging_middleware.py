"""Logging middleware"""
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("fedcare")


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        method = request.method
        url = str(request.url.path)

        response = await call_next(request)

        duration = round((time.time() - start_time) * 1000, 2)
        status = response.status_code

        log_msg = f"{method} {url} → {status} ({duration}ms)"
        if status >= 400:
            logger.warning(log_msg)
        else:
            logger.info(log_msg)

        response.headers["X-Process-Time"] = str(duration)
        return response
