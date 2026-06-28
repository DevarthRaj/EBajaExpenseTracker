# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

React Native (Expo managed workflow) + Supabase app for tracking shared team expenses across departments for a college Baja competition team. TypeScript throughout. State via Zustand, navigation via React Navigation, charts via victory-native, Excel export via SheetJS.

## Commands

```bash
npm install        # install deps
npm start          # expo start (scan QR with Expo Go)
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web
npx tsc --noEmit   # typecheck (no dedicated lint/test scripts exist)
```

There is no test runner, linter, or build script configured — `npx tsc --noEmit` is the only static check.

### Required environment

App reads two env vars at runtime (see [.env.example](.env.example)); copy to `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

These are non-null-asserted in [src/lib/supabase.ts](src/lib/supabase.ts) — the app crashes on launch if unset.

### Backend setup

Supabase is the entire backend. To stand up a fresh instance, run the full [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL Editor, then create a `bills` storage bucket (private). First admin user must be inserted manually into `public.users` (see README "Create First Admin User"); there is no in-app signup.

## Architecture

### Auth + role gate
- [src/lib/supabase.ts](src/lib/supabase.ts) — single Supabase client. Session JWTs are stored in the device keychain via a custom `SecureStoreAdapter` (expo-secure-store), with chunking fallback for tokens exceeding SecureStore's ~2KB limit. The client's `global.fetch` is wrapped to auto-sign-out on any 401.
- [src/store/authStore.ts](src/store/authStore.ts) — on `initialize()`, restores the session, then looks up the row in `public.users`. **A user authenticated via Supabase Auth but with no matching `public.users` row is force-signed-out.** Role (`admin` | `viewer`) comes from that row.
- [src/navigation/AppNavigator.tsx](src/navigation/AppNavigator.tsx) — root gate: shows `LoginScreen` or `MainTabs` based on `session`.

### Role-based access is enforced in two layers
Both must stay in sync when adding any write path:
1. **Frontend** — `role === 'admin'` checks hide write UI (e.g. the AddExpense tab in [MainTabs.tsx](src/navigation/MainTabs.tsx) only renders for admins).
2. **Supabase RLS** — every table has `authenticated read` + `is_admin()` write policies. The `is_admin()` SQL helper checks the caller's role. Viewers physically cannot write even if the frontend check were bypassed.

### State (Zustand stores, all in src/store/)
- `authStore` — session, user profile, role.
- `budgetStore` — list of budgets + the single `activeBudget`. Most data is scoped to `activeBudget.id`; switching budgets re-fetches expenses/funds.
- `expenseStore` — expenses, funds, templates, and **all write operations**. Holds the bill-upload helper (`uploadBill` → Supabase Storage `bills` bucket) and split-row construction.

Stores call Supabase directly and optimistically update local arrays after a successful response — there is no separate data-fetching layer or cache.

### Navigation tree
`AppNavigator` (stack) → `MainTabs` (bottom tabs: Summary, Funds, AddExpense*, Log, Pending, Analytics, History, Budgets; *admin-only) → `LogStack` is nested inside the Log tab to reach `EditExpense` (reuses `AddExpenseScreen` in edit mode) and `ExpenseHistory`.

### Data model (supabase/schema.sql)
- `budgets` 1—N `funds`, `expenses`, `department_limits`. Balance = sum(funds) − sum(expenses) for the active budget.
- `expenses` 1—N `expense_splits`. Three split modes (`department` / `member` / `equal`) stored in one table; only the relevant column is populated per `split_type` (department / member_name / people_count). On update, `expenseStore` deletes and re-inserts all split rows.
- **Audit trail**: a `BEFORE UPDATE` trigger (`capture_expense_edit`, SECURITY DEFINER) snapshots the previous row into `expense_edits` on every expense edit. There is no INSERT policy on `expense_edits` — only the trigger writes it. `updated_at` is stamped by a separate trigger.
- `templates.payload` is JSONB holding partial `ExpenseFormData` for quick expense re-entry.

### Shared definitions
- [src/lib/supabaseTypes.ts](src/lib/supabaseTypes.ts) — all DB row types + form-data types. Mirror schema changes here.
- [src/utils/constants.ts](src/utils/constants.ts) — `DEPARTMENTS`, `DEPARTMENT_COLORS`, `CATEGORIES`, `PAYMENT_MODES`, `SPLIT_MODES`. These are the single source of truth for the fixed dropdown values; department/category strings in the DB are free-text and must match these.
- [src/utils/exportExcel.ts](src/utils/exportExcel.ts) — builds a 2-sheet workbook (log + summary) and hands it to `expo-sharing`. Note it reaches into `expo-file-system/src/ExpoFileSystem` directly for `cacheDirectory`.

## Conventions
- Free-text `department`/`category` columns: always pick from `constants.ts` arrays, never hardcode literals elsewhere.
- New write operations: add the frontend role check **and** confirm an RLS policy covers it.
- Schema changes require edits in three places: `supabase/schema.sql`, `src/lib/supabaseTypes.ts`, and any affected store.
