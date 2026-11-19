# cream

A personal finance workspace for local CSV files. Explore your spending, record transactions and keep your data on your device. No account, database or financial-data upload is required.

## Start here

Use **Node.js 24**, then run:

```sh
npm ci
npm run dev
```

Open the URL printed in the terminal. The source HTML needs Vite; opening it directly from disk will not run the app. To try it from another device on the same network:

```sh
npm run dev -- --host
```

Choose **Browse Files**, drop a compatible CSV anywhere in the window, or use **Create New File** on a computer. **Take a look around** opens synthetic demo data: you can edit it temporarily on a computer, but the built-in demo cannot be saved or exported. Close it to discard your experiments. Opening your own file named `demo.csv` works normally.

## Your file and workspace

Opening a file starts in **Overview**. Switch sections using the sidebar or the bottom navigation on phones:

- **Overview:** all-time included income, expenses and net flow, monthly spending, recent transactions and dataset health. Net flow is not a bank-account balance. Use the explicit navigation buttons to explore each view; recent transaction rows open their details.
- **Transactions:** search descriptions, amounts, classifications, tags and notes. Combine search with the expandable category, subcategory, amount-type and inclusive date filters. **Clear** resets the ledger filters and search. Sort from the column headings or the mobile sort selector. On a computer, **Select** enables bulk classification, tagging and deletion; Select all affects only visible matches.
- **Analytics:** choose a period and explore spending, income, tags and charts. Expand **Analytics exclusions** to ignore categories, parent-qualified subcategories or individual transactions. **Exclude all** lets you start empty and remove exclusions for the few categories you want to inspect. **Clear** restores Last 12 Months and removes exclusions. Monthly comparison always compares the current and previous calendar months with the same exclusions.
- **Dataset Health:** review missing fields, invalid amounts or dates, unclassified transactions and possible classification duplicates. Open a record with **Review / Edit** to correct it. Custom classifications appear in a separate information panel.

The magnifying glasses in analytics show the exact category/subcategory or tag, using the source period, income/expense sign and exclusions. **Back to Analytics** preserves the analysis and restores the previous ledger search, sorting and filters. Ledger filters can further narrow a drilldown; Clear removes that scope too.

The ticker and Overview totals use all-time data with the same exclusions as Analytics. Recent activity and Dataset Health include every record. Invalid dates and amounts remain outside calculations until corrected. Exclusions do not delete or alter CSV rows. Filters, navigation, exclusions and unsaved edits last only for the open browser session and reset when a different file is opened or the page reloads.

Appearance follows the system light/dark setting automatically. Pause the ticker using its button; reduced-motion preferences make it static and horizontally scrollable. Transaction dates are displayed in the device timezone as **DD-MM-YYYY HH:MM:SS**. CSV timestamps retain their original offsets and precision when the date/time is not edited.

## Add, edit and save

Use **Add transaction** from any section. Enter a date, amount and description; **Now** fills the current local date and time. Negative amounts are expenses, positive amounts are income. Tags and notes are optional.

Choose a category to narrow the subcategory list. With no category, or an `Uncategorized` record, all subcategories are grouped by parent; choosing one also sets its category. The catalog combines built-in suggestions with the classifications in your current file. Use **Add category** or **Add subcategory** for a new name. Case and whitespace duplicates are rejected. New names become portable when used in a transaction and saved in the CSV; unused additions disappear when another file is opened. Imported names are preserved, including older classifications that are no longer suggested.

Custom classifications are valid. Dataset Health lists them for information and flags case/spacing variants or close spellings as possible duplicates for manual review. It never merges or renames them automatically. Missing fields still require attention. For example:

| Purchase or income | Suggested classification |
| --- | --- |
| Selling a Mac mini | Income → Sales |
| Coffee bought for a friend | Treats → Coffee |
| A meal bought for someone | Treats → Meals |
| Reusable water bottle | Shopping → Everyday Accessories |
| Work software subscription, including AI services | Tools → Software & Licenses |
| Transport during a trip | Travel → Trip Transport (Travel → Transport also remains valid) |
| Everyday transport | Transportation → the relevant subcategory |

**Save Transaction** updates the working dataset in memory. **Save Changes** writes the CSV using a supported native file handle, or downloads a replacement file in other desktop browsers. Keep that downloaded file as your updated copy. The undo button restores the last successfully saved dataset. Closing an edited file or leaving the page asks before discarding pending changes. Click **cream** to close the file and return to the landing page.

### Quick Inline Entry

Paste transaction lines into the editor without a header. Three to five fields are supported:

```text
DateTime, Amount, Description
DateTime, Amount, Description, Category
DateTime, Amount, Description, Category, Subcategory
```

Copy these examples to try the original format, classified input and multiple rows:

```text
2026-11-02T14:28:36+01:00, €-1, Caffè
2026-11-03, -25.50, Weekly groceries, Food & Dining, Groceries
2026-11-04, -5, "Coffee, cake", Bar, Snack
2026-11-05, +150, Freelance project, Income, Freelance
2026-11-06, +300, Mac mini sale, Income, Sales
```

Dates accept `YYYY-MM-DD` or an ISO timestamp with an optional timezone. Date-only entries use local midnight. The euro symbol is optional; use a decimal point. Quote descriptions containing commas; double a quote to escape it. Tags and notes come from the form and are shared across a multiline insertion.

Optional classification names match the current hybrid catalog, ignoring letter case and surrounding spaces. Create a new classification in the editor first if it is not in the catalog. Unknown categories are omitted with a row-specific warning; an unknown or incompatible subcategory is omitted while a valid category is kept. For example:

```text
2026-11-02, -1, Spelling example, Bar, Caffe
2026-11-03, -5, Unknown example, Not A Category, Coffee
```

Three-field rows use the form's classification. Supplying a category without a subcategory leaves the subcategory empty; empty trailing fields explicitly leave classification blank. Invalid dates, amounts, missing descriptions, malformed quoting or extra fields block the insertion, so a multiline batch is not partially added. Editing an existing record accepts one inline row.

## Smartphones and Home Screen

Smartphones, including Android, and iPad open files in protected **read-only** mode. Explore transactions, filters, analytics and Dataset Health; tap **Read only** for an explanation. Use a computer to create files, add, edit or save transactions. A narrow desktop window remains editable, and desktop users can enable a manual read-only lock.

To add the app to an iPhone Home Screen, open it in Safari and use **Share → Add to Home Screen**. The site provides Apple and manifest icons. Remove and re-add an old shortcut if its icon is cached. This shortcut does not add offline data storage; continue keeping your CSV files separately.

## CSV format and privacy

A file must contain exactly these seven unique headers; import accepts a different order and surrounding header whitespace. Export uses this order:

```csv
DateTime,Amount,Description,Category,Subcategory,Tags,Notes
2026-11-02T14:28:36+01:00,-1,Coffee,Bar,Coffee,#friends,
```

Use ISO dates, numeric amounts without currency symbols, and space-separated `#tags`. Descriptions, notes and other CSV values may contain quoted commas or newlines. Invalid source dates or amounts are retained for review rather than replaced with invented values. Unsupported, missing or duplicate columns are rejected before replacing the open file. Internal record IDs are not exported.

Financial data is processed locally in the browser. There is no automatic cloud backup or cross-device sync. Personal CSV files are ignored by Git by default, except the supplied synthetic `demo.csv`; keep backups of your own files.

## Develop, test and publish

The app uses React and Vite, with PapaParse for CSV and Chart.js for charts. Runtime dependencies are bundled locally.

```text
src/App.jsx             File lifecycle and shared navigation
src/components/         Workspace, editor, charts and filters
assets/js/              CSV, catalog, health, analytics and reducer logic
assets/css/style.css    Responsive styling and system themes
data/categories.json    Suggested classifications
tests/                  Unit, integration, production and browser checks
```

Install browser binaries once, then run the full suite before pushing:

```sh
npx playwright install chromium firefox webkit
npm test
```

On Linux use `npx playwright install --with-deps chromium firefox webkit` if system libraries are needed.

| Command | Checks |
| --- | --- |
| `npm run test:ci` | Unit logic, real PapaParse CSV integration and production assets |
| `npm run test:browser` | Production flows on Chromium, Firefox, WebKit, emulated iPhone and Android |
| `npm run test:dev` | React lifecycle flows through Vite development mode and StrictMode |
| `npm run test:report` | Last browser report, with retained failure screenshots and traces |

Browser fixtures use synthetic files and a controlled clock. Native pickers, permissions and share APIs have controlled test doubles; real OS dialogs and physical devices still need manual checks. Browser tests use port 4173; development checks use 5174, configurable with `PLAYWRIGHT_DEV_PORT`, leaving the usual dev server alone.

Build and inspect the deployable site with:

```sh
npm run build
npm run preview
```

Deploy the contents of `dist/` to a static host. Relative asset paths support repository subdirectories; serve the site from a directory URL ending in `/`. HTTPS or localhost enables native file APIs; other supported desktop contexts use file input and download fallbacks.

The GitHub Actions workflow runs unit, real CSV integration and production checks on every push and pull request, also checking logic/integration in UTC. Browser tests remain in the full local suite. A push to `main` deploys to GitHub Pages only after tests pass; pull requests do not deploy. Set **Settings → Pages → Source → GitHub Actions**. Direct pushes remain committed even if checks fail, while the previous successful deployment stays live. To block PR merges, configure **Node.js tests** as a required check in branch protection or a ruleset. Local commits do not trigger Actions.
