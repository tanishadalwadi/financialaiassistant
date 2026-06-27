# Financial Coach App — Design System v2
# Theme: Dark navy base + vibrant pastel cards + bold typography

> Inspired by colorful fintech UI: each card type has its own color personality.
> Dark base with pastel accent cards — NOT everything the same dark #1A1A1A.
> Give this file to Cursor with every UI prompt: `@DESIGN_SYSTEM.md`

---

## 1. Color tokens

```ts
export const colors = {

  // ─── Base backgrounds ───────────────────────────────────────────
  bgPage:        '#0F1117',   // deep navy-black — page background
  bgCard:        '#1A1D27',   // slightly lifted navy — default card
  bgCardDeep:    '#141720',   // deeper card for nested elements
  bgChip:        '#252A38',   // stat chip background
  bgInput:       '#1E2130',   // input fields
  bgOverlay:     '#00000088', // bottom sheet scrim

  // ─── Borders ─────────────────────────────────────────────────────
  borderDefault: '#2A2F42',   // subtle card border
  borderSubtle:  '#1E2235',   // row dividers inside cards
  borderFocus:   '#F97316',   // focused input — orange accent

  // ─── Brand accent (keep orange as primary action) ────────────────
  accent:        '#F97316',   // orange — CTA buttons, active tabs, links
  accentDim:     '#F9731618', // orange at ~10% opacity
  accentMuted:   '#C45E0A',   // darker orange for pressed states

  // ─── Text ────────────────────────────────────────────────────────
  textPrimary:   '#FFFFFF',
  textSecondary: '#9BA3B8',   // blue-gray muted (not plain gray)
  textTertiary:  '#5C6480',   // dimmer labels
  textDisabled:  '#3A3F55',

  // ─── Semantic ────────────────────────────────────────────────────
  success:       '#00C896',   // teal-green — income, on track
  successDim:    '#00C89615',
  danger:        '#FF5C5C',   // red — alerts, over budget
  dangerDim:     '#FF5C5C15',
  warning:       '#F97316',   // orange — behind on goals
  info:          '#4D9EFF',   // blue — neutral info

  // ─── PASTEL CARD COLORS ──────────────────────────────────────────
  // These are used as card BACKGROUNDS for nudge/insight/stat cards.
  // Each card type gets its own color. Text inside uses dark colors.

  cardMint:      '#C8F5E4',   // mint green  — income, success, on-track cards
  cardMintText:  '#0A3D2B',   // dark text on mint
  cardMintBorder:'#A0E8CF',

  cardPeach:     '#FFE4D4',   // peach/salmon — spending, expense, alert cards
  cardPeachText: '#5C2300',   // dark text on peach
  cardPeachBorder:'#FFC9A8',

  cardLavender:  '#E4DFFF',   // lavender — savings, goals, primary cards
  cardLavText:   '#2D1F6E',   // dark text on lavender
  cardLavBorder: '#C9C0FF',

  cardSky:       '#D4EEFF',   // light blue — info, days remaining, neutral
  cardSkyText:   '#0A2E52',   // dark text on sky
  cardSkyBorder: '#A8D8FF',

  cardYellow:    '#FFF4C2',   // yellow — tips, recommendations
  cardYellowText:'#4A3500',   // dark text on yellow
  cardYellowBorder:'#FFE680',

  cardLilac:     '#F4D4FF',   // lilac/purple — AI, coach, smart features
  cardLilacText: '#3D0060',   // dark text on lilac
  cardLilacBorder:'#E0A0FF',

  cardCoral:     '#FFD4D4',   // coral/red-pink — warnings, alerts
  cardCoralText: '#5C0A0A',
  cardCoralBorder:'#FFB0B0',

  // ─── Category colors (chart slices, dots, transaction icons) ─────
  catDining:        '#FF8C42',  // warm orange
  catGroceries:     '#00C896',  // teal green
  catRent:          '#7B6FFF',  // violet
  catTransport:     '#4D9EFF',  // sky blue
  catSubscriptions: '#B06FFF',  // purple
  catShopping:      '#FF6B9D',  // pink
  catHealth:        '#00D4AA',  // teal
  catTravel:        '#FFD93D',  // yellow
  catIncome:        '#00C896',  // teal green
  catOther:         '#5C6480',  // blue-gray (always last, always muted)

  // ─── Goal detail hero backgrounds (two-tone layout) ──────────────
  goalHeroBg:    '#FFE8D4',   // peach — hero top section of goal detail
  goalHeroText:  '#2A1200',   // dark text in hero
}
```

---

## 2. Category color + emoji map

```ts
export const CATEGORY_COLORS: Record<string, string> = {
  'Dining':        '#FF8C42',
  'Groceries':     '#00C896',
  'Rent':          '#7B6FFF',
  'Transport':     '#4D9EFF',
  'Subscriptions': '#B06FFF',
  'Shopping':      '#FF6B9D',
  'Health':        '#00D4AA',
  'Travel':        '#FFD93D',
  'Income':        '#00C896',
  'Other':         '#5C6480',
}

export const CATEGORY_EMOJI: Record<string, string> = {
  'Dining':        '🍽',
  'Groceries':     '🛒',
  'Rent':          '🏠',
  'Transport':     '🚗',
  'Subscriptions': '📱',
  'Shopping':      '🛍',
  'Health':        '💊',
  'Travel':        '✈️',
  'Income':        '💵',
  'Other':         '📦',
}
```

---

## 3. Typography

```ts
export const typography = {
  // Screen-level
  screenTitle:    { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  screenSubtitle: { fontSize: 14, fontWeight: '400', color: '#9BA3B8' },

  // Section
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Card titles
  cardTitleLg:    { fontSize: 18, fontWeight: '700' }, // color depends on card bg
  cardTitleMd:    { fontSize: 15, fontWeight: '600' },
  cardTitleSm:    { fontSize: 13, fontWeight: '600' },

  // Body
  body:           { fontSize: 14, fontWeight: '400', color: '#9BA3B8', lineHeight: 22 },
  bodyDark:       { fontSize: 14, fontWeight: '400', lineHeight: 22 }, // for pastel cards

  // Data display
  numberHero:     { fontSize: 36, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  numberLarge:    { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  numberMedium:   { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  // Labels
  overline:       { fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
                    textTransform: 'uppercase' as const },
  chipLabel:      { fontSize: 10, fontWeight: '600', letterSpacing: 0.5,
                    textTransform: 'uppercase' as const },
  chipValue:      { fontSize: 15, fontWeight: '700' },
  meta:           { fontSize: 12, fontWeight: '400', color: '#5C6480' },
  link:           { fontSize: 13, fontWeight: '600', color: '#F97316' },
  badge:          { fontSize: 11, fontWeight: '700' },
}
```

---

## 4. Spacing

```ts
export const spacing = {
  xs:      4,
  sm:      8,
  md:      12,
  lg:      16,
  xl:      20,
  xxl:     28,
  screenH: 20,   // horizontal screen padding — slightly more generous than before
  cardPad: 16,   // internal card padding
  cardGap: 12,   // vertical gap between cards
  sectionGap: 24, // gap between sections
}
```

---

## 5. Border radius

```ts
export const radius = {
  sm:   10,   // chips, badges, small elements
  md:   14,   // inputs, small cards
  lg:   18,   // main cards
  xl:   22,   // large hero cards
  xxl:  28,   // bottom sheets, modals, goal hero
  full: 999,  // pills, FAB, avatar
}
```

---

## 6. Shadows

```ts
export const shadows = {
  card: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius:  12,
    elevation:     6,
  },
  cardColorful: {
    // Used on pastel cards — softer, colored shadow
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius:  8,
    elevation:     3,
  },
  fab: {
    shadowColor:   '#F97316',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius:  12,
    elevation:     8,
  },
}
```

---

## 7. Component specs

### StatChip (3-col row on Home and Insights)

Each chip gets its OWN pastel background — not all the same dark chip:

```
Income chip:
  background: cardMint (#C8F5E4)
  label color: cardMintText (#0A3D2B), 10px 700 uppercase
  value color: cardMintText (#0A3D2B), 18px 700
  icon: small up-arrow in cardMintText

Expenses chip:
  background: cardPeach (#FFE4D4)
  label color: cardPeachText (#5C2300), 10px 700 uppercase
  value color: cardPeachText (#5C2300), 18px 700
  icon: small down-arrow in cardPeachText

Surplus chip:
  If positive: background cardMint, text cardMintText
  If zero:     background cardSky (#D4EEFF), text cardSkyText (#0A2E52)
  If negative: background cardCoral (#FFD4D4), text cardCoralText (#5C0A0A)

Each chip:
  borderRadius: 14
  padding: 12 14
  flex: 1
  border: 1px solid [chip border color]
```

### GoalCard

```
Overall card: bg #1A1D27, border #2A2F42, radius 18, padding 16

Progress ring: 56px
  track: 5px #2A2F42
  fill:  5px #F97316 (active), #5C6480 (blocked)

Goal name: 15px 700 white
Meta: "$X / $Y · due [date]" 12px #9BA3B8

Gap line:
  On track:  "On track · done by [Month]" — color #00C896
  Behind:    "Behind — needs $X/mo more"  — color #F97316
  Blocked:   "No surplus — tap to see why"— color #FF5C5C, tappable

Urgency badge (top-right absolute):
  Due in N days: bg cardPeach, text cardPeachText
  Past due:      bg cardCoral, text cardCoralText
  On track:      bg cardMint,  text cardMintText
  badge: radius 999, padding 3px 10px, 11px 700
```

### CoachInsightCard

```
Two options — use Option A (colorful) to match new theme:

OPTION A — Lavender pastel card (recommended):
  background: cardLavender (#E4DFFF)
  left border: none (pastel bg is enough)
  border: 1px cardLavBorder (#C9C0FF)
  borderRadius: 18
  padding: 16

  Overline: "COACH INSIGHT" — cardLavText (#2D1F6E), 10px 700 uppercase
  Nudge lines: cardLavText, 13px 400, line-height 20
  Orange dot: #7B6FFF (violet dot, not orange, to match lavender)
  CTA: "Ask coach how to fix this →" — #7B6FFF, 12px 700

OPTION B — keep dark card with orange left border (original)
  Use original spec if lavender feels too light

Default to OPTION A.
```

### NudgeCard / InsightCard (on Home bottom, Insights screen)

```
Each card gets a distinct pastel bg based on type:

  type="success"     → bg cardMint,    text cardMintText
  type="alert"       → bg cardPeach,   text cardPeachText
  type="tip"         → bg cardYellow,  text cardYellowText
  type="milestone"   → bg cardMint,    text cardMintText
  type="coach"       → bg cardLavender,text cardLavText
  type="info"        → bg cardSky,     text cardSkyText

Card layout:
  flexDirection: row, alignItems: flex-start, gap: 12
  padding: 14, borderRadius: 16
  border: 1px [type border color]

Icon square: 40x40, bg white at 50% opacity, radius 10
  icon: 20px, color matches cardXxxText

Title: 14px 700, cardXxxText
Body: 13px 400, cardXxxText at 85% opacity, lineHeight 20
```

### BalanceCard (Home hero card)

```
background: #1A1D27
border: 1px #2A2F42
borderRadius: 20
padding: 20

Label "Total Balance": 13px #9BA3B8, uppercase, letterSpacing 0.5
Amount: 36px 800 white, letterSpacing -1

Below amount: StatChipRow (3 colorful chips as above)
```

### TransactionRow

```
flexDirection: row, alignItems: center
paddingVertical: 12
borderBottom: 1px #1E2235

Icon tile: 44x44, borderRadius 12
  bg: CATEGORY_COLORS[category] at 15% opacity
  icon emoji: 20px, centered
  (e.g. Dining: bg #FF8C4215, emoji 🍽)

Name: 14px 600 white, flex 1
Sub:  12px #9BA3B8 — "Category · Apr 29"

Amount:
  income  → "+$X" color #00C896 (teal green, not just green)
  expense → "-$X" color white   (NOT red — red is for alerts only)
```

### GoalDetail two-tone layout

```
Hero section (top ~35% of screen):
  background: #FFE8D4 (goalHeroBg — warm peach)
  padding: 48px 20px 60px
  Goal emoji: 56px
  Goal name: 24px 800, color #2A1200 (goalHeroText)
  Subtitle "Travel Goal": 14px #7A4520

Dark card slides up over hero (overlapping by ~40px):
  background: #0F1117
  borderTopLeftRadius: 28
  borderTopRightRadius: 28
  padding: 24 20
  Contains: ring, stats, behavior card, savings input
```

### Progress ring (GoalDetail)

```
Size: 120px
Track: 8px stroke #2A2F42
Fill:  8px stroke #F97316
Center:
  Percentage: 28px 800 white
  "COMPLETE": 10px 600 #9BA3B8 uppercase letterSpacing 1
```

### Donut chart (Insights — replace pie with donut)

```
Use a donut chart (hollow center) not a solid pie:
  Outer radius: full
  Inner radius: 55% (creates the donut hole)
  Stroke width: effectively thick slices

Center of donut when nothing selected:
  Total spend amount: 18px 700 white
  "This month": 11px #9BA3B8

On slice tap:
  Center updates to show: category amount + category name
  Selected slice scales out slightly (1.05)
  Other slices dim to 60% opacity
  Border on selected: 2px white ring around slice
```

### PrimaryButton

```
background: #F97316
color: #FFFFFF
fontSize: 16, fontWeight: 700
height: 54, borderRadius: 999 (pill shape — NOT square)
width: 100%
shadow: shadowColor #F97316, opacity 0.3, radius 12
pressed: scale 0.97, opacity 0.9
```

### GhostButton

```
background: transparent
border: 1.5px #2A2F42
color: #FFFFFF
fontSize: 15, fontWeight: 600
height: 48, borderRadius: 999
```

### FAB

```
position: absolute, bottom 24, right 20
size: 56x56, borderRadius: 28
background: #F97316
icon: white +, 26px
shadow: shadowColor #F97316, opacity 0.4, radius 16
```

### Badge / Pill

```
borderRadius: 999
paddingH: 10, paddingV: 4
fontSize: 11, fontWeight: 700

success:  bg cardMint,    color cardMintText
warning:  bg cardPeach,   color cardPeachText
danger:   bg cardCoral,   color cardCoralText
info:     bg cardSky,     color cardSkyText
coach:    bg cardLavender,color cardLavText
```

### Tab bar

```
background: #0F1117
borderTop: 1px #1E2235
paddingTop: 10
paddingBottom: 4 (+ safe area inset)

Inactive icon: #3A3F55
Inactive label: 11px #5C6480
Active icon:   #F97316
Active label:  11px #F97316, fontWeight 700

Active tab indicator: small orange dot (4px) ABOVE the icon
  NOT a background pill — just a dot
```

---

## 8. Chart specs

### Cashflow line chart

```
Line color: #F97316 (orange)
Line width: 2.5
Dots: 6px filled, #F97316, white 2px center ring
Grid lines: 1px #1E2235 dashed
Y-axis labels: 12px #5C6480
X-axis labels: 12px #9BA3B8

Tooltip:
  bg: #1A1D27
  border: 1px [nearest data color]
  borderRadius: 12
  padding: 8 14
  shadow: card shadow
  Row 1: "MON YYYY" — 10px #9BA3B8 uppercase
  Row 2: amount — 16px 700 white (green if ≥0, red if <0)
  Connector: vertical dashed line from tooltip to dot, 1px #F97316 40% opacity
```

### Donut chart (Insights)

```
See donut spec in component section above.
Legend below chart:
  Each row: colored dot (10px) + category name (13px 400 #9BA3B8) 
            + amount right-aligned (13px 600 white)
  Row height: 32px
  Active row (when slice tapped): name becomes white 600, 
    amount becomes [category color] 700
```

---

## 9. Utility functions (unchanged — already correct)

```ts
export function formatCurrency(n: number, decimals = 0): string {
  return parseFloat(n.toFixed(decimals)).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: decimals,
  })
}

export function formatPct(n: number): string {
  return `${Math.round(n)}%`
}

export function getDisplayName(profile: Profile, user: User): string {
  if (profile?.full_name?.trim()) return profile.full_name.trim().split(' ')[0]
  const email = user?.email ?? ''
  const local = email.split('@')[0]
  return local.replace(/[\d_]+$/, '') || 'there'
}

export function guessCategory(description: string): string {
  const lower = description.toLowerCase()
  for (const [keyword, category] of Object.entries(MERCHANT_MAP)) {
    if (lower.includes(keyword)) return category
  }
  return 'Other'
}
```

---

## 10. Screen-level color application

### Home screen
```
Page bg: #0F1117
Greeting text: #9BA3B8 (muted)
Name: white, 28px 800

BalanceCard: #1A1D27 card
StatChips: COLORFUL (mint/peach/coral — see StatChip spec)
CoachInsightCard: lavender pastel (#E4DFFF)
GoalCards: dark navy (#1A1D27) with orange rings
Recent Activity card: #1A1D27
Transaction rows: icon tile uses category color at 15% opacity bg
Nudge cards at bottom: colorful pastel (mint for success, peach for warning)
```

### Goals screen
```
Page bg: #0F1117
"Create New Goal" button: PrimaryButton (orange pill)
GoalCards: dark navy with colorful urgency badges
```

### Goal Detail screen
```
Hero: #FFE8D4 peach top section
Dark overlay card: #0F1117 sliding up
Ring: orange #F97316
Stats: dark card #1A1D27
GoalBehaviorCard: lavender pastel (#E4DFFF)
Savings input: dark input #1E2130
```

### Insights screen
```
Page bg: #0F1117
Health chips: colorful (mint/peach/sky — see StatChip spec)
Donut chart: dark card #1A1D27
Budget caps section: dark card #1A1D27
  Breach pills: cardCoral bg, cardCoralText
  Fixed cost indicator: lock icon, gray
Coach perspective cards: colorful pastels by type
Cashflow chart: dark card #1A1D27
```

### AI Coach screen
```
Page bg: #0F1117
Focus card: lavender pastel (#E4DFFF) — not dark
User bubbles: #F97316 bg, white text
Assistant bubbles: #1A1D27 bg, white text
Input bar: #1A1D27 bg, border #2A2F42
Send button: #F97316 circle
```

### Profile screen
```
Page bg: #0F1117
Section cards: #1A1D27
Avatar: lavender bg (#E4DFFF), violet text initials
Notification toggle: active state #00C896 (teal), inactive #3A3F55
```

---

## 11. Copy rules (unchanged)

| ❌ Never | ✅ Replace with |
|---|---|
| "Save to Supabase" | "Save changes" |
| Raw float numbers | formatCurrency() always |
| Raw email/username | getDisplayName() always |
| ALL CAPS section labels | overline style (11px 700 uppercase) sparingly |
| "Need positive monthly surplus" | "No surplus yet — tap to see why" |
| "Gemini Edge Function" | Remove from UI |
| "Not in MVP" | "Coming soon" |

---

## 12. Visual hierarchy rules

1. **Colorful = important.** Pastel cards draw the eye — use them for
   the 1-3 most important things per screen only. Not everything.

2. **Dark cards = supporting data.** Charts, transaction lists, 
   budget inputs — these are reference, not action. Keep dark.

3. **Orange = primary action only.** Buttons, active state, 
   progress rings. Never use orange for decorative purposes.

4. **White text = primary data.** Numbers, names, amounts.
   Blue-gray (#9BA3B8) = labels and supporting context.

5. **Card order = priority order.** Most important card at top.
   Never bury the coach insight below charts.

6. **One hero number per screen.** Home: balance. Goals: progress %.
   Insights: this month's spend. Don't compete for attention.

---

*v2.0 — colorful pastel + dark navy theme*
*Use @design-systmev2.md  at the start of every Cursor UI prompt*