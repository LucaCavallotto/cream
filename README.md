# cream

A personal finance workspace that works with your local CSV files. Record transactions, understand income and spending, and review your dataset without creating an account or uploading financial data to a backend.

The app runs in your browser. React and Vite power the interface; PapaParse reads and writes CSV files, and Chart.js renders the charts. All runtime libraries are bundled locally.

## Contents

- [Run locally](#run-locally)
- [Open your first file](#open-your-first-file)
- [Explore the workspace](#explore-the-workspace)
- [Add, classify and edit transactions](#add-classify-and-edit-transactions)
- [Quick Inline Entry](#quick-inline-entry)
- [Save, undo and close](#save-undo-and-close)
- [Smartphones and Home Screen](#smartphones-and-home-screen)
- [CSV compatibility and privacy](#csv-compatibility-and-privacy)
- [Troubleshooting](#troubleshooting)
- [Development, tests and publishing](#development-tests-and-publishing)

## Run locally

Install **Node.js 24** and npm, then run these commands from the repository directory:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173/`. Keep the terminal running while using the site. The source `index.html` needs Vite; opening it directly from disk will not start the app.

To try the site from another device on the same network:

```sh
npm run dev -- --host
```

Open the printed Network URL on that device. HTTP/LAN access supports transaction IDs even when `crypto.randomUUID` is unavailable. Native file access may be unavailable there; supported desktop browsers can use file selection and download fallbacks.

For a production preview instead of the development server:

```sh
npm run build
npm run preview
```

## Open your first file

Use **Create a new file** to start from scratch, or **Open an existing file** to continue with a CSV. The demo link below these options lets you explore without a personal file:

| Action | What happens |
| --- | --- |
| **Browse Files** | Opens an existing compatible CSV. You can also drop a file anywhere in the window. |
| **Create New File** | Starts an empty dataset on a computer. Choose a filename; the required CSV headers are handled for you. |
| **Take a look around** | Opens the synthetic sample dataset. It stays read only on every device, with no unlock control; saving and exporting are disabled. |

Existing files open in **Overview**, in **read-only mode**. On desktop, including narrow windows, click the lock button in the header to unlock editing; click it again to lock the file. Each newly opened file starts locked. You can keep working while another file loads; if there are pending edits when it is ready, confirm before replacing the current dataset. New files created on a computer start editable. Smartphones and iPad remain read only; supported Android tablets can unlock editing.

The filename stays in the header. Click **cream** to return to Overview without closing the file or losing edits and filters. Use the **×** close control to close the file and return to the landing page.

## Explore the workspace

Use the desktop sidebar or smartphone bottom navigation to switch sections. Keyboard users can use arrow keys, Home and End when the tabs have focus.

| Section | Use it to |
| --- | --- |
| **Overview** | See all-time included net flow, income, expenses, this month's spending, recent activity and dataset health. Net flow is income minus expenses, not a bank-account balance. |
| **Transactions** | Search descriptions, amounts, classifications, tags and notes; sort records; filter by category, parent-qualified subcategory, income/expense/zero amounts and inclusive local date bounds. On desktop, unlock the file to edit or use bulk actions. |
| **Analytics** | Choose a period and explore cash flow, spending, income and tags. Expand **Exclude categories** for category/subcategory rules or **Exclude transactions** for individual records. |
| **Dataset Health** | Find missing fields, invalid dates/amounts, unclassified records and possible duplicate classification names. Open an affected record to inspect it or, when unlocked, correct it. Expand “What gets checked?” for the checks and the custom classifications found in your file. |

Use the category legend below the expenses pie chart to hide or show individual slices. This changes the chart only; use analytics exclusions to change which transactions contribute to totals.

Overview cards use centered callouts at the bottom. **This month** opens Analytics with **Current Month** selected. **IN & OUT** uses the same **Last 12 Months** cash-flow chart as Analytics. Recent transaction rows open their details.

### Filters and analytics exclusions

Transaction filters combine with search. Empty From/To controls show **Any date**, meaning no date limit is applied. Use **Need / Want** to show **Need**, **Want** or **Not classified** records; **All classifications** removes this restriction. Old CSV records without NeedWant are included in Not classified. Filter the unclassified records, unlock editing on desktop and use bulk selection to assign a value. Updated records immediately leave the list when they no longer match the filter. **Clear** resets the ledger's search and selectors. **Select all** in desktop bulk-edit mode selects only visible matching records.

In Analytics, select **Time Period** above the two exclusion panels. Each panel starts with **Include all** (green) and **Exclude all** (red). These controls affect only their own type of exclusion: category controls keep individual selections, and transaction controls keep category rules. Bulk transaction actions cover the entire dataset, even when the transaction search is active. Records covered by a category rule stay excluded until that rule is removed. You cannot add the same category exclusion twice. The monthly comparison always compares the current and previous calendar months using the same exclusions.

Expand a tag in **Detailed Tags Breakdown** to see its income and expense totals and the categories of its expenses, ordered by amount. These categories follow the selected period and exclusions; income does not reduce category spending. A transaction with multiple tags contributes its full amount to each tag.

The magnifying glasses in breakdowns open the exact category/subcategory or tag, matching the source period, amount sign and exclusions. **Back to Analytics** restores the analysis and the previous ledger search, sorting and filters. Ledger filters can further narrow a drilldown; Clear removes that temporary scope too.

A yellow notice in Overview and Analytics counts active category, subcategory and individual transaction exclusions. Expand **Show details** to inspect classification rules, or choose **Review exclusions** to open the relevant controls without resetting your selections.

Exclusions do not delete or modify CSV rows. Overview and the ticker use all-time data with the current exclusions. Recent activity and Dataset Health cover every record. Invalid dates and amounts stay outside calculations until corrected. Filters and exclusions reset when a file is opened, closed or the page reloads.

### Optional Need / Want classification

Use **Need / Want** in the transaction editor to mark an expense as **Need** or **Want**, or leave it **Not classified**. Existing records start unclassified. Desktop bulk selection also supports assigning or clearing the value with **Apply**. Quick Input keeps its current formats; the editor selection applies to the inserted rows, like tags and notes.

Overview shows all-time included spending across the three groups; Analytics uses the selected period and exclusions. Income and zero amounts do not contribute. Missing Need/Want is not a Dataset Health issue.

Old seven-column CSVs remain supported. Saving exports an eighth column, `NeedWant`, containing blank, `need` or `want`. Import accepts these values without case sensitivity; other values produce an import error without replacing the open file.

### Appearance and dates

Appearance follows the system's light/dark setting. The ticker appears at the top of the page and scrolls away with the content; the header and navigation remain available. It fills the strip continuously, starts at a random position on each page reload and scrolls at the same speed as its contents change. It resumes from the same position at the same speed. Click or tap it to pause or resume it, or use Enter/Space when it has keyboard focus. Hovering with a mouse pauses it temporarily; reduced-motion preferences make it static and horizontally scrollable.

Currency amounts use consistent spacing between the sign, euro symbol and value, including chart tooltips. Large headline totals adapt to the available width. On smaller screens, figures may move onto a separate line to remain readable.

Transaction dates use the device timezone: **DD-MM-YYYY HH:MM** in the ledger, with seconds shown in details. The editor uses that same local timezone. Times that do not exist during a daylight-saving change must be corrected before saving. The CSV and Quick Input use ISO timestamps; original offsets and fractional seconds are preserved when the date/time is not edited.

## Add, classify and edit transactions

On a computer, unlock the file and choose **Add transaction** from any section. Enter a date, amount and description. **Now** fills the current local date and time. Negative amounts are expenses; positive amounts are income. Tags and notes are optional.

Choose a category to narrow the subcategory list. With no category, or an `Uncategorized` record, all subcategories are grouped by parent; selecting a subcategory also sets its category.

The catalog combines [built-in suggestions](public/data/categories.json) with classifications in the current CSV. Use **Add category** or **Add subcategory** for a new name. Case and whitespace duplicates are rejected. New names become portable when used in a transaction and saved in the CSV. Unused additions disappear when a different file is opened. Imported names remain readable and selectable even when no longer suggested.

Custom classifications are valid. Dataset Health shows them for information and flags similar spellings as possible duplicates for manual review. It never automatically renames or merges records. Missing fields still need attention; tags and notes are optional.

Some useful examples:

| Transaction | Suggested classification |
| --- | --- |
| Selling a Mac mini | Income → Sales |
| Coffee bought for a friend | Treats → Coffee |
| A meal bought for someone | Treats → Meals |
| Reusable water bottle | Shopping → Everyday Accessories |
| Work software subscription, including AI services | Tools → Software & Licenses |
| Transport during a trip | Travel → Trip Transport; the original Travel → Transport remains valid |
| Everyday transport | Transportation → the relevant subcategory |

Click a record to edit it, or inspect it while locked. Desktop **Select** mode supports changing category, subcategory and tags for selected rows, as well as deletion. Deletion and bulk changes ask for confirmation.

## Quick Inline Entry

Paste transaction lines into the editor **without a CSV header**. Each record accepts three to five fields:

```text
DateTime, Amount, Description
DateTime, Amount, Description, Category
DateTime, Amount, Description, Category, Subcategory
```

Copy these examples individually or as a batch:

```text
2026-11-20T20:11:11+01:00, €-7.5, Pizza da Fede, Food & Dining, Restaurant
2026-11-21T10:29:42+01:00, €10, Test
2026-11-21, -25.50, Weekly groceries, Food & Dining, Groceries
2026-11-21, -5, "Coffee, cake", Bar, Snack
2026-11-21, +300, Mac mini sale, Income, Sales
```

- **DateTime:** `YYYY-MM-DD` or an ISO timestamp with optional timezone. Date-only entries use local midnight.
- **Amount:** The euro symbol is optional. Use a decimal point; negative means expense and positive means income.
- **Description:** Required. Quote text containing commas. Double a quote to escape it inside a quoted description.
- **Category/subcategory:** Optional names from the current hybrid catalog, matched without regard to letter case or surrounding spaces. Add a new custom name through the editor first if it is not already available.
- **Tags/notes:** Enter these in the form; they are shared across a multiline insertion.

**Every row in a multiline batch is classified independently.** In the examples above, Pizza da Fede is Food & Dining → Restaurant, while Test becomes Uncategorized with no subcategory. A row never inherits classification from another row or the form. With a single three-field entry, you can choose its classification using the form.

A category without a subcategory leaves the subcategory empty. Empty trailing fields (`Description, ,`) explicitly leave classification blank. Unknown classifications produce warnings and are omitted; a valid category is retained when only its subcategory is invalid. Try these warning examples separately:

```text
2026-11-21, -1, Spelling example, Bar, Caffe
2026-11-21, -5, Unknown example, Not A Category, Coffee
```

Invalid dates, amounts, missing descriptions, malformed quoting or extra fields block the insertion. A multiline batch is not partially added. Editing an existing record accepts one inline row.

## Save, undo and close

**Save Transaction** updates the working dataset in memory. **Save Changes** persists it:

- With a supported native file handle, cream writes to the selected file.
- In other supported desktop contexts, it downloads an updated CSV. Keep the downloaded copy as your new version; the original file is not overwritten automatically. After checking that the download finished, choose **Confirm saved**. If it was cancelled or blocked, choose **Keep unsaved** and retry. Until confirmation, pending edits remain protected.

Confirming a download acknowledges the exported snapshot; edits made afterwards still remain unsaved. The undo button restores the last successfully saved dataset. Closing an edited file, replacing it or refreshing the page asks before discarding pending changes. The refresh warning also covers unsaved fields in an open transaction editor; cancelling the editor discards that draft. The browser controls the wording of the refresh warning. Filters do not count as file edits. The built-in demo always stays read only and cannot be saved or exported. A personal file named `demo.csv` works normally.

There is no automatic session recovery after reloading or closing the page. Keep your CSV files and backups separately.

## Smartphones and Home Screen

Smartphones, including Android, and iPad use protected **read-only** mode. You can browse records, search, sort, filter, change analytics exclusions and inspect Dataset Health. On the landing page, open an existing CSV or explore the demo. Create, edit and save your file on a computer; protected devices do not show the new-file section. Tap **Read only** in the header for an explanation.

The smartphone header keeps cream, the filename, Read only and the close button on one row. Long filenames are abbreviated. Bottom navigation stays available while scrolling, and narrow desktop sidebars wrap long labels without hiding their counts.

On iPhone, open the site in Safari and use **Share → Add to Home Screen**. The site provides Apple and manifest icons. If an existing shortcut retains an old icon, remove and re-add it. A Home Screen shortcut does not provide offline data storage or synchronize CSV files between devices.

## CSV compatibility and privacy

The original seven headers are required; `NeedWant` is optional when importing older files. Headers must be unique. Import accepts reordered headers and surrounding whitespace; export always uses these eight columns:

```csv
DateTime,Amount,Description,Category,Subcategory,Tags,Notes,NeedWant
2026-11-02T14:28:36+01:00,-1,Coffee,Bar,Coffee,#friends,,want
```

Use ISO dates and numeric amounts without currency symbols in CSV files. Tags are space-separated `#labels`. Quoted commas and newlines are supported. Invalid dates or amounts are retained for review, not replaced with invented values. Missing, duplicate or unsupported columns are rejected before replacing the open dataset. Internal record IDs are not exported.

Financial data is processed locally in the browser. There is no account, automatic cloud backup or cross-device sync. Personal CSV files are ignored by Git by default; only the synthetic [public/demo.csv](public/demo.csv) is exempt. Saving a file remains your responsibility.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Editing buttons are missing | Existing files start locked. Unlock with the header lock on desktop. Smartphones and iPad cannot be unlocked. |
| Save Changes is missing in the demo | The demo always stays read only. Open or create your own file to add and save transactions. |
| Saving downloads a file | This is the fallback when direct writes are unavailable. Use the downloaded CSV as the updated version. |
| A CSV is rejected | Check the required headers and optional NeedWant column above and quote commas/newlines correctly. Rejection leaves the current file open. |
| Totals differ from the ledger | Check analytics period and exclusions. Invalid dates/amounts are omitted from calculations; the ledger and health checks retain all records. |
| A category is omitted from Quick Input | Use a name in the current catalog, or create it in the editor first. Check the warning for the affected row. |
| A file was lost after refresh | Unsaved data is session-only. Reopen your last saved CSV. |
| A development update leaves an error or a blank page | Save any pending changes before a full page reload. If the error returns after reloading, report the action and console error; also check whether browser translation or an extension is changing the page. |
| The page does not run from disk | Use the Vite development or preview server, or a deployed build. |

## Development, tests and publishing

### Repository layout

```text
src/                       React app, components and hooks
assets/js/                 CSV, catalog, validation, analytics and reducer logic
assets/css/style.css       Responsive styling and system themes
public/                    Static assets copied unchanged into the build
  data/categories.json     Suggested classifications
  demo.csv                 Synthetic sample dataset
  manifest.json            Home Screen metadata
  cream.svg, *.png         App icons
config/                    Production and dev Playwright configurations
scripts/                   Icon generation and agent-doc synchronization
tests/                     Unit, CSV integration, build and browser checks
.github/workflows/         GitHub checks and Pages deployment
index.html                 Vite HTML entry point
vite.config.js             React plugin and relative deployment paths
```

The root keeps the package files, entry point, Vite config, README and agent instruction entry points. `node_modules/`, `dist/`, `test-results/` and `playwright-report/` are generated and ignored by Git; do not edit them as source files. Vite serves files from `public/` at the site's root: for example, `public/demo.csv` is requested as `demo.csv`, not `public/demo.csv`.

### Testing

After `npm ci`, install browser binaries once and run the full suite:

```sh
npx playwright install chromium firefox webkit
npm test
```

On Linux use `npx playwright install --with-deps chromium firefox webkit` if system libraries are needed.

| Command | Purpose |
| --- | --- |
| `npm run test:ci` | Unit logic, real PapaParse CSV integration and production assets |
| `npm run test:unit` | Pure logic, repository configuration and synchronized agent-doc checks |
| `npm run test:integration` | CSV parsing/export, file services and copyable README examples |
| `npm run test:build` | Build `dist/` and check bundled/static assets |
| `npm run test:browser` | Build and exercise production flows on Chromium, Firefox, WebKit, emulated iPhone, Android phones, iPad and Android tablets |
| `npm run test:browser -- --project=chromium` | Run only Chromium production flows |
| `npm run test:dev` | Vite development lifecycle flows with React StrictMode |
| `npm run test:report` | Open the last production browser report |

Use the npm scripts: the Playwright configs live in `config/` and are supplied explicitly by those scripts. Browser fixtures use synthetic files and a controlled clock. Native pickers, permissions and sharing have test doubles; physical devices and real OS dialogs still need manual checks.

Production browser tests use port 4173; development checks use 5174, configurable with `PLAYWRIGHT_DEV_PORT`. They leave the usual dev server on 5173 alone. Failures retain screenshots and traces in `test-results/`, with reports in `playwright-report/`; development artifacts use each folder's `dev/` subdirectory.

### Agent instructions and icons

[AGENTS.md](AGENTS.md) is the canonical contributor/agent guide. [CLAUDE.md](CLAUDE.md) and [GEMINI.md](GEMINI.md) contain identical instructions for their respective entry points. After editing AGENTS.md, synchronize the copies:

```sh
npm run sync:agents
```

Tests require all three files to be byte-identical. There is no separate CODEX.md to maintain. Regenerate the PNG Home Screen icons from `public/cream.svg` with `node scripts/generate-icons.mjs` after installing Playwright Chromium.

### Publish

`npm run build` creates `dist/`; deploy **its contents** to a static HTTP(S) host, not the source repository. Relative asset paths support repository subdirectories. Serve the site at a directory URL ending in `/`. HTTPS or localhost enables supported native file APIs; other supported desktop contexts use file-input/download fallbacks.

The [GitHub Actions workflow](.github/workflows/tests.yml) runs unit, real CSV integration and production checks on every push and pull request, also repeating logic/integration in UTC. Browser tests remain part of the full local suite. A push to `main` deploys to GitHub Pages only after checks pass; pull requests do not deploy. Select **Settings → Pages → Source → GitHub Actions**.

A direct push stays committed even if checks fail, while the previous successful deployment remains live. To block PR merges, configure **Node.js tests** as a required check in branch protection or a ruleset. Local commits do not trigger Actions. Run the complete local suite before pushing.
