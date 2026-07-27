# Routing Guide

Routing currently prefers:

- Available workers over busy or offline workers
- Healthy workers over degraded or quarantined workers
- Higher trust scores
- Higher reliability scores

Fallback workers are preserved in dispatch decisions for future escalation policies.
