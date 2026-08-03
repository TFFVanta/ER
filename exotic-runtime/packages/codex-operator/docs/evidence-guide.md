# Evidence Guide

The Verification Engine uses explicit evidence kinds:

- `prompt`
- `worker_output`
- `test_result`
- `build_result`
- `documentation`
- `review`
- `metric`
- `approval`

Recommended evidence flow:

1. Let `SessionEngine` capture worker-produced evidence automatically.
2. Record supplemental test, build, documentation, and review artifacts through `VerificationEngine::record_evidence(...)`.
3. Create a verification request from the completed session.
4. Run verification and inspect violations before progressing to governance or release steps.

Evidence should stay minimal, deterministic, and directly traceable to the objective being verified.
