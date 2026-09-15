/**
 * Modular Facility Survey — Google Sheets backend
 *
 * Paste this into a Google Apps Script project that is BOUND to your
 * spreadsheet (Extensions → Apps Script from inside the sheet), then deploy
 * as a Web app (Execute as: Me, Who has access: Anyone). Put the resulting
 * /exec URL into config.js on the site.
 *
 * Each submission writes:
 *   • one row to "Responses"        (one row per person)
 *   • one row per selected unit to "Product Ratings" (long format — easy to pivot)
 */

const RESPONSES_SHEET = "Responses";
const PRODUCTS_SHEET = "Product Ratings";

const RESPONSE_HEADERS = [
  "Response ID", "Submitted At", "Org Type", "Role", "Organization",
  "Units Selected (count)", "Units in Priority Order",
  "Units We Don't Offer", "Cargotecture Ideas",
  "Interested in Acquiring", "Name", "Email", "Purchase Timeline", "Budget",
  "Comments", "User Agent", "Interested in funding through intellectual property"
];

const PRODUCT_HEADERS = [
  "Response ID", "Submitted At", "Org Type", "Rank", "Product ID", "Product", "Size",
  "Preferred Tier", "List Price (tier)", "Price Rating (1-5)", "Price Rating Label",
  "Would Pay", "Would Pay vs List (%)", "Price Rating Notes",
  "Suggested Changes", "Other Changes",
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const responses = getSheet_(ss, RESPONSES_SHEET, RESPONSE_HEADERS);
    const products = getSheet_(ss, PRODUCTS_SHEET, PRODUCT_HEADERS);

    const submittedAt = data.submittedAt ? new Date(data.submittedAt) : new Date();
    const list = Array.isArray(data.products) ? data.products : [];

    appendByHeader_(responses, RESPONSE_HEADERS, {
      "Response ID": data.responseId || "",
      "Submitted At": submittedAt,
      "Org Type": data.orgType || "",
      "Role": data.role || "",
      "Organization": data.orgName || "",
      "Units Selected (count)": list.length,
      "Units in Priority Order": list.map(p => `${p.rank}. ${p.product} (${p.size})`).join("\n"),
      "Units We Don't Offer": data.missingModels || "",
      "Cargotecture Ideas": data.cargoIdeas || "",
      "Interested in Acquiring": data.interested ? "Yes" : "No",
      "Name": data.name || "",
      "Email": data.email || "",
      "Purchase Timeline": data.timeline || "",
      "Budget": data.budget || "",
      "Comments": data.comments || "",
      "User Agent": data.userAgent || "",
      "Interested in funding through intellectual property": data.interestedInFunding ? "Yes" : "No",
    });

    if (list.length) {
      list.forEach(p => {
        const pct = (p.wouldPay != null && p.listPrice) ? Math.round(((p.wouldPay - p.listPrice) / p.listPrice) * 100) : "";
        appendByHeader_(products, PRODUCT_HEADERS, {
          "Response ID": data.responseId || "",
          "Submitted At": submittedAt,
          "Org Type": data.orgType || "",
          "Rank": p.rank,
          "Product ID": p.productId || "",
          "Product": p.product || "",
          "Size": p.size || "",
          "Preferred Tier": p.tier || "",
          "List Price (tier)": p.listPrice != null ? p.listPrice : "",
          "Price Rating (1-5)": p.priceRating != null ? p.priceRating : "",
          "Price Rating Label": p.priceRatingLabel || "",
          "Would Pay": p.wouldPay != null ? p.wouldPay : "",
          "Would Pay vs List (%)": pct,
          "Price Rating Notes": p.priceNotes || "",
          "Suggested Changes": (p.changes || []).join("; "),
          "Other Changes": p.otherChange || "",
        });
      });
    }

    CacheService.getScriptCache().remove("rows"); // next stats read sees this response
    return json_({ ok: true, responseId: data.responseId });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Visiting the URL in a browser confirms the deployment is live.
// ?action=stats returns the anonymised aggregate that powers the
// "see what others are thinking" section on the thank-you page.
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === "stats") {
    try { return json_(getStats_(p.exclude || "")); }
    catch (err) { return json_({ ok: false, error: String(err && err.stack || err) }); }
  }
  return ContentService.createTextOutput("Facility survey endpoint is running (v2, stats enabled).").setMimeType(ContentService.MimeType.TEXT);
}

// ── Aggregate results ───────────────────────────────────────────────────────
// Nothing personal leaves here: no names, emails or organisation names, and
// free-text snippets are trimmed and only tagged with org type + role.
// Cached for a few minutes so a burst of respondents doesn't re-read the sheet.
const STATS_CACHE_SECONDS = 180;
const SNIPPET_MAX = 240;
const SNIPPET_COUNT = 3; // the N longest notes across every free-text column
const SNIPPET_MIN = 4; // characters — "More seats" counts, a stray "ok" doesn't

function getStats_(excludeId) {
  const skip = r => !r["Response ID"] || r["Response ID"] === excludeId || /^test-/.test(r["Response ID"]);
  const rows = loadRows_();
  const responses = rows.responses.filter(r => !skip(r));
  const ratings = rows.ratings.filter(r => !skip(r));

  const count = responses.length;
  const tally = (rows, col) => rows.reduce((m, r) => { const v = String(r[col] || "").trim(); if (v) m[v] = (m[v] || 0) + 1; return m; }, {});

  // Per-product roll-up: how often picked, how often ranked #1, tier mix, avg would-pay.
  const products = {};
  ratings.forEach(r => {
    const id = r["Product ID"]; if (!id) return;
    const p = (products[id] = products[id] || { productId: id, product: r["Product"], size: r["Size"], picks: 0, firsts: 0, tiers: {}, payTotal: 0, payN: 0, ratingTotal: 0, ratingN: 0 });
    p.picks++;
    if (Number(r["Rank"]) === 1) p.firsts++;
    if (r["Preferred Tier"]) p.tiers[r["Preferred Tier"]] = (p.tiers[r["Preferred Tier"]] || 0) + 1;
    if (r["Would Pay"] !== "" && r["Would Pay"] != null) { p.payTotal += Number(r["Would Pay"]); p.payN++; }
    if (r["Price Rating (1-5)"] !== "" && r["Price Rating (1-5)"] != null) { p.ratingTotal += Number(r["Price Rating (1-5)"]); p.ratingN++; }
  });
  const productList = Object.values(products).map(p => ({
    productId: p.productId, product: p.product, size: p.size, picks: p.picks, firsts: p.firsts,
    pickShare: count ? Math.round((p.picks / count) * 100) : 0,
    topTier: Object.keys(p.tiers).sort((a, b) => p.tiers[b] - p.tiers[a])[0] || "",
    avgWouldPay: p.payN ? Math.round(p.payTotal / p.payN) : null,
    avgPriceRating: p.ratingN ? Math.round((p.ratingTotal / p.ratingN) * 10) / 10 : null,
  })).sort((a, b) => (b.picks - a.picks) || (b.firsts - a.firsts));

  // Quotes for the "in their words" bubbles: the SNIPPET_COUNT longest notes
  // across every free-text column — Units We Don't Offer, Cargotecture Ideas
  // and Comments on the Responses sheet, plus the per-unit price notes and
  // "other changes" on Product Ratings (tagged with the unit they're about).
  const roleOf = {}; responses.forEach(r => { roleOf[r["Response ID"]] = r["Role"] || ""; });
  const unit = r => [r["Product"], r["Size"]].filter(Boolean).join(", ");
  const collect = (rows, col, kind, unitOf) => rows.map(r => ({
    text: cleanSnippet_(r[col]), kind, orgType: r["Org Type"] || "", role: r["Role"] || roleOf[r["Response ID"]] || "", product: unitOf ? unitOf(r) : "",
  }));
  const seen = {};
  const snippets = [].concat(
    collect(responses, "Units We Don't Offer", "wish"),
    collect(responses, "Cargotecture Ideas", "idea"),
    collect(responses, "Comments", "comment"),
    collect(ratings, "Price Rating Notes", "price", unit),
    collect(ratings, "Other Changes", "change", unit)
  )
    .filter(q => q.text && !seen[q.text.toLowerCase()] && (seen[q.text.toLowerCase()] = true))
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, SNIPPET_COUNT);

  const yes = (col) => responses.filter(r => String(r[col]).trim() === "Yes").length;
  const unitsSelected = responses.reduce((s, r) => s + (Number(r["Units Selected (count)"]) || 0), 0);
  return {
    ok: true,
    generatedAt: rows.loadedAt,
    count,
    interested: yes("Interested in Acquiring"),
    interestedInFunding: yes("Interested in funding through intellectual property"),
    avgUnitsSelected: count ? Math.round((unitsSelected / count) * 10) / 10 : 0,
    orgTypes: tally(responses, "Org Type"),
    roles: tally(responses, "Role"),
    timelines: tally(responses, "Purchase Timeline"),
    budgets: tally(responses, "Budget"),
    tiers: tally(ratings, "Preferred Tier"),
    priceRatings: tally(ratings, "Price Rating Label"),
    products: productList,
    snippets,
  };
}

// The sheet read is the slow part, so cache the raw rows (not the per-
// respondent result) — every visitor then shares one cached read for a few
// minutes. Personal columns are stripped before caching. CacheService values
// cap at 100 KB; past that we just read live every time.
function loadRows_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get("rows");
  if (hit) return JSON.parse(hit);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const strip = r => { delete r["Name"]; delete r["Email"]; delete r["Organization"]; delete r["User Agent"]; return r; };
  const rows = {
    loadedAt: new Date().toISOString(),
    responses: readSheet_(ss.getSheetByName(RESPONSES_SHEET)).map(strip),
    ratings: readSheet_(ss.getSheetByName(PRODUCTS_SHEET)),
  };
  const packed = JSON.stringify(rows);
  if (packed.length < 95000) cache.put("rows", packed, STATS_CACHE_SECONDS);
  return rows;
}

// Rows as objects keyed by the header row, so column order never matters.
function readSheet_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  return values.slice(1).map(row => { const o = {}; headers.forEach((h, i) => { o[h] = row[i]; }); return o; });
}

// Trim a free-text answer down to one clean, anonymous sentence-or-two.
function cleanSnippet_(v) {
  let t = String(v || "").replace(/\s+/g, " ").trim();
  if (t.length < SNIPPET_MIN || /^(n\/?a|none|no|ok|nothing|-+|\.+)$/i.test(t)) return "";
  if (/@|https?:\/\/|www\.|\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(t)) return ""; // looks like contact info
  if (t.length > SNIPPET_MAX) t = t.slice(0, SNIPPET_MAX).replace(/\s+\S*$/, "") + "…";
  return t;
}

function getSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Write a row by column NAME. The sheet's own header row decides where each
// value lands, so the column order in the sheet and in this code can never
// drift apart again. Any header the sheet doesn't have yet is added on the
// right, so adding a field to the survey needs no manual sheet edit.
function appendByHeader_(sheet, headers, values) {
  let cols = sheet.getLastColumn();
  let have = cols ? sheet.getRange(1, 1, 1, cols).getValues()[0].map(String) : [];
  const missing = headers.filter(h => have.indexOf(h) === -1);
  if (missing.length) {
    sheet.getRange(1, have.length + 1, 1, missing.length).setValues([missing]).setFontWeight("bold");
    have = have.concat(missing);
  }
  const row = have.map(h => (h in values ? values[h] : ""));
  sheet.appendRow(row);
}

/**
 * Run this ONCE from the editor (select it in the function dropdown, click
 * Run) to start the Responses tab over with the correct headers. The existing
 * tab is kept, renamed "Responses (old <date>)", so nothing is lost. Product
 * Ratings is left alone. Then publish a new deployment version.
 */
function resetResponsesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const old = ss.getSheetByName(RESPONSES_SHEET);
  if (old) {
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH.mm");
    old.setName(`${RESPONSES_SHEET} (old ${stamp})`);
  }
  const fresh = ss.insertSheet(RESPONSES_SHEET, 0);
  fresh.getRange(1, 1, 1, RESPONSE_HEADERS.length).setValues([RESPONSE_HEADERS]).setFontWeight("bold");
  fresh.setFrozenRows(1);
  fresh.setColumnWidths(1, RESPONSE_HEADERS.length, 160);
  CacheService.getScriptCache().remove("rows");
  Logger.log(`Fresh "${RESPONSES_SHEET}" created with ${RESPONSE_HEADERS.length} columns.`);
}

/** Sanity check: lists any header in the sheets that the code doesn't expect, and vice versa. */
function checkHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  [[RESPONSES_SHEET, RESPONSE_HEADERS], [PRODUCTS_SHEET, PRODUCT_HEADERS]].forEach(([name, expected]) => {
    const sheet = ss.getSheetByName(name);
    if (!sheet || !sheet.getLastColumn()) { Logger.log(`${name}: missing or empty`); return; }
    const have = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String).filter(Boolean);
    const extra = have.filter(h => expected.indexOf(h) === -1), missing = expected.filter(h => have.indexOf(h) === -1);
    const sameOrder = JSON.stringify(have) === JSON.stringify(expected);
    Logger.log(`${name}: ${sameOrder ? "OK, matches the code exactly" : "order differs (fine — rows are written by name)"}${missing.length ? " | MISSING: " + missing.join(", ") : ""}${extra.length ? " | unexpected: " + extra.join(", ") : ""}`);
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor to create the tabs and sanity-check the script. */
function testInsert() {
  const sample = {
    responseId: "test-" + Date.now().toString(36),
    submittedAt: new Date().toISOString(),
    orgType: "High school", role: "Athletic Director", orgName: "Test HS", name: "Test",
    missingModels: "Locker room", cargoIdeas: "Stack a press box on the concession stand",
    interested: true, email: "test@example.org", timeline: "6–12 months", budget: "$50,000 – $100,000", comments: "test row — delete me",
    userAgent: "apps-script-test",
    products: [
      { rank: 1, productId: "press-box-20", product: "Press Box", size: "20 ft", tier: "Standard", listPrice: 40640, priceRating: 4, priceRatingLabel: "A little high", wouldPay: 35000, priceNotes: "Site-built quote was $38k", changes: ["A 40 ft version", "Add a restroom"], otherChange: "" },
      { rank: 2, productId: "bleacher-40", product: "Bleacher Unit", size: "40 ft", tier: "Economy", listPrice: 37050, priceRating: 3, priceRatingLabel: "About right", wouldPay: 37000, priceNotes: "", changes: ["No changes — it works as is"], otherChange: "" },
    ],
  };
  const out = doPost({ postData: { contents: JSON.stringify(sample) } });
  Logger.log(out.getContent());
}
