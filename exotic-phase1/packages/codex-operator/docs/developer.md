# Developer Guide

Design principles:

- C++20 only.
- RAII for subscriptions, sinks, and package ownership.
- Composition first.
- Minimal global state.
- Modular interfaces with narrow responsibilities.

Testing focus:

- Configuration loading
- Plugin-driven service registration
- Dependency validation and startup order
- Event throughput metrics
- Clean shutdown

Next milestone recommendation:

`EXOTIC-CODEX-001K` should build the Operations Console and Control Plane on top of this package by reusing:

- `ObservabilityEngine`
- `ComplianceEngine`
- `SessionEngineApi`
- `WorkerRuntimeApi`
- `MetricsCollector`
