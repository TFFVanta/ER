# EXOTIC Approval, Governance, and Authority Runtime v0.4

Compile-oriented C++20 source bundle integrating durable governance into the v0.3 scheduler pre-execution path.

## Merge
Copy `src`, `tests`, `cmake`, and `docs` into the EXOTIC repository, then add:

```cmake
include(cmake/EXOTIC_GOVERNANCE.cmake)
```

## CLI
`exotic governance status|requests|stop|resume`

## Important hardening note
`sha256.cpp` exposes the evidence-hash provider seam but uses a compact deterministic fallback. Before security certification, bind it to the platform cryptography provider (OpenSSL, BCrypt, or libsodium). The evidence-chain interface does not change.
