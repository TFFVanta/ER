# Required compatibility patches
## v0.2 database wrapper
The original per-connection wrapper allowed worker threads to overlap SQLite transactions. Apply `patches/v0.2` to hold a recursive connection lock for every statement and for the full lifetime of a transaction. It also adds durable atomic sequence allocation.

Update the v0.2 Autonomy repository ID methods to use:
```cpp
repository_database.next_sequence("autonomy.objectives");
repository_database.next_sequence("autonomy.proposals");
repository_database.next_sequence("autonomy.operations");
repository_database.next_sequence("autonomy.audit_events");
```
instead of `MAX(id)+1`.

## v0.3 scheduler
Apply every file under `patches/v0.3`:
- resolve the Autonomy Kernel actor from the current durable assignment;
- allocate IDs from durable sequences;
- write terminal/retry job state before releasing the lease;
- reload and reject stale jobs after lease acquisition.

The stale-job check prevents a worker holding an old in-memory copy from executing a job after another worker has completed it.

## v0.4 governance
Apply `sha256.cpp` and `evaluator.cpp`. The evaluator patch enforces capability scope (`*`, exact resource ID, or `type:id`) instead of checking only action and resource type.

## v0.5 and v0.6
Apply the patched SQLite repository files so resource and agent IDs use atomic durable sequences under concurrent workers.
