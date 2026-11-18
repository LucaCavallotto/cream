# cream

**Your money, in perspective.** A React application built with Vite: a private, browser-based personal finance workspace that works directly with your local CSV files. This application puts you in control of your data—no cloud required, no sign-ups, just privacy-focused financial tracking.

## Key Features

- **Direct File Access:** Uses the modern File System Access API to open and save CSV files directly to your device.
- **View Only Mode:** Automatically protects data on mobile devices (iOS/iPadOS) where file saving is restrictive, with a manual lock toggle for desktop users.
- **Bulk Entry:** Smart "Quick Inline Entry" supports pasting multiple transactions at once (e.g., from bank statements).
- **Overview:** See all-time net cash flow, this month’s spending, recent activity and dataset health before diving into the details.
- **Always-visible Dataset Ticker:** A scrolling, Wall Street-inspired strip of real dataset totals and top spending categories. Pause it at any time; reduced-motion preferences show a static, horizontally scrollable strip.
- **Responsive Workspace:** Sidebar navigation on desktop, compact icon navigation on tablets and a fixed bottom navigation on mobile. Add transactions and save changes from the header.
- **Comprehensive Analytics:** Detailed hierarchical breakdowns for Spending, Income, and Tags with interactive "Show More" functionality.
- **Reversible Analytics Exclusions:** Exclude investments, categories, subcategories or individual transactions from statistics without modifying the dataset.
- **Advanced Search & Sorting:** Search descriptions, amounts, classifications, tags and notes; sort by date, amount or category.
- **Automatic Appearance:** A minimal black-and-white interface follows your system’s light/dark preference, including chart labels, grid lines and colors. Green/red accents distinguish cash coming in and going out.
- **English Interface:** App labels, generated month names and chart number formatting use English regardless of the browser's language. Transaction descriptions and other imported data retain their original text.
- **Dataset Health:** Find missing or invalid values and classification problems, then review each affected transaction in the standard edit modal.

## Project Structure

```text
├── src/
│   ├── main.jsx            # React entry point and bundled styles
│   ├── App.jsx             # File lifecycle, navigation and shared state
│   └── components/         # Landing, overview, ticker, ledger, modal, health and analytics
├── assets/
│   ├── css/style.css       # Existing Bootstrap overrides and responsive styling
│   └── js/                 # Reusable CSV, validation, analytics and reducer logic
├── public/cream.svg        # Local brand icon
├── data/categories.json    # Static category/subcategory catalog
├── tests/                  # Unit, real CSV integration, build and browser tests
├── index.html              # Vite entry point and early system-theme setup
├── vite.config.js          # React build, relative asset paths and static data
└── dist/                   # Generated production site (ignored by Git)
```

React owns the UI and uses a reducer for shared session state. CSV parsing, validation, exclusions, date handling and sorting remain reusable JavaScript modules. Chart.js instances and browser listeners are created and cleaned up through component effects. Bootstrap utilities and icons support a custom, theme-aware design system; Bootstrap's DOM-manipulating JavaScript is no longer required. Runtime libraries are bundled locally rather than loaded from CDNs.

## How to Use

### 1. Getting Started
Use Node.js 24, then start the Vite development server:

```bash
npm ci
npm run dev
```

To test from another device on your local network, run `npm run dev -- --host` and open the Network URL printed by Vite. HTTP network access uses file-input/download fallbacks and supports transaction IDs even when `crypto.randomUUID` is unavailable.

Open the localhost URL printed by Vite. The source `index.html` requires Vite; opening it directly from disk does not run the app.

- **New Users:** Click **"Create New File"** to generate a fresh expense CSV on your computer.
- **Trial:** Click **"Take a look around"** to open the bundled `demo.csv` directly. It contains synthetic sample data and uses the same file/editing workflow.
- **Existing Users:** Click **"Browse Files"** or simply **Drag & Drop** your existing CSV anywhere on the screen.

The synthetic `demo.csv` uses the current category catalog and includes income, expenses, investments, repeated subcategory names under different categories, quoted descriptions, and intentionally empty classifications. Transactions span several periods, including October and November 2026, to exercise analytics and monthly comparisons. Open it and try the Quick Inline Entry examples below; use **Undo Changes** to discard test entries before saving, or test on a copy.

### Your workspace

Opening or creating a file takes you to **Overview**. Click **cream** in the header to close the file and return to the landing page; pending changes require confirmation. Use the sidebar (or bottom navigation on mobile) to switch between **Overview**, **Transactions**, **Analytics** and **Dataset Health**. Arrow keys, Home and End work when the navigation has keyboard focus.

Overview shows **all-time included cash flow**, not a bank-account balance. Recent activity and Dataset Health always cover all records. The always-visible ticker uses the same analytics exclusions as Overview and identifies invalid records that stay outside calculations. Analytics retains its own selected period. Filtering a period does not change the ticker’s all-time scope.

The **Add transaction** button is available in the header from every section. In the editor, **Now** fills the current local date and time without changing the other fields or submitting. Use **Save Changes**, the undo arrow, or the close icon for the file session. Downloads do not navigate away from the app; browser unload warnings apply only to unsaved changes. On read-only mobile sessions, the compact header shows cream, the filename, a **Read only** explanation button and the close control. Editing requires a computer. On mobile, the ledger includes a sort selector. Read-only sessions keep editing and saving disabled as before.

Pause or resume the ticker with its control; hovering or focusing its text pauses it temporarily. When your system requests reduced motion, the ticker stops moving and can be scrolled horizontally. Charts also disable animation. Appearance follows system changes automatically without resetting your work, filters or current section.

### 2. Adding Transactions
There are two ways to add expenses:
- **Manual Form:** Click **"Add transaction"** to fill out a detailed form including Category, Subcategory, Tags, and Notes.
- **Quick Inline Entry:** Paste one or more transactions into the textarea at the top of the modal. See the formats and copyable examples below.

#### Quick Inline Entry: formats and examples

Paste **only the transaction lines**, without a CSV header. Each transaction accepts three to five fields:

```text
DateTime, Amount, Description
DateTime, Amount, Description, Category
DateTime, Amount, Description, Category, Subcategory
```

- **DateTime:** `YYYY-MM-DD` or an ISO timestamp, such as `2026-11-02T14:28:36+01:00` or `2026-11-02T13:28:36Z`. Date-only entries use midnight in your local timezone.
- **Amount:** Negative for expenses and positive for income. The euro symbol is optional; use a decimal point, e.g. `€-1.50`.
- **Description:** Required. Enclose descriptions containing commas in double quotes. Escape a quote inside a quoted description by doubling it.
- **Category / Subcategory:** Optional names from `data/categories.json`. Matching ignores letter case and surrounding spaces, but does not translate names: use `Coffee`, not `Caffe`. A subcategory must belong to the supplied category.
- **Tags / Notes:** These are not inline fields; use the form. For multiple transactions, the same form tags and notes apply to every row.

**Original three-field format:**

```text
2026-11-02T14:28:36+01:00, €-1, Caffè
```

**Category only:**

```text
2026-11-02T14:28:36+01:00, €-1, Caffè, Bar
```

**Category and subcategory:**

```text
2026-11-02T14:28:36+01:00, €-1, Caffè con amici, Bar, Coffee
```

**Multiple transactions with different classifications:**

```text
2026-11-02T14:28:36+01:00, €-1, Caffè con amici, Bar, Coffee
2026-11-03, -25.50, Weekly groceries, Food & Dining, Groceries
2026-11-04, -5, "Coffee, cake", Bar, Snack
2026-11-05, +150, Freelance project, Income, Freelance
2026-11-06, -12.99, Streaming subscription, Entertainment, Subscriptions
```

**Warnings to try:** These rows are accepted, but invalid classifications are omitted. The first keeps `Bar` and leaves the subcategory empty; the second leaves both classification fields empty.

```text
2026-11-02T14:28:36+01:00, €-1, Caffè, Bar, Caffe
2026-11-03, -5, Unknown category example, Not A Category, Coffee
```

Warnings identify the affected rows in the modal and remain visible above the transaction list after insertion. A valid category is retained when only the subcategory is invalid. Rows without classification use the form's category and subcategory; supplying a category without a subcategory leaves the subcategory empty. Use empty trailing fields (`Description, , `) to explicitly leave classification empty.

**Validation errors to try:** Test these separately from the valid examples. Invalid dates, amounts, missing descriptions, malformed CSV, or more than five fields block the **entire batch** until corrected; no partial insertion occurs.

```text
2026-02-30, -1, Invalid date, Bar, Coffee
2026-11-02, not-an-amount, Invalid amount, Bar, Coffee
2026-11-02, -1, , Bar, Coffee
```

For a single line, the form is prefilled so you can review or adjust it before adding. When editing an existing transaction, only one inline transaction is allowed. Click **Save Changes** afterward to persist added or edited transactions to your CSV.

### 3. Managing Data
- **Saving:** Changes are kept in memory until you click **"Save Changes"** in the top navbar. This updates your local file.
- **Undo:** If you made a mistake before saving, use the **"Undo Changes"** button to revert to the last saved state.
- **Searching:** Use the search bar in the Transactions tab to filter by description.

### 4. Analytics exclusions

In **Analytics**, expand **Analytics exclusions** to configure filters, then collapse it when finished. A compact summary stays visible with counts of excluded category rules, subcategory rules, individual selections and affected transactions. Nothing is deleted, recategorized or changed in the CSV. All valid transactions are included initially; no automatic outlier detection or popup changes your selection.

Add and manage exclusions directly:

- Choose a **Category to exclude**, optionally choose a specific **Subcategory to exclude**, and click **Exclude**. Repeat to exclude multiple categories or subcategories at once. For example, exclude only `Investments / ETFs` to retain dividends and commissions, or choose `Investments / Entire category` to omit every investment transaction. The choices come from the actual open dataset, including imported classifications absent from the static catalog.
- Already excluded categories and subcategories disappear from the dropdowns and return when their rule is removed. A whole-category rule replaces any existing subcategory rules for that category.
- Click **Exclude all** to replace the current selections with one exclusion rule for every category present in the dataset, including records without a category. Then remove the rules for the few categories you want to analyze. Subcategory and individual selections are cleared so they cannot keep those categories hidden after you remove their category rule.
- Open **Exclude individual transactions**, search by description, category, date or amount, and check specific records. Checked records are excluded. Uncheck them to include them again. Records covered by a category or subcategory rule are locked until that rule is removed. The list covers the whole dataset and loads 50 matching records at a time.
- Use **Remove rule** to remove a category/subcategory exclusion, or **Include all** to clear every manual exclusion. Rules combine: a record remains excluded while any rule or individual selection covers it.

The summary counts explicit category and subcategory rules separately (it does not count every subcategory covered by an entire-category rule) and shows excluded transactions across the dataset and in the selected period. Invalid-record counts appear only when nonzero. Exclusions consistently affect income, expenses, net delta, pie and cash-flow charts, category/subcategory breakdowns, tags and monthly comparisons. Net delta is the result of the filtered view, not the complete dataset balance. The cash-flow chart follows the selected period; monthly comparison always compares the current and previous calendar months with the same exclusions.

Use **View Transactions** in a breakdown to inspect matching records, then **Back to Analytics** to return. The selected period, exclusions, Show More settings, expanded breakdowns and analytics scroll position are preserved. Returning also restores the transaction list's previous search and sort; clicking the Analytics tab directly performs the same return. Transaction edits made during the drilldown remain in the dataset. Opening, creating or closing a file clears the return context.

These are **session-only view settings**: switching tabs, changing the time period, saving the CSV or undoing transaction edits does not clear them. Opening or creating a file, closing it or reloading the page resets them. They are not written to the CSV and do not mark it as modified. Transactions and Dataset Health always retain the full dataset. Records with invalid dates or amounts remain excluded from analytics for data-quality reasons even after **Include all**.

### 5. Dataset Health

Open the **Dataset Health** tab after loading a CSV to see the total transaction count, records with no detected issues, records to review, and the number of individual issues. A transaction may have several issues, so issue counts can exceed the number of affected records. The checks always cover the whole dataset, regardless of transaction search or analytics filters.

Checks include missing or invalid dates and amounts, blank descriptions, missing categories or subcategories, categories absent from `data/categories.json`, subcategories not belonging to the selected category, and explicitly uncategorized records. Empty tags and notes are allowed. Missing subcategories are completeness reminders; they do not prevent saving. These checks cannot determine whether an otherwise valid transaction represents the correct real-world expense.

Use **Filter by issue** to focus on a problem, then **Review / Edit** to open the existing transaction modal. The modal shows the original issues, including invalid source values that a date or number input cannot display. Saving a correction immediately refreshes the counts and list; a record remains listed until all of its issues are resolved. Long lists load 50 records at a time. View Only Mode allows inspection without editing.

Missing and invalid imported amounts are preserved rather than silently replaced with zero. Rows with missing or invalid dates or amounts are excluded from analytics until repaired; classification issues alone do not exclude a transaction. No records are automatically changed or deleted by the health check. Click **Save Changes** to write corrections to the CSV, or **Undo Changes** to restore the last saved state and its health report.

### 6. Categorization
Categories and subcategories are loaded from `data/categories.json`. You can customize this file to match your personal spending habits.

- **Treats:** Expenses you pay for someone else, such as a friend's coffee (`Coffee`), drinks (`Drinks`), a meal (`Meals`), snacks, or an experience. Use `Bar` / `Food & Dining` for your own consumption and `Shopping / Gifts to Buy` for purchased gifts. If a payment covers both your share and a treat, split it into two transactions when you want to track the shares separately.
- **Tools:** Tools and services used for work or productive activities: `AI Services` (e.g. a month of ChatGPT), `Software & Licenses`, `Equipment`, and `Online Services` (e.g. hosting or domains). Use tags such as `#work` or `#monthly` to specify purpose or recurrence; personal software purchases can remain under `Shopping / Software`.

#### Choosing a category

| Purchase or expense | Category / Subcategory |
| --- | --- |
| Reusable water bottle for everyday use | `Shopping / Everyday Accessories` |
| Equipment specifically for sports | `Sports / Equipment` |
| Rent, mortgage payment, condominium charges | `Housing / Rent`, `Mortgage`, or `Condominium Fees` |
| Electricity, heating, water, waste collection, home repairs | The corresponding subcategory under `Housing` |
| Furniture and household purchases | `Shopping / Home` |
| Courses, tuition, certifications, study materials | The corresponding subcategory under `Education` |
| Bank account, payment, or currency exchange fees | The corresponding subcategory under `Banking` |
| Investment brokerage fees | `Investments / Fees & Commissions` |
| Transport that belongs to a trip, including flights and local transfers | `Travel / Trip Transport` |
| Commuting and other transport outside a trip | The corresponding subcategory under `Transportation` |
| Vehicle insurance and vehicle tax | `Vehicles / Insurance` and `Vehicles / Vehicle Tax` |
| Other insurance policies | The corresponding subcategory under `Insurance` |
| Other taxes | The corresponding subcategory under `Taxes` |

Classify subscriptions by purpose: entertainment under `Entertainment / Subscriptions`, productive tools under `Tools`, and other personal services under `Bills / Subscriptions`. Use tags such as `#monthly`, `#annual`, or `#vacation` for recurrence and context.

`Travel / Trip Transport` replaces the catalog entry `Travel / Transport`; existing CSV transactions are not renamed automatically and retain their original classification when edited. Use the new name for new quick input entries, or reclassify older transactions explicitly if you want a single analytics group. `Vehicles / Insurance & Tax` remains available for historical combined payments; prefer the separate subcategories for new entries.

The application expects a CSV file with the following header and column order:

`DateTime, Amount, Description, Category, Subcategory, Tags, Notes`

Import accepts reordered columns and trims whitespace around header names, but requires exactly these seven unique columns. Missing, duplicate or extra columns are rejected before replacing the open dataset, so unsupported data is not silently discarded on export. Export always writes the canonical order, including for an empty dataset.

- **DateTime:** (Required) ISO 8601 format (e.g., `2026-04-29T13:00:00+02:00`).
- **Amount:** (Required) Numeric value. Use negative for expenses and positive for income.
- **Description:** (Required) A brief text about the transaction.
- **Category / Subcategory:** Used for organization and filtering.
- **Tags:** Space-separated labels starting with `#` (e.g., `#holiday #travel`).
- **Notes:** Additional multi-line text details.

When you use **"Create New File"**, the app automatically generates a file with these headers for you.

This application is entirely client-side. Your financial data never leaves your computer and is never uploaded to any server. All processing happens locally in your browser.

**Privacy Note:** The project includes a `.gitignore` rule that prevents any CSV files (except the provided `demo.csv`) from being uploaded to Git repositories, providing an extra layer of protection for your personal data.

## Production build and hosting

```bash
npm run build
npm run preview
```

`npm run build` creates `dist/`; preview serves that build locally. Deploy **the contents of `dist/`** to a static HTTP(S) host, rather than the source repository. No application server or database is required. Vite uses relative asset paths so a repository subdirectory such as `/expense-tracker/` works too. The build includes the category catalog, `demo.csv` and the app manifest; serve the site at a directory URL ending with `/`. Use HTTPS or localhost for native file APIs; other supported browsers use the file-input/download fallback.

Data remains in the current browser session until explicitly saved to CSV. The migration preserves the seven-column CSV schema and existing files. Analytics filters and navigation state are session-only; there is no new storage service or upload step.

## Development and testing

Use **Node.js 24**. Install the exact application and development dependencies and the isolated browser binaries once:

```bash
npm ci
npx playwright install chromium firefox webkit
```

On Linux, use `npx playwright install --with-deps chromium firefox webkit` to install the required system libraries as well. The development-mode tests use a separate Vite server on port 5174, leaving the usual development server on 5173 alone. Override it with `PLAYWRIGHT_DEV_PORT` if needed.

Run the complete suite before pushing, including when working directly on `main`:

```bash
npm test
```

This runs logic tests, the production build, browser flows on Chromium, Firefox and WebKit, mobile emulation, and Vite dev mode checks. It is the definitive local validation step.

Or run a layer separately:

```bash
npm run test:unit
npm run test:integration
npm run test:build
npm run test:browser
npm run test:browser -- --project=chromium
npm run test:report
npm run test:dev
```

### Coverage and test boundaries

| Layer | What it verifies |
| --- | --- |
| Unit tests (`tests/*.test.mjs`) | Input validation, tag normalization, dataset health, period filtering, investment/category/subcategory/individual exclusions, monthly aggregation, navigation state, overview/ticker scope and theme-aware chart configuration. Reducer tests verify session resets, undo, immutable updates and asynchronous save baselines. Analytics model tests check the data shared by metrics, charts and breakdowns, including explicit English chart configuration. |
| Real CSV integration (`tests/integration/`) | The same CSV codec used by the app, with **real PapaParse 5.4.1**: BOM, line endings, reordered headers, quoting, Unicode, multiline notes, empty datasets, invalid values, malformed files, tag migration and roundtrips. File lifecycle tests check save failures, cancellation, file-handle/drop/download/share behavior and reducer state preservation with controlled filesystem/share API doubles. |
| Desktop browser flows (`tests/browser/app.spec.mjs`) | The production React/Vite build, Bootstrap CSS, Chart.js and PapaParse on **Chromium, Firefox and WebKit**: create/open, form editing and deletion, bulk operations, search/sort, quick input, atomic validation, Dataset Health corrections, exclusions, drilldown/return, download/reopen and simulated native-save failures. |
| Restyling (`tests/browser/design.spec.mjs`) | Bundled demo, overview shortcuts and totals, ticker pause/reduced motion, keyboard navigation, live theme changes and reflow from 320px through desktop across every section and the editor. |
| React lifecycle (`tests/browser/lifecycle.spec.mjs`) | Modal reset/focus/scroll cleanup, repeat navigation, session resets, live system theme, chart resizing and safe text rendering. These checks also run through Vite dev on Chromium with React StrictMode enabled. |
| Production build (`tests/build/`) | Bundled entry/assets, relative deployment paths, static catalog/demo/manifest integrity, and absence of CDN scripts or old entry points. |
| Mobile browser flows (`tests/browser/mobile.spec.mjs`) | WebKit with an iPhone viewport/touch profile: read-only inspection, health details, analytics exclusions and layout width. This is emulation, not a real iPhone. |

Browser tests build the app first and serve `dist/` using Vite preview on an isolated localhost port. External HTTPS requests are blocked: these flows exercise the actual bundled libraries. A dependency test checks the exact runtime versions against the lockfile. Application logic and CSV parsing are not mocked in these flows. Each browser clock starts on November 18, 2026 in Europe/Rome and advances normally so chart animations still run while monthly expectations remain stable. Fixtures are synthetic and do not access personal CSV files. On macOS, Firefox also gets temporary application data to avoid accessing the user's protected browser directory; cleanup removes it where allowed, leaving any OS-protected temporary remnants for macOS to manage.

The native operating-system file picker, disk permissions, the iOS share sheet, real devices and visual appearance still require manual checks. Tests exercise the browser file-input/download fallback, and simulate native API failures explicitly. A passing suite is evidence for the covered scenarios, not a guarantee that every possible input or environment is correct.

Playwright runs without automatic retries. On failures it keeps screenshots and traces under `test-results/`, with an HTML report under `playwright-report/`; both are ignored by Git. Inspect a trace with `npx playwright show-trace path/to/trace.zip`. Keep `package-lock.json` committed whenever test dependencies change. The app now requires a Vite build for deployment.

### GitHub Actions

The [Tests workflow](.github/workflows/tests.yml) runs on every push and when a pull request is opened, reopened or updated. It runs **logic tests only**: unit tests, real CSV integration tests and production-build checks, repeated under both `Europe/Rome` and `UTC` timezones. Browser tests (Playwright) are **not** run on CI—they are part of the full local suite (`npm test`) that should be run before pushing. This keeps CI fast (under a minute) and avoids flaky timeouts from headless browser setup on shared runners.

| Script | Where | What it covers | Time |
| --- | --- | --- | --- |
| `npm run test:ci` | **GitHub Actions** | Unit + Integration + Build | ~1 second |
| `npm test` | **Local** | Everything above + Playwright (4 browsers) + Vite dev mode | minutes |

Local commits do not trigger GitHub Actions. For a direct push to `main`, tests run after GitHub receives the commits: a failure does not revert or remove them. If several commits are pushed together, the push run tests the final pushed revision. Fix failures locally, rerun the suite and push a corrective commit.

**Merge blocking requires separate repository configuration.** After the workflow has run, make **Node.js tests** a required status check for `main` using a GitHub branch protection rule or ruleset. The workflow alone does not block merges. See [GitHub's status check documentation](https://docs.github.com/en/pull-requests/reference/status-checks).

---
*"Cash Rules Everything Around Me"*

### Automatic GitHub Pages deployment

With **Settings → Pages → Source → GitHub Actions** enabled, pushes to `main` run the logic test suite and then build and deploy `dist/`. Deployment waits for **Node.js tests** to succeed; failing tests leave the previous published version online. Pull requests run tests without deploying. The workflow can also be started manually from the Actions tab on `main`. No generated build files need to be committed.
