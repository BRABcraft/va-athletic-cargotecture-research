# Modular Facility Survey

A static, single-page customer survey (plain HTML/CSS/JS — no build step) that:

1. Asks about the respondent's organization and role
2. Lets them pick which modular units interest them (13 products)
3. Has them rank the picks in priority order
4. For each pick: choose a tier (Economy / Standard / Luxury), rate the price on a 5-point scale, and say what they'd realistically pay
5. Asks what sizes/configurations interest them (20 ft, 40 ft, 2-story, joined, custom), what models are missing, unmet needs, timeline and budget
6. Shows a review page, then submits to **Google Sheets** via a Google Apps Script web app

Answers are saved to `localStorage` as a draft so a refresh doesn't lose progress.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Survey markup (6 steps + thank-you) |
| `styles.css` | Styling, responsive |
| `config.js` | **Edit this**: Sheets endpoint URL, product list and prices, tier descriptions |
| `survey.js` | Survey logic: rendering, validation, ranking, submit |
| `apps-script/Code.gs` | Google Apps Script that receives submissions and writes to the sheet |

## Setup

### 1. Publish on GitHub Pages

```bash
cd facility-survey
git init -b main
git add .
git commit -m "Modular facility survey"
git remote add origin https://github.com/<your-user>/facility-survey.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save**.
The site will be live at `https://<your-user>.github.io/facility-survey/` within a minute or two.

### 2. Connect Google Sheets

1. Create a new Google Sheet (e.g. "Facility Survey Responses").
2. In the sheet: **Extensions → Apps Script**. Delete the placeholder code and paste in `apps-script/Code.gs`. Save.
3. (Optional) Select `testInsert` in the function dropdown and click **Run**. Approve the permissions when asked. Two tabs — **Responses** and **Product Ratings** — will appear with one test row each. Delete the test rows afterwards.
4. **Deploy → New deployment → ⚙ Select type → Web app**
   - Description: `survey`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, approve access, and copy the **Web app URL** (ends in `/exec`).
5. Paste that URL into `config.js`:
   ```js
   SHEETS_ENDPOINT: "https://script.google.com/macros/s/AKfycb.../exec",
   ```
6. Commit and push. Submissions now land in the sheet.

> **If you edit `Code.gs` later**, you must publish a new version: **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy**. The URL stays the same.

### What lands in the sheet

**Responses** — one row per person: ID, timestamp, org type, role, organization, name, email, number of units selected, units in priority order, configurations of interest, missing models, unmet needs, timeline, budget, comments.

**Product Ratings** — one row per unit a person selected (long format, ideal for pivot tables): response ID, org type, rank, product, size, preferred tier, list price for that tier, price rating (1 = much too low … 5 = much too high), what they'd pay, and % difference vs list.

Useful pivots: average price rating and average "would pay" by product × tier; count of times each product was ranked #1; org type vs tier preference.

## Editing products or prices

Everything is in `config.js` — `PRODUCTS` (name, size, three prices, optional `note` tag such as "2-story"), `TIERS` (labels/descriptions), and `PRICE_SCALE`. The survey, review page and payload all read from there, so no other file needs to change.

## Testing locally

Just open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8080
```

Without a `SHEETS_ENDPOINT` set, submissions are not sent anywhere; the thank-you page shows a setup notice and the payload is kept in `localStorage` under `facility-survey-unsent-<id>`.
