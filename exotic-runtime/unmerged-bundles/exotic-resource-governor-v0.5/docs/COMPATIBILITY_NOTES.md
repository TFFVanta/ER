# Compatibility Notes

## v0.4 SHA fallback compile fix

The original v0.4 bundle's fallback `sha256.cpp` uses `std::uint64_t` without
including `<cstdint>`. A compile-compatible replacement is included at:

```text
patches/v0.4/sha256.cpp
```

Copy it over:

```text
src/exotic/autonomy/governance/sha256.cpp
```

before building on toolchains that do not provide the integer type through a
transitive include.

## Approved-request revalidation

The v0.4 `GovernanceService::authorize` path identifies that approval is
required but does not itself convert an approved request into an allowed
scheduler execution. v0.5 closes that integration gap in
`GovernanceSchedulerAuthorityValidator` by reloading the explicitly supplied
approval request and checking:

- Approved status
- Proposal identity
- Action and resource scope
- Expiration
- Simulation restriction
- Approved monetary ceiling

This does not weaken the v0.4 policy or capability checks. Those checks still
run first through `AuthorityGate`.
