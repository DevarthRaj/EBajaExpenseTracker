# EBaja Expense Tracker

A React Native (Expo) + Supabase mobile app for tracking shared team expenses across departments for a college competition team.

## Features

- 🔐 **Secure Auth** — Email + password via Supabase Auth, tokens stored in device keychain
- 👥 **Role-based access** — Admin (full write) and Viewer (read-only)
- 💰 **Multi-budget support** — Switch between budgets (e.g. Regionals 2025, Budget 2026)
- 📊 **Dashboard** — Live balance, spending velocity chart, department bars with limits
- 💸 **Expense splits** — By department / by member / equal split across N people
- 🧾 **Bill attachments** — Photo or file upload to Supabase Storage
- 📋 **Audit trail** — Every edit to an expense stores the previous state
- 📤 **Excel export** — Full log + summary sheet via SheetJS
- 📈 **Analytics** — Monthly bar chart, category pie, department comparison, top spenders

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo (managed workflow) |
| Backend | Supabase (Auth + PostgreSQL + Storage) |
| State | Zustand |
| Navigation | React Navigation (bottom tabs + stack) |
| Charts | victory-native v41 |
| Export | SheetJS (xlsx) + expo-sharing |
| Language | TypeScript throughout |

## Departments

Powertrain · Suspension · Chassis · Steering · Brake · General

## Categories

Materials · Tools · Travel · Entry Fees · Food · Accommodation · Miscellaneous

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/EBajaExpenseTracker.git
cd EBajaExpenseTracker
npm install
```

### 2. Configure Supabase

```bash
cp .env.example .env
# Edit .env with your Supabase URL and anon key
```

### 3. Run the Database Schema

In your **Supabase Dashboard → SQL Editor**, run the entire contents of [`supabase/schema.sql`](./supabase/schema.sql).

### 4. Create Storage Bucket

In Supabase Dashboard → **Storage** → **New Bucket**:
- Name: `bills`
- Public: **No**

### 5. Create First Admin User

1. Go to **Authentication → Users → Invite User** in Supabase Dashboard
2. After the user accepts the invite, run:

```sql
INSERT INTO public.users (id, name, email, role)
VALUES ('<auth-uuid>', 'Admin Name', 'admin@team.com', 'admin');
```

### 6. Run the App

```bash
npm start
```

Scan the QR code with **Expo Go** on your phone.

---

## Adding Teammates

Only admins can add members. After inviting via Supabase Auth:

```sql
-- Viewer (read-only)
INSERT INTO public.users (id, name, email, role)
VALUES ('<uuid>', 'Name', 'email@example.com', 'viewer');

-- Admin (full access)
INSERT INTO public.users (id, name, email, role)
VALUES ('<uuid>', 'Name', 'email@example.com', 'admin');
```

---

## Security

- Session tokens stored in **device keychain** (expo-secure-store), never in plain AsyncStorage
- All write operations protected by both frontend role checks AND Supabase Row Level Security
- Audit trail records every expense edit with full previous state snapshot

---

## Project Structure

```
src/
├── lib/           # Supabase client + TypeScript types
├── store/         # Zustand stores (auth, budget, expenses)
├── navigation/    # React Navigation setup
├── screens/       # All app screens
└── utils/         # Constants, formatters, Excel export
supabase/
└── schema.sql     # Full DB schema with RLS + triggers
```
