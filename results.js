// "See what others are thinking" — the community results section shown under
// the thank-you message. Reads the anonymised aggregate that Code.gs serves at
// <SHEETS_ENDPOINT>?action=stats and draws it with plain SVG (no libraries).
//
// Exposed on window so survey.js can call it after a submission, and so the
// section can be previewed with sample data by opening index.html?demo.
(function () {
  "use strict";

  const PRODUCTS = window.PRODUCTS || [];
  const PRICE_SCALE = window.PRICE_SCALE || [];
  const TIERS = window.TIERS || [];

  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => "$" + Number(n).toLocaleString("en-US");
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
  const heroSrc = (id) => `images/thumb/${id}-1.jpg`;
  const productById = (id) => PRODUCTS.find((p) => p.id === id);

  // Colours were run through a colour-vision-deficiency validator against the
  // white card surface; the grey slots are deliberate (an "Other" bucket and the
  // neutral midpoint of the price scale). Every chart also carries direct labels
  // and a legend with counts, so nothing relies on hue alone.
  const CATEGORICAL = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];
  const OTHER_GREY = "#898781";
  const TIER_RAMP = { Economy: "#86b6ef", Standard: "#2a78d6", Luxury: "#104281" };
  const PRICE_DIVERGING = ["#104281", "#3987e5", "#b8b7b1", "#e0673f", "#a82020"]; // much too low → much too high

  // ── Data shaping ───────────────────────────────────────────────────────────
  // Turn a {label: count} tally into ordered slices, folding the tail into "Other".
  function slicesFromTally(tally, opts) {
    const o = opts || {};
    let entries = Object.entries(tally || {}).map(([label, value]) => ({ label, value: Number(value) || 0 })).filter((e) => e.value > 0);
    if (o.order) {
      const rank = (l) => { const i = o.order.indexOf(l); return i === -1 ? 999 : i; };
      entries.sort((a, b) => rank(a.label) - rank(b.label));
    } else {
      entries.sort((a, b) => b.value - a.value);
    }
    const max = o.max || 4;
    if (!o.order && entries.length > max + 1) {
      const head = entries.slice(0, max);
      const rest = entries.slice(max).reduce((s, e) => s + e.value, 0);
      entries = head.concat([{ label: "Other", value: rest, other: true }]);
    }
    entries.forEach((e, i) => {
      e.color = o.colors ? (typeof o.colors === "function" ? o.colors(e.label, i) : o.colors[i]) : (e.other ? OTHER_GREY : CATEGORICAL[i]);
      if (!e.color) e.color = OTHER_GREY;
    });
    return entries;
  }

  // ── Donut chart (SVG) ──────────────────────────────────────────────────────
  function arcPath(cx, cy, rOuter, rInner, a0, a1) {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [x0, y0] = p(rOuter, a0), [x1, y1] = p(rOuter, a1), [x2, y2] = p(rInner, a1), [x3, y3] = p(rInner, a0);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${rOuter} ${rOuter} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)} A${rInner} ${rInner} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)} Z`;
  }

  function donut(title, slices, opts) {
    const o = opts || {};
    const total = slices.reduce((s, e) => s + e.value, 0);
    const size = 220, cx = size / 2, cy = size / 2, rO = 100, rI = 62;
    let a = -Math.PI / 2;
    const paths = [], labels = [];
    slices.forEach((e, i) => {
      const frac = total ? e.value / total : 0;
      const a1 = a + frac * Math.PI * 2;
      const d = slices.length === 1
        ? `M${cx - rO} ${cy} A${rO} ${rO} 0 1 1 ${cx + rO} ${cy} A${rO} ${rO} 0 1 1 ${cx - rO} ${cy} M${cx - rI} ${cy} A${rI} ${rI} 0 1 0 ${cx + rI} ${cy} A${rI} ${rI} 0 1 0 ${cx - rI} ${cy}`
        : arcPath(cx, cy, rO, rI, a, a1);
      const share = pct(e.value, total);
      paths.push(`<path d="${d}" fill="${e.color}" fill-rule="evenodd" data-i="${i}" tabindex="0" role="img" aria-label="${esc(e.label)}: ${e.value} (${share}%)"><title>${esc(e.label)}: ${e.value} (${share}%)</title></path>`);
      // Direct label inside slices that are wide enough to hold one.
      if (frac >= 0.09) {
        const mid = a + (a1 - a) / 2, r = (rO + rI) / 2;
        labels.push(`<text x="${(cx + r * Math.cos(mid)).toFixed(1)}" y="${(cy + r * Math.sin(mid)).toFixed(1)}" text-anchor="middle" dominant-baseline="central">${share}%</text>`);
      }
      a = a1;
    });
    const legend = slices.map((e, i) => `
      <li data-i="${i}"><span class="sw" style="background:${e.color}"></span><span class="lbl">${esc(e.label)}</span><span class="n">${e.value}</span><span class="p">${pct(e.value, total)}%</span></li>`).join("");
    return `
      <figure class="cr-chart">
        <div class="cr-chart-body">
          <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="cr-donut" aria-hidden="${total ? "false" : "true"}">
            <g class="slices">${paths.join("")}</g>
            <g class="labels" aria-hidden="true">${labels.join("")}</g>
            <text class="center-n" x="${cx}" y="${cy - 6}" text-anchor="middle">${o.centerValue ?? total}</text>
            <text class="center-l" x="${cx}" y="${cy + 16}" text-anchor="middle">${esc(o.centerLabel || "answers")}</text>
          </svg>
          <ul class="cr-legend">${legend}</ul>
        </div>
      </figure>`;
  }

  // Hovering a slice lights its legend row, and vice versa.
  function wireDonuts(root) {
    root.querySelectorAll(".cr-chart").forEach((fig) => {
      const set = (i, on) => {
        fig.querySelectorAll(`[data-i="${i}"]`).forEach((el) => el.classList.toggle("hot", on));
        fig.classList.toggle("has-hot", on);
      };
      fig.querySelectorAll("[data-i]").forEach((el) => {
        const i = el.dataset.i;
        el.addEventListener("mouseenter", () => set(i, true));
        el.addEventListener("mouseleave", () => set(i, false));
        el.addEventListener("focus", () => set(i, true));
        el.addEventListener("blur", () => set(i, false));
      });
    });
  }

  // ── Sections ───────────────────────────────────────────────────────────────
  function kpis(s) {
    const tiles = [
      { v: s.count, l: "responses so far", sub: "from athletic programs like yours" },
      { v: pct(s.interested, s.count) + "%", l: "want to talk about acquiring a unit", sub: `${s.interested} of ${s.count}` },
      { v: s.avgUnitsSelected, l: "units on the average shortlist", sub: "picked out of " + PRODUCTS.length },
      { v: pct(s.interestedInFunding, s.count) + "%", l: "open to sponsorship or naming rights", sub: "to help fund a project" },
    ];
    return `<div class="cr-kpis">${tiles.map((t) => `<div class="cr-kpi"><span class="v">${esc(t.v)}</span><span class="l">${esc(t.l)}</span><span class="s">${esc(t.sub)}</span></div>`).join("")}</div>`;
  }

  function topProducts(s) {
    const top = (s.products || []).slice(0, 3);
    if (!top.length) return "";
    const medal = ["1", "2", "3"];
    const cards = top.map((p, i) => {
      const cfg = productById(p.productId) || {};
      const name = p.product || cfg.name || p.productId;
      const size = p.size || cfg.size || "";
      const listAtTier = cfg.prices && p.topTier ? cfg.prices[p.topTier.toLowerCase()] : null;
      const facts = [
        [`${p.pickShare}%`, "put it on their shortlist"],
        [String(p.firsts), p.firsts === 1 ? "ranked it #1" : "ranked it #1"],
        p.topTier ? [p.topTier, listAtTier ? `most-chosen tier · ${fmt(listAtTier)}` : "most-chosen tier"] : null,
        p.avgWouldPay != null ? [fmt(p.avgWouldPay), "average they'd pay"] : null,
      ].filter(Boolean);
      return `
        <article class="cr-top ${i === 0 ? "first" : ""}">
          <div class="cr-top-photo"><img src="${heroSrc(p.productId)}" alt="${esc(name)}" loading="lazy"><span class="cr-medal">#${medal[i]}</span></div>
          <div class="cr-top-body">
            <h4>${esc(name)} <span class="opt">· ${esc(size)}${cfg.note ? " · " + esc(cfg.note) : ""}</span></h4>
            <div class="cr-bar"><span style="width:${p.pickShare}%"></span></div>
            <dl>${facts.map(([v, l]) => `<div><dt>${esc(v)}</dt><dd>${esc(l)}</dd></div>`).join("")}</dl>
          </div>
        </article>`;
    }).join("");
    return `
      <section class="cr-block">
        <h3>Top three most wanted units</h3>
        <div class="cr-tops">${cards}</div>
      </section>`;
  }

  function charts(s) {
    const org = slicesFromTally(s.orgTypes, { max: 4 });
    const tiers = slicesFromTally(s.tiers, { order: TIERS.map((t) => t.label), colors: (l) => TIER_RAMP[l] });
    const price = slicesFromTally(s.priceRatings, { order: PRICE_SCALE.map((p) => p.label), colors: (l) => PRICE_DIVERGING[PRICE_SCALE.findIndex((p) => p.label === l)] });
    const ratingsN = tiers.reduce((a, e) => a + e.value, 0);
    return `
      <section class="cr-block">
        <h3>Who's answering, and how our pricing lands</h3>
        <div class="cr-charts">
          ${donut("Who's responding", org, {centerLabel: "people" })}
          ${donut("Preferred build tier", tiers, {centerValue: ratingsN, centerLabel: "unit ratings" })}
          ${donut("How the price feels", price, {centerValue: price.reduce((a, e) => a + e.value, 0), centerLabel: "unit ratings" })}
        </div>
      </section>`;
  }

  // Floating quote bubbles. On wide screens they drift in a loose 3-column
  // field; on phones they stack (see CSS), so nothing overlaps.
  function bubbles(s) {
    // The server already returns the longest notes across every column,
    // longest first; show the top three on a single row.
    const list = (s.snippets || []).slice(0, 3);
    if (!list.length) return "";
    const KIND = { idea: "Cargotecture idea", wish: "Wish list", comment: "Comment", price: "On the price", change: "Suggested change" };
    const items = list.map((q, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const jitterX = ((i * 37) % 11) - 5, jitterY = ((i * 53) % 17) - 8;
      const who = [q.role, q.orgType].filter(Boolean).join(", ");
      return `
        <blockquote class="cr-bubble k-${esc(q.kind)}" style="--col:${col};--row:${row};--jx:${jitterX}px;--jy:${jitterY}px;--dur:${6 + (i % 4) * 1.3}s;--delay:${-(i * 0.9)}s">
          <span class="kind">${KIND[q.kind] || "Comment"}${q.product ? ` · ${esc(q.product)}` : ""}</span>
          <p>“${esc(q.text)}”</p>
          <footer>— ${esc(who || "A respondent")}</footer>
        </blockquote>`;
    }).join("");
    return `
      <section class="cr-block">
        <h3><span class="cr-kicker">In their words</span>What people are asking for</h3>
        <div class="cr-bubbles" style="--rows:${Math.ceil(list.length / 3)}">${items}</div>
      </section>`;
  }

  function header(s, note) {
    const n = s.count;
    const title = n > 0 ? `See what <em>${n.toLocaleString("en-US")}</em> ${n === 1 ? "other is" : "others are"} thinking` : "You're the first to answer";
    const lede = n > 0
      ? "As a thank-you, here's a live look at what other athletic directors and facility leaders have told us so far. It updates as responses come in."
      : "As a thank-you, this page will show a live summary of what other athletic directors and facility leaders tell us. Check back once a few more responses arrive.";
    return `
      <header class="cr-hero">
        <h2>${title}</h2>
        <p class="cr-lede">${lede}</p>
      </header>`;
  }

  function footer(s) {
    const when = s.generatedAt ? new Date(s.generatedAt) : new Date();
    return `
      <footer class="cr-foot">
        <p><strong>About these numbers.</strong> n = ${s.count} ${s.count === 1 ? "response" : "responses"}, collected from the survey you just completed. Percentages are of respondents unless a chart says otherwise; tier and price charts count one rating per unit selected. Quotes are trimmed for length and show only role and organization type. Updated ${when.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.</p>
      </footer>`;
  }

  function render(stats, opts) {
    const o = opts || {};
    const root = $("#community"); if (!root) return;
    const s = Object.assign({ count: 0, interested: 0, interestedInFunding: 0, avgUnitsSelected: 0, orgTypes: {}, tiers: {}, priceRatings: {}, products: [], snippets: [] }, stats || {});
    root.innerHTML = header(s, o.note) + (s.count > 0 ? kpis(s) + topProducts(s) + charts(s) + bubbles(s) + footer(s) : "");
    root.hidden = false;
    wireDonuts(root);
  }

  function renderLoading() {
    const root = $("#community"); if (!root) return;
    root.innerHTML = `<div class="cr-loading"><span class="cr-spin" aria-hidden="true"></span>Gathering what others have said…</div>`;
    root.hidden = false;
  }

  function renderUnavailable(ownerNote) {
    const root = $("#community"); if (!root) return;
    root.innerHTML = `
      <header class="cr-hero">
        <h2>See what others are thinking</h2>
        <p class="cr-lede">We couldn't load the live results right now. Your answers were still recorded, and we're grateful for them. Refresh this page in a moment to see how your peers answered.</p>
      </header>
      ${ownerNote ? `<div class="warn-box"><strong>Setup note (visible to the site owner):</strong> ${ownerNote}</div>` : ""}`;
    root.hidden = false;
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  // The survey calls prefetch() when the visitor reaches the Review step, so
  // the round trip to Apps Script (~2 s) usually finishes before they submit.
  // The respondent's own row can't be in the sheet yet at that point, so no
  // exclude id is needed for the prefetch.
  let prefetched = null;
  function fetchStats(endpoint, excludeId) {
    const url = `${endpoint}${endpoint.includes("?") ? "&" : "?"}action=stats&exclude=${encodeURIComponent(excludeId || "")}&t=${Date.now()}`;
    return fetch(url, { method: "GET" }).then(async (res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); });
  }
  function prefetch(endpoint) {
    if (!endpoint || prefetched) return;
    prefetched = { endpoint, promise: fetchStats(endpoint, "").catch((ex) => { prefetched = null; throw ex; }) };
  }

  async function load(endpoint, excludeId) {
    renderLoading();
    try {
      const text = await (prefetched && prefetched.endpoint === endpoint ? prefetched.promise : fetchStats(endpoint, excludeId));
      let stats = null;
      try { stats = JSON.parse(text); } catch (_) {
        // The deployed script is still the old version: its doGet answers with
        // plain text instead of the stats JSON. Nothing the respondent can fix.
        console.warn("community results: endpoint returned non-JSON —", text.slice(0, 80));
        renderUnavailable("the Google Apps Script at the survey endpoint doesn't serve <code>?action=stats</code> yet. Paste the latest <code>apps-script/Code.gs</code> into the script project and publish a new deployment version (Deploy → Manage deployments → Edit → Version: New version).");
        return;
      }
      if (!stats || stats.ok === false) {
        console.warn("community results: endpoint error —", stats && stats.error);
        renderUnavailable(`the stats endpoint returned an error: <code>${esc(stats && stats.error || "empty response")}</code>`);
        return;
      }
      render(stats);
    } catch (ex) {
      console.warn("community results unavailable:", ex && ex.message ? ex.message : ex);
      renderUnavailable();
    }
  }

  // Deterministic sample so the section can be designed and previewed without
  // any responses in the sheet (index.html?demo, or no endpoint configured).
  function sampleStats() {
    const count = 42;
    const seeded = (i) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    const products = PRODUCTS.map((p, i) => {
      const picks = Math.round(6 + seeded(i + 1) * 28);
      const tierIdx = Math.floor(seeded(i + 7) * 3);
      const tier = TIERS[tierIdx].label;
      return { productId: p.id, product: p.name, size: p.size, picks, firsts: Math.round(seeded(i + 3) * picks * 0.45), pickShare: pct(picks, count), topTier: tier, avgWouldPay: Math.round(p.prices[TIERS[tierIdx].id] * (0.8 + seeded(i + 5) * 0.3) / 500) * 500, avgPriceRating: 3.4 };
    }).sort((a, b) => (b.picks - a.picks) || (b.firsts - a.firsts));
    return {
      ok: true, generatedAt: new Date().toISOString(), count, interested: 19, interestedInFunding: 27, avgUnitsSelected: 4.6,
      orgTypes: { "High school": 24, "College / University": 7, "Parks & Recreation / Municipality": 4, "Youth league / Club": 3, "Private facility / Business": 2, "Professional / Semi-pro team": 1, "Other": 1 },
      roles: { "Athletic Director": 29, "Facilities / Operations Manager": 5, "Coach": 4, "Administrator / Principal / Superintendent": 3, "Booster club / Fundraising": 1 },
      tiers: { Economy: 61, Standard: 98, Luxury: 34 },
      priceRatings: { "Much too low": 4, "A little low": 21, "About right": 92, "A little high": 58, "Much too high": 18 },
      products,
      snippets: [
        { text: "A press box stacked on top of a concession stand would solve two problems at our stadium with one crane day.", kind: "idea", orgType: "High school", role: "Athletic Director" },
        { text: "We need a real locker room with showers for visiting teams. Right now they change on the bus.", kind: "wish", orgType: "High school", role: "Athletic Director" },
        { text: "A site-built press box was quoted at $38k, so this is close, but I'd want the window included.", kind: "price", orgType: "High school", role: "Athletic Director", product: "Press Box, 20 ft" },
      ],
    };
  }

  window.CommunityResults = { render, load, prefetch, sampleStats, renderUnavailable };
})();
