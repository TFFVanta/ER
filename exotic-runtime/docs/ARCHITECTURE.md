# Architecture

## Canonical object model

Every fact in Exotic is represented through five primitives:

1. **Entity** — identity-bearing object.
2. **Component** — reusable capability/data bundle.
3. **Relationship** — typed weighted edge.
4. **State** — current properties of an entity or component.
5. **Event** — immutable change signal.

## Runtime equation

Let the graph state at time `t` be `G_t`, observation be `o_t`, prediction be `p_t`, alignment be `a_t`, action be `u_t`, and measured result be `r_t`:

`p_t = P(o_t, M_t)`

`a_t = A(G_t, p_t)`

`u_t = E(a_t, policy)`

`G_(t+1), M_(t+1) = L(G_t, M_t, o_t, p_t, u_t, r_t)`

The implementation keeps these transformations modular while sharing a single graph and memory substrate.
