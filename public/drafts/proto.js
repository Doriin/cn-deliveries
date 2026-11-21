/* Behaviour shared by the interactive drafts (11-13). Each draft supplies its own markup and look;
   this file only finds elements by data-attributes and makes them work. Sample data, nothing is saved. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = (n) => n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  /* Animate between two states of the page when the browser can; the change itself never waits on the animation.
     `run` must be safe to call twice. */
  function vt(run) {
    if (!document.startViewTransition || reduce) return run();
    let ran = false;
    const once = () => { ran = true; run(); };
    try {
      const t = document.startViewTransition(once);
      // a newer change may cut this animation short; that is expected, not an error
      t.ready?.catch(() => {}); t.finished?.catch(() => {}); t.updateCallbackDone?.catch(() => {});
    } catch { return run(); }
    setTimeout(() => { if (!ran) run(); }, 300);
  }

  const parcels = [
    { n: "0005", who: "Igor Munteanu", tel: "+373 79 111 000", city: "Durlești", addr: "str. Codrilor 5", client: "Demo Shop SRL", courier: "Ion", cod: 915, stage: "bad", time: "15:32", kg: "3,2" },
    { n: "0007", who: "Natalia Rusu", tel: "+373 60 123 123", city: "Ciocana", addr: "bd. Mircea cel Bătrân 30", client: "Demo Shop SRL", courier: "Ion", cod: 250, stage: "road", time: "14:48", kg: "2" },
    { n: "0011", who: "Tipografia Nord", tel: "+373 22 444 555", city: "Râșcani", addr: "str. Kiev 8/1", client: "Demo Print Agency", courier: "Vasile", cod: 0, stage: "road", time: "15:05", kg: "12" },
    { n: "0009", who: "Olga Moraru", tel: "+373 78 123 456", city: "Stăuceni", addr: "str. Unirii 7", client: "Demo Shop SRL", courier: "Ion", cod: 0, stage: "pickup", time: "15:30", kg: "2" },
    { n: "0006", who: "Agenția Beta", tel: "+373 22 333 444", city: "Bălți", addr: "str. Independenței 1", client: "Demo Print Agency", courier: null, cod: 0, stage: "depot", time: "09:15", kg: "8,5" },
    { n: "0012", who: "Doina Lungu", tel: "+373 69 222 333", city: "Ialoveni", addr: "str. Alexandru cel Bun 3", client: "Demo Shop SRL", courier: null, cod: 390, stage: "depot", time: "10:40", kg: "1" },
    { n: "0008", who: "Victor Ceban", tel: "+373 69 777 888", city: "Botanica", addr: "bd. Dacia 44, ap. 9", client: "Demo Shop SRL", courier: "Ion", cod: 640, stage: "done", time: "15:25", kg: "7,5" },
    { n: "0004", who: "Elena Ciobanu", tel: "+373 69 555 666", city: "Botanica", addr: "str. Dacia 23, ap. 14", client: "Demo Shop SRL", courier: "Ion", cod: 480, stage: "done", time: "14:50", kg: "3" },
    { n: "0002", who: "Andrei Rusu", tel: "+373 78 111 222", city: "Centru", addr: "bd. Ștefan cel Mare 100", client: "Demo Shop SRL", courier: "Vasile", cod: 1250.5, stage: "done", time: "14:34", kg: "4" },
    { n: "0003", who: "Ana Botnaru", tel: "+373 68 444 111", city: "Buiucani", addr: "str. Alba Iulia 75", client: "Demo Print Agency", courier: "Ion", cod: 0, stage: "done", time: "13:40", kg: "0,5" },
    { n: "0010", who: "Cafeneaua Tucano", tel: "+373 22 888 777", city: "Centru", addr: "str. Pușkin 22", client: "Demo Print Agency", courier: "Vasile", cod: 0, stage: "done", time: "13:02", kg: "6" },
    { n: "0001", who: "Maria Popescu", tel: "+373 69 123 456", city: "Stăuceni", addr: "str. Livezilor 12", client: "Demo Shop SRL", courier: "Ion", cod: 350, stage: "done", time: "12:10", kg: "5,5" },
  ];
  const STAGE = { bad: "Nu răspunde", road: "În livrare", pickup: "De ridicat", depot: "În depozit", done: "Livrat" };
  const byId = (n) => parcels.find((p) => p.n === n);
  const state = { tab: "all", cashIon: 1470, ionDone: 4 };
  let booting = true; // the first paint shows final values, nothing counts up on load

  /* ---------- numbers that change tick to their new value ---------- */
  function roll(el, to, { decimals = 2, ms = 650 } = {}) {
    if (!el) return;
    const from = parseFloat(el.dataset.v ?? "0");
    el.dataset.v = to;
    const show = (v) => (el.textContent = decimals ? fmt(v) : Math.round(v));
    if (reduce || booting || from === to) return show(to);
    const t0 = performance.now();
    // a background tab gets no animation frames, so the final value is also set on a timer
    setTimeout(() => { if (parseFloat(el.dataset.v) === to) { show(to); el.classList.remove("is-rolling"); } }, ms + 150);
    el.classList.add("is-rolling");
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 4);
      show(from + (to - from) * e);
      k < 1 ? requestAnimationFrame(step) : el.classList.remove("is-rolling");
    };
    requestAnimationFrame(step);
  }
  /* a small count swaps by sliding the old digit out and the new one in */
  function swap(el, text) {
    if (!el || el.textContent === String(text)) return;
    if (reduce || booting) return (el.textContent = text);
    el.classList.add("is-out");
    setTimeout(() => { el.textContent = text; el.classList.remove("is-out"); el.classList.add("is-in"); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("is-in"))); }, 130);
  }

  /* ---------- toasts ---------- */
  function toast(text, kind = "ok") {
    const box = $("[data-toasts]");
    if (!box) return;
    const t = document.createElement("div");
    t.className = "toast " + kind;
    t.setAttribute("role", "status");
    t.innerHTML = `<svg class="i"><use href="icons.svg#${kind === "ok" ? "check" : "alert"}"/></svg><span></span>`;
    t.lastChild.textContent = text;
    box.prepend(t);
    while (box.children.length > 3) box.lastChild.remove();
    requestAnimationFrame(() => t.classList.add("in"));
    setTimeout(() => { t.classList.remove("in"); t.classList.add("out"); setTimeout(() => t.remove(), 220); }, 4000);
  }

  /* ---------- buttons that do something slow: label -> spinner -> tick -> label, without changing width ---------- */
  async function busy(btn, work) {
    if (btn.classList.contains("is-loading") || btn.classList.contains("is-done")) return false;
    btn.style.width = btn.offsetWidth + "px";
    btn.classList.add("is-loading");
    btn.setAttribute("aria-busy", "true");
    await wait(reduce ? 200 : 900);
    btn.classList.remove("is-loading");
    btn.classList.add("is-done");
    btn.removeAttribute("aria-busy");
    if (work) work();
    await wait(1400);
    btn.classList.remove("is-done");
    btn.style.width = "";
    return true;
  }

  /* ---------- tabs with a moving indicator; they filter the list ---------- */
  function placeIndicator(tabs) {
    const on = $("[data-tab].on", tabs), ind = $(".ind", tabs);
    if (!on || !ind) return;
    ind.style.setProperty("--x", on.offsetLeft + "px");
    ind.style.setProperty("--w", on.offsetWidth + "px");
    ind.style.setProperty("--y", on.offsetTop + "px");
    ind.style.setProperty("--h", on.offsetHeight + "px");
  }
  function counts() {
    const c = { all: parcels.length };
    for (const p of parcels) c[p.stage] = (c[p.stage] || 0) + 1;
    $$("[data-count]").forEach((el) => swap(el, c[el.dataset.count] || 0));
    $$("[data-share]").forEach((el) => (el.style.flexGrow = c[el.dataset.share] || 0.001));
    const collected = parcels.filter((p) => p.stage === "done").reduce((a, p) => a + p.cod, 0);
    const road = parcels.filter((p) => ["road", "bad", "pickup"].includes(p.stage)).reduce((a, p) => a + p.cod, 0);
    const depot = parcels.filter((p) => p.stage === "depot").reduce((a, p) => a + p.cod, 0);
    $$('[data-sum="collected"]').forEach((el) => roll(el, collected));
    $$('[data-sum="road"]').forEach((el) => roll(el, road));
    $$('[data-sum="depot"]').forEach((el) => roll(el, depot));
    $$('[data-sum="total"]').forEach((el) => roll(el, collected + road + depot));
    $$('[data-sum="cashIon"]').forEach((el) => roll(el, state.cashIon));
    $$("[data-meter]").forEach((el) => (el.style.setProperty("--p", collected / (collected + road + depot))));
    $$('[data-ion-done]').forEach((el) => swap(el, state.ionDone));
    $$('[data-ion-left]').forEach((el) => swap(el, 7 - state.ionDone));
    $$("[data-done-count]").forEach((el) => swap(el, c.done || 0));
  }
  function applyFilter() {
    const run = () => $$("[data-row]").forEach((r) => (r.hidden = !(state.tab === "all" || byId(r.dataset.row).stage === state.tab)));
    vt(run);
    const empty = $("[data-empty]");
    if (empty) setTimeout(() => (empty.hidden = $$("[data-row]").some((r) => !r.hidden)), 0);
  }

  /* ---------- selection and the bulk bar ---------- */
  function selection() {
    const picked = $$("[data-row] input[type=checkbox]:checked");
    $$("[data-row]").forEach((r) => r.classList.toggle("sel", $("input[type=checkbox]", r)?.checked));
    const bar = $("[data-bulk]");
    if (bar) { bar.classList.toggle("show", picked.length > 0); bar.inert = picked.length === 0; }
    $$("[data-bulk-count]").forEach((el) => (el.textContent = picked.length));
    const all = $("[data-select-all]");
    if (all) { const n = $$("[data-row]:not([hidden]) input[type=checkbox]"); all.checked = n.length > 0 && n.every((b) => b.checked); all.indeterminate = picked.length > 0 && !all.checked; }
  }

  /* ---------- the detail drawer ---------- */
  let lastFocus = null;
  function openDrawer(n) {
    const d = $("[data-drawer]"), p = byId(n);
    if (!d || !p) return;
    const set = (k, v) => $$(`[data-f="${k}"]`, d).forEach((el) => (el.textContent = v));
    set("n", "CN-261117-" + p.n); set("who", p.who); set("addr", `${p.addr}, ${p.city}`); set("tel", p.tel);
    set("cod", p.cod ? fmt(p.cod) + " MDL" : "Fără ramburs"); set("client", p.client); set("courier", p.courier ?? "Fără curier"); set("kg", `1 buc · ${p.kg} kg`);
    $$('[data-f="status"]', d).forEach((el) => (el.innerHTML = (CN.badge || CN.status)(p)));
    d.dataset.stage = p.stage;
    lastFocus = document.activeElement;
    d.classList.add("open"); d.inert = false;
    $("[data-scrim]")?.classList.add("open");
    $("[data-close]", d)?.focus({ preventScroll: true });
  }
  function closeDrawer() {
    const d = $("[data-drawer]");
    if (!d?.classList.contains("open")) return;
    d.classList.remove("open"); d.inert = true;
    $("[data-scrim]")?.classList.remove("open");
    lastFocus?.focus?.({ preventScroll: true });
  }

  /* ---------- a courier's run: stops fill in as parcels are done ---------- */
  function advanceRun(name) {
    $$(`[data-run="${name}"]`).forEach((run) => {
      const now = $(".n", run);
      if (!now) return;
      now.classList.remove("n"); now.classList.add("d", "just");
      const next = now.nextElementSibling;
      if (next) next.classList.add("n");
      setTimeout(() => now.classList.remove("just"), 700);
    });
  }

  /* ---------- the courier's phone ---------- */
  const steps = [
    { n: "0007", kind: "deliver", go: "Livrat", label: "Următoarea livrare" },
    { n: "0009", kind: "pickup", go: "Am ridicat coletul", label: "De ridicat de la expeditor", title: "str. Ismail 1", city: "Chișinău", person: "Demo Shop SRL · +373 22 000 000", note: "1 colet pentru Stăuceni" },
    { n: "0005", kind: "retry", go: "Livrat", label: "De reîncercat" },
  ];
  let stepAt = 0;
  function showStep(first) {
    const box = $("[data-next]"), s = steps[stepAt];
    if (!box) return;
    const p = byId(s.n);
    const fill = () => {
      const scope = box.closest("[data-phone]") || box;
      const set = (k, v) => $$(`[data-p="${k}"]`, scope).forEach((el) => (el.textContent = v));
      set("label", s.label); set("n", "CN-261117-" + p.n);
      set("title", s.title ?? p.addr); set("city", s.city ?? p.city); set("person", s.person ?? `${p.who} · ${p.tel}`);
      set("note", s.note ?? (s.kind === "retry" ? "Nu a răspuns la 15:32. Sunați înainte." : "Sunați cu 10 min înainte"));
      set("go", s.go);
      const pay = $("[data-pay]", scope), amount = s.kind === "pickup" ? 0 : p.cod;
      if (pay) pay.hidden = !amount;
      set("cod", fmt(amount) + " MDL");
    };
    if (first || reduce) return fill();
    box.classList.add("leave");
    setTimeout(() => { fill(); box.classList.remove("leave"); box.classList.add("enter"); requestAnimationFrame(() => requestAnimationFrame(() => box.classList.remove("enter"))); }, 220);
  }
  function openSheet() {
    const sh = $("[data-sheet]");
    if (!sh) return;
    const p = byId(steps[stepAt].n);
    $$("[data-sheet-cod]", sh).forEach((el) => (el.textContent = fmt(p.cod) + " MDL"));
    sh.classList.remove("success"); sh.classList.add("open"); sh.inert = false;
    $("[data-sheet-scrim]")?.classList.add("open");
  }
  function closeSheet() {
    const sh = $("[data-sheet]");
    sh?.classList.remove("open"); if (sh) sh.inert = true;
    $("[data-sheet-scrim]")?.classList.remove("open");
  }
  function completeStep() {
    const s = steps[stepAt], p = byId(s.n);
    if (s.kind === "pickup") { p.stage = "road"; p.time = "acum"; }
    else { p.stage = "done"; p.time = "acum"; state.cashIon += p.cod; state.ionDone += 1; }
    advanceRun("ion");
    $$('[data-stop="' + p.n + '"]').forEach((el) => { el.classList.remove("now"); el.classList.add(p.stage === "done" ? "done" : "moved"); });
    const upNext = steps[stepAt + 1];
    if (upNext) $$('[data-stop="' + upNext.n + '"]').forEach((el) => el.classList.add("now"));
    CN.on.complete?.(p, s, state);
    const row = $(`[data-row="${p.n}"]`);
    if (row) {
      $$("[data-status]", row).forEach((el) => (el.innerHTML = CN.status(p)));
      $$("[data-time]", row).forEach((el) => (el.textContent = p.time));
      row.classList.toggle("past", p.stage === "done");
      row.classList.add("flash"); setTimeout(() => row.classList.remove("flash"), 1600);
    }
    $$(`[data-task="${p.n}"]`).forEach((t) => { t.classList.add("gone"); setTimeout(() => t.remove(), 420); });
    counts();
    if (state.tab !== "all") applyFilter();
    $$("[data-now-ion]").forEach((el) => { const nx = steps[stepAt + 1]; el.textContent = nx ? (nx.kind === "pickup" ? "Demo Shop SRL, str. Ismail 1" : `${byId(nx.n).city}, ${byId(nx.n).addr}`) : "Traseu încheiat"; });
    toast(s.kind === "pickup" ? `Ion a ridicat coletul ${p.n}` : `Ion a livrat coletul ${p.n}${p.cod ? ", " + fmt(p.cod) + " MDL încasat" : ""}`);
    if (stepAt < steps.length - 1) { stepAt += 1; showStep(); }
    else { const b = $("[data-deliver]"); if (b) { b.disabled = true; $$('[data-p="go"]').forEach((el) => (el.textContent = "Traseu încheiat")); } }
  }

  /* ---------- segmented control with a sliding thumb ---------- */
  function placeThumb(seg) {
    const on = $("[aria-checked=true]", seg), th = $(".thumb", seg);
    if (!on || !th) return;
    th.style.setProperty("--x", on.offsetLeft + "px"); th.style.setProperty("--w", on.offsetWidth + "px");
    th.style.setProperty("--y", on.offsetTop + "px"); th.style.setProperty("--h", on.offsetHeight + "px");
  }

  /* ---------- tooltips: wait before the first, none between neighbours ---------- */
  let tip, tipTimer, warmUntil = 0;
  function showTip(el) {
    tip ??= Object.assign(document.body.appendChild(document.createElement("div")), { className: "tip" });
    tip.textContent = el.dataset.tip;
    const r = el.getBoundingClientRect();
    tip.style.left = r.left + r.width / 2 + "px"; tip.style.top = r.top + scrollY - 8 + "px";
    tip.classList.toggle("instant", performance.now() < warmUntil);
    tip.classList.add("show");
  }

  const CN = (window.CN = {
    parcels, fmt, STAGE, toast, roll, busy, swap, state, vt, on: {},
    status: (p) => STAGE[p.stage],
    mount({ row, status }) {
      if (status) CN.status = status;
      const host = $("[data-rows]");
      if (host && row) host.innerHTML = parcels.map((p) => row(p)).join("");
      $$("[data-v]").forEach((el) => (el.dataset.v = el.dataset.v || "0"));
      counts(); showStep(true); booting = false;

      $$("[data-tabs]").forEach((tabs) => {
        placeIndicator(tabs);
        requestAnimationFrame(() => tabs.classList.add("ready"));
        tabs.addEventListener("click", (e) => {
          const b = e.target.closest("[data-tab]"); if (!b) return;
          $$("[data-tab]", tabs).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); });
          state.tab = b.dataset.tab; placeIndicator(tabs); applyFilter(); setTimeout(selection, 0);
        });
        tabs.addEventListener("keydown", (e) => {
          if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
          const all = $$("[data-tab]", tabs), i = all.indexOf(document.activeElement);
          const nx = all[(i + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length]; nx.focus(); nx.click();
        });
      });
      $$("[data-seg]").forEach((seg) => {
        placeThumb(seg); requestAnimationFrame(() => seg.classList.add("ready"));
        seg.addEventListener("click", (e) => { const b = e.target.closest("[role=radio]"); if (!b) return; $$("[role=radio]", seg).forEach((x) => x.setAttribute("aria-checked", x === b)); placeThumb(seg); });
      });
      addEventListener("resize", () => { $$("[data-tabs]").forEach(placeIndicator); $$("[data-seg]").forEach(placeThumb); });
      document.fonts?.ready.then(() => { $$("[data-tabs]").forEach(placeIndicator); $$("[data-seg]").forEach(placeThumb); });

      document.addEventListener("change", (e) => {
        if (e.target.matches("[data-select-all]")) $$("[data-row]:not([hidden]) input[type=checkbox]").forEach((b) => (b.checked = e.target.checked));
        if (e.target.matches("[data-row] input[type=checkbox], [data-select-all]")) selection();
      });
      document.addEventListener("click", (e) => {
        const t = e.target;
        if (t.closest("[data-bulk-clear]")) { $$("[data-row] input[type=checkbox]").forEach((b) => (b.checked = false)); return selection(); }
        if (t.closest("[data-close], [data-scrim]")) return closeDrawer();
        if (t.closest("[data-sheet-close], [data-sheet-scrim]")) return closeSheet();
        const dl = t.closest("[data-deliver]");
        if (dl) { const s = steps[stepAt]; if (s.kind !== "pickup" && byId(s.n).cod) return openSheet(); return void busy(dl, completeStep); }
        const cf = t.closest("[data-confirm]");
        if (cf) return void busy(cf, () => { $("[data-sheet]").classList.add("success"); if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(30); setTimeout(() => { closeSheet(); completeStep(); }, reduce ? 300 : 950); });
        const a = t.closest("[data-async]");
        if (a) return void busy(a, () => {
          if (a.dataset.async === "cash") { state.cashIon = 0; counts(); $$("[data-cash-row]").forEach((r) => r.classList.add("settled")); CN.on.cash?.(state); }
          if (a.dataset.async === "task") { const task = a.closest("[data-task]"); setTimeout(() => { task?.classList.add("gone"); setTimeout(() => task?.remove(), 420); }, 500); }
          if (a.dataset.toast) toast(a.dataset.toast);
        });
        const row = t.closest("[data-row]");
        if (row && !t.closest("input, label, button, a, select")) openDrawer(row.dataset.row);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { closeDrawer(); closeSheet(); }
        const typing = e.target.matches("input, textarea, select");
        if (e.key === "/" && !typing) { e.preventDefault(); $("[data-search]")?.focus(); }
      });
      document.addEventListener("pointerover", (e) => {
        const el = e.target.closest?.("[data-tip]"); if (!el) return;
        clearTimeout(tipTimer);
        if (performance.now() < warmUntil) showTip(el); else tipTimer = setTimeout(() => showTip(el), 550);
      });
      document.addEventListener("pointerout", (e) => {
        if (!e.target.closest?.("[data-tip]")) return;
        clearTimeout(tipTimer);
        if (tip?.classList.contains("show")) { tip.classList.remove("show"); warmUntil = performance.now() + 300; }
      });
      $$("[data-drawer], [data-sheet], [data-bulk]").forEach((el) => (el.inert = true));
      requestAnimationFrame(() => document.documentElement.classList.add("ready"));
    },
  });
})();
