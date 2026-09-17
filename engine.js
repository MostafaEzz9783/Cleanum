(() => {
  const key = "cleanum-pricing-v2";
  const auditKey = "cleanum-audit-v2";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = (value) => `${Number(value || 0).toLocaleString("en-SA", { maximumFractionDigits: 1 })} SAR`;
  const number = (value) => Number.parseFloat(value) || 0;
  const actualMinutes = { 0.5: 75, 1: 75, 1.5: 120, 2: 150 };
  const materialCost = { 0.5: 1.43, 1: 1.96, 1.5: 2.82, 2: 3.66 };

  const defaults = {
    salary: 3000, team: 2, hours: 208, dailyHours: 8, workdaysPerWeek: 6, workdaysPerMonth: 26, visitsPerWorkerPerDay: 3, dailyMaterialTarget: 6, transport: 2000, accommodation: 2000, supplies: 0, admin: 0,
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
  state.team = 2;
  state.accommodation = 2000;

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
  home.innerHTML = '<option value="0.5">Studio</option><option value="1">1BR</option><option value="1.5">2BR</option><option value="2">3BR</option>';
  const serviceKey = () => service.selectedIndex === 1 ? "turnover" : "regular";
  if (hoursInput) { hoursInput.value = state.dailyHours * state.workdaysPerMonth; hoursInput.readOnly = true; }
  if (teamInput) { teamInput.value = 2; teamInput.readOnly = true; }

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
    const billableMinutes = actualMinutes[unit];
    const billable = billableMinutes / 60;
    const minimum = number(minVisitInput?.value);
    const adjustment = number(adjustInput?.value);
    const averageMaterial = Object.values(materialCost).reduce((sum, value) => sum + value, 0) / Object.keys(materialCost).length;
    const dailyMaterialTarget = team * state.visitsPerWorkerPerDay;
    const monthlyMaterials = averageMaterial * dailyMaterialTarget * state.workdaysPerMonth;
    const fixedMonthlyCost = salary * team + state.transport + state.accommodation;
    const monthlyCost = fixedMonthlyCost + monthlyMaterials;
    const capacity = team * hours;
    const costPerHour = capacity > 0 ? fixedMonthlyCost / capacity : 0;
    const employeeCostPerHour = team > 0 ? costPerHour / team : 0;
    const salaryCostPerHour = hours > 0 ? salary / hours : 0;
    const fixedOverheadPerHour = capacity > 0 ? (state.transport + state.accommodation) / capacity : 0;
    const visitMaterials = materialCost[unit] * (selectedService === "turnover" ? 1.4 : 1);
    const hourlyRate = state.margin < 1 ? employeeCostPerHour / (1 - state.margin) : 0;
    const directCost = employeeCostPerHour * billable + visitMaterials;
    const hourlyTotal = state.margin < 1 ? directCost / (1 - state.margin) : 0;
    const beforeTax = Math.max(hourlyTotal + adjustment, minimum);
    const vat = state.taxEnabled ? beforeTax * state.taxRate : 0;
    const total = beforeTax + vat;
    const targetMargin = state.margin * 100;
    const actualMargin = beforeTax > 0 ? ((beforeTax - directCost) / beforeTax) * 100 : 0;
    const averageBillable = Object.values(actualMinutes).reduce((sum, minutes) => sum + minutes / 60, 0) / 4;
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
    return { unit, serviceKey: selectedService, salary, team, hours, billable, billableMinutes, minimum, adjustment, fixedMonthlyCost, monthlyCost, capacity, costPerHour, employeeCostPerHour, salaryCostPerHour, fixedOverheadPerHour, directCost, hourlyRate, hourlyTotal, beforeTax, vat, total, actualMargin, targetMargin, visits, revenue, vatCollected, profit, requiredHours, utilization, marketComparable, marketDifference: marketComparable - state.marketPrice, material: visitMaterials, averageMaterial, dailyMaterialTarget, monthlyMaterials, averageBillable, averageActualMinutes, averageBeforeTax, averageTotal, shiftRevenue };
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
    const capacityVisits = v.team * state.visitsPerWorkerPerDay * state.workdaysPerMonth;
    const averageDirectVisitCost = v.employeeCostPerHour * v.averageBillable + v.averageMaterial;
    const scenarioPrice = Math.max(averageDirectVisitCost / (1 - state.margin), state.minVisit.regular);
    const breakEvenVisits = Math.ceil((v.salary * v.team + state.transport + state.accommodation) / Math.max(scenarioPrice - v.averageMaterial, 1));
    const profiles = [
      { name: "بداية هادئة", note: "بناء ثقة وقاعدة عملاء تدريجياً؛ لا يصل للتعادل خلال السنة الأولى.", tone: "#7892aa", visits: [16, 20, 24, 30, 36, 42, 48, 54, 60, 68, 76, 84] },
      { name: "نمو متوازن — الموصى به", note: "يصل إلى التعادل التشغيلي في الشهر الخامس؛ أفضل توازن بين الواقعية والسيولة.", tone: "#1e9d85", visits: [50, 75, 100, 120, 140, 145, 150, 152, 154, 156, 156, 156] },
      { name: "بداية قوية", note: "يصل للتعادل في الشهر الثالث ثم يتحول إلى ربح؛ يحتاج تسويقاً ومبيعات قوية منذ اليوم الأول.", tone: "#d8842c", visits: [100, 125, 140, 145, 150, 152, 154, 156, 156, 156, 156, 156] },
    ];
    const rows = (profile) => profile.visits.map((visits, index) => {
      const materials = visits * v.averageMaterial;
      const expense = v.salary * v.team + state.transport + state.accommodation + materials;
      const revenue = visits * scenarioPrice;
      const profit = revenue - expense;
      return { month: index + 1, visits, revenue, expense, profit };
    });
    section.innerHTML = `<article class="panel engine-panel"><h2>سيناريوهات السنة الأولى — عاملتان</h2><p class="sub">السقف التشغيلي: ${capacityVisits} زيارة شهرياً. سعر السيناريو المتوسط ${money(scenarioPrice)} قبل الضريبة، والمواد تحسب فعلياً حسب عدد الزيارات.</p><div class="engine-good">نقطة التعادل الشهرية: ${breakEvenVisits} زيارة. تم اختيار سيناريو النمو المتوازن للوصول إليها في الشهر الخامس.</div></article>${profiles.map(profile => {
      const data = rows(profile); const totals = data.reduce((sum, row) => ({ visits: sum.visits + row.visits, revenue: sum.revenue + row.revenue, expense: sum.expense + row.expense, profit: sum.profit + row.profit }), { visits: 0, revenue: 0, expense: 0, profit: 0 });
      const achieved = data.find(row => row.profit >= 0)?.month;
      return `<article class="panel engine-panel"><h3 style="border-right:4px solid ${profile.tone};padding-right:10px">${profile.name}</h3><p class="sub">${profile.note}</p><div class="engine-grid"><div class="engine-stat"><small>التعادل الشهري</small><strong>${achieved ? `شهر ${achieved}` : "بعد السنة الأولى"}</strong></div><div class="engine-stat"><small>زيارات السنة</small><strong>${totals.visits}</strong></div><div class="engine-stat"><small>إيرادات السنة قبل الضريبة</small><strong>${money(totals.revenue)}</strong></div><div class="engine-stat"><small>صافي السنة التشغيلي</small><strong>${money(totals.profit)}</strong></div></div><table class="engine-table"><thead><tr><th>الشهر</th><th>الزيارات</th><th>الإيرادات قبل الضريبة</th><th>المصاريف</th><th>الربح / الخسارة</th></tr></thead><tbody>${data.map(row => `<tr><td>${row.month}</td><td>${row.visits}</td><td>${money(row.revenue)}</td><td>${money(row.expense)}</td><td style="color:${row.profit >= 0 ? "#147558" : "#b45309"}">${money(row.profit)}</td></tr>`).join("")}</tbody></table></article>`;
    }).join("")}`;
  };

  let render = () => {
    const v = calc();
    setText("costHour", money(v.costPerHour)); setText("costHour2", money(v.costPerHour));
    setText("monthCard", money(v.monthlyCost)); setText("monthly", money(v.monthlyCost));
    setText("engine-salary-monthly", money(v.salary * v.team));
    setText("engine-salary-daily", money((v.salary * v.team) / state.workdaysPerMonth));
    setText("engine-fixed-monthly", money(state.transport + state.accommodation));
    setText("engine-material-average", money(v.averageMaterial));
    setText("engine-material-monthly", money(v.monthlyMaterials));
    setText("engine-employee-hourly", money(v.employeeCostPerHour));
    setText("engine-salary-hourly", money(v.salaryCostPerHour));
    setText("engine-fixed-overhead-hourly", money(v.fixedOverheadPerHour));
    setText("engine-material-hourly", money(v.monthlyMaterials / v.capacity));
    setText("engine-material-formula", money(v.monthlyMaterials));
    const materialTarget = $("#engine-material-target"); if (materialTarget) materialTarget.value = v.dailyMaterialTarget;
    setText("engine-material-detail", `بناءً على ${v.dailyMaterialTarget} زيارة يومياً × ${state.workdaysPerMonth} يوم عمل، ومتوسط ${money(v.averageMaterial)} مواد لكل زيارة.`);
    const fixedCardLabel = $("#costHour")?.closest(".card")?.querySelector("p"); if (fixedCardLabel) fixedCardLabel.textContent = "التكلفة الثابتة / ساعة";
    setText("hourlyRate", money(v.hourlyRate)); setText("hourlyTotal", money(v.hourlyTotal)); setText("actual", `${v.billableMinutes} دقيقة`);
    setText("calculator-labor", money(v.employeeCostPerHour * v.billable)); setText("calculator-material", money(v.material));
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
    billableInput.value = actualMinutes[unit];
    billableInput.readOnly = true;
    if (billableInput.parentElement?.firstChild) billableInput.parentElement.firstChild.nodeValue = "وقت التنظيف والفوترة (بالدقائق)";
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
  const costSummary = costs?.querySelector(".cost-grid article:nth-child(2)");
  if (costSummary) costSummary.innerHTML = `<h2>ملخص التكاليف</h2><div class="rows"><p>إجمالي التكلفة الشهرية الحالية<strong id="monthly">—</strong></p><p>التكلفة الشهرية لتشغيل الموظفات<strong id="engine-salary-monthly">—</strong></p><p class="sub" style="margin-top:-7px">راتب الموظفات اليومي: <strong id="engine-salary-daily">—</strong> × 26 يوم عمل</p><p>المصاريف الثابتة الشهرية<strong id="engine-fixed-monthly">—</strong></p><p class="sub" style="margin-top:-7px">سكن الموظفين 2,000 + السيارة/النقل 2,000</p><p>مصاريف التشغيل المتغيرة لكل زيارة<strong id="engine-material-average">—</strong></p><p class="sub" style="margin-top:-7px">متوسط المواد فقط؛ مجموع مواد الشهر: <strong id="engine-material-monthly">—</strong></p><p>التكلفة المحملة / ساعة<strong id="costHour2">—</strong></p><p class="sub" style="margin-top:-7px">تكلفة العاملة في الساعة المستخدمة في الحاسبة: <strong id="engine-employee-hourly">—</strong></p><p class="sub" style="margin-top:-7px">تكلفة المواد في الساعة: <strong id="engine-material-hourly">—</strong></p></div>`;
  const fixedHourRow = costSummary?.querySelector("#costHour2")?.closest("p");
  if (fixedHourRow?.childNodes[0]) fixedHourRow.childNodes[0].nodeValue = "التكلفة الثابتة / ساعة";
  if (costs) costs.insertAdjacentHTML("beforeend", `<article class="panel engine-panel"><h3>التكاليف الثابتة والمواد</h3><p class="sub">النقل والوقود وسكن الموظفين ثابتان للشركة كلها. الإدارة والتشغيل غير محسوبين حالياً.</p><div class="engine-fields"><label>النقل والوقود الشهري<input value="2,000 SAR — ثابت للشركة" readonly></label><label>سكن الموظفين الشهري<input value="2,000 SAR — ثابت للشركة" readonly></label><label>هدف الزيارات اليومي للمواد (محسوب تلقائياً)<input id="engine-material-target" type="number" readonly value="0"></label><div class="engine-stat"><small>تكلفة المواد المتوقعة شهرياً</small><strong id="engine-material-formula">—</strong><p class="sub" id="engine-material-detail">—</p></div></div></article>`);
  costs?.querySelector(".cost-grid article:nth-child(2) .rows")?.insertAdjacentHTML("beforeend", '<p>سكن الموظفين الشهري<strong id="engine-accommodation-summary">2,000 SAR</strong></p>');
  if (costs) costs.insertAdjacentHTML("beforeend", `<article class="panel engine-panel"><h3>عينات مرجعية لشراء المستلزمات</h3><p class="sub">أسعار سوق حالية للاسترشاد عند الشراء بالجملة أو بالكرتون. تكلفة المواد في النموذج تبقى تقديراً إجمالياً لكل زيارة، وليست جمعاً مباشراً لهذه العبوات.</p><table class="engine-table"><thead><tr><th>الصنف</th><th>سعر السوق</th><th>الاستخدام التقريبي</th><th>تكلفة الاستخدام</th></tr></thead><tbody><tr><td><a href="https://www.carrefourksa.com/mafsau/en/multi-purpose-cleaner/dac-base-disinf-5l-bakhour-offer/p/752991?offer=offer_carrefour_&sellerId=0000&sid=QCOMM" target="_blank" rel="noreferrer">منظف أرضيات DAC، 5 لتر</a></td><td>21.99 SAR</td><td>50 مل / زيارة</td><td>0.22 SAR</td></tr><tr><td><a href="https://aleithar.sa/en/qs-vinyl-gloves-carton-powder-free-transparent/p1264123435" target="_blank" rel="noreferrer">قفازات فينيل، كرتون 1,000</a></td><td>77.39 SAR</td><td>زوج / زيارة</td><td>0.15 SAR</td></tr><tr><td><a href="https://aryaf.com.sa/ar/wholesale-medium-thickness-trash-bags-50-gal-500-bags/p1060182784" target="_blank" rel="noreferrer">أكياس نفايات، 500 كيس</a></td><td>175.70 SAR</td><td>كيس / زيارة</td><td>0.35 SAR</td></tr><tr><td><a href="https://www.carrefourksa.com/mafsau/ar/c/02245" target="_blank" rel="noreferrer">منظف زجاج DAC، 4 لتر</a></td><td>28.95 SAR</td><td>20 مل / زيارة</td><td>0.14 SAR</td></tr></tbody></table><p class="sub">الأسعار تتغير حسب المورد والعروض. تشمل تكلفة الزيارة في النموذج أيضاً استهلاك المايكروفايبر ومنظفات الحمام والمطبخ والفاقد التشغيلي.</p></article>`);

  const dashboard = $("#dash");
  if (dashboard) dashboard.insertAdjacentHTML("beforeend", '<article id="financial-health" class="panel engine-panel"></article><section id="engine-warnings"></section>');
  const calculator = $("#calc");
  if (calculator) calculator.querySelector(".panel")?.insertAdjacentHTML("beforeend", '<article class="panel engine-panel"><h3>كيف يُحسب السعر؟</h3><div class="engine-grid"><div class="engine-stat"><small>بالساعة</small><strong id="engine-hourly-explainer">—</strong><p class="sub">تكلفة عاملة واحدة × وقت التنظيف، ثم تضاف مواد الوحدة.</p></div><div class="engine-stat"><small>بالزيارة</small><strong id="engine-visit-explainer">—</strong><p class="sub">إجمالي الساعات بعد التعديل، ولا يقل عن الحد الأدنى للزيارة.</p></div></div></article>');
  calculator?.querySelector(".result .rows")?.insertAdjacentHTML("afterbegin", '<p>تكلفة العاملة للزيارة<strong id="calculator-labor">—</strong></p><p>تكلفة مواد الوحدة<strong id="calculator-material">—</strong></p>');

  const originalRender = render;
  const renderWithExplain = () => { originalRender(); const v = calc(); setText("engine-hourly-explainer", money(v.hourlyTotal)); setText("engine-visit-explainer", money(v.beforeTax)); };
  render = renderWithExplain;

  home.addEventListener("change", () => { loadUnitServiceDefaults(); syncState(); });
  service.addEventListener("change", () => { loadUnitServiceDefaults(); syncState(); });
  [minVisitInput, adjustInput, salaryInput, teamInput, hoursInput].filter(Boolean).forEach(input => input.addEventListener("input", syncState));
  $("#quick-team")?.addEventListener("input", event => { if (teamInput) { teamInput.value = event.target.value; } syncState(); });
  const quickTeam = $("#quick-team"); if (quickTeam) { quickTeam.value = 2; quickTeam.readOnly = true; }

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
