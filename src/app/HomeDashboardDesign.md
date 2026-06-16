---
name: Tactical Terminal
colors:
  surface: '#1d100f'
  surface-dim: '#1d100f'
  surface-bright: '#463534'
  surface-container-lowest: '#170b0a'
  surface-container-low: '#261817'
  surface-container: '#2a1c1b'
  surface-container-high: '#362625'
  surface-container-highest: '#413130'
  on-surface: '#f7ddda'
  on-surface-variant: '#e1bebc'
  inverse-surface: '#f7ddda'
  inverse-on-surface: '#3c2d2b'
  outline: '#a98987'
  outline-variant: '#59413f'
  surface-tint: '#ffb3af'
  primary: '#ffb3af'
  on-primary: '#68000d'
  primary-container: '#f85b59'
  on-primary-container: '#5c000a'
  inverse-primary: '#b3282d'
  secondary: '#d3fbff'
  on-secondary: '#00363a'
  secondary-container: '#00eefc'
  on-secondary-container: '#00686f'
  tertiary: '#69d9c5'
  on-tertiary: '#003730'
  tertiary-container: '#26a28f'
  on-tertiary-container: '#003029'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3af'
  on-primary-fixed: '#410005'
  on-primary-fixed-variant: '#900919'
  secondary-fixed: '#7df4ff'
  secondary-fixed-dim: '#00dbe9'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f54'
  tertiary-fixed: '#87f6e0'
  tertiary-fixed-dim: '#69d9c5'
  on-tertiary-fixed: '#00201b'
  on-tertiary-fixed-variant: '#005046'
  background: '#1d100f'
  on-background: '#f7ddda'
  surface-variant: '#413130'
typography:
  headline-display:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
spacing:
  unit: 4px
  gutter: 16px
  margin: 24px
  container-max: 1440px
---

## Brand & Style
The design system embodies a "Tactical Command" aesthetic, blending **Cyberpunk Minimalism** with **Terminal Brutalism**. It is engineered for technical users, developers, and operators who require a high-density, low-distraction environment that feels like a mission-critical HUD.

The visual language is characterized by deep blacks, monospaced precision, and high-energy accents that indicate system status and urgency. It evokes a sense of authority, precision, and digital craftsmanship. The design system prioritizes functional clarity over decorative elements, using light and line weight to establish hierarchy.

## Colors
The palette is rooted in an "Onyx" base to maximize contrast and reduce eye strain in low-light environments.

- **Primary (#E54D4D):** A tactical red used for critical actions, branding elements, and urgent alerts.
- **Secondary/Active (#00F0FF):** A high-visibility cyan used exclusively for active states, focus indicators, and successful connections.
- **Surface & Background:** The background is near-absolute black (#050505), with surfaces elevated slightly (#0A0A0A) to create subtle depth.
- **Borders (#1A1A1A):** Thin, low-contrast lines provide structure without overwhelming the content.

## Typography
This design system utilizes a monospaced-only type scale to reinforce the terminal aesthetic. **JetBrains Mono** (or equivalent Codex Mono) provides excellent legibility for both data and prose.

- **Display Text:** Uses uppercase and tight letter spacing for a "header" feel.
- **Information Density:** Body text is kept small (14px) to allow for the high density required in tactical dashboards.
- **Labels:** Meta-information and category tags utilize "label-caps" to distinguish them from interactive content.

## Layout & Spacing
The layout follows a **Fixed Terminal Grid** philosophy. Elements are aligned to a strict 4px base unit, ensuring all borders and components snap to a mathematical rhythm.

- **Grid:** A 12-column layout on desktop, transitioning to a single column on mobile.
- **Gutters:** 16px gutters are used consistently between dashboard "decks" (cards).
- **Density:** Padding within components is tight (8px to 12px) to maximize the amount of information visible at a single glance.
- **Structure:** Use horizontal and vertical "divider lines" (1px thickness) to delineate workspace zones rather than large gaps of whitespace.

## Elevation & Depth
Depth is communicated through **Linear Containment** and **Luminance** rather than shadows.

- **Tonal Layering:** Interactive surfaces use a slightly lighter hex than the background.
- **Inner Glows:** Active or "focused" elements use a subtle 0 0 8px outer glow in the Secondary Cyan to simulate a CRT or glass display effect.
- **Borders:** Containers use a 1px solid border. When an element is focused, the border color shifts from Neutral Dim to Primary Red or Secondary Cyan.
- **Backdrop:** The "terminal background" may feature a subtle scan-line or grid-pattern overlay at 2% opacity to enhance the hardware-interface feel.

## Shapes
The design system employs a **Sharp (0px)** corner radius for all primary containers, buttons, and inputs. This reinforces the rigid, industrial nature of the terminal interface. 

Exception: Small indicators (like the "Codex Mono" status dot) should be perfectly circular to stand out against the hard-edged environment.

## Components
- **Buttons:** Primary buttons are solid blocks of Red (#E54D4D) with black text. Secondary buttons are outlined with 1px borders and monospaced labels.
- **Input Fields:** Styled as "Quick Prompt" areas with a 1px border and a subtle internal background shift. Placeholders use Neutral Dim color.
- **Chips/Tabs:** Segmented controls are rectangular with hard corners. The active tab is indicated by a Primary Red background or a Secondary Cyan bottom border.
- **Cards (Decks):** Standard containers have a 1px border. Headers within cards use the "label-caps" style with a small icon prefix.
- **Progress Bars:** Use a segmented block style (e.g., [|||||-----]) or high-contrast solid fills to indicate system readiness.
- **Lists:** Clean rows separated by 1px dividers. Hover states should trigger a subtle Cyan text color shift or a background highlight.