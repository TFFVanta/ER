# Lifecycle

Lifecycle orchestration is implemented in `src/lifecycle/lifecycle_manager.cpp`.

The package validates dependencies through EXOTIC's existing service graph, recovers services, starts them in dependency order, and shuts them down in reverse order.
