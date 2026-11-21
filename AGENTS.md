# cream — repository instructions

This file, CLAUDE.md and GEMINI.md must remain byte-identical. Edit AGENTS.md, then run `npm run sync:agents`. The repository tests detect drift. Keep user-facing instructions in README.md, not in these agent instructions.

## Project and structure

cream is a client-side React/Vite workspace for local finance CSV files. Financial data is processed in the browser; there is no account, application backend or automatic cloud backup. Use Node.js 24 and the pinned dependencies in package-lock.json.

- `src/App.jsx`: file lifecycle, navigation, shared state and system theme.
- `src/components/`: Overview, Transactions, Analytics, Dataset Health, editor, shared Money and AnalyticsChart components.
- `assets/js/`: pure CSV, classification, health, date, analytics and reducer logic; file services return results/errors rather than mutating UI.
- `assets/css/style.css`: system themes and responsive Bootstrap overrides. Use plain CSS and Bootstrap utilities; do not introduce Tailwind without a user request.
- `public/`: assets served unchanged at the site root and copied into dist by Vite, including demo.csv, manifest.json, icons and data/categories.json. Runtime URLs omit `public/` and use the deployment base URL.
- `config/`: production and development Playwright configurations. Their paths and web-server working directories resolve explicitly to the repository root.
- `tests/`: unit logic, real PapaParse integration, production assets and browser flows.
- `scripts/`: icon generation and synchronization of these instruction files.
- `.github/workflows/tests.yml`: push/PR checks and successful-main GitHub Pages deployment.

## Data and session invariants

- Preserve the seven-column CSV schema: `DateTime,Amount,Description,Category,Subcategory,Tags,Notes`. Import permits reordered/trimmed headers, but rejects missing, duplicate or unsupported columns before replacing a session. Export uses canonical order and excludes internal IDs.
- Use the actual PapaParse codec for both import/export and Quick Input; never split CSV manually. Retain quoted commas/newlines, original timestamp offsets and fractional seconds when unrelated fields change. Preserve invalid source values for review instead of inventing dates or zero amounts.
- Quick Input accepts three to five fields. In multiline batches each row has independent classification: omitted category means Uncategorized with no subcategory; explicit empty fields stay blank. Never inherit classification from another row or from the form. Tags and notes may be shared. Keep invalid batches atomic and unknown-classification warnings row-specific.
- Maintain the hybrid catalog: suggested values plus classifications from the current CSV and temporary editor additions. Imported custom names are valid. Flag similar names for manual review without renaming/merging automatically; prevent normalized duplicates during creation. Reset file-specific additions when replacing a session.
- Transactions opened from a file start read only; desktop users can unlock. New desktop files start editable. Smartphones and iPad remain protected independently of viewport width. Keep write controls hidden and guard write actions in read-only mode.
- The built-in demo has an explicit isDemo flag. It always stays read only on every device; hide its unlock control and guard mutations in the reducer. Native writes, downloads and sharing are blocked at the file-service boundary. A personal file named demo.csv remains normal.
- Edits remain in memory until successful Save Changes. Retain the last saved baseline for Undo, preserve edits made during asynchronous saves and ignore stale save results from an old session. Confirm destructive actions and discarding pending edits, not successful saves.
- Never use personal CSV data as fixtures. Only public/demo.csv is exempt from the CSV ignore rule.

## UI and analytics invariants

- Overview is the initial workspace view. Clicking cream returns to Overview without closing the file or losing changes; the close button returns to the landing page.
- Keep section components mounted across tab navigation so analytics filters, expansions and return context survive. Shared state changes belong in the immutable reducer.
- Overview and ticker use all-time included analytics data; recent activity and Dataset Health cover all records. Exclusions never alter CSV data. Invalid dates/amounts remain outside calculations. Monthly comparison uses current and previous calendar months with identical exclusions.
- Keep category/subcategory exclusions independent from individual selections. Each panel’s Include all and Exclude all affects only its own rules; bulk transaction actions cover the entire dataset, regardless of search or period.
- Keep the ticker filled across viewport sizes at a constant pixels-per-second speed, with one random starting phase per page load. Click/tap and Enter/Space toggle explicit pause; mouse hover pauses temporarily without trapping touch users. Respect reduced motion.
- Drilldowns use exact category/subcategory pairs or tags, matching source period, sign and exclusions; Back restores ledger search, sorting, filters and analytics scroll position.
- Overview uses centered card callouts. This month selects Current Month; IN & OUT shares the Last 12 Months chart renderer with Analytics. Clean up Chart.js instances and browser listeners in effects, including React StrictMode.
- Use Money and the shared currency formatter for consistent sign/euro/value spacing, including chart tooltips. Display local human dates: DD-MM-YYYY HH:MM in the ledger, seconds in details. Technical CSV/Quick Input timestamps remain ISO.
- Keep the interface in English while preserving imported user text. Follow system light/dark and reduced-motion preferences. Keep captions readable and navigation counts inside their container. Test small phone widths and landscape layouts, long filenames and visible/tappable controls.
- Preserve existing DOM IDs and accessible names used by tests unless intentionally updating both. Keep keyboard focus trapping/restoration for modals and keyboard navigation for tabs.

## Development and verification

- Install: `npm ci`; develop: `npm run dev`. `npm run dev -- --host` exposes the app on the local network. HTTP/LAN must tolerate missing crypto.randomUUID and use file-input/download fallbacks when native file APIs are unavailable.
- Fast checks: `npm run test:ci` (unit, real CSV integration, production build). Full local suite: `npm test` after installing browsers with `npx playwright install chromium firefox webkit` (Linux may need `--with-deps`).
- Use the npm scripts because Playwright configs live in config/: `npm run test:browser`, `npm run test:browser -- --project=chromium`, `npm run test:dev`, `npm run test:report`.
- Production browser tests use port 4173. Dev/StrictMode tests use a separate server on 5174, configurable through PLAYWRIGHT_DEV_PORT. Do not stop a user's normal dev server on 5173. Only stop servers started for your task.
- Use synthetic fixtures and real bundled libraries in browser flows. Native file/permission/share dialogs use controlled doubles; emulation does not replace checks on real hardware. Keep failure artifacts in ignored test-results/ and playwright-report/.
- Preserve the existing CI policy: GitHub runs unit, CSV integration and build checks, with logic/integration repeated in Europe/Rome and UTC; browser flows run locally. Deploy dist only after successful checks on main. PRs do not deploy. Do not add browser jobs to CI without authorization.
- Serve the site at a directory URL ending in `/`. Preserve relative base paths and unchanged public asset URLs for repository-subdirectory deployments. Do not introduce a new deployment workflow when the existing one suffices.

## Working and documentation

Read relevant code and tests before editing. Preserve unrelated work. Add regression coverage for data changes and meaningful UI flows; run checks appropriate to the change and report failures honestly. Avoid rewriting production code solely to satisfy an implementation-mirroring test.

README.md is an English user guide covering start-up, opening/unlocking/editing/saving, demo/mobile limits, Quick Input examples, categories, analytics, CSV compatibility, troubleshooting, tests and publishing. Keep it current without turning it into a changelog.

Do not commit or push unless the user authorizes it. When authorized, group related changes and use an English imperative title plus paragraphs explaining behavior and validation, matching existing history. Follow the user's explicit scope and preferences; do not add approval steps for ordinary reversible work.
