# Greenline Ledger

A simple income/expense tracker for a solo service business — log jobs and
expenses, see profit at a glance, import a bank/Venmo CSV, and send quick
invoices. Data saves in your browser (localStorage), so it's there when
you come back.

## Run it on your computer first

You need [Node.js](https://nodejs.org) installed (the free LTS version, any
version 18+ works). Then, in this folder:

```bash
npm install
npm run dev
```

Open the localhost link it prints (usually `http://localhost:5173`). Click
the business name at the top to rename it to yours.

## Put it on the internet (free, ~10 minutes)

**1. Create a GitHub account** at github.com if you don't have one.

**2. Create a new repository** (top right → "New repository"). Name it
`greenline-ledger`, leave it public or private, don't add a README (you
already have one).

**3. Push this folder to GitHub.** In this folder, run:

```bash
git init
git add .
git commit -m "First version of the ledger"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/greenline-ledger.git
git push -u origin main
```

(Replace `YOUR-USERNAME` with your actual GitHub username — GitHub shows you
this exact command on the new repo page too.)

**4. Create a free Vercel account** at vercel.com and sign in with GitHub.

**5. Click "Add New Project"**, pick your `greenline-ledger` repo, leave all
settings as default (Vercel auto-detects Vite), and click **Deploy**.

That's it — in about a minute you'll get a real URL like
`greenline-ledger.vercel.app` that works on your phone, saves your data
between visits, and updates automatically every time you `git push` a
change.

## Notes

- Data lives in that specific browser on that specific device. Opening the
  site on your phone and your laptop will show two separate sets of entries
  — this version doesn't sync across devices yet (that's the next upgrade,
  once you want other people using it too).
- If you ever want multiple people to log in with their own separate data,
  that's when to add a real backend (Supabase is the easiest one to start
  with) — happy to build that out when you're ready for it.
