# Build Instructions

From `C:\Projects\Exotic\exotic-phase1`:

```powershell
cmake -S . -B build
cmake --build build --target exotic_codex_operator_tests exotic_codex_prompt_compiler_tests exotic_codex_worker_runtime_tests exotic_codex_session_engine_tests exotic_codex_verification_engine_tests exotic_codex_governance_engine_tests exotic_codex_policy_automation_engine_tests exotic_codex_compliance_engine_tests exotic_codex_operator_benchmark exotic_codex_prompt_compiler_benchmark exotic_codex_worker_runtime_benchmark exotic_codex_session_engine_benchmark exotic_codex_verification_engine_benchmark exotic_codex_governance_engine_benchmark exotic_codex_policy_automation_engine_benchmark exotic_codex_compliance_engine_benchmark --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

If Visual Studio toolchain discovery is inconsistent, run the commands from a Developer Command Prompt.
