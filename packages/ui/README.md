# @exotic/ui

EXOTIC's brand-native React component library: black-and-white first, sharp radii, minimal
ornament, operator-grade. Values are sourced from `brand/tokens.json` and `brand/web/exotic.css`
(the canonical brand system) — see `src/styles.css` for the mirrored CSS custom properties.

## Components

- `Button` (`variant`: `default` | `primary` | `ghost`)
- `Card` (`eyebrow`, `title`)
- `Chip`
- `Eyebrow`
- `Input`

```tsx
import { Button, Card, Chip, Eyebrow, Input } from "@exotic/ui";
import "@exotic/ui/styles.css";
```

## Build

`npm run build --workspace=@exotic/ui` bundles `src/index.ts` with esbuild (React/ReactDOM kept
external as peer deps) into `dist/index.js` + `dist/index.css`, and emits `.d.ts` declarations
via `tsc --emitDeclarationOnly`.
