# Execution Lifecycle

1. An assignment enters the runtime queue.
2. The dispatcher selects a matching worker from the registry.
3. Immutable assignment and start events are emitted.
4. The worker executes and produces a result.
5. Success updates metrics and history.
6. Failures trigger retries up to the runtime limit.
7. Repeated failure moves the assignment to the dead-letter queue and quarantines the worker.
