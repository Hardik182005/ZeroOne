---
name: Ether Clean
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#464554'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#5d5d67'
  on-secondary: '#ffffff'
  secondary-container: '#e3e1ed'
  on-secondary-container: '#64636d'
  tertiary: '#5a5c5d'
  on-tertiary: '#ffffff'
  tertiary-container: '#737576'
  on-tertiary-container: '#fcfdfe'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e3e1ed'
  secondary-fixed-dim: '#c7c5d1'
  on-secondary-fixed: '#1a1b23'
  on-secondary-fixed-variant: '#46464f'
  tertiary-fixed: '#e1e3e4'
  tertiary-fixed-dim: '#c5c7c8'
  on-tertiary-fixed: '#191c1d'
  on-tertiary-fixed-variant: '#454748'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display-lg:
    fontFamily: DM Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: DM Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: DM Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: DM Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  margin-mobile: 20px
  margin-desktop: 40px
  gutter: 24px
  section-gap: 80px
---

## Brand & Style
The brand personality is refined, airy, and hyper-focused, targeting users who value cognitive clarity and streamlined workflows. The design style is **High-End Minimalism**, leaning heavily on expansive whitespace and a reduced visual weight to eliminate distraction. By shifting away from high-saturation tones, the UI evokes an emotional response of calm, precision, and modern sophistication. Elements should feel lightweight, almost ephemeral, yet grounded by deliberate typographic hierarchy and structural integrity.

## Colors
The palette is anchored by a desaturated, professional Indigo-Purple primary, used sparingly for calls to action and critical highlights. The secondary color is a very pale, nearly-white violet tint, used for large surface areas and subtle grouping to maintain the minimalist aesthetic without losing brand character. Neutrals transition from a deep charcoal for text to a sequence of cool grays for borders and backgrounds. High levels of whitespace (background white) are mandatory to maintain the "clean" narrative.

## Typography
This design system utilizes **DM Sans** across all levels to achieve a geometric, low-contrast, and contemporary look. Headings should utilize tighter letter spacing and heavier weights to provide necessary visual anchor points in a high-whitespace layout. Body text favors a generous line height to ensure maximum readability and a sense of "breathability" within the document flow. For mobile, display sizes scale down aggressively to prevent awkward line breaks while maintaining the bold, geometric impact.

## Layout & Spacing
The layout follows a **Fixed Grid** model for desktop (centered 12-column, 1200px max-width) and a **Fluid Grid** for mobile devices. The spacing rhythm is intentionally expanded; use "section-gap" (80px) between major content blocks to enforce the minimalist aesthetic. Margins are generous, pushing content inward to create a "gallery" feel. On mobile, padding is slightly increased from standard conventions to ensure elements do not feel cramped against the screen edges.

## Elevation & Depth
Depth is achieved through **Tonal Layers** rather than heavy shadows. Different surface tiers (Base, Surface, Overlay) are distinguished by subtle shifts in the secondary and tertiary colors. When depth is required for interactive components like menus or modals, use extremely soft, ambient shadows: 10-15% opacity with a large blur radius (20px+) and a slight purple-tinted hex to maintain color harmony. Low-contrast outlines (1px width, 10% opacity) should be the primary method for defining card boundaries and input fields.

## Shapes
In alignment with the existing brand identity, the system uses a **Rounded** shape language. This creates a friendly yet professional balance that softens the clinical nature of the minimalist layout. Standard buttons and inputs utilize the base 0.5rem radius, while larger containers (cards, modals) should scale up to the `rounded-xl` (1.5rem) to emphasize the soft, modern structure.

## Components
- **Buttons:** Primary buttons use the desaturated purple with white text. Secondary buttons are ghost-style with a 1px border of the primary color or a light secondary background.
- **Input Fields:** Use a light grey background (tertiary) with no border in the default state, transitioning to a primary-colored thin border on focus.
- **Cards:** Defined by a white background on a tertiary-colored page surface, or a 1px subtle border on white backgrounds. No heavy shadows.
- **Chips:** Small, pill-shaped elements using the secondary light-accent color with primary-colored text for high legibility.
- **Lists:** Use generous vertical padding between list items (16px+) to reinforce the clean, spacious theme.
- **Modals:** Centered with a Backdrop Blur (12px) to focus the user’s attention while maintaining the sense of environmental depth.