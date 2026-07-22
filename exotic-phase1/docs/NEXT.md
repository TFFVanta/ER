# Next implementation sequence

1. Persistence: append-only event journal plus snapshot loader.
2. Serialization: stable JSON schema and versioned migrations.
3. Automation runtime: triggers, conditions, actions, schedules.
4. SDK public API: C ABI plus TypeScript/Python bindings.
5. Domain package: Software domain as first vertical proof.
6. AI runtime: provider-neutral model/tool interface.
7. Desktop shell: graph inspector, event stream, engine health.
8. Security hardening: real cryptographic tokens, encrypted persistence, audit log.

Do not build separate domain cores. Every vertical must remain a package over the same runtime.
