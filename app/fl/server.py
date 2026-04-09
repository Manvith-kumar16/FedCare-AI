import threading
import logging
from typing import Optional

import flwr as fl

logger = logging.getLogger("fedcare.fl.server")


class FLServerController:
    """Simple controller to start/stop a Flower server in a background thread.

    Note: This launches a synchronous Flower server in a thread. For production
    use a dedicated process or container and proper process supervision.
    """

    def __init__(self):
        self._thread: Optional[threading.Thread] = None
        self._server: Optional[fl.server.Server] = None
        self._running = False

    def start(self, host: str = "0.0.0.0", port: int = 8080, rounds: int = 3, strategy_name: str = "FedAvg", min_fit_clients: int = 1, min_available_clients: int = 1):
        if self._running:
            raise RuntimeError("FL server already running")

        def run_server():
            logger.info("Starting Flower server on %s:%s", host, port)
            # Choose strategy
            if strategy_name.lower() == "fedavg":
                strategy = fl.server.strategy.FedAvg(min_fit_clients=min_fit_clients, min_available_clients=min_available_clients)
            else:
                # default to FedAvg for now; FedProx requires custom strategy implementation
                logger.warning("Strategy %s not implemented; falling back to FedAvg", strategy_name)
                strategy = fl.server.strategy.FedAvg(min_fit_clients=min_fit_clients, min_available_clients=min_available_clients)

            # Start the server (blocks)
            try:
                fl.server.start_server(server_address=f"{host}:{port}", config=fl.server.ServerConfig(num_rounds=rounds), strategy=strategy)
            except Exception as e:
                logger.exception("Flower server stopped with error: %s", e)
            finally:
                self._running = False

        self._thread = threading.Thread(target=run_server, daemon=True)
        self._thread.start()
        self._running = True
        return True

    def is_running(self) -> bool:
        return self._running and self._thread is not None and self._thread.is_alive()

    def stop(self):
        # Flower server does not expose a clean programmatic stop in all versions.
        # In production, send a termination signal to the process or use a managed container.
        logger.warning("Stop requested but programmatic stop is not implemented; please terminate the process externally")
        return False


controller = FLServerController()
