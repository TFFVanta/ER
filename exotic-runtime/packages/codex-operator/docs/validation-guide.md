# Validation Guide

Validation fails when:

- Objective fields are incomplete
- Repository context is missing
- Constraints are inconsistent
- Protected files are referenced incorrectly
- Token budget is exceeded

Compiled prompts should only be emitted after validation succeeds.
