# Worker Architecture

The worker runtime is built from five collaborating layers:

1. Registry: stores worker descriptors, capabilities, health, and performance history.
2. Dispatcher: selects the best worker without direct worker-to-worker calls.
3. Messaging: emits immutable worker events through the EXOTIC event bus.
4. Execution engine: manages queueing, retries, dead letters, pause/resume, and parallel dispatch.
5. API and state: exposes runtime status and tracks worker health, queue depth, and assignment history.
