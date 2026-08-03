# Context Selection Guide

The context compiler intentionally compresses repository state.

Selection order:

1. Files in the current subsystem
2. Files implied by objective dependencies
3. Recent changes
4. Failing tests
5. Open TODOs
6. Relevant build files

The compiler trims output to the active file budget to avoid unnecessary prompt bloat.
