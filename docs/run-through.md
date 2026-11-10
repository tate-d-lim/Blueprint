# Demo run-through (builder journey, 2026-11-17, Low-Risk app)

Numbers come from the real seed (2026-11-10). If a number on screen differs, the seed changed: check before you present.

## Before you start

```bash
docker-compose up -d          # MongoDB
npm run seed                  # or "Reset demo data" in the header
npm run build && npm start    # steadier than the dev server
```

"Viewing as" in the header on **Builder**. Desktop, 1280×800 or 1440×900. If WebGL is off, steps 4–6 show a still image of the hotel and the parts list; everything else works. `npm run e2e` runs the whole path on port 3100 and database `buildplan_e2e`.

## The path

1. **Tell us about your app.** Restricted, Sensitive Normal, Slight, None or minimal. **Work out my app type** → verdict **Low-Risk Cloud**.
2. **Next: about your app.** Public, web, sign-in, SMS ticked; GenAI No. **Next: what your app needs.**
3. **What your app needs (step 4).** "84 requirements in 11 parts". Open CCTV, **Show all 10 requirements**. Left out: 2. **Save this plan.**
4. **Your tools (step 5).** Tick appCentral: "18 are yours · 51 your tools do · 15 questions". DBaaS and IGA: "18 are yours · 66 your tools do (15 not yet verified) · 0 questions". Parts light only when every claim is Verified. **Continue to your plan.**
5. **The go (step 6).** "Your plan is ready. 18 are yours, and your tools do 51." (appCentral only). **Give your agent the build plan** downloads `BUILD-PLAN.md`, grouped by hotel part.
6. **Saved projects → Sample project (two weeks in):** "9 of 17 tasks done". Export → security review spreadsheet.

Steps 1–5 never offer the build plan. After a rehearsal, **Reset demo data**.
