# Integration Guide

This foundation milestone integrates with existing EXOTIC systems by extension, not replacement.

- Runtime Kernel: the package stores and exposes the live `exotic::Runtime`.
- Event Bus: the event bridge subscribes to the existing `EventBus` and records event throughput.
- Worker Runtime: worker coordination emits immutable events back onto the existing `EventBus`.
- Session Engine: session lifecycle orchestration compiles prompts, coordinates workers, tracks approvals, and emits immutable session events on the existing `EventBus`.
- Verification Engine: verification requests and evidence artifacts are evaluated without bypassing existing runtime, logging, metrics, or event-bus integrations.
- Governance Engine: approval policy decisions consume verification results and resolve session approval gates through the same runtime, metrics, and event-bus surfaces.
- Policy Automation Engine: automation rules evaluate verification and governance state, then delegate policy actions without bypassing existing session, verification, or governance components.
- Compliance Engine: compliance checks consume session, verification, governance, automation, and audit state while preserving those underlying components as the source of truth.
- Lifecycle Manager: the package uses `runtime::ServiceGraph` for dependency validation and ordered startup.
- Configuration System: the package derives defaults from `runtime::RuntimeConfig` and allows file overlays.
- Universal Graph Runtime: the built-in graph adapter service reports entity and relationship counts from `Runtime::graph()`.

Recommended usage:

- Register real scheduler, governance, or worker services as `runtime::RuntimeService` implementations.
- Keep operator-specific concerns such as plugins, metrics, and DI inside this package.
- Reuse `DependencyContainer` for future objective engine components rather than introducing global singletons.
