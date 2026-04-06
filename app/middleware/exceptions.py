from fastapi import Request
from fastapi.responses import JSONResponse
import logging


logger = logging.getLogger("fedcare")


async def http_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})
