# Plugins

Plugin registration and installation are implemented in `src/plugins/plugin_registry.cpp`.

Runtime extensions should register through the package plugin registry so they share the same dependency graph, logging, metrics, and lifecycle controls.
