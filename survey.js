(function () {
  "use strict";

  const CONFIG = window.SURVEY_CONFIG || {};
  const PRODUCTS = window.PRODUCTS || [];
  const TIERS = window.TIERS || [];
  const PRICE_SCALE = window.PRICE_SCALE || [];
  const TOTAL_STEPS = 6;
  const DRAFT_KEY = "facility-survey-draft-v1";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const fmt = (n) => "$" + Number(n).toLocaleString("en-US");
  const productById = (id) => PRODUCTS.find((p) => p.id === id);
  const productLabel = (p) => `${p.name} (${p.size})`;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Photos live at images/<id>-<n>.jpg (full) and images/thumb/<id>-<n>.jpg; config lists a caption per photo.
  const photos = (p) => (p.images || []).map((caption, i) => ({ src: `images/${p.id}-${i + 1}.jpg`, thumb: `images/thumb/${p.id}-${i + 1}.jpg`, caption }));
  const heroSrc = (p) => `images/thumb/${p.id}-1.jpg`;
  const MAX_STRIP = 3; // thumbnails shown per product before "+N" — keeps every unit visually equal

  // ── State ──────────────────────────────────────────────────────────────────
  const state = {
    step: 1,
    selected: [],   // product ids, in ranked order
    ratings: {},    // id -> { tier, priceRating, wouldPay, priceNotes, changes: [labels], otherChange }
  };

  const form = $("#survey");
  const btnBack = $("#btn-back");
  const btnNext = $("#btn-next");
  const btnSubmit = $("#btn-submit");

  // ── Draft persistence (so a refresh doesn't lose answers) ─────────────────
  function saveDraft() {
    try {
      const fields = {};
      $$("input[name], select[name], textarea[name]", form).forEach((el) => {
        if (el.type === "radio") { if (el.checked) fields[el.name] = el.value; }
        else if (el.type === "checkbox") { (fields[el.name] = fields[el.name] || []); if (el.checked) fields[el.name].push(el.value); }
        else fields[el.name] = el.value;
      });
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step: state.step, selected: state.selected, ratings: state.ratings, fields }));
    } catch (_) { /* storage unavailable — fine */ }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      state.selected = (d.selected || []).filter(productById);
      state.ratings = d.ratings || {};
      state.step = Math.min(Math.max(d.step || 1, 1), TOTAL_STEPS);
      const f = d.fields || {};
      $$("input[name], select[name], textarea[name]", form).forEach((el) => {
        if (el.closest("#product-grid, #pricing-list, #changes-list")) return; // rendered separately
        if (el.type === "radio") el.checked = f[el.name] === el.value;
        else if (el.type === "checkbox") el.checked = Array.isArray(f[el.name]) && f[el.name].includes(el.value);
        else if (f[el.name] !== undefined) el.value = f[el.name];
      });
    } catch (_) { /* ignore corrupt draft */ }
  }

  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (_) {} }

  // ── Step 2: product grid ───────────────────────────────────────────────────
  function renderProducts() {
    const grid = $("#product-grid");
    grid.innerHTML = PRODUCTS.map((p) => `
      <div class="product-card ${state.selected.includes(p.id) ? "selected" : ""}" data-id="${p.id}">
        <button type="button" class="pphoto" data-lightbox="${p.id}" data-index="0" aria-label="View photo of ${esc(p.name)}">
          <img src="${heroSrc(p)}" alt="${esc(p.name)}, ${esc(p.size)}" loading="lazy" width="520" height="340">
          <span class="zoom" aria-hidden="true">&#x2922;</span>
        </button>
        <label class="pbody">
          <input type="checkbox" name="products" value="${p.id}" ${state.selected.includes(p.id) ? "checked" : ""}>
          <span class="ptext">
            <span class="pname">${esc(p.name)}</span>
            <span class="pmeta"><span class="psize">${esc(p.size)}</span>${p.note ? `<span class="ptag">${esc(p.note)}</span>` : ""}</span>
            <span class="pdesc">${esc(p.desc || "")}</span>
            <span class="pprice">from <strong>${fmt(p.prices.economy)}</strong></span>
          </span>
        </label>
      </div>`).join("");

    grid.addEventListener("change", (e) => {
      if (e.target.name !== "products") return;
      const id = e.target.value;
      if (e.target.checked) { if (!state.selected.includes(id)) state.selected.push(id); }
      else { state.selected = state.selected.filter((x) => x !== id); delete state.ratings[id]; }
      e.target.closest(".product-card").classList.toggle("selected", e.target.checked);
      $("#err-products").hidden = state.selected.length > 0;
      saveDraft();
    });
  }

  // ── Step 3: ranking ────────────────────────────────────────────────────────
  function renderRanking() {
    const list = $("#rank-list");
    list.innerHTML = state.selected.map((id, i) => {
      const p = productById(id);
      return `
        <li class="rank-item" data-id="${id}">
          <span class="rank-num">${i + 1}</span>
          <img class="rank-thumb" src="${heroSrc(p)}" alt="" loading="lazy">
          <span class="rank-name">${esc(p.name)}<small>${esc(p.size)}${p.note ? " · " + esc(p.note) : ""}</small></span>
          <span class="rank-controls">
            <button type="button" data-move="-1" aria-label="Move ${p.name} up" ${i === 0 ? "disabled" : ""}>▲</button>
            <button type="button" data-move="1" aria-label="Move ${p.name} down" ${i === state.selected.length - 1 ? "disabled" : ""}>▼</button>
          </span>
        </li>`;
    }).join("");
  }

  $("#rank-list").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-move]");
    if (!btn) return;
    const id = btn.closest(".rank-item").dataset.id;
    const from = state.selected.indexOf(id);
    const to = from + Number(btn.dataset.move);
    if (to < 0 || to >= state.selected.length) return;
    [state.selected[from], state.selected[to]] = [state.selected[to], state.selected[from]];
    renderRanking();
    // keep focus on the same product's button after re-render
    const again = $(`.rank-item[data-id="${id}"] button[data-move="${btn.dataset.move}"]`);
    if (again && !again.disabled) again.focus();
    saveDraft();
  });

  // ── Step 4: per-product pricing ────────────────────────────────────────────
  function renderPricing() {
    const wrap = $("#pricing-list");
    wrap.innerHTML = state.selected.map((id, i) => {
      const p = productById(id);
      const r = state.ratings[id] || {};
      return `
        <div class="price-block" data-id="${id}">
          <div class="pb-head">
            <div class="pb-gallery">
              <button type="button" class="pb-hero" data-lightbox="${id}" data-index="0" aria-label="View photos of ${esc(p.name)}">
                <img src="${heroSrc(p)}" alt="${esc(p.name)}" loading="lazy">
              </button>
              ${galleryStrip(p)}
            </div>
            <div class="pb-text">
              <h3><span class="badge">#${i + 1}</span>${esc(p.name)} <span class="opt">· ${esc(p.size)}${p.note ? " · " + esc(p.note) : ""}</span></h3>
              <p class="pb-desc">${esc(p.desc || "")}</p>
              ${p.drivers ? `<p class="pb-drivers"><strong>What moves the price between tiers:</strong> ${esc(p.drivers)}</p>` : ""}
            </div>
          </div>
          <p class="sub q">Which tier would you most likely choose for this unit?</p>

          <div class="tier-options" role="radiogroup" aria-label="Tier for ${p.name}">
            ${TIERS.map((t) => `
              <label class="tier-option">
                <input type="radio" name="tier-${id}" value="${t.id}" ${r.tier === t.id ? "checked" : ""}>
                <span class="tname">${t.label}</span>
                <span class="tprice">${fmt(p.prices[t.id])}</span>
                <span class="tdesc">${t.desc}</span>
              </label>`).join("")}
          </div>
          <p class="error err-tier" hidden>Please pick a tier.</p>

          <p class="q">How does the <span class="tier-name">${r.tier ? TIERS.find((t) => t.id === r.tier).label : "selected tier's"}</span> price feel to you?</p>
          <div class="scale" role="radiogroup" aria-label="Price rating for ${p.name}">
            ${PRICE_SCALE.map((s) => `
              <label><input type="radio" name="price-${id}" value="${s.value}" ${Number(r.priceRating) === s.value ? "checked" : ""}>${s.label}</label>`).join("")}
          </div>
          <p class="error err-price" hidden>Please rate the price.</p>

          <p class="q"><label for="pay-${id}" style="display:inline;margin:0">How much would you realistically pay for this unit, at the tier you chose?</label></p>
          <div class="money">
            <input type="number" id="pay-${id}" name="pay-${id}" min="0" step="500" inputmode="numeric" placeholder="e.g. 45000" value="${r.wouldPay ?? ""}">
          </div>
          <p class="money-hint"></p>
          <p class="error err-pay" hidden>Please enter an amount (whole dollars).</p>

          <p class="q"><label for="notes-${id}" style="display:inline;margin:0">Why did you rate the price this way? <span class="opt">(optional)</span></label></p>
          <textarea id="notes-${id}" name="notes-${id}" rows="2" class="price-notes" placeholder="e.g. compared to a site-built option, what you'd expect the tier to include, budget constraints…">${esc(r.priceNotes || "")}</textarea>
        </div>`;
    }).join("");

    // Show the price-vs-list comparison hint as they type.
    state.selected.forEach((id) => updatePayHint(id));
  }

  function galleryStrip(p) {
    const list = photos(p).slice(1); // hero already shown
    if (!list.length) return "";
    const shown = list.slice(0, MAX_STRIP);
    const extra = list.length - shown.length;
    return `<div class="pb-strip">${shown.map((ph, k) => `
      <button type="button" data-lightbox="${p.id}" data-index="${k + 1}" aria-label="${esc(ph.caption)}">
        <img src="${ph.thumb}" alt="${esc(ph.caption)}" loading="lazy">
        ${extra && k === shown.length - 1 ? `<span class="more">+${extra}</span>` : ""}
        <span class="cap">${esc(ph.caption)}</span>
      </button>`).join("")}</div>`;
  }

  // ── Lightbox ───────────────────────────────────────────────────────────────
  const lb = { el: $("#lightbox"), img: $("#lb-img"), cap: $("#lb-cap"), list: [], i: 0, opener: null, p: null };
  function openLightbox(pid, index) {
    const p = productById(pid); if (!p) return;
    lb.p = p; lb.list = photos(p); lb.i = Math.min(index, lb.list.length - 1); lb.opener = document.activeElement;
    showLightbox(); lb.el.hidden = false; document.body.classList.add("lb-open"); $("#lb-close").focus();
  }
  function showLightbox() {
    const ph = lb.list[lb.i]; const p = lb.p;
    lb.img.src = ph.src; lb.img.alt = `${p.name} — ${ph.caption}`;
    lb.cap.textContent = `${p.name} (${p.size}) — ${ph.caption}${lb.list.length > 1 ? ` · ${lb.i + 1} of ${lb.list.length}` : ""}`;
    $("#lb-prev").hidden = $("#lb-next").hidden = lb.list.length < 2;
  }
  function closeLightbox() { lb.el.hidden = true; document.body.classList.remove("lb-open"); lb.img.removeAttribute("src"); if (lb.opener) lb.opener.focus(); }
  function stepLightbox(d) { lb.i = (lb.i + d + lb.list.length) % lb.list.length; showLightbox(); }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lightbox]");
    if (b) { e.preventDefault(); openLightbox(b.dataset.lightbox, Number(b.dataset.index || 0)); }
  });
  $("#lb-close").addEventListener("click", closeLightbox);
  $("#lb-prev").addEventListener("click", () => stepLightbox(-1));
  $("#lb-next").addEventListener("click", () => stepLightbox(1));
  lb.el.addEventListener("click", (e) => { if (e.target === lb.el) closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (lb.el.hidden) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") stepLightbox(-1);
    else if (e.key === "ArrowRight") stepLightbox(1);
  });

  // ── Pricing notes (what's included / excluded) ─────────────────────────────
  (function renderPricingNotes() {
    const n = window.PRICING_NOTES; const body = $("#pricing-notes-body");
    if (!n || !body) { const d = $("#pricing-notes"); if (d) d.hidden = true; return; }
    body.innerHTML = `
      <p><strong>Included:</strong> ${esc(n.includes)}</p>
      <p><strong>Not included:</strong> ${esc(n.excludes)}</p>
      <p>${esc(n.packages)} ${esc(n.dated)}</p>`;
  })();

  function updatePayHint(id) {
    const block = $(`.price-block[data-id="${id}"]`);
    if (!block) return;
    const hint = $(".money-hint", block);
    const r = state.ratings[id] || {};
    const p = productById(id);
    if (!r.tier || !r.wouldPay) { hint.textContent = ""; hint.classList.remove("warn"); return; }
    const list = p.prices[r.tier];
    const diff = Math.round(((r.wouldPay - list) / list) * 100);
    const tierLabel = TIERS.find((t) => t.id === r.tier).label;
    if (Math.abs(diff) < 3) hint.textContent = `That's right at our ${tierLabel} price of ${fmt(list)}.`;
    else hint.textContent = `That's ${Math.abs(diff)}% ${diff < 0 ? "below" : "above"} our ${tierLabel} price of ${fmt(list)}.`;
    hint.classList.toggle("warn", diff <= -25);
  }

  $("#pricing-list").addEventListener("input", (e) => {
    const block = e.target.closest(".price-block");
    if (!block) return;
    const id = block.dataset.id;
    const r = (state.ratings[id] = state.ratings[id] || {});
    if (e.target.name === `tier-${id}`) {
      r.tier = e.target.value;
      $(".tier-name", block).textContent = TIERS.find((t) => t.id === r.tier).label;
      $(".err-tier", block).hidden = true;
    } else if (e.target.name === `price-${id}`) {
      r.priceRating = Number(e.target.value);
      $(".err-price", block).hidden = true;
    } else if (e.target.name === `pay-${id}`) {
      r.wouldPay = e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value)));
      $(".err-pay", block).hidden = true;
    } else if (e.target.name === `notes-${id}`) {
      r.priceNotes = e.target.value;
    }
    block.classList.remove("invalid");
    updatePayHint(id);
    saveDraft();
  });

  // ── Step 5: suggested changes per product ──────────────────────────────────
  // Which variant options make sense for a given unit. A 20 ft unit is only
  // offered a 40 ft version (and vice versa); stacking is skipped for units that
  // are already 2-story, already have a stacked sibling, or can't sensibly stack.
  function variantOptions(p) {
    const opts = [];
    if (p.size === "40 ft") opts.push({ id: "size20", label: "A 20 ft version" });
    if (p.size === "20 ft") opts.push({ id: "size40", label: "A 40 ft version" });
    const stackedSibling = PRODUCTS.find((q) => q !== p && q.name.startsWith(p.name) && q.note === "2-story");
    if (p.note !== "2-story" && !p.noStacked && !stackedSibling) opts.push({ id: "stacked", label: "A 2-story / stacked version" });
    if (stackedSibling && state.selected.indexOf(stackedSibling.id) === -1) opts.push({ id: "stacked-existing", label: `Interested in the stacked version (${fmt(stackedSibling.prices.economy)}+)` });
    if (p.note === "2-story") {
      const single = PRODUCTS.find((q) => q !== p && p.name.startsWith(q.name) && q.note !== "2-story");
      if (!single) opts.push({ id: "single", label: "A single-level version" });
      else if (state.selected.indexOf(single.id) === -1) opts.push({ id: "single-existing", label: `Interested in the single-level version (${fmt(single.prices.economy)}+)` });
    }
    (p.extraOptions || []).forEach((label, i) => opts.push({ id: `extra${i}`, label }));
    opts.push({ id: "none", label: "No changes — it works as is" });
    return opts;
  }

  function renderChanges() {
    const wrap = $("#changes-list");
    wrap.innerHTML = state.selected.map((id, i) => {
      const p = productById(id); const r = state.ratings[id] || {};
      const chosen = r.changes || [];
      return `
        <div class="change-block" data-id="${id}">
          <div class="cb-head">
            <img src="${heroSrc(p)}" alt="" loading="lazy">
            <h3><span class="badge">#${i + 1}</span>${esc(p.name)} <span class="opt">· ${esc(p.size)}${p.note ? " · " + esc(p.note) : ""}</span></h3>
          </div>
          <p class="q">What changes would you recommend for this unit?</p>
          <div class="choice-grid compact">
            ${variantOptions(p).map((o) => `
              <label class="choice"><input type="checkbox" name="chg-${id}" value="${esc(o.label)}" data-opt="${o.id}" ${chosen.includes(o.label) ? "checked" : ""}><span>${esc(o.label)}</span></label>`).join("")}
          </div>
          <label for="other-${id}" class="other-label">Other changes <span class="opt">(optional)</span></label>
          <input type="text" id="other-${id}" name="other-${id}" placeholder="e.g. add a restroom, more seating, different layout, ADA ramp, branding…" value="${esc(r.otherChange || "")}">
        </div>`;
    }).join("");
  }

  $("#changes-list").addEventListener("input", (e) => {
    const block = e.target.closest(".change-block"); if (!block) return;
    const id = block.dataset.id; const r = (state.ratings[id] = state.ratings[id] || {});
    if (e.target.name === `chg-${id}`) {
      // "No changes" is exclusive with the other options.
      if (e.target.dataset.opt === "none" && e.target.checked) $$(`input[name="chg-${id}"]`, block).forEach((el) => { if (el !== e.target) el.checked = false; });
      else if (e.target.checked) { const none = $(`input[name="chg-${id}"][data-opt="none"]`, block); if (none) none.checked = false; }
      r.changes = $$(`input[name="chg-${id}"]:checked`, block).map((el) => el.value);
    } else if (e.target.name === `other-${id}`) {
      r.otherChange = e.target.value;
    }
    saveDraft();
  });

  // "Interested in acquiring" reveals timeline / budget / email.
  const interested = $("#interested"), interestPanel = $("#interest-panel");
  function syncInterest() {
    interestPanel.hidden = !interested.checked;
    if (!interested.checked) ["#err-name", "#err-email", "#err-timeline", "#err-budget"].forEach((id) => showErr(id, false));
  }
  interested.addEventListener("change", syncInterest);

  // ── Step 6: review ─────────────────────────────────────────────────────────
  function val(name) { const el = form.elements[name]; return el ? (el.value || "") : ""; }
  function checked(name) { return $$(`input[name="${name}"]:checked`, form).map((el) => el.value); }

  function renderReview() {
    const priceLabel = (v) => (PRICE_SCALE.find((s) => s.value === Number(v)) || {}).label || "—";
    const rows = state.selected.map((id, i) => {
      const p = productById(id); const r = state.ratings[id] || {};
      const tier = TIERS.find((t) => t.id === r.tier);
      const changes = [...(r.changes || []), r.otherChange].filter(Boolean).join("; ");
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(productLabel(p))}</td>
        <td>${tier ? `${tier.label}<br><span class="opt">${fmt(p.prices[r.tier])}</span>` : "—"}</td>
        <td>${esc(priceLabel(r.priceRating))}${r.priceNotes ? `<br><span class="opt">${esc(r.priceNotes)}</span>` : ""}</td>
        <td>${r.wouldPay != null ? fmt(r.wouldPay) : "—"}</td>
        <td>${changes ? esc(changes) : "—"}</td>
      </tr>`;
    }).join("");

    const dl = (pairs) => `<dl class="review-grid">${pairs.filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;

    $("#review").innerHTML = `
      <div class="review-section"><h3>About you <button type="button" class="edit" data-goto="1">Edit</button></h3>
        ${dl([["Organization type", val("orgType")], ["Role", val("role")], ["Organization", val("orgName")]])}
      </div>
      <div class="review-section"><h3>Units, priority &amp; pricing <button type="button" class="edit" data-goto="3">Edit order</button><button type="button" class="edit" data-goto="4">Edit pricing</button></h3>
        <div class="review-wrap"><table class="review-table">
          <thead><tr><th>#</th><th>Unit</th><th>Tier</th><th>Price feels</th><th>Would pay</th><th>Suggested changes</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>
      <div class="review-section"><h3>Ideas &amp; interest <button type="button" class="edit" data-goto="5">Edit</button></h3>
        ${dl([["Units we don't offer", val("missingModels")], ["Cargotecture ideas", val("cargoIdeas")], ["Interested in acquiring", interested.checked ? "Yes" : "No"],
              ["Name", interested.checked ? val("name") : ""], ["Email", interested.checked ? val("email") : ""],
              ["Timeline", interested.checked ? val("timeline") : ""], ["Budget", interested.checked ? val("budget") : ""], ["Comments", val("comments")]])}
      </div>`;
  }

  $("#review").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-goto]");
    if (b) goTo(Number(b.dataset.goto));
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  function showErr(id, show) { const el = $(id); if (el) el.hidden = !show; }

  function validateStep(step) {
    let ok = true;
    let firstBad = null;
    const bad = (el) => { ok = false; if (!firstBad) firstBad = el; };

    if (step === 1) {
      const orgOk = checked("orgType").length > 0; showErr("#err-orgType", !orgOk); if (!orgOk) bad($("#err-orgType"));
      const roleOk = !!val("role"); showErr("#err-role", !roleOk); $("#role").classList.toggle("invalid", !roleOk); if (!roleOk) bad($("#role"));
    }
    if (step === 2) {
      const selOk = state.selected.length > 0; showErr("#err-products", !selOk); if (!selOk) bad($("#err-products"));
    }
    if (step === 4) {
      state.selected.forEach((id) => {
        const r = state.ratings[id] || {}; const block = $(`.price-block[data-id="${id}"]`);
        const tierOk = !!r.tier, priceOk = !!r.priceRating, payOk = r.wouldPay != null && r.wouldPay >= 0;
        $(".err-tier", block).hidden = tierOk; $(".err-price", block).hidden = priceOk; $(".err-pay", block).hidden = payOk;
        block.classList.toggle("invalid", !(tierOk && priceOk && payOk));
        if (!(tierOk && priceOk && payOk)) bad(block);
      });
    }
    if (step === 5 && interested.checked) {
      const req = (sel, errSel, okFn) => {
        const el = $(sel); const ok = okFn(el);
        showErr(errSel, !ok); el.classList.toggle("invalid", !ok); if (!ok) bad(el);
      };
      req("#name", "#err-name", (el) => el.value.trim().length > 0);
      req("#email", "#err-email", (el) => el.value.trim().length > 0 && el.checkValidity());
      req("#timeline", "#err-timeline", (el) => !!el.value);
      req("#budget", "#err-budget", (el) => !!el.value);
    }
    if (!ok && firstBad) firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
    return ok;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  function goTo(step, opts) {
    state.step = step;
    if (step === 3) renderRanking();
    if (step === 4) renderPricing();
    if (step === 5) { renderChanges(); syncInterest(); }
    if (step === 6) renderReview();

    $$(".step", form).forEach((s) => { s.hidden = Number(s.dataset.step) !== step; });
    $$("#progress-list li").forEach((li) => {
      const n = Number(li.dataset.step);
      li.classList.toggle("active", n === step);
      li.classList.toggle("done", n < step);
    });
    btnBack.style.visibility = step === 1 ? "hidden" : "visible";
    btnNext.hidden = step === TOTAL_STEPS;
    btnSubmit.hidden = step !== TOTAL_STEPS;
    if (!(opts && opts.noScroll)) window.scrollTo({ top: $(".progress").offsetTop - 12, behavior: "smooth" });
    saveDraft();
  }

  btnNext.addEventListener("click", () => {
    const navErr = $("#err-nav"); navErr.hidden = true;
    try {
      if (validateStep(state.step)) goTo(Math.min(state.step + 1, TOTAL_STEPS));
    } catch (ex) {
      // Surface the problem instead of a button that appears to do nothing.
      navErr.textContent = `Something went wrong moving to the next step (${ex && ex.message ? ex.message : ex}). Please try again or refresh the page.`;
      navErr.hidden = false;
      console.error(ex);
    }
  });
  btnBack.addEventListener("click", () => goTo(Math.max(state.step - 1, 1)));
  form.addEventListener("input", (e) => { if (!e.target.closest("#pricing-list, #changes-list")) saveDraft(); });
  form.addEventListener("change", (e) => {
    if (e.target.name === "orgType") showErr("#err-orgType", false);
    if (["role", "timeline", "budget", "name", "email"].includes(e.target.id)) { e.target.classList.remove("invalid"); showErr(`#err-${e.target.id}`, false); }
  });
  // Enter in a text field shouldn't submit the whole form early.
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && state.step !== TOTAL_STEPS) { e.preventDefault(); btnNext.click(); }
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  function buildPayload() {
    const responseId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      responseId,
      submittedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      orgType: val("orgType"),
      role: val("role"),
      orgName: val("orgName").trim(),
      name: interested.checked ? val("name").trim() : "",
      email: interested.checked ? val("email").trim() : "",
      missingModels: val("missingModels").trim(),
      cargoIdeas: val("cargoIdeas").trim(),
      interested: interested.checked,
      timeline: interested.checked ? val("timeline") : "",
      budget: interested.checked ? val("budget") : "",
      comments: val("comments").trim(),
      products: state.selected.map((id, i) => {
        const p = productById(id); const r = state.ratings[id] || {};
        const tier = TIERS.find((t) => t.id === r.tier);
        return {
          rank: i + 1,
          productId: id,
          product: p.name,
          size: p.size,
          tier: tier ? tier.label : "",
          listPrice: tier ? p.prices[r.tier] : null,
          priceRating: r.priceRating ?? null,
          priceRatingLabel: (PRICE_SCALE.find((s) => s.value === Number(r.priceRating)) || {}).label || "",
          wouldPay: r.wouldPay ?? null,
          priceNotes: (r.priceNotes || "").trim(),
          changes: r.changes || [],
          otherChange: (r.otherChange || "").trim(),
        };
      }),
    };
  }

  async function submit(payload) {
    const endpoint = (CONFIG.SHEETS_ENDPOINT || "").trim();
    if (!endpoint) return { sent: false, reason: "no-endpoint" };
    // Apps Script web apps don't return CORS headers, so we post opaque
    // (no-cors) with a text/plain body — the script still receives the JSON.
    await fetch(endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    return { sent: true };
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    // Re-validate everything in case a draft was restored with gaps.
    for (const s of [1, 2, 4, 5]) { if (!validateStep(s)) { goTo(s); return; } }

    const err = $("#err-submit"); err.hidden = true;
    btnSubmit.disabled = true; btnSubmit.textContent = "Submitting…";
    const payload = buildPayload();
    try {
      const result = await submit(payload);
      form.hidden = true; $(".progress").hidden = true;
      const thanks = $("#thanks"); thanks.hidden = false;
      $("#thanks-id").textContent = `Reference: ${payload.responseId}`;
      if (!result.sent) {
        thanks.insertAdjacentHTML("beforeend", `<div class="warn-box"><strong>Setup note (visible to the site owner):</strong> no Google Sheets endpoint is configured in <code>config.js</code>, so this response was not saved anywhere. See README.md to connect the sheet.</div>`);
        try { localStorage.setItem("facility-survey-unsent-" + payload.responseId, JSON.stringify(payload)); } catch (_) {}
      }
      clearDraft();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (ex) {
      err.textContent = "Sorry — we couldn't send your response. Check your connection and try again.";
      err.hidden = false;
      btnSubmit.disabled = false; btnSubmit.textContent = "Submit survey";
    }
  });

  // ── Init ───────────────────────────────────────────────────────────────────
  loadDraft();
  renderProducts();
  goTo(state.step, { noScroll: true });
})();
