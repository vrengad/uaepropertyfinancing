/*********************************
 * UAE Property Financing (Static)
 * - 3 scenarios (A/B/C)
 * - LocalStorage persistence
 * - Cashflow, Net Yield, CoC, IRR
 *********************************/

/* ---------- Date (top-right) ---------- */
(function setToday() {
  const today = new Date();
  const el = document.getElementById("gregorian-date");
  if (!el) return;
  el.textContent = today.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
})();

/* ---------- Quotes (kept) ---------- */
const quotes = [
  { tamil: "முயற்சி திருவினையாக்கும்.", english: "Effort will bring success." },
  { tamil: "கற்றது கைமண் அளவு, கல்லாதது உலகளவு.", english: "What we have learned is small; what we haven't is vast." },
  { tamil: "யாதும் ஊரே யாவரும் கேளிர்.", english: "All towns are ours; all people are our kin." },
  { tamil: "தீதும் நன்றும் பிறர் தர வாரா.", english: "Good and bad do not come from others." },
  { tamil: "ஒன்று பட்டால் உண்டு வாழ்வு.", english: "Unity is strength." },
  { tamil: "அறம் செய்ய விரும்பு.", english: "Desire to do good deeds." }
];

const tamilQuoteEl = document.getElementById("tamil-quote");
const englishMeaningEl = document.getElementById("english-meaning");
const newQuoteBtn = document.getElementById("new-quote-btn");

let currentQuoteIndex = -1;
function showRandomQuote() {
  if (!tamilQuoteEl || !englishMeaningEl) return;
  let index;
  do {
    index = Math.floor(Math.random() * quotes.length);
  } while (index === currentQuoteIndex && quotes.length > 1);

  currentQuoteIndex = index;
  tamilQuoteEl.style.opacity = 0;
  englishMeaningEl.style.opacity = 0;

  setTimeout(() => {
    tamilQuoteEl.textContent = `"${quotes[index].tamil}"`;
    englishMeaningEl.textContent = quotes[index].english;
    tamilQuoteEl.style.opacity = 1;
    englishMeaningEl.style.opacity = 1;
  }, 250);
}
if (newQuoteBtn) newQuoteBtn.addEventListener("click", showRandomQuote);
showRandomQuote();

/* ---------- State & defaults ---------- */
const STORAGE_KEY = "uaePropertyFinancing.scenarios.v1";

const DEFAULTS = {
  A: {
    name: "Scenario A",
    emirate: "Dubai",
    unitType: "1BHK",
    offPlan: false,

    fxAedPerEur: 4.00, // 1 EUR = X AED
    purchasePriceAed: 800000,

    annualRentAed: 72000,
    vacancyPct: 5,
    rentGrowthPct: 3,
    expenseGrowthPct: 2,

    // Upfront costs
    regFeePct: 4.0,
    regAdminAed: 580,
    agentPct: 2.0,
    vatPct: 5.0,
    trusteeFeeAed: 4000,
    nocFeeAed: 1500,
    otherUpfrontAed: 0,
    furnitureAed: 0,

    // Operating
    serviceChargesAedYr: 12000,
    mgmtPct: 8,
    maintPct: 5,
    insuranceAedYr: 800,
    otherOpAedYr: 0,

    // Financing
    financingMode: "UAE Mortgage", // Cash | UAE Mortgage | NL Loan
    uaeDownPct: 25,
    uaeRatePct: 5.5,
    uaeTermYrs: 25,
    uaeBankFeePct: 1.0,
    uaeBankFeeAed: 0,
    uaeMortgageRegPct: 0.25,
    uaeMortgageRegAdminAed: 290,

    nlLoanAmountEur: 0,
    nlRatePct: 5.0,
    nlTermYrs: 20,
    nlRepayment: "Amortizing", // Amortizing | Interest-only
    nlBankFeePct: 0.0,
    nlBankFeeEur: 0.0,

    // Exit
    holdYrs: 7,
    appreciationPct: 3.0,
    sellAgentPct: 2.0,
    sellVatPct: 5.0,
    sellOtherAed: 0
  },
  B: null,
  C: null
};

DEFAULTS.B = { ...DEFAULTS.A, name: "Scenario B", financingMode: "NL Loan", emirate: "Abu Dhabi", regFeePct: 2.0, uaeMortgageRegPct: 0.10, purchasePriceAed: 750000, annualRentAed: 65000, nlLoanAmountEur: 120000 };
DEFAULTS.C = { ...DEFAULTS.A, name: "Scenario C", financingMode: "Cash", emirate: "Dubai", regFeePct: 4.0, uaeMortgageRegPct: 0.25, purchasePriceAed: 700000, annualRentAed: 60000 };

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(DEFAULTS);
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.A || !parsed.B || !parsed.C) return clone(DEFAULTS);
    return parsed;
  } catch {
    return clone(DEFAULTS);
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const badge = document.getElementById("autosave-badge");
    if (badge) {
      badge.textContent = "Auto-saved";
      badge.style.opacity = "1";
      setTimeout(() => (badge.style.opacity = "0.85"), 400);
    }
  } catch {}
}

function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function num(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }

function fmtMoney(v, cur) {
  const x = num(v);
  if (cur === "AED") return x.toLocaleString("en-GB", { maximumFractionDigits: 0 }) + " AED";
  if (cur === "EUR") return x.toLocaleString("en-GB", { maximumFractionDigits: 0 }) + " EUR";
  return x.toLocaleString("en-GB", { maximumFractionDigits: 2 });
}
function fmtPct(v) { return num(v).toLocaleString("en-GB", { maximumFractionDigits: 2 }) + "%"; }
function fmtIrr(v) { return Number.isFinite(v) ? fmtPct(v * 100) : "n/a"; }

function defaultRegFeePct(emirate) { return emirate === "Abu Dhabi" ? 2.0 : 4.0; }
function defaultMortgageRegPct(emirate) { return emirate === "Abu Dhabi" ? 0.10 : 0.25; }

/* ----- Finance math ----- */
function pmt(principal, annualRatePct, termYears) {
  const P = num(principal);
  const r = num(annualRatePct) / 100 / 12;
  const n = Math.round(num(termYears) * 12);
  if (P <= 0 || n <= 0) return 0;
  if (Math.abs(r) < 1e-10) return P / n;
  const pow = Math.pow(1 + r, n);
  return P * r * pow / (pow - 1);
}

function remainingBalance(principal, annualRatePct, termYears, monthsPaid) {
  const P = num(principal);
  const r = num(annualRatePct) / 100 / 12;
  const n = Math.round(num(termYears) * 12);
  const m = clamp(Math.round(num(monthsPaid)), 0, n);
  if (P <= 0 || n <= 0) return 0;
  if (Math.abs(r) < 1e-10) {
    const paid = (P / n) * m;
    return Math.max(0, P - paid);
  }
  const PMT = pmt(P, annualRatePct, termYears);
  const pow = Math.pow(1 + r, m);
  const bal = P * pow - PMT * ((pow - 1) / r);
  return Math.max(0, bal);
}

/* ----- IRR (yearly periods) ----- */
function irr(cashflows) {
  if (!cashflows || cashflows.length < 2) return NaN;
  const hasPos = cashflows.some(c => c > 0);
  const hasNeg = cashflows.some(c => c < 0);
  if (!hasPos || !hasNeg) return NaN;

  const npv = (rate) => cashflows.reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t), 0);
  const dnpv = (rate) => cashflows.reduce((s, cf, t) => {
    if (t === 0) return s;
    return s + (-t * cf) / Math.pow(1 + rate, t + 1);
  }, 0);

  // Newton
  let x = 0.12;
  for (let i = 0; i < 80; i++) {
    const f = npv(x);
    if (Math.abs(f) < 1e-7) return x;
    const df = dnpv(x);
    if (Math.abs(df) < 1e-10) break;
    const nx = x - f / df;
    if (nx <= -0.95 || nx > 5) break;
    x = nx;
  }

  // Bisection
  let lo = -0.9, hi = 2.5;
  let flo = npv(lo), fhi = npv(hi);
  if (flo * fhi > 0) return NaN;
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    const fmid = npv(mid);
    if (Math.abs(fmid) < 1e-7) return mid;
    if (flo * fmid < 0) { hi = mid; fhi = fmid; }
    else { lo = mid; flo = fmid; }
  }
  return (lo + hi) / 2;
}

/* ----- Scenario calculation ----- */
function calcScenario(s) {
  const fx = Math.max(0.0001, num(s.fxAedPerEur)); // AED per 1 EUR
  const aedToEur = (aed) => num(aed) / fx;
  const eurToAed = (eur) => num(eur) * fx;

  const priceAed = num(s.purchasePriceAed);

  // Upfront fees
  const regFeeAed = priceAed * num(s.regFeePct) / 100;
  const agentFeeAed = priceAed * num(s.agentPct) / 100;
  const agentVatAed = agentFeeAed * num(s.vatPct) / 100;

  // Financing-dependent upfront fees
  let mortgageRegAed = 0;
  let bankFeesAed = 0;
  let bankFeesEur = 0;

  // Debt service + remaining balance
  let annualDebtServiceAed = 0;
  let annualDebtServiceEur = 0;
  let remainingLoanAtExitAed = 0;
  let remainingLoanAtExitEur = 0;

  if (s.financingMode === "UAE Mortgage") {
    const downPct = clamp(num(s.uaeDownPct), 0, 100);
    const loanAed = Math.max(0, priceAed * (1 - downPct / 100));

    mortgageRegAed = loanAed * num(s.uaeMortgageRegPct) / 100 + num(s.uaeMortgageRegAdminAed);
    bankFeesAed = loanAed * num(s.uaeBankFeePct) / 100 + num(s.uaeBankFeeAed);

    const mPmt = pmt(loanAed, num(s.uaeRatePct), num(s.uaeTermYrs));
    annualDebtServiceAed = mPmt * 12;

    const monthsHeld = Math.round(num(s.holdYrs) * 12);
    remainingLoanAtExitAed = remainingBalance(loanAed, num(s.uaeRatePct), num(s.uaeTermYrs), monthsHeld);
  } else if (s.financingMode === "NL Loan") {
    const loanEur = Math.max(0, num(s.nlLoanAmountEur));
    bankFeesEur = loanEur * num(s.nlBankFeePct) / 100 + num(s.nlBankFeeEur);

    if (s.nlRepayment === "Interest-only") {
      annualDebtServiceEur = loanEur * (num(s.nlRatePct) / 100);
      remainingLoanAtExitEur = loanEur;
    } else {
      const mPmtEur = pmt(loanEur, num(s.nlRatePct), num(s.nlTermYrs));
      annualDebtServiceEur = mPmtEur * 12;
      const monthsHeld = Math.round(num(s.holdYrs) * 12);
      remainingLoanAtExitEur = remainingBalance(loanEur, num(s.nlRatePct), num(s.nlTermYrs), monthsHeld);
    }
  }

  const upfrontAed =
    regFeeAed + num(s.regAdminAed) +
    agentFeeAed + agentVatAed +
    num(s.trusteeFeeAed) + num(s.nocFeeAed) +
    num(s.otherUpfrontAed) + num(s.furnitureAed) +
    mortgageRegAed + bankFeesAed;

  const totalAcqCostAed = priceAed + upfrontAed;

  // Operating (year 1 base)
  const grossRent1 = num(s.annualRentAed);
  const vacancy = clamp(num(s.vacancyPct), 0, 100) / 100;
  const rentGrowth = num(s.rentGrowthPct) / 100;
  const expGrowth = num(s.expenseGrowthPct) / 100;

  const service1 = num(s.serviceChargesAedYr);
  const insurance1 = num(s.insuranceAedYr);
  const otherOp1 = num(s.otherOpAedYr);

  const mgmtPct = clamp(num(s.mgmtPct), 0, 100) / 100;
  const maintPct = clamp(num(s.maintPct), 0, 100) / 100;

  // Build yearly cashflows in EUR for IRR
  const holdYrs = Math.max(1, Math.round(num(s.holdYrs)));
  const cashflowsEur = [];

  // Cash invested (year 0)
  let cashInvestedEur = aedToEur(totalAcqCostAed) + bankFeesEur;

  if (s.financingMode === "UAE Mortgage") {
    const downPct = clamp(num(s.uaeDownPct), 0, 100) / 100;
    const downPaymentAed = priceAed * downPct;
    cashInvestedEur = aedToEur(downPaymentAed + upfrontAed);
  } else if (s.financingMode === "NL Loan") {
    const totalCostEur = aedToEur(totalAcqCostAed);
    cashInvestedEur = Math.max(0, totalCostEur - num(s.nlLoanAmountEur)) + bankFeesEur;
  }

  cashflowsEur.push(-cashInvestedEur);

  let noiAedYr1 = 0;
  let annualCashflowEurYr1 = 0;

  for (let y = 1; y <= holdYrs; y++) {
    const rentY = grossRent1 * Math.pow(1 + rentGrowth, y - 1);
    const collectedRentY = rentY * (1 - vacancy);

    const serviceY = service1 * Math.pow(1 + expGrowth, y - 1);
    const insuranceY = insurance1 * Math.pow(1 + expGrowth, y - 1);
    const otherOpY = otherOp1 * Math.pow(1 + expGrowth, y - 1);

    const mgmtY = collectedRentY * mgmtPct;
    const maintY = collectedRentY * maintPct;

    const noiY = collectedRentY - (serviceY + insuranceY + otherOpY + mgmtY + maintY);

    if (y === 1) noiAedYr1 = noiY;

    let debtY_Eur = 0;
    if (s.financingMode === "UAE Mortgage") debtY_Eur = aedToEur(annualDebtServiceAed);
    else if (s.financingMode === "NL Loan") debtY_Eur = annualDebtServiceEur;

    const cashflowY_Eur = aedToEur(noiY) - debtY_Eur;
    if (y === 1) annualCashflowEurYr1 = cashflowY_Eur;

    cashflowsEur.push(cashflowY_Eur);
  }

  // Exit
  const salePriceAed = priceAed * Math.pow(1 + num(s.appreciationPct) / 100, holdYrs);
  const sellAgentAed = salePriceAed * num(s.sellAgentPct) / 100;
  const sellVatAed = sellAgentAed * num(s.sellVatPct) / 100;
  const sellOtherAed = num(s.sellOtherAed);

  const saleNetAedBeforeDebt = salePriceAed - sellAgentAed - sellVatAed - sellOtherAed;

  let debtPayoffEur = 0;
  if (s.financingMode === "UAE Mortgage") debtPayoffEur = aedToEur(remainingLoanAtExitAed);
  else if (s.financingMode === "NL Loan") debtPayoffEur = remainingLoanAtExitEur;

  const saleProceedsEur = aedToEur(saleNetAedBeforeDebt) - debtPayoffEur;
  cashflowsEur[cashflowsEur.length - 1] += saleProceedsEur;

  const totalAcqCostEur = aedToEur(totalAcqCostAed);
  const noiEurYr1 = aedToEur(noiAedYr1);

  const netYield = totalAcqCostEur > 0 ? (noiEurYr1 / totalAcqCostEur) : NaN;

  const annualDebtServiceEurShown =
    (s.financingMode === "UAE Mortgage") ? aedToEur(annualDebtServiceAed) :
    (s.financingMode === "NL Loan") ? annualDebtServiceEur :
    0;

  const monthlyCashflowEur = annualCashflowEurYr1 / 12;
  const monthlyCashflowAed = eurToAed(monthlyCashflowEur);

  const cashOnCash = cashInvestedEur > 0 ? (annualCashflowEurYr1 / cashInvestedEur) : NaN;
  const irrVal = irr(cashflowsEur);

  return {
    totalAcqCostAed, totalAcqCostEur,
    cashInvestedEur,
    noiAedYr1, noiEurYr1,
    annualDebtServiceEur: annualDebtServiceEurShown,
    monthlyCashflowEur, monthlyCashflowAed,
    netYield, cashOnCash, irr: irrVal
  };
}

/* ----- Rendering ----- */
const state = loadState();
const scenarioKeys = ["A", "B", "C"];
const scenariosEl = document.getElementById("scenarios");
const compareBodyEl = document.getElementById("compare-body");

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inputNumber(key, field, labelText, value, step) {
  return `
    <div>
      <label for="${key}-${field}">${labelText}</label>
      <input id="${key}-${field}" data-scenario="${key}" data-field="${field}" type="number" step="${step}" value="${escapeHtml(value)}" />
    </div>
  `;
}
function inputText(key, field, labelText, value) {
  return `
    <div>
      <label for="${key}-${field}">${labelText}</label>
      <input id="${key}-${field}" data-scenario="${key}" data-field="${field}" type="text" value="${escapeHtml(value)}" />
    </div>
  `;
}
function select(key, field, labelText, value, options) {
  const opts = options.map(o => `<option value="${escapeHtml(o)}" ${o===value?"selected":""}>${escapeHtml(o)}</option>`).join("");
  return `
    <div>
      <label for="${key}-${field}">${labelText}</label>
      <select id="${key}-${field}" data-scenario="${key}" data-field="${field}">${opts}</select>
    </div>
  `;
}
function checkbox(key, field, labelText, checked) {
  return `
    <div class="inline">
      <input id="${key}-${field}" data-scenario="${key}" data-field="${field}" type="checkbox" ${checked ? "checked" : ""} />
      <label for="${key}-${field}">${labelText}</label>
    </div>
  `;
}

function scenarioCardHtml(key, s) {
  return `
  <div class="card scenario-card" data-scenario="${key}">
    <div class="card-header">
      <div class="scenario-title">
        <h3>${key}: ${escapeHtml(s.name)}</h3>
        <span class="badge">${escapeHtml(s.financingMode)}</span>
      </div>
      <div class="muted tiny">Emirate: <strong>${escapeHtml(s.emirate)}</strong></div>
    </div>

    <div class="card-body">
      <div class="kpis">
        <div class="kpi"><div class="label">Monthly Cashflow</div><div class="value" id="kpi-cf-${key}">—</div></div>
        <div class="kpi"><div class="label">Net Yield (Yr1)</div><div class="value" id="kpi-yield-${key}">—</div></div>
        <div class="kpi"><div class="label">Cash-on-Cash (Yr1)</div><div class="value" id="kpi-coc-${key}">—</div></div>
        <div class="kpi"><div class="label">IRR (Hold)</div><div class="value" id="kpi-irr-${key}">—</div></div>
      </div>

      <div class="fieldset">
        <div class="fieldset-title">Property</div>
        <div class="form-grid">
          ${inputText(key,"name","Scenario name",s.name)}
          ${select(key,"emirate","Emirate",s.emirate,["Dubai","Abu Dhabi"])}
          ${select(key,"unitType","Unit type",s.unitType,["Studio","1BHK","2BHK"])}
          ${checkbox(key,"offPlan","Off-plan",s.offPlan)}
          ${inputNumber(key,"purchasePriceAed","Purchase price (AED)",s.purchasePriceAed,0)}
          ${inputNumber(key,"annualRentAed","Annual rent (AED)",s.annualRentAed,0)}
          ${inputNumber(key,"vacancyPct","Vacancy (%)",s.vacancyPct,0.1)}
          ${inputNumber(key,"serviceChargesAedYr","Service charges / year (AED)",s.serviceChargesAedYr,0)}
        </div>
      </div>

      <div class="fieldset">
        <div class="fieldset-title">Upfront costs</div>
        <div class="form-grid">
          ${inputNumber(key,"regFeePct","Registration fee (%)",s.regFeePct,0.01)}
          ${inputNumber(key,"regAdminAed","Registration admin (AED)",s.regAdminAed,0)}
          ${inputNumber(key,"agentPct","Agent fee (%)",s.agentPct,0.01)}
          ${inputNumber(key,"vatPct","VAT on agent fee (%)",s.vatPct,0.01)}
          ${inputNumber(key,"trusteeFeeAed","Trustee / admin (AED)",s.trusteeFeeAed,0)}
          ${inputNumber(key,"nocFeeAed","NOC fee (AED)",s.nocFeeAed,0)}
          ${inputNumber(key,"furnitureAed","Furniture / setup (AED)",s.furnitureAed,0)}
          ${inputNumber(key,"otherUpfrontAed","Other upfront (AED)",s.otherUpfrontAed,0)}
        </div>
      </div>

      <div class="fieldset">
        <div class="fieldset-title">Operating assumptions</div>
        <div class="form-grid">
          ${inputNumber(key,"mgmtPct","Property mgmt (% of collected rent)",s.mgmtPct,0.01)}
          ${inputNumber(key,"maintPct","Maintenance reserve (% of collected rent)",s.maintPct,0.01)}
          ${inputNumber(key,"insuranceAedYr","Insurance / year (AED)",s.insuranceAedYr,0)}
          ${inputNumber(key,"otherOpAedYr","Other operating / year (AED)",s.otherOpAedYr,0)}
          ${inputNumber(key,"rentGrowthPct","Rent growth (%/yr)",s.rentGrowthPct,0.01)}
          ${inputNumber(key,"expenseGrowthPct","Expense growth (%/yr)",s.expenseGrowthPct,0.01)}
        </div>
      </div>

      <div class="fieldset">
        <div class="fieldset-title">Financing</div>
        <div class="form-grid">
          ${select(key,"financingMode","Financing mode",s.financingMode,["Cash","UAE Mortgage","NL Loan"])}
          ${inputNumber(key,"fxAedPerEur","FX: 1 EUR = (AED)",s.fxAedPerEur,0.0001)}
        </div>

        <div class="subcard" id="uae-mortgage-${key}" style="display:none;">
          <div class="fieldset-title">UAE Mortgage</div>
          <div class="form-grid">
            ${inputNumber(key,"uaeDownPct","Down payment (%)",s.uaeDownPct,0.1)}
            ${inputNumber(key,"uaeRatePct","Interest rate (%/yr)",s.uaeRatePct,0.01)}
            ${inputNumber(key,"uaeTermYrs","Term (years)",s.uaeTermYrs,1)}
            ${inputNumber(key,"uaeBankFeePct","Bank fee (% of loan)",s.uaeBankFeePct,0.01)}
            ${inputNumber(key,"uaeBankFeeAed","Bank fee (fixed AED)",s.uaeBankFeeAed,0)}
            ${inputNumber(key,"uaeMortgageRegPct","Mortgage registration (% of loan)",s.uaeMortgageRegPct,0.01)}
            ${inputNumber(key,"uaeMortgageRegAdminAed","Mortgage reg admin (AED)",s.uaeMortgageRegAdminAed,0)}
          </div>
        </div>

        <div class="subcard" id="nl-loan-${key}" style="display:none;">
          <div class="fieldset-title">NL Loan (EUR)</div>
          <div class="form-grid">
            ${inputNumber(key,"nlLoanAmountEur","Loan amount (EUR)",s.nlLoanAmountEur,0)}
            ${inputNumber(key,"nlRatePct","Interest rate (%/yr)",s.nlRatePct,0.01)}
            ${inputNumber(key,"nlTermYrs","Term (years)",s.nlTermYrs,1)}
            ${select(key,"nlRepayment","Repayment type",s.nlRepayment,["Amortizing","Interest-only"])}
            ${inputNumber(key,"nlBankFeePct","Bank fee (% of loan)",s.nlBankFeePct,0.01)}
            ${inputNumber(key,"nlBankFeeEur","Bank fee (fixed EUR)",s.nlBankFeeEur,0.01)}
          </div>
          <p class="muted tiny" style="margin-top:8px;">
            Cash invested is calculated as (Total acquisition cost in EUR − Loan amount) + bank fees.
          </p>
        </div>
      </div>

      <div class="fieldset">
        <div class="fieldset-title">Exit (for IRR)</div>
        <div class="form-grid">
          ${inputNumber(key,"holdYrs","Hold period (years)",s.holdYrs,1)}
          ${inputNumber(key,"appreciationPct","Price appreciation (%/yr)",s.appreciationPct,0.01)}
          ${inputNumber(key,"sellAgentPct","Selling agent fee (%)",s.sellAgentPct,0.01)}
          ${inputNumber(key,"sellVatPct","VAT on selling agent fee (%)",s.sellVatPct,0.01)}
          ${inputNumber(key,"sellOtherAed","Other selling costs (AED)",s.sellOtherAed,0)}
        </div>
      </div>
    </div>
  </div>
  `;
}

function showHideFinancingSections() {
  scenarioKeys.forEach(k => {
    const mode = state[k].financingMode;
    const uaeEl = document.getElementById(`uae-mortgage-${k}`);
    const nlEl = document.getElementById(`nl-loan-${k}`);
    if (uaeEl) uaeEl.style.display = (mode === "UAE Mortgage") ? "block" : "none";
    if (nlEl) nlEl.style.display = (mode === "NL Loan") ? "block" : "none";
  });
}

function wireInputs() {
  document.querySelectorAll("[data-scenario][data-field]").forEach(el => {
    const key = el.getAttribute("data-scenario");
    const field = el.getAttribute("data-field");

    el.addEventListener("input", () => {
      const prev = state[key][field];

      if (el.type === "checkbox") state[key][field] = el.checked;
      else if (el.tagName === "SELECT" || el.type === "text") state[key][field] = el.value;
      else state[key][field] = num(el.value);

      if (field === "emirate") {
        const newEm = state[key].emirate;
        const oldDefault = defaultRegFeePct(prev);
        const newDefault = defaultRegFeePct(newEm);
        if (Math.abs(num(state[key].regFeePct) - oldDefault) < 0.001) state[key].regFeePct = newDefault;

        const oldMort = defaultMortgageRegPct(prev);
        const newMort = defaultMortgageRegPct(newEm);
        if (Math.abs(num(state[key].uaeMortgageRegPct) - oldMort) < 0.001) state[key].uaeMortgageRegPct = newMort;
      }

      showHideFinancingSections();
      saveState(state);
      recalcAndRender();
    });
  });

  showHideFinancingSections();
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderCompare(rows, results) {
  if (!compareBodyEl) return;

  setText("th-a", `A: ${state.A.name}`);
  setText("th-b", `B: ${state.B.name}`);
  setText("th-c", `C: ${state.C.name}`);

  compareBodyEl.innerHTML = rows.map(row => {
    const cells = scenarioKeys.map(k => {
      const r = results[k];
      const valStr = row.fmt(state[k], r);

      let cls = "";
      if (row.metric) {
        const vals = scenarioKeys.map(kk => results[kk][row.metric]).filter(v => Number.isFinite(v));
        if (vals.length) {
          const best = Math.max(...vals);
          if (Number.isFinite(results[k][row.metric]) && Math.abs(results[k][row.metric] - best) < 1e-12) cls = "best";
        }
      }

      return `<td class="${cls}">${escapeHtml(valStr)}</td>`;
    }).join("");

    return `<tr><td>${escapeHtml(row.label)}</td>${cells}</tr>`;
  }).join("");
}

function recalcAndRender() {
  const results = {
    A: calcScenario(state.A),
    B: calcScenario(state.B),
    C: calcScenario(state.C)
  };

  scenarioKeys.forEach(k => {
    const r = results[k];
    setText(`kpi-cf-${k}`, `${fmtMoney(r.monthlyCashflowAed,"AED")} / ${fmtMoney(r.monthlyCashflowEur,"EUR")}`);
    setText(`kpi-yield-${k}`, Number.isFinite(r.netYield) ? fmtPct(r.netYield * 100) : "n/a");
    setText(`kpi-coc-${k}`, Number.isFinite(r.cashOnCash) ? fmtPct(r.cashOnCash * 100) : "n/a");
    setText(`kpi-irr-${k}`, fmtIrr(r.irr));
  });

  const rows = [
    { label: "Purchase price", fmt: (s, r) => fmtMoney(s.purchasePriceAed,"AED") },
    { label: "Total acquisition cost", fmt: (s, r) => `${fmtMoney(r.totalAcqCostAed,"AED")} / ${fmtMoney(r.totalAcqCostEur,"EUR")}` },
    { label: "Cash invested (upfront)", fmt: (s, r) => fmtMoney(r.cashInvestedEur,"EUR") },
    { label: "NOI (Year 1)", fmt: (s, r) => `${fmtMoney(r.noiAedYr1,"AED")} / ${fmtMoney(r.noiEurYr1,"EUR")}` },
    { label: "Debt service (Year 1)", fmt: (s, r) => fmtMoney(r.annualDebtServiceEur,"EUR") },
    { label: "Monthly cashflow (Year 1)", fmt: (s, r) => fmtMoney(r.monthlyCashflowEur,"EUR") },
    { label: "Net yield (Year 1)", metric: "netYield", fmt: (s, r) => Number.isFinite(r.netYield) ? fmtPct(r.netYield*100) : "n/a" },
    { label: "Cash-on-cash (Year 1)", metric: "cashOnCash", fmt: (s, r) => Number.isFinite(r.cashOnCash) ? fmtPct(r.cashOnCash*100) : "n/a" },
    { label: "IRR (Hold)", metric: "irr", fmt: (s, r) => fmtIrr(r.irr) }
  ];

  renderCompare(rows, results);
}

function render() {
  if (!scenariosEl) return;
  scenariosEl.innerHTML = scenarioKeys.map(k => scenarioCardHtml(k, state[k])).join("");
  wireInputs();
  recalcAndRender();
}

/* ----- Toolbar ----- */
function wireToolbar() {
  const resetBtn = document.getElementById("btn-reset");
  const copyABtn = document.getElementById("btn-copy-a-to-b");
  const copyACBtn = document.getElementById("btn-copy-a-to-c");
  const exportBtn = document.getElementById("btn-export");

  if (resetBtn) resetBtn.addEventListener("click", () => {
    const fresh = clone(DEFAULTS);
    state.A = fresh.A; state.B = fresh.B; state.C = fresh.C;
    saveState(state);
    render();
  });

  if (copyABtn) copyABtn.addEventListener("click", () => {
    state.B = clone(state.A);
    state.B.name = "Scenario B";
    saveState(state);
    render();
  });

  if (copyACBtn) copyACBtn.addEventListener("click", () => {
    state.C = clone(state.A);
    state.C.name = "Scenario C";
    saveState(state);
    render();
  });

  if (exportBtn) exportBtn.addEventListener("click", () => {
    const payload = { exportedAt: new Date().toISOString(), scenarios: state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "uae-property-financing-scenarios.json";
    a.click();
    URL.revokeObjectURL(url);
  });
}

wireToolbar();
render();
