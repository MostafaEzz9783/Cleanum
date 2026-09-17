(() => {
  const $ = (selector) => document.querySelector(selector);
  const dashboard = $("#dash");
  const calculator = $("#calc");
  const costs = $("#costs");
  const fmt = (value) =>
    Number(value).toLocaleString(document.documentElement.lang === "en" ? "en-SA" : "ar-SA", {
      maximumFractionDigits: 1,
    }) + " SAR";

  calculator.querySelector(".panel").insertAdjacentHTML(
    "afterbegin",
    '<div id="staffing-note" style="margin:0 0 16px;padding:11px 13px;border-radius:9px;background:#e8faf4;color:#176e62;font-size:13px"><strong>✓ عاملة واحدة لكل زيارة</strong><br><span style="font-size:11px">عدد العاملات في الشركة يوزّع التكلفة الشهرية فقط، ولا يُضرب في تكلفة الشقة.</span></div><div id="material-note" style="margin:0 0 16px;padding:11px 13px;border-radius:9px;background:#f5f8fb;color:#46627a;font-size:13px"><strong>تكلفة المستلزمات المرجعية: <span id="material-cost">2.9 SAR</span></strong><br><span style="font-size:11px">للتشغيل والربحية فقط — مدرجة حاليًا في مجمع التكاليف الشهري ولا تُضاف مرة ثانية للسعر.</span></div>',
  );

  costs.insertAdjacentHTML(
    "beforeend",
    '<article class="panel" style="margin-top:17px"><h2>تكلفة المستلزمات المرجعية لكل زيارة</h2><p style="font-size:12px;color:#71869a">مبنية على عرض المورد قبل VAT، وتشمل المنظفات، القفازات، كيس النفايات، واستهلاك المايكروفايبر القابل لإعادة الاستخدام.</p><div class="rows"><p>Studio — تنظيف دوري<strong>1.43 SAR</strong></p><p>1BR — تنظيف دوري<strong>1.96 SAR</strong></p><p>2BR — تنظيف دوري<strong>2.82 SAR</strong></p><p>3BR — تنظيف دوري<strong>3.66 SAR</strong></p></div><p style="margin:13px 0 0;color:#147d6e;font-size:12px">Turnover Cleaning = تكلفة المواد × 1.4</p></article>',
  );

  const serviceSelect = calculator.querySelectorAll("select")[1];
  serviceSelect.id = "serviceType";
  const materialByUnit = { 0.5: 1.43, 1: 1.96, 1.5: 2.82, 2: 3.66 };
  function updateMaterialCost() {
    const base = materialByUnit[Number($("#home").value)] || 0;
    const turnover = serviceSelect.selectedIndex === 1;
    $("#material-cost").textContent = fmt(base * (turnover ? 1.4 : 1));
  }

  dashboard.insertAdjacentHTML(
    "beforeend",
    '<article class="panel" id="quick-simulator" style="margin-top:17px"><div style="display:flex;justify-content:space-between;align-items:start;gap:20px"><div><h2>محاكي الداشبورد السريع</h2><p style="color:#71869a;font-size:13px;margin:7px 0 0">8 ساعات يومياً × 6 أيام أسبوعياً — 3 زيارات لكل عاملة يومياً.</p></div><span style="background:#e8faf4;color:#147d6e;padding:7px 10px;border-radius:7px;font-size:11px">عاملة واحدة / زيارة</span></div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:19px"><label class="field" style="margin:0">عدد العاملات في الشركة<input id="quick-team" type="number" min="1" value="8"></label><label class="field" style="margin:0">الزيارات الشهرية (محسوبة)<input id="quick-visits" type="number" readonly value="624"></label><div style="background:#f4f8fa;border-radius:9px;padding:12px"><span style="font-size:11px;color:#71869a">متوسط سعر الزيارة</span><b id="quick-price" style="display:block;font-size:18px;margin-top:7px">0 SAR</b></div><div style="background:#f4f8fa;border-radius:9px;padding:12px"><span style="font-size:11px;color:#71869a">متوسط إيراد الشفت</span><b id="quick-shift" style="display:block;font-size:18px;margin-top:7px">0 SAR</b></div></div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:15px"><div style="border-right:3px solid #36c3b7;padding-right:10px"><span style="font-size:11px;color:#71869a">الإيراد الشهري المتوقع</span><b id="quick-revenue" style="display:block;font-size:19px;margin-top:5px">0 SAR</b></div><div style="border-right:3px solid #f1b858;padding-right:10px"><span style="font-size:11px;color:#71869a">التكلفة الشهرية</span><b id="quick-cost" style="display:block;font-size:19px;margin-top:5px">0 SAR</b></div><div style="border-right:3px solid #36c3b7;padding-right:10px"><span style="font-size:11px;color:#71869a">الربح التشغيلي المتوقع</span><b id="quick-profit" style="display:block;font-size:19px;margin-top:5px">0 SAR</b></div></div></article>',
  );

  function updateDashboard() {
    const team = Math.max(1, Number($("#quick-team").value) || 1);
    const visits = Math.max(0, Number($("#quick-visits").value) || 0);
    $("#team").value = team;
    $("#team").dispatchEvent(new Event("input", { bubbles: true }));
    const salary = Number($("#salary").value) || 0;
    const hours = Math.max(1, Number($("#hours").value) || 1);
    const billable = Math.max(0, Number($("#billableInput").value) || 0);
    const minimumVisit = Math.max(0, Number($("#minVisit").value) || 0);
    const adjustment = Number($("#adjust").value) || 0;
    const monthlyCost = salary * team + 12400 + 5700 + 6800;
    const hourlyRate = (monthlyCost / (team * hours)) / 0.6;
    const price = (Math.max(hourlyRate * billable, minimumVisit) + adjustment) * 1.15;
    const revenue = price * visits;
    $("#quick-price").textContent = fmt(price);
    $("#quick-revenue").textContent = fmt(revenue);
    $("#quick-cost").textContent = fmt(monthlyCost);
    $("#quick-profit").textContent = fmt(revenue - monthlyCost);
  }

  ["#quick-team", "#quick-visits"].forEach((selector) =>
    $(selector).addEventListener("input", updateDashboard),
  );
  ["#salary", "#hours", "#billableInput", "#minVisit", "#adjust"].forEach((selector) =>
    $(selector).addEventListener("input", updateDashboard),
  );
  ["#home", "#serviceType"].forEach((selector) =>
    $(selector).addEventListener("input", updateMaterialCost),
  );

  document.querySelectorAll(".card").forEach((card, index) => {
    card.style.cursor = "pointer";
    card.title = "افتح الحاسبة";
    card.addEventListener("click", () => {
      document.querySelector('[data-page="' + (index === 3 ? "costs" : "calc") + '"]').click();
    });
  });
  updateDashboard();
  updateMaterialCost();
})();
