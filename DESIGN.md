---
name: Alhalaqa
description: Quran teacher platform for student management, session tracking, and billing
colors:
  primary: "oklch(0.55 0.12 175)"
  primary-foreground: "oklch(0.99 0 0)"
  background: "oklch(0.985 0.002 180)"
  foreground: "oklch(0.2 0.02 180)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.2 0.02 180)"
  muted: "oklch(0.96 0.005 180)"
  muted-foreground: "oklch(0.5 0.02 180)"
  secondary: "oklch(0.95 0.01 180)"
  secondary-foreground: "oklch(0.3 0.02 180)"
  accent: "oklch(0.92 0.02 180)"
  accent-foreground: "oklch(0.3 0.02 180)"
  border: "oklch(0.9 0.01 180)"
  input: "oklch(0.92 0.01 180)"
  ring: "oklch(0.55 0.12 175)"
  destructive: "oklch(0.55 0.2 25)"
  destructive-foreground: "oklch(0.99 0 0)"
  success: "oklch(0.6 0.15 145)"
  warning: "oklch(0.75 0.15 85)"
  sidebar: "oklch(0.99 0.002 180)"
  sidebar-foreground: "oklch(0.2 0.02 180)"
  sidebar-accent: "oklch(0.95 0.02 180)"
  sidebar-border: "oklch(0.9 0.01 180)"
typography:
  display:
    fontFamily: "'Noto Sans Arabic', 'Geist', sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "'Noto Sans Arabic', 'Geist', sans-serif"
    fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "'Noto Sans Arabic', 'Geist', sans-serif"
    fontSize: "clamp(1rem, 2vw, 1.25rem)"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "'Noto Sans Arabic', 'Geist', sans-serif"
    fontSize: "0.938rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'Noto Sans Arabic', 'Geist', sans-serif"
    fontSize: "0.813rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  sm: "0.25rem"
  md: "0.375rem"
  lg: "0.5rem"
  xl: "0.75rem"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    border: "1px solid {colors.border}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
    border: "1px solid {colors.input}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "1rem"
---

# Design System: Alhalaqa

## 1. Overview

**Creative North Star: "The Quiet Desk"**

A teacher's workspace after hours: everything in its place, nothing unnecessary, the desk surface is cool and clean. The tools are visible but quiet. The eye rests between tasks.

This system is a product dashboard for serious daily use. It rejects the SaaS-generic playbook — no cream backgrounds, no mega-cards, no decorative geometry, no gold-and-green "religious software" palette. The teal primary is the only accent color; it marks interactivity and focus, never decoration. Surfaces are cool-neutral, flat by default, and airy. Density is comfortable on desktop, tight enough on mobile that a teacher can check their schedule between sessions without zooming.

The visual voice is restrained and purposeful. Nothing is here to impress. Everything is here to work.

**Key Characteristics:**
- Cool-neutral surfaces, teal accent (≤10% of any screen)
- Flat by default, tonal layering for depth
- RTL-native, Arabic-first typography
- Mobile as primary design target
- No decorative borders, no side-stripes, no gradients

## 2. Colors

The palette is cool-neutral with a single teal anchor. Chroma is kept low; the effect is calm, legible, and professional.

### Primary
- **Muted Teal** (`oklch(0.55 0.12 175)`): The only accent. Used for interactive elements — buttons, links, focus rings, active states. Never decorative.

### Neutral
- **Cool White** (`oklch(0.985 0.002 180)`): Page background.
- **Pure White** (`oklch(1 0 0)`): Card and surface backgrounds.
- **Cool Slate** (`oklch(0.2 0.02 180)`): Body text and headings.
- **Muted Slate** (`oklch(0.5 0.02 180)`): Secondary text, placeholders.
- **Subtle Border** (`oklch(0.9 0.01 180)`): Borders and dividers.
- **Soft Hover** (`oklch(0.92 0.02 180)`): Hover and accent surfaces.

### Feedback
- **Green** (`oklch(0.6 0.15 145)`): Success states.
- **Amber** (`oklch(0.75 0.15 85)`): Warnings.
- **Red** (`oklch(0.55 0.2 25)`): Destructive actions and errors.

### Named Rules
**The One-Voice Rule.** Primary teal marks interactivity only. No decorative teal borders, teal backgrounds on non-interactive cards, or teal accents on static elements. If it doesn't click, it doesn't get color.

**The Flat-By-Default Rule.** Surfaces are flat at rest. Tonal separation comes from background lightness, not shadows. Shadows appear only as a response to state (hover, elevation, focus).

## 3. Typography

**Display/Body Font:** Noto Sans Arabic (with Geist fallback)
**Label/Mono Font:** Geist Mono

**Character:** A single humanist sans family across all roles. Restrained and legible. Noto Sans Arabic handles the Arabic glyphs with appropriate stroke contrast; Geist provides the Latin complement. No pairing drama — one family, multiple weights.

### Hierarchy
- **Display** (700, `clamp(1.75rem, 4vw, 3.5rem)`, 1.2): Hero headings only. `text-wrap: balance`. Used on the landing page and empty states. Never in the dashboard.
- **Headline** (600, `clamp(1.25rem, 2.5vw, 1.75rem)`, 1.3): Section titles and page headings in the dashboard.
- **Title** (600, `clamp(1rem, 2vw, 1.25rem)`, 1.4): Card titles, dialog headings, sidebar section labels.
- **Body** (400, `0.938rem`, 1.6): All running text. Max line length 70ch. Data content may vary.
- **Label** (500, `0.813rem`, 1): Form labels, table headers, metadata. No uppercase.

### Named Rules
**The No-Uppercase Rule.** Labels are never all-caps. Arabic text set in uppercase is unreadable. Sentence case or title case only.

## 4. Elevation

The system is flat by default. Depth is communicated through tonal layering (background lightness differences between page, card, and sidebar surfaces), not through shadows. A single low shadow (`0 1px 3px rgba(0,0,0,0.08)`) is used for dropdowns, modals, and elevated popovers to separate them from the page plane.

No multi-level shadow vocabulary. One level: "surface" (flat) and "overlay" (one shadow). That is enough.

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 4px 24px -8px rgba(0,0,0,0.12)`): Modals, dropdowns, popovers, dialogs.

### Named Rules
**The One-Shadow Rule.** One shadow for overlays. No multi-elevation system. The page has two planes: surface and overlay. That's it.

## 5. Components

### Buttons
- **Shape:** Gently rounded corners (6px / `rounded-md`)
- **Primary:** Teal background (`--primary`), white text. `hover:bg-primary/90`. No shadow at rest.
- **Outline:** Transparent body, 1px solid `--border`, default text. `hover:bg-accent` fills the background subtly.
- **Ghost:** No border, no background. `hover:bg-accent` for feedback.
- **Focus:** 3px ring at `--ring` color with 50% opacity.
- **Height:** 36px (default), 40px (lg), 32px (sm). All tight and purposeful. No oversized buttons.
- **Disabled:** 50% opacity, no pointer events.

### Inputs / Fields
- **Shape:** Gently rounded corners (6px). 1px solid `--input` stroke.
- **Background:** Page background color (not white card).
- **Focus:** Border shifts to `--ring` color + 3px ring at 50% opacity.
- **Padding:** 8px 12px (`px-3 py-2`).
- **Error:** Red ring + destructive border.
- **Placeholder:** `--muted-foreground` color at 4.5:1 contrast.

### Cards / Containers
- **Shape:** Rounded corners (8px / `rounded-lg`). Pure white background.
- **Border:** 1px solid `--border`.
- **Shadow:** None at rest. No shadows on cards ever.
- **Padding:** 16px (`p-4`). Inner spacing uses `gap-3` or `gap-4` between children.
- **Nested cards:** Prohibited. A card inside a card is always wrong. Use tonal background variation instead.

### Navigation (Sidebar)
- **Background:** Near-white cool tint (`--sidebar`), slightly darker than page background.
- **Items:** Default text weight, `--sidebar-foreground`. Hover fills with `--sidebar-accent`.
- **Active:** Teal tint and bolder weight.
- **No icons as decoration.** Icons earn their place as navigation affordances.
- **Mobile:** Collapses to bottom tab bar or hamburger.

### Dialog / Modal
- **Backdrop:** 60% black at 40% opacity. Blur optional but moderate (4px max).
- **Surface:** Pure white card, rounded corners (12px / `rounded-xl`), overlay shadow.
- **Padding:** 24px.

## 6. Do's and Don'ts

### Do:
- **Do** use the teal accent sparingly (≤10% of any screen). Its rarity is its power.
- **Do** prefer tonal layering over shadows for depth.
- **Do** keep body text at or above `--muted-foreground` lightness. Never use a lighter gray for body copy.
- **Do** design mobile-first. The primary user works from a phone between sessions.
- **Do** maintain 4.5:1 contrast ratio for all body text.
- **Do** use `text-wrap: balance` on headings, `text-wrap: pretty` on prose.
- **Do** keep card corners at 8px max. Restraint, not roundness.

### Don't:
- **Don't** use the generic v0/SaaS template look: no cream/sand backgrounds, no overly-rounded cards (24px+), no decorative gradient accents.
- **Don't** apply "religious software" aesthetics: no ornate borders, no geometric patterns, no gold, no green-dominant everything.
- **Don't** use side-stripe borders (border-left/right >1px as a colored accent on cards). Use full borders or nothing.
- **Don't** use gradient text. Never `background-clip: text` with a gradient as a decorative treatment.
- **Don't** use glassmorphism, mega-shadows (16px+ blur), or repeating-linear-gradient backgrounds.
- **Don't** put an uppercase eyebrow ("ABOUT" / "FEATURES" / "PRICING") above every section. One per page max, or none.
- **Don't** use numbered section markers (01 / 02 / 03) as default scaffolding. Numbers only when the section IS a sequence.
- **Don't** nest cards.
- **Don't** ship animated entrances or staggered reveals without a `prefers-reduced-motion` alternative.
