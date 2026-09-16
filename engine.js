(() => {
  const key = "cleanum-pricing-v2";
  const auditKey = "cleanum-audit-v2";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = (value) => `${Number(value || 0).toLocaleString("en-SA", { maximumFractionDigits: 1 })} SAR`;
  const number = (value) => Number.parseFloat(value) || 0;
  const actualMinutes = { 1: 45, 1.5: 170, 2: 200, 2.5: 135 };
  const materialCost = { 1: 2.9, 1.5: 4.2, 2: 5.3, 2.5: 6.5 };

  const defaults = {
    salary: 3000, team: 8, hours: 208, dailyHours: 8, workdaysPerWeek: 6, workdaysPerMonth: 26, visitsPerWorkerPerDay: 3, dailyMaterialTarget: 24, transport: 2000, supplies: 0, admin: 0,
    margin: 0.4, taxRate: 0.15, taxEnabled: true, marketPrice: 128, marketIncludesTax: true,
    monthlyVisits: 310, role: "admin", drafts: [],
    billable: {
      regular: { 1: 1, 1.5: 1.5, 2: 2, 2.5: 2.5 },
      turnover: { 1: 1, 1.5: 1.5, 2: 2, 2.5: 2.5 }
    },
    minVisit: { regular: 75, turnover: 75 }
  };
  let state;
  try { state = { ...defaults, ...JSON.parse(localStorage.getItem(key) || "{}") }; } catch { state = { ...defaults }; }
  state.billable = { ...defaults.billable, ...state.billable };
  state.minVisit = { ...defaults.minVisit, ...state.minVisit };
  state.drafts ||= [];
  state.transport = 2000;
  state.admin = 0;

  const addAudit = (action, details) => {
    let items = [];
    try { items = JSON.parse(localStorage.getItem(auditKey) || "[]"); } catch { /* empty */ }
    items.unshift({ action, details, at: new Date().toLocaleString("en-SA") });
    localStorage.setItem(auditKey, JSON.stringify(items.slice(0, 30)));
  };
  const persist = () => localStorage.setItem(key, JSON.stringify(state));
  const setText = (id, value) => { const node = $(`#${id}`); if (node) node.textContent = value; };
  const setValue = (id, value) => { const node = $(`#${id}`); if (node && document.activeElement !== node) node.value = value; };

  const home = $("#home");
  const service = $("#serviceType");
  const billableInput = $("#billableInput");
  const minVisitInput = $("#minVisit");
  const adjustInput = $("#adjust");
  const salaryInput = $("#salary");
  const teamInput = $("#team");
  const hoursInput = $("#hours");
  if (!home || !service || !billableInput) return;
  const serviceKey = () => service.selectedIndex === 1 ? "turnover" : "regular";
  if (hoursInput) { hoursInput.value = state.dailyHours * state.workdaysPerMonth; hoursInput.readOnly = true; }

  const style = document.createElement("style");
  style.textContent = `
    .engine-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:12px;margin-top:14px}.engine-stat{background:#f2f7fb;border:1px solid #dce8f1;border-radius:12px;padding:15px}.engine-stat small{display:block;color:#66809d;margin-bottom:7px}.engine-stat strong{font-size:21px;color:#123c63}.engine-panel{margin-top:16px}.engine-panel h3{margin:0 0 12px}.engine-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}.engine-fields label{font-size:13px;color:#54708d;font-weight:700}.engine-fields input,.engine-fields select{width:100%;box-sizing:border-box;margin-top:6px;border:1px solid #d7e4ee;border-radius:9px;padding:10px;background:#fff;color:#123c63}.engine-warning{border-right:4px solid #d88229;background:#fff7eb;padding:12px;border-radius:8px;margin-top:10px;color:#77440c}.engine-good{border-right:4px solid #27b98e;background:#edfcf7;padding:12px;border-radius:8px;margin-top:10px;color:#165a4c}.engine-table{width:100%;border-collapse:collapse;font-size:14px}.engine-table th,.engine-table td{padding:10px;border-bottom:1px solid #e2edf4;text-align:right}.engine-table th{color:#66809d}.draft-actions button{margin-inline-start:6px;border:0;border-radius:7px;padding:7px 10px;cursor:pointer;background:#164b72;color:#fff}.badge{display:inline-block;padding:3px 8px;border-radius:99px;background:#eaf1f7;color:#355774;font-size:12px}.badge.published{background:#dff8ee;color:#147558}.badge.archived{background:#f3f3f3;color:#6b7280}@media(max-width:760px){.engine-grid{grid-template-columns:1fr 1fr}}
  `;
  document.head.append(style);

  const calc = () => {
    const unit = home.value;
    const selectedService = serviceKey();
    const salary = number(salaryInput?.value || state.salary);
    const team = number(teamInput?.value || state.team);
    const hours = state.dailyHours * state.workdaysPerMonth;
    const billable = Math.max(1, Math.round(actualMinutes[unit] / 60));
    const minimum = number(minVisitInput?.value);
    const adjustment = number(adjustInput?.value);
    const averageMaterial = Object.values(materialCost).reduce((sum, value) => sum + value, 0) / Object.keys(materialCost).length;
    const dailyMaterialTarget = team * state.visitsPerWorkerPerDay;
    const monthlyMaterials = averageMaterial * dailyMaterialTarget * state.workdaysPerMonth;
    const monthlyCost = salary * team + state.transport + monthlyMaterials;
    const capacity = team * hours;
    const costPerHour = capacity > 0 ? monthlyCost / capacity : 0;
    const hourlyRate = state.margin < 1 ? costPerHour / (1 - state.margin) : 0;
    const directCost = costPerHour * billable;
    const hourlyTotal = hourlyRate * billable;
    const beforeTax = Math.max(hourlyTotal + adjustment, minimum);
    const vat = state.taxEnabled ? beforeTax * state.taxRate : 0;
    const total = beforeTax + vat;
    const targetMargin = state.margin * 100;
    const actualMargin = beforeTax > 0 ? ((beforeTax - directCost) / beforeTax) * 100 : 0;
    const averageBillable = Object.values(actualMinutes).reduce((sum, minutes) => sum + Math.max(1, Math.round(minutes / 60)), 0) / 4;
    const averageActualMinutes = Object.values(actualMinutes).reduce((sum, value) => sum + value, 0) / 4;
    const averageBeforeTax = Math.max(hourlyRate * averageBillable, state.minVisit.regular);
    const averageVat = state.taxEnabled ? averageBeforeTax * state.taxRate : 0;
    const averageTotal = averageBeforeTax + averageVat;
    const shiftRevenue = averageBeforeTax * state.visitsPerWorkerPerDay;
    const visits = team * state.visitsPerWorkerPerDay * state.workdaysPerMonth;
    const revenue = averageBeforeTax * visits;
    const vatCollected = averageVat * visits;
    const profit = revenue - monthlyCost;
    const requiredHours = visits * averageBillable;
    const utilization = capacity ? requiredHours / capacity : 0;
    const marketComparable = state.marketIncludesTax ? total : beforeTax;
    return { unit, serviceKey: selectedService, salary, team, hours, billable, minimum, adjustment, monthlyCost, capacity, costPerHour, directCost, hourlyRate, hourlyTotal, beforeTax, vat, total, actualMargin, targetMargin, visits, revenue, vatCollected, profit, requiredHours, utilization, marketComparable, marketDifference: marketComparable - state.marketPrice, material: materialCost[unit] * (selectedService === "turnover" ? 1.4 : 1), averageMaterial, dailyMaterialTarget, monthlyMaterials, averageBillable, averageActualMinutes, averageBeforeTax, averageTotal, shiftRevenue };
  };

  const renderLibrary = () => {
    const library = $("#library");
    if (!library) return;
    const drafts = state.drafts;
    const recent = (() => { try { return JSON.parse(localStorage.getItem(auditKey) || "[]").slice(0, 6); } catch { return []; } })();
    library.innerHTML = `<h2>مكتبة الأسعار وسجل القرارات</h2><p class="sub">محفوظ محلياً على هذا الجهاز. النشر هنا توثيق داخلي وليس مزامنة فريق أو موافقة حقيقية.</p>
      <article class="panel engine-panel"><h3>مسودات وعروض محفوظة</h3>${drafts.length ? `<table class="engine-table"><thead><tr><th>التاريخ</th><th>الوحدة</th><th>الخدمة</th><th>السعر قبل الضريبة</th><th>الحالة</th><th></th></tr></thead><tbody>${drafts.map((draft, i) => `<tr><td>${draft.at}</td><td>${draft.unit}</td><td>${draft.service === "turnover" ? "تنظيف عند الانتقال" : "تنظيف دوري"}</td><td>${money(draft.beforeTax)}</td><td><span class="badge ${draft.status}">${draft.status === "published" ? "منشور" : draft.status === "archived" ? "مؤرشف" : "مسودة"}</span></td><td class="draft-actions">${draft.status === "draft" ? `<button data-action="publish" data-index="${i}">نشر</button>` : ""}${draft.status !== "archived" ? `<button data-action="archive" data-index="${i}">أرشفة</button>` : ""}</td></tr>`).join("")}</tbody></table>` : "<p>لا توجد مسودات بعد. استخدم «حفظ كمسودة» من الحاسبة.</p>"}</article>
      <article class="panel engine-panel"><h3>آخر التغييرات</h3>${recent.length ? `<table class="engine-table"><tbody>${recent.map(item => `<tr><td>${item.at}</td><td>${item.action}</td><td>${item.details}</td></tr>`).join("")}</tbody></table>` : "<p>سيظهر هنا سجل الحفظ والنشر والتغييرات.</p>"}</article>`;
    $$("button[data-action]", library).forEach(button => button.addEventListener("click", () => {
      const draft = state.drafts[Number(button.dataset.index)];
      const action = button.dataset.action;
      if (!draft || !confirm(action === "publish" ? "هل تريد نشر هذه النسخة في المكتبة المحلية؟" : "هل تريد أرشفة هذه النسخة؟")) return;
      draft.status = action === "publish" ? "published" : "archived";
      addAudit(action === "publish" ? "نشر نسخة" : "أرشفة نسخة", `${draft.unit} — ${money(draft.beforeTax)}`);
      persist(); renderLibrary();
    }));
  };

  const renderScenarios = () => {
    const section = $("#scenarios");
    if (!section) return;
    const v = calc();
    const capacityVisits = state.visitsPerWorkerPerDay * state.workdaysPerMonth;
    const scenarioPrice = Math.max(
      (((v.salary + state.transport + v.averageMaterial * capacityVisits) / (state.dailyHours * state.workdaysPerMonth)) / (1 - state.margin)) * v.averageBillable,
      state.minVisit.regular,
    );
    const breakEvenVisits = Math.ceil((v.salary + state.transport) / Math.max(scenarioPrice - v.averageMaterial, 1));
    const profiles = [
      { name: "بداية هادئة", note: "بناء ثقة وقاعدة عملاء تدريجياً؛ لا يصل للتعادل خلال السنة الأولى.", tone: "#7892aa", visits: [8, 10, 12, 15, 18, 21, 24, 27, 30, 34, 38, 42] },
      { name: "نمو متوازن — الموصى به", note: "يصل إلى التعادل التشغيلي في الشهر الخامس؛ أفضل توازن بين الواقعية والسيولة.", tone: "#1e9d85", visits: [20, 28, 38, 48, 56, 62, 66, 70, 72, 74, 76, 78] },
      { name: "بداية قوية", note: "يصل للتعادل في الشهر الثالث ثم يتحول إلى ربح؛ يحتاج تسويقاً ومبيعات قوية منذ اليوم الأول.", tone: "#d8842c", visits: [40, 50, 58, 64, 68, 72, 74, 76, 78, 78, 78, 78] },
    ];
    const rows = (profile) => profile.visits.map((visits, index) => {
      const materials = visits * v.averageMaterial;
      const expense = v.salary + state.transport + materials;
      const revenue = visits * scenarioPrice;
      const profit = revenue - expense;
      return { month: index + 1, visits, revenue, expense, profit };
    });
    section.innerHTML = `<article class="panel engine-panel"><h2>سيناريوهات السنة الأولى — عاملة واحدة</h2><p class="sub">السقف التشغيلي: ${capacityVisits} زيارة شهرياً. سعر السيناريو المتوسط ${money(scenarioPrice)} قبل الضريبة، والمواد تحسب فعلياً حسب عدد الزيارات.</p><div class="engine-good">نقطة التعادل الشهرية: ${breakEvenVisits} زيارة. تم اختيار سيناريو النمو المتوازن للوصول إليها في الشهر الخامس.</div></article>${profiles.map(profile => {
      const data = rows(profile); const totals = data.reduce((sum, row) => ({ visits: sum.visits + row.visits, revenue: sum.revenue + row.revenue, expense: sum.expense + row.expense, profit: sum.profit + row.profit }), { visits: 0, revenue: 0, expense: 0, profit: 0 });
      const achieved = data.find(row => row.profit >= 0)?.month;
      return `<article class="panel engine-panel"><h3 style="border-right:4px solid ${profile.tone};padding-right:10px">${profile.name}</h3><p class="sub">${profile.note}</p><div class="engine-grid"><div class="engine-stat"><small>التعادل الشهري</small><strong>${achieved ? `شهر ${achieved}` : "بعد السنة الأولى"}</strong></div><div class="engine-stat"><small>زيارات السنة</small><strong>${totals.visits}</strong></div><div class="engine-stat"><small>إيرادات السنة قبل الضريبة</small><strong>${money(totals.revenue)}</strong></div><div class="engine-stat"><small>صافي السنة التشغيلي</small><strong>${money(totals.profit)}</strong></div></div><table class="engine-table"><thead><tr><th>الشهر</th><th>الزيارات</th><th>الإيرادات قبل الضريبة</th><th>المصاريف</th><th>الربح / الخسارة</th></tr></thead><tbody>${data.map(row => `<tr><td>${row.month}</td><td>${row.visits}</td><td>${money(row.revenue)}</td><td>${money(row.expense)}</td><td style="color:${row.profit >= 0 ? "#147558" : "#b45309"}">${money(row.profit)}</td></tr>`).join("")}</tbody></table></article>`;
    }).join("")}`;
  };

  let render = () => {
    const v = calc();
    setText("costHour", money(v.costPerHour)); setText("costHour2", money(v.costPerHour));
    setText("monthCard", money(v.monthlyCost)); setText("monthly", money(v.monthlyCost));
    const summaryRows = $$("#costs .cost-grid article:nth-child(2) .rows p strong");
    if (summaryRows[2]) summaryRows[2].textContent = money(state.transport);
    if (summaryRows[3]) summaryRows[3].textContent = money(v.monthlyMaterials);
    setText("engine-material-formula", money(v.monthlyMaterials));
    const materialTarget = $("#engine-material-target"); if (materialTarget) materialTarget.value = v.dailyMaterialTarget;
    setText("engine-material-detail", `بناءً على ${v.dailyMaterialTarget} زيارة يومياً × ${state.workdaysPerMonth} يوم عمل، ومتوسط ${money(v.averageMaterial)} مواد لكل زيارة.`);
    setText("hourlyRate", money(v.hourlyRate)); setText("hourlyTotal", money(v.hourlyTotal));
    setText("base", money(v.directCost)); setText("before", money(v.beforeTax)); setText("vat", money(v.vat)); setText("total", money(v.total)); setText("final", money(v.total));
    setText("visitCard", money(v.beforeTax)); setText("marketPrice", money(v.marketComparable)); setText("diff", `${v.marketDifference >= 0 ? "+" : ""}${money(v.marketDifference)}`);
    setText("material-cost", money(v.material));
    const revenueNode = $("#revenue"); if (revenueNode) revenueNode.textContent = money(v.revenue);
    const progress = $("#progress"); if (progress) progress.style.width = `${Math.min(100, Math.max(0, v.actualMargin))}%`;
    const readiness = $("#readiness"); if (readiness) readiness.textContent = `${Math.round(v.actualMargin)}%`;
    const target = $("#marginTarget"); if (target) target.textContent = `هامش الربح الفعلي ${v.actualMargin.toFixed(1)}% — المستهدف ${v.targetMargin.toFixed(0)}%`;
    const quick = { "quick-revenue": money(v.revenue), "quick-cost": money(v.monthlyCost), "quick-profit": money(v.profit) };
    Object.entries(quick).forEach(([id, value]) => setText(id, value));
    setText("quick-price", money(v.averageTotal)); setText("quick-shift", money(v.shiftRevenue));
    const quickVisits = $("#quick-visits"); if (quickVisits) { quickVisits.value = v.visits; quickVisits.readOnly = true; }

    const health = $("#financial-health");
    if (health) health.innerHTML = `<h3>صحة التسعير والتشغيل</h3><div class="engine-grid"><div class="engine-stat"><small>متوسط سعر الزيارة (شامل الضريبة)</small><strong>${money(v.averageTotal)}</strong></div><div class="engine-stat"><small>متوسط إيراد الشفت قبل الضريبة</small><strong>${money(v.shiftRevenue)}</strong></div><div class="engine-stat"><small>تكلفة المواد الشهرية</small><strong>${money(v.monthlyMaterials)}</strong><p class="sub">${v.dailyMaterialTarget} زيارة يومياً محسوبة تلقائياً</p></div><div class="engine-stat"><small>الإيراد الشهري قبل الضريبة</small><strong>${money(v.revenue)}</strong></div><div class="engine-stat"><small>ربح تشغيلي قبل الضريبة</small><strong>${money(v.profit)}</strong></div><div class="engine-stat"><small>زمن 3 زيارات / الشفت</small><strong>${(v.averageActualMinutes * 3).toFixed(0)} / 480 دقيقة</strong></div></div>`;
    const warnings = [];
    if (!v.team || !v.hours || !v.billable) warnings.push("أدخل عدد العاملات وساعات السعة ووقت الفوترة لإصدار سعر صالح.");
    if (v.adjustment < 0 && v.hourlyTotal + v.adjustment < v.minimum) warnings.push("تم الحفاظ على الحد الأدنى للزيارة بعد التعديل اليدوي؛ الخصم لا يمكنه كسره.");
    if (v.actualMargin + .01 < v.targetMargin) warnings.push("الهامش الفعلي أقل من الهدف. راجع الحد الأدنى أو التعديل اليدوي.");
    if (v.averageActualMinutes * state.visitsPerWorkerPerDay > state.dailyHours * 60) warnings.push("متوسط مدة الزيارات يتجاوز ساعات الشفت؛ راجع هدف الزيارات اليومي.");
    if (v.material > 0) warnings.push(`تكلفة المستلزمات الشهرية تُحسب تلقائياً من ${v.team} عاملات × 3 زيارات يومياً، بمتوسط ${money(v.averageMaterial)} للزيارة؛ فلا تُضاف مرة أخرى لسعر الزيارة.`);
    const warningBox = $("#engine-warnings"); if (warningBox) warningBox.innerHTML = warnings.length ? warnings.map(message => `<div class="engine-warning">${message}</div>`).join("") : '<div class="engine-good">التسعير فوق الحد الأدنى والسعة ضمن النطاق الحالي.</div>';
  };

  const loadUnitServiceDefaults = () => {
    const unit = home.value;
    const selectedService = serviceKey();
    billableInput.value = Math.max(1, Math.round(actualMinutes[unit] / 60));
    billableInput.readOnly = true;
    if (billableInput.parentElement?.firstChild) billableInput.parentElement.firstChild.nodeValue = "الوقت القابل للفوترة (وقت التنظيف مقرب لأقرب ساعة)";
    if (minVisitInput) minVisitInput.value = state.minVisit[selectedService];
  };
  const syncState = () => {
    state.salary = number(salaryInput?.value); state.team = number(teamInput?.value); state.hours = number(hoursInput?.value);
    const selectedService = serviceKey();
    state.minVisit[selectedService] = number(minVisitInput?.value);
    persist(); render(); renderScenarios();
  };

  const settings = $("#settings");
  if (settings) settings.innerHTML = `<h2>إعدادات الحوكمة والتسعير</h2><p class="sub">تطبق على هذا المتصفح فقط. الضريبة تُعرض للعميل وتُفصل عن الإيراد والربح.</p><article class="panel engine-panel"><h3>سياسة التسعير والضريبة والسوق</h3><div class="engine-fields"><label>هامش الربح المستهدف<input id="engine-margin" type="number" min="0" max="90" step="1" value="${state.margin * 100}"></label><label>نسبة ضريبة القيمة المضافة<input id="engine-tax" type="number" min="0" max="100" step="1" value="${state.taxRate * 100}"></label><label>سعر السوق المرجعي<input id="engine-market" type="number" min="0" step="1" value="${state.marketPrice}"></label><label>أساس سعر السوق<select id="engine-market-basis"><option value="including">شامل الضريبة</option><option value="excluding">قبل الضريبة</option></select></label><label>نموذج الشفت<select disabled><option>8 ساعات × 6 أيام / أسبوع</option></select></label><label>هدف التنفيذ<select disabled><option>3 زيارات / عاملة / يوم</option></select></label><label>الدور الحالي<select id="engine-role"><option value="admin">مدير النظام</option><option value="pricing">مدير التسعير</option><option value="viewer">مشاهد فقط</option></select></label></div><p><label><input id="engine-tax-enabled" type="checkbox" ${state.taxEnabled ? "checked" : ""}> تفعيل الضريبة في عرض سعر العميل</label></p></article>`;
  if (settings) {
    $("#engine-market-basis").value = state.marketIncludesTax ? "including" : "excluding";
    $("#engine-role").value = state.role;
    $$("input,select", settings).forEach(input => input.addEventListener("input", () => {
      state.margin = number($("#engine-margin").value) / 100; state.taxRate = number($("#engine-tax").value) / 100;
      state.taxEnabled = $("#engine-tax-enabled").checked; state.marketPrice = number($("#engine-market").value);
      state.marketIncludesTax = $("#engine-market-basis").value === "including";
      state.role = $("#engine-role").value; persist(); render(); renderScenarios();
    }));
  }

  const costs = $("#costs");
  if (costs) costs.insertAdjacentHTML("beforeend", `<article class="panel engine-panel"><h3>التكاليف الثابتة والمواد</h3><p class="sub">النقل والوقود ثابتان عند 2,000 SAR شهرياً للشركة كلها. الإدارة والتشغيل غير محسوبين حالياً.</p><div class="engine-fields"><label>النقل والوقود الشهري<input value="2,000 SAR — ثابت للشركة" readonly></label><label>هدف الزيارات اليومي للمواد (محسوب تلقائياً)<input id="engine-material-target" type="number" readonly value="0"></label><div class="engine-stat"><small>تكلفة المواد المتوقعة شهرياً</small><strong id="engine-material-formula">—</strong><p class="sub" id="engine-material-detail">—</p></div></div></article>`);

  const dashboard = $("#dash");
  if (dashboard) dashboard.insertAdjacentHTML("beforeend", '<article id="financial-health" class="panel engine-panel"></article><section id="engine-warnings"></section>');
  const calculator = $("#calc");
  if (calculator) calculator.querySelector(".panel")?.insertAdjacentHTML("beforeend", '<article class="panel engine-panel"><h3>كيف يُحسب السعر؟</h3><div class="engine-grid"><div class="engine-stat"><small>بالساعة</small><strong id="engine-hourly-explainer">—</strong><p class="sub">سعر الساعة × وقت التنظيف بعد التقريب لأقرب ساعة كاملة.</p></div><div class="engine-stat"><small>بالزيارة</small><strong id="engine-visit-explainer">—</strong><p class="sub">إجمالي الساعات بعد التعديل، ولا يقل عن الحد الأدنى للزيارة.</p></div></div></article>');

  const originalRender = render;
  const renderWithExplain = () => { originalRender(); const v = calc(); setText("engine-hourly-explainer", money(v.hourlyTotal)); setText("engine-visit-explainer", money(v.beforeTax)); };
  render = renderWithExplain;

  home.addEventListener("change", () => { loadUnitServiceDefaults(); syncState(); });
  service.addEventListener("change", () => { loadUnitServiceDefaults(); syncState(); });
  [minVisitInput, adjustInput, salaryInput, teamInput, hoursInput].filter(Boolean).forEach(input => input.addEventListener("input", syncState));
  $("#quick-team")?.addEventListener("input", event => { if (teamInput) { teamInput.value = event.target.value; } syncState(); });

  $(".save")?.addEventListener("click", () => {
    const v = calc();
    if (!v.beforeTax || !v.billable || !v.team || !v.hours) { alert("أكمل مدخلات السعة ووقت الفوترة قبل حفظ المسودة."); return; }
    state.drafts.unshift({ at: new Date().toLocaleString("en-SA"), unit: home.options[home.selectedIndex].text, service: v.serviceKey, beforeTax: v.beforeTax, total: v.total, billable: v.billable, status: "draft" });
    addAudit("حفظ مسودة", `${home.options[home.selectedIndex].text} — ${money(v.beforeTax)} قبل الضريبة`); persist(); renderLibrary(); alert("تم حفظ المسودة محلياً في مكتبة الأسعار.");
  });
  $(".discard")?.addEventListener("click", () => { if (confirm("هل تريد مسح التعديل اليدوي فقط؟")) { if (adjustInput) adjustInput.value = 0; syncState(); } });

  $$(".nav button").forEach(button => button.addEventListener("click", () => {
    const titles = { dash: "لوحة التحكم", calc: "حاسبة الأسعار", costs: "هيكل التكاليف", scenarios: "السيناريوهات", library: "مكتبة الأسعار", settings: "الإعدادات" };
    const title = $("#title"); if (title) title.textContent = titles[button.dataset.page] || "Cleanum";
  }));
  renderLibrary(); renderScenarios(); loadUnitServiceDefaults(); syncState();
})();
