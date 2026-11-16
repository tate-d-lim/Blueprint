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
2. **Next: about your app.** Public, web, sign-in, SMS ticked; GenAI No. **Next: what your app needs.** (With GenAI Yes, three more questions appear: an AI service run by another company, an AI model you host, file uploads. A Yes on the first two asks one more each. The saved plan then has no "Decide first" box.)
3. **What your app needs (step 4).** "84 controls in 11 parts". Open CCTV, **Show all 10 controls**. Left out: 2. **Save this plan.**
4. **The saved plan.** It opens on the **Plan** tab: the hotel beside the checklist, "0 of 84 done". **Add tools** → tick appCentral: "51 of 84 done". DBaaS and IGA: "66 of 84 done". A part lights only when every claim is Verified. A click on a part opens the **Hotel** tab close up.
5. **Prompt your agent.** The security plan (SSP) is the plan: download it and copy the short prompt for the agent. Planned controls say what to do and why.
6. **Projects → Sample project (two weeks in):** "75 of 83 done · 66 by your tools · 8 left". Tick a control in the checklist. Export → security review spreadsheet.

There is no build plan: the SSP is the plan. After a rehearsal, **Reset demo data**.
