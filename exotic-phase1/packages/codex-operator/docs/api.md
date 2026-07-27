# API Guide

Primary public types live in `include/exotic/codex_operator/operator.hpp`.

Important entry points:

- `OperatorConfig`
- `ConfigurationStore`
- `StructuredLogger`
- `MetricsCollector`
- `HealthMonitor`
- `DependencyContainer`
- `OperatorRuntimeService`
- `OperatorServiceRegistry`
- `LifecycleManager`
- `PluginRegistry`
- `CodexOperatorPackage`
- `RuntimeBootstrap`
- `PromptCompilerInput`
- `RepositoryAnalyzer`
- `ContextCompiler`
- `CanonSelector`
- `ConstraintsEngine`
- `PromptTemplateRegistry`
- `PromptRenderer`
- `PromptValidator`
- `PromptCompiler`
- `WorkerRegistry`
- `WorkerDispatcher`
- `WorkerMessageBus`
- `WorkerStateStore`
- `WorkerExecutionEngine`
- `WorkerRuntimeApi`
- `WorkerRuntime`
- `SessionEventStream`
- `SessionStore`
- `SessionEngineApi`
- `SessionEngine`
- `EvidenceStore`
- `VerificationEngineApi`
- `VerificationEngine`
- `GovernanceEngineApi`
- `GovernanceEngine`
- `PolicyAutomationEngineApi`
- `PolicyAutomationEngine`
- `ComplianceEngineApi`
- `ComplianceEngine`
- `ObservabilityEngineApi`
- `ObservabilityEngine`

Typical flow:

1. Create or load `runtime::RuntimeConfig`.
2. Call `RuntimeBootstrap::create(...)`.
3. Register services and plugins.
4. Call `initialize()`.
5. Call `start()`.
6. Query `snapshot()` for metrics and health.
7. Call `shutdown()` during teardown.
