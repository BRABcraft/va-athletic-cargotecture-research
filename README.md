# Modular Facility Survey

A static, single-page customer survey (plain HTML/CSS/JS — no build step) that:

1. Asks about the respondent's organization and role (name/org optional)
2. Lets them pick which modular units interest them (17 products, each with a hero photo; tap to open a lightbox gallery)
3. Has them rank the picks in priority order
4. For each pick: see the photos, a one-line description and what moves the price between tiers, then choose a tier (Economy / Standard / Luxury), rate the price on a 5-point scale, say what they'd realistically pay, and optionally explain the rating. An expandable note explains what the prices include and exclude.
5. "What would you change?" — for each picked unit, smart variant checkboxes (a 20 ft unit is offered a 40 ft version and vice versa; stacking is only offered where it makes sense; 2-story units are offered single-level) plus unit-specific ideas and a free-text "other changes" box. Then: units we don't offer, the respondent's own cargotecture ideas, and a **"Would you be interested in acquiring any of these products?"** checkbox that reveals timeline (required), budget and email
6. Shows a review page, then submits to **Google Sheets** via a Google Apps Script web app

Answers are saved to `localStorage` as a draft so a refresh doesn't lose progress.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Survey markup (6 steps + thank-you) |
| `styles.css` | Styling, responsive |
| `config.js` | **Edit this**: Sheets endpoint URL, product list (prices, descriptions, price drivers, photo captions), tier descriptions, pricing notes |
| `images/`, `images/thumb/` | Product photos, `<product-id>-<n>.jpg`. `-1` is the hero. Resized from the originals in *Marland continental products* (full ~1400px, thumbs ~520px) |
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

**Responses** — one row per person: ID, timestamp, org type, role, organization, name, number of units selected, units in priority order, units we don't offer, cargotecture ideas, interested in acquiring (Yes/No), email, timeline, budget, comments, user agent.

**Product Ratings** — one row per unit a person selected (long format, ideal for pivot tables): response ID, timestamp, org type, rank, product, size, preferred tier, list price for that tier, price rating (1 = much too low … 5 = much too high) and its label, what they'd pay, % difference vs list, price-rating notes, suggested changes (checkbox labels, `;`-separated), other changes (free text).

Useful pivots: average price rating and average "would pay" by product × tier; count of times each product was ranked #1; org type vs tier preference.

## Editing products, prices or photos

Everything is in `config.js` — `PRODUCTS` (name, size, three prices, `desc`, `drivers`, optional `note` tag such as "2-story", `noStacked` for units that can't sensibly stack, `extraOptions` — the unit-specific change ideas offered on step 5 — and an `images` array of captions), `TIERS`, `PRICING_NOTES` and `PRICE_SCALE`. Prices, descriptions and drivers were taken from `Marland_Continental_Product_Pricing.xlsx` (Price Worksheet / Cost Model tabs, priced September 2026). The survey, review page and payload all read from `config.js`, so no other file needs to change.

To add or change a photo: drop `images/<id>-<n>.jpg` and `images/thumb/<id>-<n>.jpg` (n = 1 is the hero shown on the card; keep heroes as exterior shots at roughly 3:2) and add a caption at the matching position in that product's `images` array. Every product shows one hero plus at most three thumbnails on the pricing step; extra photos are reachable through the lightbox ("+N").

## Testing locally

Just open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8080
```

Without a `SHEETS_ENDPOINT` set, submissions are not sent anywhere; the thank-you page shows a setup notice and the payload is kept in `localStorage` under `facility-survey-unsent-<id>`.
