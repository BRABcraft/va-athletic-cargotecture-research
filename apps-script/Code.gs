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
  "Response ID", "Submitted At", "Org Type", "Role", "Organization", "Name", "Email",
  "Units Selected (count)", "Units in Priority Order",
  "Configurations of Interest", "Missing Models", "Unmet Needs",
  "Purchase Timeline", "Budget", "Comments", "User Agent",
];

const PRODUCT_HEADERS = [
  "Response ID", "Submitted At", "Org Type", "Rank", "Product ID", "Product", "Size",
  "Preferred Tier", "List Price (tier)", "Price Rating (1-5)", "Price Rating Label",
  "Would Pay", "Would Pay vs List (%)",
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

    responses.appendRow([
      data.responseId || "",
      submittedAt,
      data.orgType || "",
      data.role || "",
      data.orgName || "",
      data.name || "",
      data.email || "",
      list.length,
      list.map(p => `${p.rank}. ${p.product} (${p.size})`).join("\n"),
      (data.configs || []).join(", "),
      data.missingModels || "",
      data.unmetNeeds || "",
      data.timeline || "",
      data.budget || "",
      data.comments || "",
      data.userAgent || "",
    ]);

    if (list.length) {
      const rows = list.map(p => {
        const pct = (p.wouldPay != null && p.listPrice) ? Math.round(((p.wouldPay - p.listPrice) / p.listPrice) * 100) : "";
        return [
          data.responseId || "",
          submittedAt,
          data.orgType || "",
          p.rank,
          p.productId || "",
          p.product || "",
          p.size || "",
          p.tier || "",
          p.listPrice != null ? p.listPrice : "",
          p.priceRating != null ? p.priceRating : "",
          p.priceRatingLabel || "",
          p.wouldPay != null ? p.wouldPay : "",
          pct,
        ];
      });
      products.getRange(products.getLastRow() + 1, 1, rows.length, PRODUCT_HEADERS.length).setValues(rows);
    }

    return json_({ ok: true, responseId: data.responseId });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Visiting the URL in a browser confirms the deployment is live.
function doGet() {
  return ContentService.createTextOutput("Facility survey endpoint is running.").setMimeType(ContentService.MimeType.TEXT);
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

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor to create the tabs and sanity-check the script. */
function testInsert() {
  const sample = {
    responseId: "test-" + Date.now().toString(36),
    submittedAt: new Date().toISOString(),
    orgType: "High school", role: "Athletic Director", orgName: "Test HS", name: "Test", email: "",
    configs: ["20 ft units", "2-story / stacked units"],
    missingModels: "Locker room", unmetNeeds: "", timeline: "6–12 months", budget: "$50,000 – $100,000", comments: "test row — delete me",
    userAgent: "apps-script-test",
    products: [
      { rank: 1, productId: "press-box-20", product: "Press Box", size: "20 ft", tier: "Standard", listPrice: 40640, priceRating: 4, priceRatingLabel: "A little high", wouldPay: 35000 },
      { rank: 2, productId: "bleacher-40", product: "Bleacher Unit", size: "40 ft", tier: "Economy", listPrice: 37050, priceRating: 3, priceRatingLabel: "About right", wouldPay: 37000 },
    ],
  };
  const out = doPost({ postData: { contents: JSON.stringify(sample) } });
  Logger.log(out.getContent());
}
