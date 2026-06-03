# Brand Spec

## Core tokens

```css
:root {
  --bg: oklch(14% 0.01 18);
  --surface: oklch(18% 0.012 18);
  --fg: oklch(93% 0.01 85);
  --muted: oklch(55% 0.015 40);
  --border: oklch(28% 0.01 22);
  --accent: oklch(59% 0.19 24);
}
```

## Typography

- Display: `"Bebas Neue", "Downcome", Impact, sans-serif`
- Body: `"Inter Variable", "Segoe UI", sans-serif`
- Mono: `"JetBrains Mono", "Share Tech Mono", "SFMono-Regular", monospace`

## Layout posture

- Base canvas near-black with slightly warmer charcoal surfaces, never flat gray.
- Borders do most of the separation work: thin, crisp, always visible, low shadow budget.
- Accent red is sparse and purposeful: status edges, active tabs, key actions, small highlights.
- Dense product surfaces should use mono only for paths, counts, logs, and technical metadata.
- Motion stays short and utility-led; no glitch, pulse, crack, or full-surface transition effects in product UI.
