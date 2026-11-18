# Project Context: cream

A modular, privacy-first, browser-based personal finance manager that interacts directly with local CSV files.

---

## Project Overview
**cream** is a single-page application (SPA) designed to manage personal finances without cloud dependency. It leverages the **File System Access API** to read and write directly to the user's local disk, ensuring 100% data privacy. A `.gitignore` policy is in place to prevent accidental upload of any `.csv` files (except the synthetic `demo.csv`).

**Core User Flow:**
1.  **Entry:** Create a new CSV or open/drag-and-drop an existing one.
2.  **Dashboard:** View net balance, recent activity, and categorical trends.
3.  **Operation:** Add transactions via manual form or **Quick Inline Entry** (bulk pasting).
4.  **Persistence:** Save changes back to the local CSV.

---

## Technical Stack

| Category | Technology | Usage |
| :--- | :--- | :--- |
| **Core** | React / JavaScript (ES6+) / Vite | Components, state and production build |
| **Styling** | Bootstrap 5.3.3 / CSS3 | Responsive UI and Design System |
| **Data Parsing** | [PapaParse 5.4.1](https://www.papaparse.com/) | CSV Reading and Writing |
| **Visualization** | [Chart.js 4.4.2](https://www.chartjs.org/) | Financial Analytics |
| **Icons** | Bootstrap Icons 1.11.3 | UI Component Decoration |
| **Native APIs** | File System Access API | Native Local File Management |

---

## Architecture
React components in `src/` own UI rendering. Shared session state uses `appReducer` from `assets/js/appState.js`; reusable validation, CSV and analytics logic stays in `assets/js/`. File services return values or errors and do not mutate UI state.

```text
├── src/
│   ├── main.jsx             # React root and bundled styles
│   ├── App.jsx              # Browser file lifecycle and shared state
│   └── components/          # Transactions, modal, health, analytics and filters
├── assets/
│   ├── css/style.css        # Existing Bootstrap overrides
│   └── js/                  # Reducer, CSV codec, validation and analytics models
├── data/categories.json     # Hierarchical static catalog
├── tests/                   # Unit, CSV integration, build and browser checks
├── vite.config.js           # Relative assets and static data copied to dist/
└── index.html               # Vite HTML entry point
```

---

## Workflow & Rules

### 1. Local Development
- Use Node.js 24, `npm ci`, then `npm run dev`. Use `npm run build` and `npm run preview` to check the production site. Deploy `dist/`, not the source files.
- Native file APIs require HTTPS or localhost and browser support. Other browsers use file-input/download fallback.
- Run `npm test` before pushing; it includes production build checks and browser flows.

### 2. Coding Standards
- **Naming Conventions:**
    - JS: `camelCase` for variables/functions.
    - HTML: `kebab-case` for IDs and classes.
- **State Management:**
    - Shared state lives in the reducer in `assets/js/appState.js`.
    - Dispatch immutable reducer actions for transaction edits; keep the saved baseline separate.
    - `viewOnlyMode` state controls UI visibility for editing elements and is auto-detected for mobile.
- **UI Logic:**
    - Keep data calculations in reusable modules and render through React components.
    - Clean up browser listeners and Chart.js instances in effects. Do not mix imperative DOM renderers with React.
    - Keep analytics components mounted across tab navigation to preserve filters and expansion state.

### 3. Documentation & Commits
- Keep comments focused on "why" rather than "what."
- Commit messages should be concise and describe the functional change.

---

## Design System & UI
The app uses a minimal black-and-white design with green/red financial accents. The system appearance controls both CSS and chart palettes.

- **Typography:** Uses system sans-serif fonts, tight editorial headings and tabular figures.
- **Layout:** Sticky footer implemented via Flexbox (`html, body { height: 100% }`).
- **Styling:** 
    - Strictly **Vanilla CSS** + **Bootstrap 5 Utilities**. 
    - **Avoid Tailwind CSS** unless explicitly requested.
    - Custom variables are defined in `:root` for consistency.
- **Aesthetics:** Use clear hierarchy, restrained surfaces, fine borders and generous spacing. Respect reduced-motion preferences. Avoid adding decorative shadows to every panel.
- **Navigation:** Overview is the initial workspace section. Desktop uses a sidebar; mobile uses bottom navigation. Keep the dataset ticker and file controls visible across sections.
- **Scope:** Overview and ticker use all-time analytics exclusions; recent activity and Dataset Health cover all records.

---

## CSV Data Schema
The program expects a specific column order for CSV compatibility:
`DateTime, Amount, Description, Category, Subcategory, Tags, Notes`

---

## Lessons Learned & Gotchas
- **File System API:** Requires a secure context (HTTPS or localhost) and explicit user activation (click event).
- **Sticky Footer:** Must wrap main content in a `<main>` tag with `flex: 1 0 auto` to work with the vertical flexbox body.
- **Bulk Parsing:** The `Quick Inline Entry` textarea uses real PapaParse and supports quoted multiline descriptions; do not split CSV manually.
- **Date Handling:** `inlineDateTime` supports date-only and ISO input. Preserve original timezone offsets and fractional seconds when unrelated fields are edited.
- **Mobile Compatibility:** File saving on iOS/iPadOS is restrictive; "View Only Mode" is used as a safety fallback to prevent confusing save prompts or accidental data loss on mobile devices.
- **Analytics Performance:** Hierarchical breakdowns use interactive "Show More" toggles to maintain performance and UI cleanliness when dealing with large numbers of categories or tags.
- **Tag System:** Tags are space-separated and prefixed with `#` (e.g. `#holiday #travel`). Old comma-separated CSV files are automatically migrated to this format upon loading to maintain seamless backwards compatibility.

