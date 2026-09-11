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

// Product catalog. Prices, descriptions and "drivers" come from
// Marland_Continental_Product_Pricing.xlsx (Price Worksheet + Cost Model tabs,
// priced September 2026). Edit here and the survey updates automatically.
//
//   images[0] is the hero shown on the product card; the rest appear in the
//   pricing step's thumbnail strip / lightbox. Files live in images/ (full) and
//   images/thumb/ (small), named <id>-<n>.jpg.
//
//   On the "What would you change?" step each unit is offered size/stacking
//   variants automatically (a 20 ft unit gets "40 ft version", a 40 ft unit gets
//   "20 ft version"; stacking is skipped for 2-story units, units that already
//   have a stacked sibling, and units flagged noStacked) plus the unit-specific
//   ideas listed in extraOptions.
window.PRODUCTS = [
  {
    id: "bleacher-40", name: "Bleacher Unit", size: "40 ft",
    prices: { economy: 37050, standard: 71599, luxury: 131812 },
    desc: "Single-level open-side bleacher. 4 tiered rows, ~100 seats, container-roof canopy, side access stair, perimeter guardrail.",
    drivers: "Seating is the swing item: aluminum bench planks vs. fold-down chairs vs. chairback stadium seats. Riser frame moves from painted mild steel to hot-dip galvanized.",
    images: ["Exterior", "Plan & elevations"],
    extraOptions: ["Higher seating capacity", "Wheelchair-accessible seating area"],
  },
  {
    id: "bleacher-40-stacked", name: "Bleacher Unit, Stacked", size: "40 ft", note: "2-story",
    prices: { economy: 81203, standard: 153265, luxury: 278086 },
    desc: "Two-level stacked bleacher, ~19' overall. ~200 seats, external steel stair tower with landings, 4' cantilevered walkway, guardrails on both levels.",
    drivers: "Everything in the single unit, doubled, plus an engineered stair tower and stacked-frame structural design. Engineering and steel roughly double between tiers.",
    images: ["Exterior", "Plan & elevations"],
    extraOptions: ["Higher seating capacity", "Wheelchair-accessible seating area"],
  },
  {
    id: "press-box-20", name: "Press Box", size: "20 ft",
    prices: { economy: 23831, standard: 40640, luxury: 72021 },
    desc: "6-station press box. 18' fold-up awning window on gas struts, full-length work counter with power and Cat6, insulated, rear steel entry door, mini-split.",
    drivers: "The 18' fold-up window: shop-built steel with polycarbonate vs. aluminum with tempered glass vs. thermally broken with laminated low-E. Counter goes laminate to solid surface.",
    images: ["Exterior", "Spec sheet"],
    extraOptions: ["Rooftop filming deck", "Add a restroom"],
  },
  {
    id: "equipment-room-20", name: "Equipment Room", size: "20 ft",
    prices: { economy: 17769, standard: 29498, luxury: 53373 },
    desc: "Secure athletic equipment storage. Adjustable shelving, lockable gear lockers, wall-mounted ball and bat racks, bench, whiteboard, louvered vents, rubber coin flooring, motion-sensor LED.",
    drivers: "Simplest unit in the line. Spread is storage quality and climate control — wire shelving and padlocks vs. welded lockers, dehumidification and keypad entry.",
    images: ["Exterior", "Spec sheet"],
    extraOptions: ["Add climate control", "Add a coaches' office"],
  },
  {
    id: "training-room-40", name: "Training Room", size: "40 ft",
    prices: { economy: 56413, standard: 98087, luxury: 168171 },
    desc: "6-table athletic training room. 36' glass wall, glass entry door, 6 treatment tables, supply casework and wall shelving, seamless rubber floor, linear LED, dual mini-split.",
    drivers: "36' of glazing and six treatment tables. Tables run fixed-height to electric hi-lo; glazing runs fixed aluminum to thermally broken low-E storefront.",
    images: ["Exterior", "Interior", "Plan & elevations"],
    extraOptions: ["Add a restroom", "Add an ice bath / hydrotherapy area"],
  },
  {
    id: "training-room-20", name: "Training Room", size: "20 ft",
    prices: { economy: 33361, standard: 58532, luxury: 108017 },
    desc: "3-table athletic training room. 16' glass wall, glass entry door, 3 treatment tables, supply casework, wall shelving, rubber floor, linear LED, mini-split.",
    drivers: "Same drivers as the 40', at roughly half the glazing and half the tables.",
    images: ["Exterior", "Interior", "Plan & elevations"],
    extraOptions: ["Add a restroom", "Add an ice bath / hydrotherapy area"],
  },
  {
    id: "weight-room-20", name: "Weight Room", size: "20 ft",
    prices: { economy: 32047, standard: 62552, luxury: 116441 },
    desc: "Open-side 16' outdoor weight room. Functional trainer, power rack with bar and plates, dumbbell rack and set, 2 benches, treadmill, heavy rubber flooring, LED strips, roll-down security shutter.",
    drivers: "Equipment is over half the cost. Economy is a budget rack and 5–50 lb dumbbells; Standard adds a functional trainer and commercial treadmill; Luxury is premium-brand throughout.",
    images: ["Exterior", "Plan & elevations"],
    extraOptions: ["Fully enclosed, climate-controlled version", "Add a turf / sled lane"],
  },
  {
    id: "concession-20", name: "Concession Stand", size: "20 ft",
    prices: { economy: 38345, standard: 71190, luxury: 133077 },
    desc: "16' fold-up awning serving window, full service counter, popcorn and hot-food equipment, beverage cooler, POS, hand sink and 3-compartment sink, NSF wall and floor finishes.",
    drivers: "Health-department compliance. Economy meets minimum NSF; Standard adds full coved finishes and a warming line-up; Luxury adds a Type-I hood, ice machine and grease interceptor.",
    images: ["Exterior", "Plan & elevations"],
    extraOptions: ["Add a walk-in cooler", "Full kitchen with hood"],
  },
  {
    id: "merchandise-20", name: "Merchandise Stand", size: "20 ft",
    prices: { economy: 30284, standard: 54901, luxury: 99611 },
    desc: "Retail team store. Full-side fold-up awning canopy with ~7' projection, slatwall and hanging rails, shelving, center display table, POS counter, track lighting, wood-look flooring, exterior lettering.",
    drivers: "Fixtures and branding. Stock slatwall and a folding table vs. a full slatwall system vs. custom back-lit millwork. Signage budget more than triples.",
    images: ["Exterior", "Plan & elevations"],
    extraOptions: ["Add secure stock storage", "Add a fitting area"],
  },
  {
    id: "ticket-booth-20", name: "Ticket Booth", size: "20 ft",
    prices: { economy: 31719, standard: 54741, luxury: 96244 },
    desc: "Split-plan gate unit. 8' walk-through turnstile bay with full-height turnstile on checker-plate deck, plus 12' conditioned ticket office with transaction window, counter shelf, desk and chair.",
    drivers: "The turnstile: mechanical vs. counter with drop-arm vs. electronic with QR/RFID scanner integration. Transaction window follows the same curve.",
    images: ["Exterior", "Plan & elevations"],
    extraOptions: ["More turnstile lanes", "Add a staff restroom"],
  },
  {
    id: "referee-lounge-20", name: "Referee Lounge", size: "20 ft",
    prices: { economy: 23134, standard: 40495, luxury: 78799 },
    desc: "Officials' changing and briefing room. Bank of lockers, padded bench, coat hooks, kitchenette with sink and coffee station, rubber flooring, LED panels, insulated, steel door with closer, exterior landing and ramp.",
    drivers: "Locker grade and how far the kitchenette goes. Luxury adds a half-bath rough-in and an aluminum ADA ramp.",
    images: ["Exterior", "Interior", "Plan & elevations"],
    extraOptions: ["Add a shower", "Add a full restroom"],
  },
  {
    id: "visiting-team-40", name: "Visiting Team Facility", size: "40 ft",
    prices: { economy: 68708, standard: 112935, luxury: 172486 },
    desc: "Combined wet-and-dry team facility. 3-stall shower room, 2 toilet compartments with 2 lavatories, mechanical closet with 3 water heaters, and a locker room with ~14 lockers and bench. Three exterior doors.",
    drivers: "Plumbing is the swing item — three showers, two toilets and three water heaters in one 40'. Waterproofing method (FRP vs. hot-mop tile vs. porcelain) and locker grade do the rest.",
    images: ["Exterior", "Plan & elevations", "Locker room", "Lavatory", "Shower room", "Toilet compartment"],
    extraOptions: ["Add a coaches' room", "Separate home / visitor sides"],
  },
  {
    id: "clubhouse-20", name: "Clubhouse + Observation Deck", size: "20 ft", note: "2-story",
    prices: { economy: 65690, standard: 108689, luxury: 188773 },
    desc: "Two-level clubhouse. Ground-floor bar in an open-side 20' container with back bar, cooler and TV, 20' × 10' covered lower deck, and a 20' × 12' rooftop observation deck with exterior stair, guardrails and festoon lighting.",
    drivers: "The elevated occupied roof deck. Screw piers and treated lumber vs. footings and composite vs. hot-dip galvanized with ipe and glass-infill rail. Bar equipment scales with it.",
    images: ["Exterior", "Plan & elevations"],
    extraOptions: ["Add a restroom", "Larger rooftop deck"],
  },
  {
    id: "vip-suite-40", name: "Luxury Suite / VIP Club", size: "40 ft",
    prices: { economy: 94064, standard: 156161, luxury: 279271 },
    desc: "Single-level VIP club. 36' sliding glass wall, lounge with sectional and club chairs, full bar with refrigerator and ice maker, private restroom, 75\" media wall, climate control, ambient LED, and a 40' × 10' outdoor deck with cable railing.",
    drivers: "Finish level and the glass. Fixed aluminum window wall vs. commercial slider vs. thermally broken multi-slide; laminate vs. quartz vs. stone bar; treated vs. composite vs. ipe deck. Deck is included at every tier.",
    images: ["Exterior", "Exterior & interiors", "Spec sheet"],
    extraOptions: ["Kitchen / catering prep area", "Split into several smaller private suites"],
  },
  {
    id: "vip-suite-40-stacked", name: "Luxury Suite / VIP Club, Stacked", size: "40 ft", note: "2-story",
    prices: { economy: 201266, standard: 336371, luxury: 519103 },
    desc: "Two-story VIP club, 19'-6\" overall. Main lounge and bar on level one, VIP suite and bar on level two, restroom on each floor, glazing on both levels, 40' × 8' rooftop deck with lounge and dining, interior and exterior staircases.",
    drivers: "Everything in the single suite, doubled, plus the stack frame, an interior stair cut through the floor plate, and a third occupied level on the roof. Structural engineering roughly triples.",
    images: ["Exterior", "Spec sheet"],
    extraOptions: ["Kitchen / catering prep area", "Split into several smaller private suites"],
  },
  {
    id: "container-stage-40", name: "Container Stage", size: "40 ft",
    prices: { economy: 92135, standard: 161510, luxury: 288802 },
    desc: "Concert and event stage. Two 40' containers as flanking towers with a 24' × 20' performance deck between them, 16' to the roof. Truss roof with weatherproof cover, rigging points for lighting and audio, non-slip deck, access stairs, stage power distribution. AV package priced separately.",
    drivers: "Roof truss and rigging. Bolted box truss with a tarp vs. aluminum ground-support with tensioned cover vs. motorized hoists and flown wings. Power grows from single-phase to 400A 3-phase.",
    images: ["Exterior", "Spec sheet"],
    noStacked: true, // stacking makes no sense for this unit
    extraOptions: ["Backstage / green room", "Include the AV package (LED wall, audio, lighting)"],
  },
  {
    id: "dugout-40", name: "Baseball Dugout", size: "40 ft",
    prices: { economy: 29480, standard: 51456, luxury: 106299 },
    desc: "Team dugout seating up to 15. Full-length open side with protective railing and chain-link fence, continuous bench, equipment storage with cubbies, hooks, bat and helmet racks, water cooler station, roof overhang, LED lighting, non-slip flooring.",
    drivers: "Insulation and comfort. Economy is a painted steel box with a treated bench; Standard adds insulation, composite bench and fans; Luxury adds climate control, sound and scoreboard integration.",
    images: ["Exterior", "Spec sheet"],
    noStacked: true, // stacking makes no sense for this unit
    extraOptions: ["Add a restroom", "Batting cage extension"],
  },
];

window.TIERS = [
  { id: "economy",  label: "Economy",  desc: "Good enough, functional, cheaper materials" },
  { id: "standard", label: "Standard", desc: "Good balance of quality, durability, and affordability" },
  { id: "luxury",   label: "Luxury",   desc: "High-end materials and quality for a longer product lifespan" },
];

// Shown in an expandable note on the pricing step so respondents know what a
// price does and doesn't include. Summarised from the workbook's Read Me tab.
window.PRICING_NOTES = {
  includes: "Each price is delivered and covers the container shell, structural steel, insulation and finishes, doors/windows/glazing, electrical/HVAC/plumbing, fixtures and equipment, paint and signage, engineering with stamped drawings, shop labor, and a freight and set allowance.",
  excludes: "Prices do not include the site foundation (a concrete pad typically runs $4,000–$12,000; pier systems $1,500–$5,000), utility service to the pad, sales tax, local building permits, or crane time beyond what's built into the stacked and deck units. Stage AV (LED wall, audio, lighting, generator) is quoted separately.",
  packages: "Prices are per unit, bought one at a time. Multi-unit packages would carry a discount that isn't reflected here.",
  dated: "Priced September 2026.",
};

// 5-point price perception scale (stored as both the number and the label).
window.PRICE_SCALE = [
  { value: 1, label: "Much too low" },
  { value: 2, label: "A little low" },
  { value: 3, label: "About right" },
  { value: 4, label: "A little high" },
  { value: 5, label: "Much too high" },
];
