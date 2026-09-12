// ─────────────────────────────────────────────────────────────────────────────
// Survey configuration
//
// SHEETS_ENDPOINT is the "Web app" URL Google hands you once you've deployed
// apps-script/Code.gs — see step 2 of the README. It'll look something like:
//   https://script.google.com/macros/s/AKfycb.../exec
//
// Leave it blank and nothing breaks, but submissions never leave the browser,
// and the thank-you page will say so.
// ─────────────────────────────────────────────────────────────────────────────
window.SURVEY_CONFIG = {
  SHEETS_ENDPOINT: "https://script.google.com/macros/s/AKfycbx2nzNQDqGI6FcvFganCaJbvGk_P-qNqJgDpLneu1MYPfF-qmsG2bR6tXdw-UMSWRsuVw/exec",
};

// The product catalog. Prices, descriptions and "drivers" all come out of
// Marland_Continental_Product_Pricing.xlsx (the Price Worksheet and Cost Model
// tabs, priced September 2026). Change anything here and the survey picks it up
// on its own.
//
//   images[0] is the hero shot on the product card; everything after it shows up
//   in the thumbnail strip and lightbox on the pricing step. The files live in
//   images/ at full size and images/thumb/ small, named <id>-<n>.jpg.
//
//   On the "What would you change?" step, every unit automatically gets offered
//   the size and stacking variants that make sense for it — a 20 ft unit is
//   offered a 40 ft version and vice versa, and stacking is left out for
//   2-story units, for anything that already has a stacked sibling, and for
//   anything flagged noStacked. On top of that it gets the unit-specific ideas
//   listed in extraOptions.
window.PRODUCTS = [
  {
    id: "bleacher-40", name: "Bleacher Unit", size: "40 ft",
    prices: { economy: 37050, standard: 71599, luxury: 131812 },
    desc: "A single-level bleacher with one side left open to the field. Four tiered rows seat about 100 people, the container roof carries over them as a canopy, and there's a stair up the side with guardrail running the perimeter.",
    drivers: "Seating is what really moves the price: plain aluminum bench planks (economy), fold-down chairs (standard), or full chairback stadium seats (luxury). The riser frame climbs too, from painted mild steel up to hot-dip galvanized.",
    images: ["Exterior", "Plan & elevations"],
    extraOptions: ["More seats", "Wheelchair-accessible seating"],
  },
  {
    id: "bleacher-40-stacked", name: "Bleacher Unit, Stacked", size: "40 ft", note: "2-story",
    prices: { economy: 81203, standard: 153265, luxury: 278086 },
    desc: "Two bleachers stacked one on the other, standing about 19' overall and seating roughly 200. An external steel stair tower with landings gets you up top, and there's a 4' cantilevered walkway and guardrails on both levels.",
    drivers: "Everything in the single unit, twice over, plus an engineered stair tower and the structural design a stacked frame demands. Engineering and steel both roughly double as you move up the tiers.",
    images: ["Exterior", "Plan & elevations"],
    extraOptions: ["More seats", "Wheelchair-accessible seating"],
  },
  {
    id: "press-box-20", name: "Press Box", size: "20 ft",
    prices: { economy: 23831, standard: 40640, luxury: 72021 },
    desc: "A press box with room for six. The 18' window folds up on gas struts, a work counter runs the full length with power and Cat6 at every station, and the whole thing is insulated and cooled by a mini-split. Steel entry door at the back.",
    drivers: "It mostly comes down to that 18' fold-up window: shop-built steel with polycarbonate at the low end, aluminum with tempered glass in the middle, thermally broken with laminated low-E at the top. The counter follows the same path, laminate up to solid surface.",
    images: ["Exterior", "Spec sheet"],
    extraOptions: ["A filming deck on the roof", "A restroom"],
  },
  {
    id: "equipment-room-20", name: "Equipment Room", size: "20 ft",
    prices: { economy: 17769, standard: 29498, luxury: 53373 },
    desc: "Somewhere secure to keep athletic gear. Adjustable shelving, lockable gear lockers, ball and bat racks on the wall, a bench, a whiteboard, louvered vents, rubber coin flooring, and LED lighting on a motion sensor.",
    drivers: "The simplest unit in the line. What separates the tiers is storage quality and climate control: wire shelving and padlocks at one end, welded lockers with dehumidification and keypad entry at the other.",
    images: ["Exterior", "Spec sheet"],
    extraOptions: ["Climate control", "A coaches' office"],
  },
  {
    id: "training-room-40", name: "Training Room", size: "40 ft",
    prices: { economy: 56413, standard: 98087, luxury: 168171 },
    desc: "An athletic training room with six treatment tables. A 36' glass wall and glass entry door, supply casework and wall shelving, a seamless rubber floor, linear LED lighting, and two mini-splits to keep up with all that glazing.",
    drivers: "Almost all of it is the 36' of glass and the six tables. Tables go from fixed-height up to electric hi-lo, and the glazing from fixed aluminum up to thermally broken low-E storefront.",
    images: ["Exterior", "Interior", "Plan & elevations"],
    extraOptions: ["A restroom", "An ice bath or hydrotherapy area"],
  },
  {
    id: "training-room-20", name: "Training Room", size: "20 ft",
    prices: { economy: 33361, standard: 58532, luxury: 108017 },
    desc: "The same training room at half the size, with three treatment tables. A 16' glass wall and glass entry door, supply casework, wall shelving, rubber floor, linear LED, and a single mini-split.",
    drivers: "The same things drive the price here as in the 40' version. There's just half as much glass and half as many tables.",
    images: ["Exterior", "Interior", "Plan & elevations"],
    extraOptions: ["A restroom", "An ice bath or hydrotherapy area"],
  },
  {
    id: "weight-room-20", name: "Weight Room", size: "20 ft",
    prices: { economy: 32047, standard: 62552, luxury: 116441 },
    desc: "An outdoor weight room with 16' of the side left open. Inside there's a functional trainer, a power rack with bar and plates, a dumbbell rack and set, two benches, a treadmill, heavy rubber flooring and LED strips — and a roll-down shutter to lock it all up at night.",
    drivers: "Equipment is more than half the cost. Economy gets you a budget rack and 5–50 lb dumbbells, Standard adds a functional trainer and a commercial treadmill, and Luxury is premium-brand throughout.",
    images: ["Exterior", "Plan & elevations"],
    extraOptions: ["Enclosed and climate-controlled", "A turf and sled lane"],
  },
  {
    id: "concession-20", name: "Concession Stand", size: "20 ft",
    prices: { economy: 38345, standard: 71190, luxury: 133077 },
    desc: "A 16' awning folds up to open the serving window, with a full service counter behind it. Popcorn and hot-food equipment, a beverage cooler, POS, a hand sink and a three-compartment sink, and NSF wall and floor finishes throughout.",
    drivers: "Health-department compliance sets both the floor and the ceiling. Economy just meets the NSF minimum; Standard adds fully coved finishes and a warming line-up; Luxury brings in a Type-I hood, an ice machine and a grease interceptor.",
    images: ["Exterior", "Plan & elevations"],
    extraOptions: ["A walk-in cooler", "A full kitchen with a hood"],
  },
  {
    id: "merchandise-20", name: "Merchandise Stand", size: "20 ft",
    prices: { economy: 30284, standard: 54901, luxury: 99611 },
    desc: "A retail team store. The whole side folds up into an awning canopy with about 7' of projection, and inside there's slatwall with hanging rails, shelving, a center display table, a POS counter, track lighting, wood-look flooring, and lettering on the outside.",
    drivers: "Fixtures and branding do most of it: stock slatwall and a folding table at the low end, a full slatwall system in the middle, custom back-lit millwork at the top. The signage budget more than triples along the way.",
    images: ["Exterior", "Plan & elevations"],
    extraOptions: ["Secure stock storage", "A fitting area"],
  },
  {
    id: "ticket-booth-20", name: "Ticket Booth", size: "20 ft",
    prices: { economy: 31719, standard: 54741, luxury: 96244 },
    desc: "A gate unit split into two halves: an 8' walk-through bay with a full-height turnstile on checker-plate decking, and a 12' conditioned ticket office with a transaction window, counter shelf, desk and chair.",
    drivers: "The turnstile costs the most: a mechanical turnstile (economy), a counting turnstile with a drop arm (standard), then an electronic one with QR and RFID scanning built in (luxury). The transaction window climbs on the same curve.",
    images: ["Exterior", "Plan & elevations"],
    extraOptions: ["More turnstile lanes", "A staff restroom"],
  },
  {
    id: "referee-lounge-20", name: "Referee Lounge", size: "20 ft",
    prices: { economy: 23134, standard: 40495, luxury: 78799 },
    desc: "A place for officials to change and go over the game. A bank of lockers, a padded bench, coat hooks, a kitchenette with sink and coffee station, rubber flooring, LED panels, insulation, a steel door with a closer, and a landing and ramp outside.",
    drivers: "Mostly locker grade and how far the kitchenette goes. At the Luxury tier it also picks up a half-bath rough-in and an aluminum ADA ramp.",
    images: ["Exterior", "Interior", "Plan & elevations"],
    extraOptions: ["A shower", "A full restroom"],
  },
  {
    id: "visiting-team-40", name: "Visiting Team Facility", size: "40 ft",
    prices: { economy: 68708, standard: 112935, luxury: 172486 },
    desc: "A combined wet-and-dry team facility in a single 40-footer: a three-stall shower room, two toilet compartments sharing two lavatories, a mechanical closet holding three water heaters, and a locker room with about 14 lockers and a bench. Three doors out to the field.",
    drivers: "Plumbing is the swing item. We're fitting three showers, two toilets and three water heaters into one 40' box. After that it's the waterproofing method (FRP, hot-mop tile, or porcelain) and the grade of the lockers.",
    images: ["Exterior", "Plan & elevations", "Locker room", "Lavatory", "Shower room", "Toilet compartment"],
    extraOptions: ["A coaches' room", "Separate home and visitor sides"],
  },
  {
    id: "clubhouse-20", name: "Clubhouse + Observation Deck", size: "20 ft", note: "2-story",
    prices: { economy: 65690, standard: 108689, luxury: 188773 },
    desc: "Two levels. Downstairs is a bar in an open-side 20' container, with back bar, cooler and TV, opening onto a 20' × 10' covered deck. Up top sits a 20' × 12' observation deck reached by an exterior stair, with guardrails and festoon lighting.",
    drivers: "The elevated occupied roof deck sets the price. Screw piers and treated lumber (economy), footings and composite (standard), hot-dip galvanized with ipe and glass-infill rail (luxury). The bar equipment scales along with it.",
    images: ["Exterior", "Plan & elevations"],
    extraOptions: ["A restroom", "A bigger rooftop deck"],
  },
  {
    id: "vip-suite-40", name: "Luxury Suite / VIP Club", size: "40 ft",
    prices: { economy: 94064, standard: 156161, luxury: 279271 },
    desc: "A single-level VIP club behind a 36' sliding glass wall. Lounge seating with a sectional and club chairs, a full bar with refrigerator and ice maker, a private restroom, a 75\" media wall, climate control and ambient LED, plus a 40' × 10' outdoor deck with cable railing.",
    drivers: "Finish level and the glass. Fixed aluminum window wall, commercial slider, or thermally broken multi-slide; laminate, quartz or stone at the bar; treated lumber, composite or ipe on the deck. The deck itself comes with every tier.",
    images: ["Exterior", "Exterior & interiors", "Spec sheet"],
    extraOptions: ["A kitchen or catering prep area", "Split into several smaller private suites"],
  },
  {
    id: "vip-suite-40-stacked", name: "Luxury Suite / VIP Club, Stacked", size: "40 ft", note: "2-story",
    prices: { economy: 201266, standard: 336371, luxury: 519103 },
    desc: "A two-story VIP club standing 19'-6\" overall. Main lounge and bar on the first floor, a second suite and bar above it, a restroom on each level, glazing on both, and a 40' × 8' rooftop deck set up for lounging and dining. Staircases inside and out.",
    drivers: "Everything in the single suite, twice over, plus the stack frame, an interior stair cut through the floor plate, and a third occupied level on the roof. Structural engineering roughly triples.",
    images: ["Exterior", "Spec sheet"],
    extraOptions: ["A kitchen or catering prep area", "Split into several smaller private suites"],
  },
  {
    id: "container-stage-40", name: "Container Stage", size: "40 ft",
    prices: { economy: 92135, standard: 161510, luxury: 288802 },
    desc: "A stage for concerts and events. Two 40' containers stand as flanking towers with a 24' × 20' performance deck between them and 16' of clearance to the roof. Truss roof with a weatherproof cover, rigging points for lighting and audio, non-slip decking, access stairs and stage power distribution. The AV package is quoted separately.",
    drivers: "The roof truss and rigging. Bolted box truss with a tarp at the low end, aluminum ground-support with a tensioned cover next, then motorized hoists with flown wings. Power grows from single-phase to 400A three-phase along the way.",
    images: ["Exterior", "Spec sheet"],
    noStacked: true, // stacking makes no sense for this unit
    extraOptions: ["A backstage green room", "Include the AV package (LED wall, audio, lighting)"],
  },
  {
    id: "dugout-40", name: "Baseball Dugout", size: "40 ft",
    prices: { economy: 29480, standard: 51456, luxury: 106299 },
    desc: "A dugout that seats up to 15. The full length of one side is open, with protective railing and chain-link fence, a continuous bench, storage with cubbies and hooks, bat and helmet racks, a water cooler station, a roof overhang, LED lighting and non-slip flooring.",
    drivers: "Insulation and comfort. Economy is a painted steel box with a treated bench; Standard adds insulation, a composite bench and fans; Luxury brings climate control, sound, and scoreboard integration.",
    images: ["Exterior", "Spec sheet"],
    noStacked: true, // stacking makes no sense for this unit
    extraOptions: ["A restroom", "A batting cage extension"],
  },
];

window.TIERS = [
  { id: "economy",  label: "Economy",  desc: "Functional and gets the job done, built with cheaper materials" },
  { id: "standard", label: "Standard", desc: "A sensible balance of quality, durability and cost" },
  { id: "luxury",   label: "Luxury",   desc: "High-end materials and workmanship, meant to last a lot longer" },
];

// Shown in an expandable note on the pricing step so people know what a price
// does and doesn't cover. Summarised from the workbook's Read Me tab.
window.PRICING_NOTES = {
  includes: "Every price is delivered, and covers the container shell, structural steel, insulation and finishes, doors, windows and glazing, electrical, HVAC and plumbing, fixtures and equipment, paint and signage, engineering with stamped drawings, shop labor, and an allowance for freight and set.",
  excludes: "A few things sit outside the price. You'll still need a foundation on site: a concrete pad usually runs $4,000–$12,000 and a pier system runs $1,500–$5,000. You'll also need utility service to the pad, sales tax and local building permits. Crane time is not included, beyond what's already built into the stacked units and the ones with decks. Stage AV (LED wall, audio, lighting, generator) is quoted on its own.",
  packages: "These are per-unit prices for buying one at a time. Order several together and there'd be a discount, which isn't reflected here.",
  dated: "Prices as of September 2026.",
};

// 5-point price perception scale (we store both the number and the label).
window.PRICE_SCALE = [
  { value: 1, label: "Much too low" },
  { value: 2, label: "A little low" },
  { value: 3, label: "About right" },
  { value: 4, label: "A little high" },
  { value: 5, label: "Much too high" },
];