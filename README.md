# Amina Abubakar Mattress Stores — Sales, Inventory & Staff App

A role-based web app for running the business day to day:
- **CEO** — sees and controls everything: all stores, all staff (activate, assign roles/stores, deactivate), all sales and inventory.
- **Manager** — full sales + inventory control for their own store, and can view (not edit) staff at their store.
- **Staff** — can record sales and view inventory at their own store only.

Built with Next.js (App Router) + Supabase (auth, database, row-level security) + Tailwind CSS. Deploys on Vercel.

---

## 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → your project (or create a new one).
2. Open **SQL Editor** → **New query**, paste the entire contents of `supabase/schema.sql`, and run it. This creates all tables, security rules, and helper functions.
3. Go to **Authentication → Providers** and make sure **Email** is enabled.
4. Go to **Authentication → Settings** and turn **OFF** "Confirm email" for now (simplest for an internal team app — everyone can sign in immediately after signing up, and the CEO activates their role). You can turn it back on later once staff are used to the flow.
5. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key

---

## 2. Create the first CEO account

1. Run the app locally (see step 4) or use the deployed site once it's live.
2. On the login page, click **"New staff member? Create an account"**, sign up with Amina's real email and a password.
3. In Supabase, go to **Authentication → Users**, find that user, and copy their **User UID**.
4. Back in **SQL Editor**, run (replace the UID and name):

   ```sql
   insert into profiles (id, full_name, role, store_id, is_active)
   values ('PASTE-USER-UUID-HERE', 'Amina Abubakar', 'ceo', null, true);
   ```

   (If a `profiles` row with that ID already exists because email confirmation is off, use `update` instead of `insert`.)

5. Sign in with that account — you now have full CEO access, including the **Stores** and **Staff** pages.

From here, the CEO adds store branches under **Stores**, and every manager/staff member who signs up will show as "Pending" on the **Staff** page until the CEO assigns them a role and store and activates them.

---

## 3. Run locally

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase URL and anon key from step 1.5, then:

```bash
npm run dev
```

Open http://localhost:3000.

---

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — mattress store app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

(Create the empty repo on GitHub first, without a README, then run the commands above.)

---

## 5. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo you just pushed.
2. Vercel auto-detects Next.js — leave build settings as default.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your Supabase anon key
4. Click **Deploy**. Once it's live, share the Vercel URL with your team.

Every future `git push` to `main` will auto-deploy.

---

## How the roles work under the hood

- Every user is a row in `profiles`, linked to their Supabase Auth account, with a `role` (`ceo` / `manager` / `staff`) and a `store_id`.
- Row-level security (RLS) policies in `supabase/schema.sql` enforce access **at the database level** — not just in the UI — so a manager or staff account can never read or write another store's data, and only the CEO can create/edit stores or change anyone's role.
- New sign-ups get a `profiles` row with `is_active = false` and no store, and land on a "waiting for activation" page until the CEO assigns them from the **Staff** page.

## Project structure

```
app/
  login/            sign in / sign up
  pending/          shown to accounts awaiting CEO activation
  dashboard/
    page.tsx         overview stats
    sales/            record & view sales
    inventory/        products, stock levels, restocking
    staff/            CEO/manager staff roster
    stores/           CEO-only store management
components/
  dashboard/          client components for each dashboard section
  ui/                 shared UI primitives
lib/
  supabase/           browser + server Supabase clients
  types.ts            shared TypeScript types
supabase/
  schema.sql          full database schema + RLS policies — run this first
```

## Updating an existing deployment

If your app is already live and you're pulling in new features (credit sales / debtor tracking), run `supabase/migrations/002_debt_tracking.sql` once in the Supabase SQL Editor — it's additive and safe to run on a database that already has `schema.sql` applied. A fresh install only needs `schema.sql`, which already includes everything.

## Notes

- Currency is formatted in Naira (₦) — change the `naira()` helper functions in the dashboard components if you need a different currency.
- To add a category dropdown, delivery tracking, or reports/export — those are natural next additions once the core flows are in daily use.
