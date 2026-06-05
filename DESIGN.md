# Design Brief

## Direction

StyleBook — Mobile-first appointment calendar for hairstylists. Single-user, no authentication. Glanceable, zero-friction scheduling with clear visual distinction between time slots, active appointments, and processing phases.

## Tone

Clean, contemporary, functional. Minimalist with purposeful color accents. Focus on information clarity over decoration — every visual element serves the calendar workflow.

## Differentiation

Calendar grid uses pure white background with subtle gray lines only; teal accent reserved for appointment blocks and UI controls, never applied to empty time slots or grid fills. Processing-phase blocks use semi-transparent diagonal stripes to show stylist availability during passive phases.

## Color Palette

| Token            | OKLCH           | Light Mode Role              | Dark Mode Role                   |
| :--------------- | :-------------- | :--------------------------- | :------------------------------- |
| primary          | 0.15 0.02 266   | #222831 — Text, anchors      | White text on dark backgrounds  |
| secondary        | 0.18 0.01 280   | #393E46 — Surfaces, cards    | Light gray surfaces             |
| accent           | 0.63 0.14 189   | #00ADB5 — CTAs, highlights   | Teal accents on dark            |
| background       | 0.98 0           | #EEEEEE / white              | #222831 dark background         |
| foreground       | 0.15 0           | Dark text (#222831)          | Light text (#EEEEEE)            |
| muted            | 0.94 0           | Light gray (#EEEEEE)         | Medium gray                     |
| border           | 0.92 0           | Subtle gray lines            | Darker gray lines               |

## Typography

- Display: Fraunces — Headlines, appointment header timestamps
- Body: General Sans — All interface text, appointment details, form labels
- Scale: h1 `text-2xl font-bold`, h2 `text-lg font-semibold`, label `text-sm font-medium`, body `text-base`

## Elevation & Depth

Flat design with minimal shadows. Appointment blocks use solid color fills; processing phases show semi-transparent tint with diagonal stripe pattern. Card surfaces distinguished by background color only, not elevation.

## Structural Zones

| Zone            | Background        | Border           | Notes                                                              |
| :-------------- | :---------------- | :--------------- | :----------------------------------------------------------------- |
| Header/Nav      | secondary         | border            | Sticky top nav or bottom tab bar; icon-driven on mobile            |
| Calendar Grid   | background (white) | border (gray)    | Pure white, no fills, gray lines only, today column has time line  |
| Appointment     | service-color     | —                | Solid blocks with client name (bold) + service + price/duration    |
| Processing      | service-color/40% | —                | Semi-transparent with diagonal stripes; shows client name         |
| Footer/Settings | secondary         | border-t          | Settings panel, dark mode toggle, working hours configuration     |

## Spacing & Rhythm

Section gaps 1rem (mobile) to 2rem (desktop); card padding 1rem; micro-spacing 0.5rem. Grid time slots fixed-height (60px per hour typical). Appointment blocks scale to duration; minimum height 24px for ultra-short services.

## Component Patterns

- Buttons: Teal background (`bg-accent`), white text; rounded-md; hover darkens chroma slightly
- Cards: White background, subtle `border-muted`, no shadow or minimal shadow-sm
- Badges: Muted background, primary foreground; rounded-full; used for service pills
- Appointment blocks: Service-color background, white text; white text bold for client name
- Processing phases: Service-color background at 40% opacity, white text, 45deg diagonal stripe pattern

## Motion

- Entrance: Fade-in 200ms on modal open; slide-up 300ms on appointment reveal
- Hover: `transition-smooth` (0.3s) on buttons, appointment blocks; slight scale/shadow lift
- Decorative: Minimal; use only for loading states (fade/pulse) and smooth list transitions

## Constraints

- No teal fills on calendar grid; only on appointment blocks and UI controls
- Calendar grid always pure white background with gray divider lines; no alternating row colors
- All text/background combos must meet WCAG AA (≥4.5:1 contrast ratio)
- Minimum 16px font on all inputs (prevents iOS auto-zoom on mobile)
- Viewport `user-scalable=no, maximum-scale=1` to prevent pinch/tap zoom
- Mobile-first: responsive layout, touch-friendly tap targets (≥44px)

## Signature Detail

Today's column displays a prominent horizontal line showing current time, with faint guide lines extending across all columns at 30-min intervals—creating a visual trace for users to locate appointments on the calendar at a glance.
