// ─────────────────────────────────────────────────────────────────────────────
// Survey configuration
//
// SHEETS_ENDPOINT: the "Web app" URL you get after deploying apps-script/Code.gs
// (see README.md, step 2). It looks like:
//   https://script.google.com/macros/s/AKfycb.../exec
//
// Until this is filled in, submissions are kept in the browser only and a
// warning is shown on the thank-you page.
// ─────────────────────────────────────────────────────────────────────────────
window.SURVEY_CONFIG = {
  SHEETS_ENDPOINT: "",
};

// Product catalog. Edit prices/names here and the survey updates automatically.
window.PRODUCTS = [
  { id: "bleacher-40",         name: "Bleacher Unit",                 size: "40 ft",  prices: { economy: 37050,  standard: 71599,  luxury: 131812 } },
  { id: "bleacher-40-stacked", name: "Bleacher Unit, Stacked",        size: "40 ft",  prices: { economy: 81203,  standard: 153265, luxury: 278086 }, note: "2-story" },
  { id: "press-box-20",        name: "Press Box",                     size: "20 ft",  prices: { economy: 23831,  standard: 40640,  luxury: 72021 } },
  { id: "equipment-room-20",   name: "Equipment Room",                size: "20 ft",  prices: { economy: 17769,  standard: 29498,  luxury: 53373 } },
  { id: "training-room-40",    name: "Training Room",                 size: "40 ft",  prices: { economy: 56413,  standard: 98087,  luxury: 168171 } },
  { id: "training-room-20",    name: "Training Room",                 size: "20 ft",  prices: { economy: 33361,  standard: 58532,  luxury: 108017 } },
  { id: "weight-room-20",      name: "Weight Room",                   size: "20 ft",  prices: { economy: 32047,  standard: 62552,  luxury: 116441 } },
  { id: "concession-20",       name: "Concession Stand",              size: "20 ft",  prices: { economy: 38345,  standard: 71190,  luxury: 133077 } },
  { id: "merchandise-20",      name: "Merchandise Stand",             size: "20 ft",  prices: { economy: 30284,  standard: 54901,  luxury: 99611 } },
  { id: "ticket-booth-20",     name: "Ticket Booth",                  size: "20 ft",  prices: { economy: 31719,  standard: 54741,  luxury: 96244 } },
  { id: "referee-lounge-20",   name: "Referee Lounge",                size: "20 ft",  prices: { economy: 23134,  standard: 40495,  luxury: 78799 } },
  { id: "visiting-team-40",    name: "Visiting Team Facility",        size: "40 ft",  prices: { economy: 68708,  standard: 112935, luxury: 172486 } },
  { id: "clubhouse-20",        name: "Clubhouse + Observation Deck",  size: "20 ft",  prices: { economy: 65690,  standard: 108689, luxury: 188773 }, note: "2-story" },
];

window.TIERS = [
  { id: "economy",  label: "Economy",  desc: "Good enough, functional, cheaper materials" },
  { id: "standard", label: "Standard", desc: "Good balance of quality, durability, and affordability" },
  { id: "luxury",   label: "Luxury",   desc: "High-end materials and quality for a longer product lifespan" },
];

// 5-point price perception scale (stored as both the number and the label).
window.PRICE_SCALE = [
  { value: 1, label: "Much too low" },
  { value: 2, label: "A little low" },
  { value: 3, label: "About right" },
  { value: 4, label: "A little high" },
  { value: 5, label: "Much too high" },
];
