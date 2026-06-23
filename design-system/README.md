# @radiogenia/design-system

The Radiogenia design system, packaged so design tooling can read your **tokens**
and **React components** directly — including Claude Design's `/design-sync`.

```
design-system/
├─ package.json          ← package metadata + designSystem manifest
├─ index.ts              ← single entry point (tokens + components + catalog)
├─ tokens/
│  ├─ colors.ts          ← brand palette, status colors, hsl() helper
│  ├─ themes.ts          ← the 9 skins as semantic color tokens (light/dark)
│  ├─ typography.ts      ← font families, size scale, weights, line-heights
│  ├─ spacing.ts         ← spacing scale, radius, shadows, z-index
│  └─ index.ts           ← `tokens` aggregate
└─ components/
   ├─ index.ts           ← re-exports every src/components/ui primitive
   └─ catalog.ts         ← machine-readable component manifest
```

## Using it with Claude Design

1. In Claude Code, open this `design-system` package (this folder).
2. Run `/design-sync`. It reads `tokens/` and the components re-exported from
   `components/index.ts` (and can use `components/catalog.ts` to index them).

> Note: `/design-sync` is part of the Claude Design tooling, not a built-in
> Claude Code command. If the command isn't found, install/enable the Claude
> Design plugin first; this package is the input it expects.

## Using it in app code

```ts
import { tokens, themes, Button, Card } from "@/../design-system";
// or granular:
import { themes, hsl } from "@/../design-system/tokens";
import { Button } from "@/../design-system/components";

const primary = hsl(themes[0].colors.primary); // "hsl(221 83% 53%)"
```

## Source of truth & keeping in sync

These tokens are **extracted** from the live app so the package stays portable
(no React import needed to read tokens):

| Token group       | Extracted from                         |
| ----------------- | -------------------------------------- |
| Themes / colors   | `src/lib/ui-prefs.tsx` (`SKINS`)       |
| Typography        | `src/lib/ui-prefs.tsx` (`FONT_FAMILIES`) |
| Radius / brand    | `src/app/globals.css`                  |
| Components         | `src/components/ui/*`                   |

When you change a skin, font, or `--radius`, update the matching token file here
(`themes.ts`, `typography.ts`, `spacing.ts`). The component barrel re-exports the
live components, so those never drift.

## Themes

9 skins, 4 light / 5 dark:

| id          | mode  | primary swatch |
| ----------- | ----- | -------------- |
| clasico     | light | `#3b82f6`      |
| medianoche  | dark  | `#38bdf8`      |
| bosque      | light | `#059669`      |
| obsidiana   | dark  | `#a78bfa`      |
| arena       | light | `#b45309`      |
| coral       | dark  | `#fb7185`      |
| acero       | dark  | `#60a5fa`      |
| cerezo      | light | `#e11d48`      |
| oceano      | dark  | `#2dd4bf`      |

Colors are HSL channel triplets (e.g. `"221 83% 53%"`) so they compose with
opacity: `hsl(themes[0].colors.primary, 0.1)` → `hsl(221 83% 53% / 0.1)`.
