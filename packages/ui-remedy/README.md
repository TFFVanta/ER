# @exotic/ui-remedy

Exotic Remedy's brand-native React component library: flat pastel color inside a bold black
outline, premium-fun bounce/wiggle motion, classic two-color pattern accents. Values are sourced
from `brand/exotic-remedy/identity.md` and `aesthetic.md` - read those first for the *why*
behind every rule here.

**Distinct from `@exotic/ui`** (the EXOTIC AI-platform kit) - different brand, different design
law (quiet/restrained vs. premium/fun), do not mix the two systems in one composition.

## Components

- `Button` (`variant`: `default` | `gold` | `outline`) - wiggles on hover, pops on press
- `Card` (`eyebrow`, `title`, `interactive`, `pattern`: `dots` | `pinstripe` | `none`) - bounces
  in on mount
- `Chip` (`gold`)
- `Eyebrow`
- `Input`
- `BounceIn` - wraps any content in the entrance animation

```tsx
import { Button, Card, Chip, Eyebrow, Input, BounceIn } from "@exotic/ui-remedy";
import "@exotic/ui-remedy/styles.css";
```

## Not yet included

No mascot component - the flamingo art in `brand/exotic-remedy/assets/` is raster (PNG), not a
vector source suitable for a reusable component. Vectorize it first if you want a `<Mascot />`
component.

## Build

`npm run build --workspace=@exotic/ui-remedy` - same esbuild + tsc pipeline as `@exotic/ui`.
