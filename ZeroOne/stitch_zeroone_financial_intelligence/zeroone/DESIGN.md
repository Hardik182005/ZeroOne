---
name: ZeroOne
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0edec'
  surface-container-high: '#ebe7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#484456'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#797487'
  outline-variant: '#cac3d9'
  surface-tint: '#6434ed'
  primary: '#5317dd'
  on-primary: '#ffffff'
  primary-container: '#6c3ff5'
  on-primary-container: '#e9e1ff'
  inverse-primary: '#cbbeff'
  secondary: '#65568a'
  on-secondary: '#ffffff'
  secondary-container: '#d5c3ff'
  on-secondary-container: '#5c4e81'
  tertiary: '#005a3e'
  on-tertiary: '#ffffff'
  tertiary-container: '#007552'
  on-tertiary-container: '#68ffc2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e7deff'
  primary-fixed-dim: '#cbbeff'
  on-primary-fixed: '#1e0060'
  on-primary-fixed-variant: '#4b00d3'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#cfbdf9'
  on-secondary-fixed: '#201142'
  on-secondary-fixed-variant: '#4d3e71'
  tertiary-fixed: '#63fcc0'
  tertiary-fixed-dim: '#3fdfa5'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005138'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-hero:
    fontFamily: EB Garamond
    fontSize: 72px
    fontWeight: '700'
    lineHeight: 80px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: EB Garamond
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-lg-mobile:
    fontFamily: EB Garamond
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin: 32px
  container-max: 1440px
---

## Brand & Style

The design system embodies "Computational Elegance"—a fusion of high-frequency financial data and premium editorial design. It targets institutional investors and sophisticated retail traders who demand the information density of Bloomberg with the spatial clarity of modern productivity tools.

The aesthetic is **Cinematic Minimalism**. It utilizes a white-dominant canvas to ensure maximum readability of complex data, punctuated by a deep, "electric" purple that signals intelligence and action. The style borrows the precision of **Linear** (structured grids, subtle borders) and the depth of **visionOS** (glassmorphism, spatial layering, and soft environmental shadows). The emotional response should be one of absolute clarity, authority, and "the future of capital."

## Colors

The palette is anchored by **ZeroOne Purple**, used strategically for primary actions and brand moments. 

- **Primary & Tonal:** Use `#6C3FF5` for primary buttons and active states. Use the deeper `#1A0A3C` (Purple Night) for global navigation and the top Ticker Bar to provide a grounded "frame" for the UI.
- **Data Visualization:** Use Green Bullish and Red Bearish for market sentiment. These are calibrated for high legibility against both white and glass surfaces.
- **Neutrality:** The system uses a hierarchy of greys with slight purple undertones (e.g., `#5A5A72`) to maintain a cohesive "cool" temperature across the interface.

## Typography

This design system uses a high-contrast typographic pairing to balance heritage and technology.

- **Editorial Layer:** **EB Garamond** (standing in for Cormorant Garamond) is used for hero headlines and section titles. It provides the "Bloomberg terminal meets luxury journal" feel.
- **Interface Layer:** **Inter** is the workhorse for all UI elements, forms, and secondary text, ensuring high legibility at small sizes.
- **Data Layer:** **JetBrains Mono** is strictly reserved for prices, percentages, and tickers. Its fixed-width nature prevents "jumping" layouts during live data streams and reinforces the technical precision of the brand.

## Layout & Spacing

The design system utilizes a **12-column fluid grid** for dashboard views and a **fixed-center column** for editorial content. 

- **The Ticker Bar:** A fixed 40px bar at the extreme top of the viewport, utilizing the `Purple Night` background.
- **The Floating Chrome:** Main navigation and "browser-in-app" elements should utilize 24px margins from the viewport edge, appearing to float above the canvas.
- **Rhythm:** An 8px base grid governs all component-level spacing, while a 4px "micro-step" is used for tight data-dense tables.
- **Responsive Behavior:** On mobile, margins reduce to 16px and the 12-column grid collapses to a single-column stack. The Ticker Bar remains sticky but reduces its data density to "Price + Symbol" only.

## Elevation & Depth

Depth in this design system is achieved through **Glassmorphism** and **Spatial Layering**, avoiding traditional heavy shadows.

- **Level 1 (Canvas):** Pure white background.
- **Level 2 (Cards):** Semi-transparent white (`rgba(255, 255, 255, 0.7)`) with a 20px backdrop blur and a 1px solid border (`#EDE9FF`).
- **Level 3 (Modals/Chrome):** Floating elements use a more pronounced 40px blur and a subtle 10% opacity "ZeroOne Purple" tint in the background to suggest active focus.
- **Shadows:** Use only "Ambient Occlusion" shadows—ultra-soft, large-radius (30px+), low-opacity (5-8%) shadows that mimic natural light casting onto a physical surface.

## Shapes

The shape language is refined and modern. 

- **Standard Elements:** Buttons, input fields, and small cards use a 0.5rem (8px) corner radius.
- **Large Containers:** Dashboard widgets and "cinematic" cards use 1rem (16px) to emphasize the soft, premium feel.
- **Data Nodes:** Pipeline nodes and status indicators should use the "Pill" shape (fully rounded) to contrast against the structured grid of the data tables.

## Components

- **Ticker Bar:** Fixed top. Background: `Purple Night`. Text: `JetBrains Mono` in White/Green/Red. Features a horizontal "scanline" animation every 10 seconds to indicate live connectivity.
- **Primary Buttons:** High-contrast `Primary Purple` background. Implement a "Shimmer" effect: a diagonal white gradient (`20% opacity`) that sweeps across the button on hover.
- **Cinematic Cards:** Must feature a 1px inner stroke in `Lavender Accent` at 30% opacity to catch light, mimicking the edge of a glass pane.
- **Pipeline Nodes:** Small, circular or pill-shaped badges connected by 1px dotted lines. Active nodes should glow with a subtle `Primary Purple` outer pulse.
- **Input Fields:** Minimalist. No background on idle (only a bottom border). On focus, a soft `Purple Muted` background fades in with a 2px `Primary Purple` left-accent border.
- **Floating Chrome:** The navigation bar should be a floating island with `backdrop-filter: blur(20px)` and a shadow-less, light-border aesthetic.