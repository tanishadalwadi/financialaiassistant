# FinanceAI - Complete UI/UX Design & Frontend Specifications

## 1. Design System Overview

### 1.1 Core Philosophy

- **Style**: Dark premium theme with playful pastel accents
- **Vibe**: AI-powered, friendly, modern fintech
- **Personality**: Professional yet approachable, growth-oriented
- **Target**: Mobile-first financial wellness app

---

## 2. Color System

### 2.1 Primary Colors

```css
--primary: #ed7925 /* Vibrant orange - main action color */
  --primary-hover: #f59042 /* Lighter orange - hover states */;
```

### 2.2 Background Colors

```css
--background: #0f1720 /* Main app background (darkest) */
  --background-secondary: #141c26 /* Secondary background */ --card: #1a2430
  /* Card/panel background */ --card-elevated: #1f2a38
  /* Elevated/hover card state */;
```

### 2.3 Text Colors

```css
--foreground: #e6eef6 /* Primary text (lightest) */ --muted-foreground: #9fb0c0
  /* Secondary text (medium) */ --subtle-foreground: #6b7c8f
  /* Tertiary text (subtle) */;
```

### 2.4 Pastel Accent Cards

```css
--pastel-pink: #e9b7f5 /* Used for creative/premium features */
  --pastel-yellow: #ffe8b4 /* Used for warnings/highlights */
  --pastel-blue: #c9e4ff /* Used for info/tips */ --pastel-green: #b4f4d5
  /* Used for success/income */ --pastel-orange: #ffd1b4
  /* Used for expenses/alerts */;
```

### 2.5 Functional Colors

```css
--success: #4faf8f /* Success states, income */ --warning: #f4a261
  /* Warning states */ --error: #e76f51 /* Error/destructive states, expenses */
  --purple: #7b61ff /* Secondary accent */;
```

### 2.6 Border & Overlay

```css
--border: rgba(255, 255, 255, 0.05) /* Default borders */
  --border-hover: rgba(255, 255, 255, 0.1) /* Hover borders */
  --overlay: rgba(0, 0, 0, 0.8) /* Modal backdrop */;
```

---

## 3. Typography

### 3.1 Font Stack

```css
font-family:
  -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu",
  "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
```

### 3.2 Type Scale

```css
/* Display */
--text-display: 32px /* Hero titles, onboarding */ /* Headings */
  --text-h1: 30px /* Page titles */ --text-h2: 24px /* Section headers */
  --text-h3: 18px /* Card headers */ --text-h4: 15px /* Small headers */
  /* Body */ --text-base: 15px /* Standard body text */ --text-sm: 13px
  /* Secondary body text */ --text-xs: 12px /* Labels, captions */
  --text-tiny: 11px /* Micro text, timestamps */ --text-micro: 10px
  /* Uppercase labels */;
```

### 3.3 Font Weights

```css
--font-bold: 700 /* Emphasis, numbers, headings */ --font-semibold: 600
  /* Buttons, labels */ --font-medium: 500 /* Secondary emphasis */
  --font-regular: 400 /* Body text */;
```

### 3.4 Line Heights

```css
--leading-tight: 1.2 /* Large headings */ --leading-normal: 1.5 /* Body text */
  --leading-relaxed: 1.7 /* Comfortable reading */;
```

### 3.5 Letter Spacing

```css
--tracking-tight: -0.02em /* Large headings */ --tracking-normal: 0
  /* Default */ --tracking-wide: 0.05em /* Uppercase labels */;
```

---

## 4. Spacing System

### 4.1 Base Scale (4px increment)

```css
--space-1: 4px --space-2: 8px --space-3: 12px --space-4: 16px --space-5: 20px
  --space-6: 24px --space-7: 28px --space-8: 32px --space-10: 40px
  --space-12: 48px;
```

### 4.2 Common Patterns

- **Card padding**: `p-6` (24px) or `p-7` (28px) for large cards
- **Section spacing**: `mb-10` (40px)
- **Content container**: `px-6` (24px horizontal)
- **Bottom nav clearance**: `pb-28` (112px)
- **Stack items**: `space-y-3` or `space-y-4`

---

## 5. Border Radius System

### 5.1 Hierarchy

```css
--radius-full: 9999px /* Fully rounded (pills, buttons) */ --radius-xl: 24px
  /* Large cards, main containers */ --radius-lg: 20px /* Standard cards */
  --radius-md: 16px /* Small cards, inputs */ --radius-sm: 12px
  /* Tiny elements */ --radius-xs: 8px /* Micro elements */;
```

### 5.2 Usage Guide

- **Primary buttons**: `rounded-full`
- **Large feature cards**: `rounded-[24px]`
- **Standard cards**: `rounded-[20px]`
- **Stat cards**: `rounded-[16px]`
- **Badges/pills**: `rounded-full`
- **Icon containers**: `rounded-[16px]` to `rounded-[20px]`

---

## 6. Shadow System

### 6.1 Elevation Levels

```css
/* Light shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05) /* Medium shadows */ --shadow-md: 0
  4px 12px rgba(0, 0, 0, 0.1) /* Large shadows (feature cards) */ --shadow-lg: 0
  8px 24px rgba(0, 0, 0, 0.15) /* Extra large (modals) */ --shadow-xl: 0 16px
  48px rgba(0, 0, 0, 0.2) /* Colored glow (primary button/nav) */
  --shadow-primary: 0 8px 24px rgba(237, 121, 37, 0.5);
```

### 6.2 Common Patterns

```css
/* Standard card */
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

/* Elevated card */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

/* Active navigation item */
box-shadow: 0 8px 24px rgba(237, 121, 37, 0.5);

/* Modal backdrop */
background: rgba(0, 0, 0, 0.8);
backdrop-filter: blur(8px);
```

---

## 7. Component Specifications

### 7.1 Buttons

#### Primary Button

```tsx
className="py-5 px-6 rounded-full bg-[#ed7925] text-white
           font-semibold text-[15px] shadow-sm
           hover:bg-[#f59042] active:scale-[0.98] transition-all"
```

**Usage**: Main actions (Continue, Create, Submit)
**States**: Default, Hover (#f59042), Active (scale 0.98)

#### Secondary Button

```tsx
className="py-5 px-6 rounded-full bg-[#1A2430] border-2 border-white/5
           text-[#E6EEF6] font-semibold text-[15px]
           hover:bg-[#1F2A38] active:scale-[0.98] transition-all"
```

**Usage**: Alternative actions (Cancel, Back)

#### Tertiary Button (Unselected State)

```tsx
className="py-5 px-6 rounded-[20px] bg-transparent border-2 border-white/10
           text-[#E6EEF6] font-semibold text-[15px]
           hover:border-white/20 transition-all"
```

**Usage**: Option selection, filters

#### Small Button (Compact)

```tsx
className="px-4 py-2 rounded-full bg-[#ed7925] text-white
           text-[12px] font-medium hover:bg-[#f59042]
           active:scale-95 transition-all"
```

**Usage**: Inline actions, filter chips

### 7.2 Cards

#### Large Feature Card

```tsx
className="p-8 rounded-[24px] bg-[#1A2430] border border-white/5
           shadow-lg shadow-black/20"
```

**Usage**: Main content cards, charts, featured content

#### Standard Card

```tsx
className = "p-6 rounded-[20px] bg-[#1A2430] border border-white/5 shadow-sm";
```

**Usage**: Goal items, setting groups, content sections

#### Stat Card (Colorful)

```tsx
className = "p-3 rounded-[16px] bg-[#B4F4D5]"; // Or other pastel colors
```

**Usage**: Income/Expense/Saved stats, summary metrics
**Text Color**: Always use dark text `text-[#1A2430]` on pastel backgrounds

#### Interactive Card (Clickable)

```tsx
className="p-6 rounded-[20px] bg-[#1A2430] border border-white/5
           hover:bg-[#1F2A38] active:scale-[0.99] transition-all"
```

**Usage**: Goal list items, clickable settings

### 7.3 Navigation

#### Bottom Navigation (Pill-Shaped Floating)

```tsx
<nav className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
  <div
    className="bg-[#1A2430]/98 backdrop-blur-2xl rounded-full px-4 py-2.5 
                  shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)] 
                  pointer-events-auto"
  >
    <div className="flex items-center gap-1">{/* Tab items */}</div>
  </div>
</nav>
```

**Active Tab**:

```tsx
className="w-[60px] h-[60px] -my-3 rounded-full bg-[#ed7925]
           shadow-[0_8px_24px_rgba(237,121,37,0.5)] border-4 border-[#1A2430]"
```

**Inactive Tab**:

```tsx
className = "w-11 h-11 rounded-full";
```

**Icon States**:

- Active: `h-6 w-6 text-white strokeWidth={2.5}`
- Inactive: `h-5 w-5 text-[#9FB0C0] strokeWidth={2}`

### 7.4 Inputs

#### Text Input

```tsx
className="w-full p-4 rounded-[18px] border-2 border-white/5
           focus:border-[#ed7925] focus:outline-none transition-colors
           bg-[#141C26] text-[#E6EEF6] placeholder:text-[#9FB0C0]"
```

#### Search Input

```tsx
className="flex-1 py-3 bg-transparent focus:outline-none
           text-[#E6EEF6] text-[15px] placeholder:text-[#9FB0C0]"
```

#### Number Input (with $ prefix)

```tsx
<div className="relative">
  <span
    className="absolute left-5 top-1/2 -translate-y-1/2 
                   text-[#9FB0C0] font-semibold text-[16px]"
  >
    $
  </span>
  <input
    className="w-full p-4 pl-9 rounded-[18px] border-2 border-white/5 
                    focus:border-[#ed7925] focus:outline-none 
                    bg-[#141C26] text-[#E6EEF6]"
  />
</div>
```

### 7.5 Toggle Switch

```tsx
<button
  className={`relative w-[52px] h-[30px] rounded-full transition-colors
                    ${enabled ? "bg-[#ed7925]" : "bg-[#1F2A38]"}`}
>
  <div
    className={`absolute top-[3px] left-[3px] w-[28px] h-[28px] 
                   bg-white rounded-full transition-transform shadow-md
                   ${enabled ? "translate-x-[26px]" : "translate-x-0"}`}
  />
</button>
```

### 7.6 Progress Indicators

#### Progress Ring

```tsx
// SVG-based circular progress
stroke="#ed7925"
strokeWidth={8}
strokeLinecap="round"
```

#### Progress Bar

```tsx
<div className="h-3.5 bg-white/5 rounded-full overflow-hidden">
  <div
    className="h-full bg-[#ed7925] rounded-full transition-all duration-1000"
    style={{ width: `${progress}%` }}
  />
</div>
```

#### Progress Dots (Onboarding)

```tsx
{
  /* Active */
}
className = "h-2 w-10 rounded-full bg-[#ed7925]";

{
  /* Completed */
}
className = "h-2 w-2 rounded-full bg-[#ed7925]/50";

{
  /* Inactive */
}
className = "h-2 w-2 rounded-full bg-white/10";
```

### 7.7 Modal

```tsx
<div
  className="fixed inset-0 bg-black/80 backdrop-blur-sm 
                flex items-end sm:items-center justify-center z-50 p-4"
>
  <div
    className="w-full max-w-md bg-[#1A2430] 
                  rounded-t-[24px] sm:rounded-[24px] shadow-2xl 
                  max-h-[90vh] overflow-y-auto"
  >
    {/* Modal content */}
  </div>
</div>
```

---

## 8. Screen Specifications

### 8.1 Home Screen

**Layout**:

- Header: User greeting + balance card
- Stats Row: 3-column grid (Income, Expenses, Saved)
- Quick Actions: 2-button row
- AI Insight: Colorful card with tip
- Primary Goal: Progress card with ring
- Chart Section: Monthly spending line chart
- Recent Activity: Transaction list

**Key Elements**:

```tsx
// Balance Card
<div className="mb-10 p-8 rounded-[24px] bg-[#1A2430]
                border border-white/5 shadow-lg shadow-black/20">

// Stat Cards (3-column grid)
<div className="grid grid-cols-3 gap-3">
  <div className="p-3 rounded-[16px] bg-[#B4F4D5]">
    {/* Green for Income */}
  </div>
  <div className="p-3 rounded-[16px] bg-[#FFD1B4]">
    {/* Orange for Expenses */}
  </div>
  <div className="p-3 rounded-[16px] bg-[#C9E4FF]">
    {/* Blue for Saved */}
  </div>
</div>

// Quick Actions
<div className="grid grid-cols-2 gap-4">
  <button className="py-4 px-5 rounded-full bg-[#ed7925]">Ask AI</button>
  <button className="py-4 px-5 rounded-full bg-transparent
                     border-2 border-white/10">New Goal</button>
</div>
```

### 8.2 Goals Screen

**Layout**:

- Header: Title + description
- Create Button: Primary CTA
- Goals List: Stacked cards with progress

**Goal Card Structure**:

```tsx
<Link
  className="block p-6 rounded-[20px] bg-[#1A2430] 
                 border border-white/5 hover:bg-[#1F2A38] 
                 active:scale-[0.99] transition-all"
>
  {/* Icon container with pastel color */}
  <div className="p-4 rounded-[20px] bg-[pastel-color]">
    <span className="text-[28px]">{icon}</span>
  </div>

  {/* Progress bar with matching color */}
  <div className="h-3.5 bg-white/5 rounded-full">
    <div
      className="h-full bg-[pastel-color] rounded-full"
      style={{ width: `${progress}%` }}
    />
  </div>

  {/* Stats: Current, Remaining, Target */}
</Link>
```

### 8.3 Goal Details Screen

**Header**:

```tsx
// Colored header with solid pastel background
<div className="p-7 pb-28 bg-[pastel-color] rounded-b-[40px] shadow-xl">
  {/* Dark text on pastel: text-[#1A2430] */}
  <Link className="text-[#1A2430]">Back to Goals</Link>

  {/* Icon with white/60 backdrop */}
  <div className="p-5 rounded-[26px] bg-white/60">
    <span className="text-[44px]">{icon}</span>
  </div>

  <h1 className="text-[32px] font-bold text-[#1A2430]">{name}</h1>
</div>
```

**Progress Card**:

- Large progress ring (120px)
- Stat cards with pastel colors (yellow, blue, purple)
- Action buttons (Add Funds, Adjust Goal)

### 8.4 Insights Screen

**Components**:

- Summary cards (2-column grid, green + yellow)
- Pie chart card (spending by category)
- Line chart card (spending vs budget)
- AI insights list (colored cards)

**AI Insight Cards**:

```tsx
{
  /* Success - Green */
}
<div className="p-5 rounded-[20px] bg-[#B4F4D5]">
  <Lightbulb className="text-[#2D7A4F]" />
  <p className="text-[#1A2430]">{message}</p>
</div>;

{
  /* Warning - Orange */
}
<div className="p-5 rounded-[20px] bg-[#FFD1B4]">
  <AlertCircle className="text-[#C2410C]" />
  <p className="text-[#1A2430]">{message}</p>
</div>;

{
  /* Tip - Blue */
}
<div className="p-5 rounded-[20px] bg-[#C9E4FF]">
  <Lightbulb className="text-[#ed7925]" />
  <p className="text-[#1A2430]">{message}</p>
</div>;
```

### 8.5 AI Coach Screen

**Layout**:

- Fixed header with AI branding
- Scrollable message area
- Suggested prompts (horizontal scroll)
- Fixed input footer

**Message Bubbles**:

```tsx
{/* User message */}
<div className="bg-[#ed7925] text-white rounded-[18px] rounded-br-md p-4">

{/* AI message */}
<div className="bg-[#1A2430] border border-white/5 text-[#E6EEF6]
                rounded-[18px] rounded-bl-md p-4">
  <div className="flex items-center gap-2 mb-2.5">
    <Sparkles className="h-3.5 w-3.5 text-[#ed7925]" />
    <span className="text-[11px] font-semibold text-[#ed7925]
                     uppercase tracking-wide">AI COACH</span>
  </div>
</div>
```

**Input Footer**:

```tsx
<div className="fixed bottom-0 left-0 right-0 bg-[#1A2430] border-t border-white/5 p-4">
  <div className="flex items-center gap-2 p-2 rounded-full bg-[#141C26]">
    <input className="flex-1 bg-transparent" />
    <button className="p-3.5 rounded-full bg-[#ed7925]">
      <Send className="h-5 w-5 text-white" />
    </button>
  </div>
</div>
```

### 8.6 Profile Screen

**Sections**:

- User Info Card
- Financial Preferences (Monthly Budget, Savings Rate)
- Notifications & Nudges (Toggle switches)
- Appearance (Dark mode toggle)
- Account Settings (List items with chevron)

**Toggle Row**:

```tsx
<div className="p-6 rounded-[20px] bg-[#1A2430] border border-white/5">
  <div className="flex items-center justify-between">
    <div>
      <p className="font-semibold text-[#E6EEF6] text-[15px]">Label</p>
      <p className="text-[13px] text-[#9FB0C0] mt-1">Description</p>
    </div>
    {/* Toggle switch */}
  </div>
</div>
```

### 8.7 Onboarding Flow

**Structure**: 4 steps, vertical centered layout

**Option Buttons (Unselected)**:

```tsx
className="w-full py-5 px-6 rounded-[20px] bg-transparent
           text-[#E6EEF6] border-2 border-white/10
           hover:border-white/20 font-semibold text-[15px]"
```

**Option Buttons (Selected)**:

```tsx
className="w-full py-5 px-6 rounded-[20px] bg-[#ed7925]
           text-white border-2 border-[#ed7925]
           font-semibold text-[15px]"
```

---

## 9. Interaction Patterns

### 9.1 Transitions

```css
/* Standard transition */
transition: all 0.2s ease-in-out;

/* Specific properties */
transition-colors: all 0.2s;
transition-transform: all 0.3s;
transition-opacity: all 0.15s;
```

### 9.2 Hover States

- **Cards**: `hover:bg-[#1F2A38]`
- **Buttons**: `hover:bg-[#f59042]`
- **Borders**: `hover:border-white/20`
- **Text links**: `hover:text-[#E6EEF6]` or `hover:opacity-70`

### 9.3 Active/Press States

- **Buttons**: `active:scale-[0.98]` or `active:scale-95`
- **Cards**: `active:scale-[0.99]`
- **Navigation**: `active:scale-90`

### 9.4 Focus States

```css
focus:outline-none
focus:border-[#ed7925]
focus:ring-2 focus:ring-[#ed7925]/20
```

---

## 10. Iconography

### 10.1 Library

**Lucide React** - Consistent, clean, modern icon set

### 10.2 Icon Sizes

```tsx
{
  /* Large feature icons */
}
<Icon className="h-16 w-16" strokeWidth={1.5} />;

{
  /* Standard icons */
}
<Icon className="h-6 w-6" strokeWidth={2} />;

{
  /* Navigation (active) */
}
<Icon className="h-6 w-6" strokeWidth={2.5} />;

{
  /* Navigation (inactive) */
}
<Icon className="h-5 w-5" strokeWidth={2} />;

{
  /* Small inline icons */
}
<Icon className="h-4 w-4" strokeWidth={2} />;

{
  /* Micro icons */
}
<Icon className="h-3.5 w-3.5" strokeWidth={2} />;
```

### 10.3 Common Icons

- **Home**: `Home`
- **Goals**: `Target`
- **Insights**: `TrendingUp`
- **AI Coach**: `MessageCircle`, `Sparkles`
- **Profile**: `User`
- **Back**: `ArrowLeft`
- **Forward**: `ChevronRight`
- **Success**: `TrendingUp`, `Lightbulb`
- **Warning**: `AlertCircle`
- **Income**: `TrendingUp`
- **Expense**: `TrendingDown`
- **Saved**: `Target`

---

## 11. Charts & Data Visualization

### 11.1 Library

**Recharts** - React-based charting library

### 11.2 Line Chart Configuration

```tsx
<LineChart id="unique-id">
  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
  <XAxis
    dataKey="month"
    stroke="#9FB0C0"
    fontSize={12}
    tickLine={false}
    axisLine={false}
  />
  <YAxis
    stroke="#9FB0C0"
    fontSize={12}
    tickLine={false}
    axisLine={false}
    tickFormatter={(value) => `$${value}`}
  />
  <Tooltip
    contentStyle={{
      backgroundColor: "#1A2430",
      border: "1px solid rgba(255, 255, 255, 0.05)",
      borderRadius: "16px",
    }}
  />
  <Line
    name="Spending"
    type="monotone"
    dataKey="amount"
    stroke="#ed7925"
    strokeWidth={3}
    dot={{ fill: "#ed7925", r: 5 }}
    activeDot={{ r: 7 }}
  />
</LineChart>
```

### 11.3 Pie Chart Configuration

```tsx
<PieChart id="unique-id">
  <Pie
    data={data}
    cx="50%"
    cy="50%"
    innerRadius={70}
    outerRadius={95}
    paddingAngle={3}
    dataKey="value"
    strokeWidth={0}
  >
    {data.map((entry) => (
      <Cell key={entry.name} fill={entry.color} />
    ))}
  </Pie>
  <Tooltip
    contentStyle={{
      backgroundColor: "#1A2430",
      border: "1px solid rgba(255, 255, 255, 0.05)",
      borderRadius: "16px",
    }}
  />
</PieChart>
```

---

## 12. Responsive Behavior

### 12.1 Breakpoints

```css
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Desktop */
```

### 12.2 Container

```tsx
<main className="mx-auto max-w-md">
  {/* All content constrained to mobile width */}
</main>
```

### 12.3 Modal Behavior

```tsx
{
  /* Mobile: bottom sheet */
}
className = "rounded-t-[24px]";

{
  /* Desktop: centered modal */
}
sm: className = "rounded-[24px]";
```

---

## 13. Animation & Motion

### 13.1 Page Transitions

None - instant navigation for speed

### 13.2 Micro-interactions

```tsx
{/* Button press */}
active:scale-[0.98]

{/* Card tap */}
active:scale-[0.99]

{/* Navigation tap */}
active:scale-90

{/* Progress bars */}
transition-all duration-1000

{/* Hover states */}
transition-all duration-200
```

### 13.3 Loading States

- Use skeleton screens (dark cards with subtle pulse)
- Chart data: fade in with 300ms delay

---

## 14. Accessibility

### 14.1 Color Contrast

- All text on dark: Minimum 4.5:1 ratio
- Pastel cards: Use `text-[#1A2430]` for maximum contrast
- Primary button: White text on orange (excellent contrast)

### 14.2 Focus Management

- All interactive elements have focus states
- Modal traps focus
- Skip navigation for keyboard users

### 14.3 Touch Targets

- Minimum 44×44px for all interactive elements
- Navigation icons: 60×60px (active), 44×44px (inactive)

---

## 15. Code Conventions

### 15.1 File Structure

```
src/
├── app/
│   ├── components/
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx
│   │   ├── screens/
│   │   │   ├── Home.tsx
│   │   │   ├── Goals.tsx
│   │   │   ├── GoalDetails.tsx
│   │   │   ├── Insights.tsx
│   │   │   ├── AICoach.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Transactions.tsx
│   │   │   └── OnboardingFlow.tsx
│   │   └── shared/
│   │       └── ProgressRing.tsx
│   ├── data/
│   │   └── mockData.ts
│   └── App.tsx
├── styles/
│   ├── theme.css
│   └── fonts.css
└── imports/
    └── [imported assets]
```

### 15.2 Component Pattern

```tsx
export function ComponentName() {
  // 1. State
  const [state, setState] = useState();

  // 2. Hooks
  const navigate = useNavigate();

  // 3. Derived values
  const computed = useMemo(() => {}, []);

  // 4. Handlers
  const handleAction = () => {};

  // 5. Render
  return <div className="...">{/* JSX */}</div>;
}
```

### 15.3 Naming Conventions

- **Components**: PascalCase (`Home`, `GoalDetails`)
- **Files**: PascalCase for components (`Home.tsx`)
- **CSS classes**: Tailwind utility classes
- **Props**: camelCase
- **Constants**: UPPER_SNAKE_CASE

### 15.4 Tailwind Class Order

1. Layout (display, position, z-index)
2. Sizing (w-, h-, min-, max-)
3. Spacing (p-, m-, gap-)
4. Typography (text-, font-, leading-)
5. Backgrounds (bg-)
6. Borders (border, rounded)
7. Effects (shadow, opacity)
8. Transitions (transition, hover, active)

---

## 16. Data Structures

### 16.1 Goal Object

```typescript
interface Goal {
  id: string;
  name: string;
  type: "savings" | "travel" | "purchase" | "monthly" | "emergency";
  target: number;
  current: number;
  deadline: string; // ISO date
  icon: string; // Emoji
  color: string; // Tailwind gradient or solid color mapping
}
```

### 16.2 Transaction Object

```typescript
interface Transaction {
  id: string;
  name: string;
  amount: number; // Negative for expenses
  category: string;
  date: string; // ISO date
  type: "income" | "expense";
}
```

### 16.3 User Object

```typescript
interface User {
  name: string;
  email: string;
  balance: number;
  income: number;
  expenses: number;
  savings: number;
}
```

---

## 17. Performance Optimizations

### 17.1 Image Handling

- Use `ImageWithFallback` component
- Import via `figma:asset` scheme for Figma assets
- SVGs imported as React components

### 17.2 Chart Rendering

- Use unique IDs for each chart instance
- Memoize gradient IDs with timestamp + random
- Limit data points to visible range

### 17.3 List Rendering

- Always provide unique `key` props
- Use React.memo for expensive list items
- Virtualize long transaction lists if >100 items

---

## 18. Special Notes

### 18.1 Gradient Removal

All gradients have been replaced with solid colors for consistency:

- Navigation active state: solid `#ed7925`
- Goal cards: solid pastel colors (mapped from Tailwind gradients)
- Progress bars: solid colors matching card theme

### 18.2 Color Mapping for Goals

```typescript
const solidColors = {
  "from-amber-400 to-orange-500": "bg-[#FFD1B4]",
  "from-emerald-400 to-teal-500": "bg-[#B4F4D5]",
  "from-blue-400 to-indigo-500": "bg-[#C9E4FF]",
  "from-purple-400 to-pink-500": "bg-[#E9B7F5]",
};
```

### 18.3 Text Readability on Pastels

**Critical**: Always use dark text on pastel backgrounds

```tsx
// ✅ Correct
<div className="bg-[#B4F4D5]">
  <p className="text-[#1A2430]">Dark text on light background</p>
</div>

// ❌ Wrong
<div className="bg-[#B4F4D5]">
  <p className="text-white">Poor contrast!</p>
</div>
```

---

## 19. Build & Deploy

### 19.1 Tech Stack

- **Framework**: React 18+
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Charts**: Recharts
- **Build**: Vite

### 19.2 Environment

- Development server runs automatically
- No manual `npm run dev` needed
- Preview updates in real-time

---

## 20. Quick Reference

### 20.1 Most Common Classes

**Card**:

```tsx
className = "p-6 rounded-[20px] bg-[#1A2430] border border-white/5 shadow-sm";
```

**Primary Button**:

```tsx
className =
  "py-5 px-6 rounded-full bg-[#ed7925] text-white font-semibold text-[15px] hover:bg-[#f59042] active:scale-[0.98] transition-all";
```

**Section Header**:

```tsx
className = "text-[30px] font-bold text-[#E6EEF6] mb-2 tracking-tight";
```

**Body Text**:

```tsx
className = "text-[15px] text-[#9FB0C0]";
```

**Stat Number**:

```tsx
className = "text-[32px] font-bold text-[#E6EEF6] tracking-tight";
```

---

## End of Specifications

This document contains all visual, interaction, and code specifications needed to recreate the FinanceAI app exactly. For questions or clarifications, reference the actual component files in `/src/app/components/`.

**Last Updated**: Current session  
**Primary Color**: #ed7925 (Vibrant Orange)  
**Design System Version**: 1.0
