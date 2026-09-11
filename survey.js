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

  // ── State ──────────────────────────────────────────────────────────────────
  const state = {
    step: 1,
    selected: [],   // product ids, in ranked order
    ratings: {},    // id -> { tier, priceRating, wouldPay }
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
        if (el.closest("#product-grid, #pricing-list")) return; // rendered separately
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
      <label class="product-card">
        <input type="checkbox" name="products" value="${p.id}" ${state.selected.includes(p.id) ? "checked" : ""}>
        <span class="pname">${p.name}</span>
        <span class="psize">${p.size}</span>${p.note ? `<span class="ptag">${p.note}</span>` : ""}
        <span class="pprice">from <strong>${fmt(p.prices.economy)}</strong></span>
      </label>`).join("");

    grid.addEventListener("change", (e) => {
      if (e.target.name !== "products") return;
      const id = e.target.value;
      if (e.target.checked) { if (!state.selected.includes(id)) state.selected.push(id); }
      else { state.selected = state.selected.filter((x) => x !== id); delete state.ratings[id]; }
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
          <span class="rank-name">${p.name}<small>${p.size}${p.note ? " · " + p.note : ""}</small></span>
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
          <h3><span class="badge">#${i + 1}</span>${p.name} <span class="opt">· ${p.size}${p.note ? " · " + p.note : ""}</span></h3>
          <p class="sub">Which tier would you most likely choose for this unit?</p>

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
        </div>`;
    }).join("");

    // Show the price-vs-list comparison hint as they type.
    state.selected.forEach((id) => updatePayHint(id));
  }

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
    }
    block.classList.remove("invalid");
    updatePayHint(id);
    saveDraft();
  });

  // ── Step 6: review ─────────────────────────────────────────────────────────
  function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function val(name) { const el = form.elements[name]; return el ? (el.value || "") : ""; }
  function checked(name) { return $$(`input[name="${name}"]:checked`, form).map((el) => el.value); }

  function renderReview() {
    const priceLabel = (v) => (PRICE_SCALE.find((s) => s.value === Number(v)) || {}).label || "—";
    const rows = state.selected.map((id, i) => {
      const p = productById(id); const r = state.ratings[id] || {};
      const tier = TIERS.find((t) => t.id === r.tier);
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(productLabel(p))}</td>
        <td>${tier ? `${tier.label}<br><span class="opt">${fmt(p.prices[r.tier])}</span>` : "—"}</td>
        <td>${esc(priceLabel(r.priceRating))}</td>
        <td>${r.wouldPay != null ? fmt(r.wouldPay) : "—"}</td>
      </tr>`;
    }).join("");

    const dl = (pairs) => `<dl class="review-grid">${pairs.filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;

    $("#review").innerHTML = `
      <div class="review-section"><h3>About you <button type="button" class="edit" data-goto="1">Edit</button></h3>
        ${dl([["Organization type", val("orgType")], ["Role", val("role")], ["Organization", val("orgName")], ["Name", val("name")], ["Email", val("email")]])}
      </div>
      <div class="review-section"><h3>Units, priority &amp; pricing <button type="button" class="edit" data-goto="3">Edit order</button><button type="button" class="edit" data-goto="4">Edit pricing</button></h3>
        <div class="review-wrap"><table class="review-table">
          <thead><tr><th>#</th><th>Unit</th><th>Tier</th><th>Price feels</th><th>Would pay</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>
      <div class="review-section"><h3>Gaps &amp; timing <button type="button" class="edit" data-goto="5">Edit</button></h3>
        ${dl([["Configurations", checked("configs").join(", ")], ["Missing models", val("missingModels")], ["Unmet needs", val("unmetNeeds")], ["Timeline", val("timeline")], ["Budget", val("budget")], ["Comments", val("comments")]])}
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
      const email = $("#email"); const emailOk = !email.value || email.checkValidity(); email.classList.toggle("invalid", !emailOk); if (!emailOk) bad(email);
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
    if (step === 5) {
      const cfgOk = checked("configs").length > 0; showErr("#err-configs", !cfgOk); if (!cfgOk) bad($("#err-configs"));
      const tlOk = !!val("timeline"); showErr("#err-timeline", !tlOk); $("#timeline").classList.toggle("invalid", !tlOk); if (!tlOk) bad($("#timeline"));
    }
    if (!ok && firstBad) firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
    return ok;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  function goTo(step, opts) {
    state.step = step;
    if (step === 3) renderRanking();
    if (step === 4) renderPricing();
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

  btnNext.addEventListener("click", () => { if (validateStep(state.step)) goTo(Math.min(state.step + 1, TOTAL_STEPS)); });
  btnBack.addEventListener("click", () => goTo(Math.max(state.step - 1, 1)));
  form.addEventListener("input", (e) => { if (!e.target.closest("#pricing-list")) saveDraft(); });
  form.addEventListener("change", (e) => {
    if (e.target.name === "orgType") showErr("#err-orgType", false);
    if (e.target.name === "configs") showErr("#err-configs", false);
    if (e.target.id === "role" || e.target.id === "timeline") { e.target.classList.remove("invalid"); showErr(`#err-${e.target.id}`, false); }
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
      name: val("name").trim(),
      email: val("email").trim(),
      configs: checked("configs"),
      missingModels: val("missingModels").trim(),
      unmetNeeds: val("unmetNeeds").trim(),
      timeline: val("timeline"),
      budget: val("budget"),
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
