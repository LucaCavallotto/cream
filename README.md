# Personal Expense Tracker

A modular, browser-based personal finance manager that works directly with your local CSV files. This application puts you in control of your data—no cloud required, no sign-ups, just privacy-focused financial tracking.

## Key Features

- **Direct File Access:** Uses the modern File System Access API to open and save CSV files directly to your device.
- **View Only Mode:** Automatically protects data on mobile devices (iOS/iPadOS) where file saving is restrictive, with a manual lock toggle for desktop users.
- **Bulk Entry:** Smart "Quick Inline Entry" supports pasting multiple transactions at once (e.g., from bank statements).
- **Responsive Dashboard:** View your current net delta and monthly spend comparisons at a glance.
- **Comprehensive Analytics:** Detailed hierarchical breakdowns for Spending, Income, and Tags with interactive "Show More" functionality.
- **Advanced Search & Sorting:** Quickly find transactions by description or sort by any column.
- **Dark Mode Support:** Automatically syncs with your system's light/dark preference.
- **Dataset Health:** Find missing or invalid values and classification problems, then review each affected transaction in the standard edit modal.

## Project Structure

```text
├── assets/
│   ├── css/        # Custom styling
│   └── js/         # Application logic (App, UI, File System, Analytics)
├── data/           # Categorization configuration
└── index.html      # Main application entry point
```

## How to Use

### 1. Getting Started
Simply open the `index.html` file in any modern web browser.
- **New Users:** Click **"Create New File"** to generate a fresh expense CSV on your computer.
- **Trial:** You can also use the included `demo.csv` to explore the app's features immediately.
- **Existing Users:** Click **"Browse Files"** or simply **Drag & Drop** your existing CSV anywhere on the screen.

The synthetic `demo.csv` uses the current category catalog and includes income, expenses, investments, repeated subcategory names under different categories, quoted descriptions, and intentionally empty classifications. Transactions span several periods, including October and November 2026, to exercise analytics and monthly comparisons. Open it and try the Quick Inline Entry examples below; use **Undo Changes** to discard test entries before saving, or test on a copy.

### 2. Adding Transactions
There are two ways to add expenses:
- **Manual Form:** Click **"+ Add Expense"** to fill out a detailed form including Category, Subcategory, Tags, and Notes.
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

### 4. Dataset Health

Open the **Dataset Health** tab after loading a CSV to see the total transaction count, records with no detected issues, records to review, and the number of individual issues. A transaction may have several issues, so issue counts can exceed the number of affected records. The checks always cover the whole dataset, regardless of transaction search or analytics filters.

Checks include missing or invalid dates and amounts, blank descriptions, missing categories or subcategories, categories absent from `data/categories.json`, subcategories not belonging to the selected category, and explicitly uncategorized records. Empty tags and notes are allowed. Missing subcategories are completeness reminders; they do not prevent saving. These checks cannot determine whether an otherwise valid transaction represents the correct real-world expense.

Use **Filter by issue** to focus on a problem, then **Review / Edit** to open the existing transaction modal. The modal shows the original issues, including invalid source values that a date or number input cannot display. Saving a correction immediately refreshes the counts and list; a record remains listed until all of its issues are resolved. Long lists load 50 records at a time. View Only Mode allows inspection without editing.

Missing and invalid imported amounts are preserved rather than silently replaced with zero. Rows with missing or invalid dates or amounts are excluded from analytics until repaired; classification issues alone do not exclude a transaction. No records are automatically changed or deleted by the health check. Click **Save Changes** to write corrections to the CSV, or **Undo Changes** to restore the last saved state and its health report.

### 5. Categorization
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

- **DateTime:** (Required) ISO 8601 format (e.g., `2026-04-29T13:00:00+02:00`).
- **Amount:** (Required) Numeric value. Use negative for expenses and positive for income.
- **Description:** (Required) A brief text about the transaction.
- **Category / Subcategory:** Used for organization and filtering.
- **Tags:** Space-separated labels starting with `#` (e.g., `#holiday #travel`).
- **Notes:** Additional multi-line text details.

When you use **"Create New File"**, the app automatically generates a file with these headers for you.

This application is entirely client-side. Your financial data never leaves your computer and is never uploaded to any server. All processing happens locally in your browser.

**Privacy Note:** The project includes a `.gitignore` rule that prevents any CSV files (except the provided `demo.csv`) from being uploaded to Git repositories, providing an extra layer of protection for your personal data.

---
*"Cash Rules Everything Around Me"*
