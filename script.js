/*********************************
 * UAE Property Financing (v2.1 UX Overhaul)
 * - Simplified to 2 scenarios (A/B)
 * - Collapsible form sections & Tooltips
 * - Sticky Footer (AED/EUR/INR)
 * - Live EUR conversion helpers
 *********************************/

/* ---------- Configuration ---------- */
const STORAGE_KEY = "uaePropertyFinancing.scenarios.v2";
const SCENARIO_KEYS = ["A", "B"];
const FX_INR_PER_AED = 23.0; // Hardcoded estimate for INR conversion

/* ---------- Date (top-right) ---------- */
(function setToday() {
  const today = new Date();
  const el = document.getElementById("gregorian-date");
  if (!el) return;
  el.textContent = today.toLocaleDateString("en-GB", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric"
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
  do { index = Math.floor(Math.random() * quotes.length); } while (index === currentQuoteIndex && quotes.length > 1);

  currentQuoteIndex = index;
  
  // Subtle fade for better UX
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


/* ---------- State & defaults (from v2 UX) ---------- */
const DEFAULTS = {
  A: {
    name: "Dubai Investment (Mortgage)", emirate: "Dubai", unitType: "1BHK", offPlan: false,
    fxAedPerEur: 4.00, purchasePriceAed: 800000, annualRentAed: 72000, vacancyPct: 5, rentGrowthPct: 3, expenseGrowthPct: 2,
    regFeePct: 4.0, regAdminAed: 580, agentPct: 2.0, vatPct: 5.0, trusteeFeeAed: 4000, nocFeeAed: 1500, otherUpfrontAed: 0, furnitureAed: 0,
    serviceChargesAedYr: 12000, mgmtPct: 8, maintPct: 5, insuranceAedYr: 800, otherOpAedYr: 0,
    financingMode: "UAE Mortgage", uaeDownPct: 25, uaeRatePct: 5.5, uaeTermYrs: 25,
    uaeBankFeePct: 1.0, uaeBankFeeAed: 0, uaeMortgageRegPct: 0.25, uaeMortgageRegAdminAed: 290,
    nlLoanAmountEur: 0, nlRatePct: 5.0, nlTermYrs: 20, nlRepayment: "Amortizing", nlBankFeePct: 0.0, nlBankFeeEur: 0.0,
    holdYrs: 7, appreciationPct: 3.0, sellAgentPct: 2.0, sellVatPct: 5.0, sellOtherAed: 0
  },
  B: null
};

DEFAULTS.B = JSON.parse(JSON.stringify(DEFAULTS.A));
DEFAULTS.B.name = "Abu Dhabi Cash (Lower Fees)";
DEFAULTS.B.emirate = "Abu Dhabi";
DEFAULTS.B.financingMode = "Cash";
DEFAULTS.B.regFeePct = 2.0;
DEFAULTS.B.uaeMortgageRegPct = 0.10;
DEFAULTS.B.purchasePriceAed = 750000;
DEFAULTS.B.annualRentAed = 65000;


function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(DEFAULTS);
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.A || !parsed.B) return clone(DEFAULTS);
    return parsed;
  } catch { return clone(DEFAULTS); }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const badge = document.getElementById("autosave-badge");
    if (badge) {
      badge.textContent = "Saved!";
      badge.style.opacity = "1";
      setTimeout(() => { badge.textContent = "Auto-saved"; badge.style.opacity = "0.8"; }, 800);
    }
  } catch {}
}

const state = loadState();

/* ----- Math Helpers ----- */
function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function num(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
function toPct(v) { return num(v) / 100; }

function fmtMoney(v, cur) {
  const x = num(v);
  // EUR has 2 decimal places, others generally 0 for large amounts
  const options = { maximumFractionDigits: (cur === "EUR") ? 2 : 0 };
  return x.toLocaleString("en-GB", options) + (cur ? " " + cur : "");
}

function fmtCompact(v) {
  const x = num(v);
  if (x >= 1000000) return (x/1000000).toFixed(2) + "M";
  if (x >= 1000) return (x/1000).toFixed(1) + "k";
  return x.toFixed(0);
}

function fmtPct(v) { return num(v).toLocaleString("en-GB", { maximumFractionDigits: 2 }) + "%"; }
function fmtIrr(v) { return Number.isFinite(v) ? fmtPct(v * 100) : "n/a"; }

function defaultRegFeePct(emirate) { return emirate === "Abu Dhabi" ? 2.0 : 4.0; }
function defaultMortgageRegPct(emirate) { return emirate === "Abu Dhabi" ? 0.10 : 0.25; }

/* ----- Finance Math (simplified for this view) ----- */
function pmt(principal, annualRatePct, termYears) {
  const P = num(principal);
  const r = toPct(annualRatePct) / 12;
  const n = Math.round(num(termYears) * 12);
  if (P <= 0 || n <= 0) return 0;
  if (Math.abs(r) < 1e-10) return P / n;
  const pow = Math.pow(1 + r, n);
  return P * r * pow / (pow - 1);
}

function remainingBalance(principal, annualRatePct, termYears, monthsPaid) {
  const P = num(principal);
  const r = toPct(annualRatePct) / 12;
  const n = Math.round(num(termYears) * 12);
  const m = clamp(Math.round(num(monthsPaid)), 0, n);
  if (P <= 0 || n <= 0) return 0;
  if (Math.abs(r) < 1e-10) { return Math.max(0, P - (P / n) * m); }
  const PMT = pmt(P, annualRatePct, termYears);
  const pow = Math.pow(1 + r, m);
  const bal = P * pow - PMT * ((pow - 1) / r);
  return Math.max(0, bal);
}

function irr(cashflows) {
  // Simple IRR approximation (using code from previous step)
  if (!cashflows || cashflows.length < 2) return NaN;
  const hasPos = cashflows.some(c => c > 0);
  const hasNeg = cashflows.some(c => c < 0);
  if (!hasPos || !hasNeg) return NaN;

  const npv = (rate) => cashflows.reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t), 0);
  const dnpv = (rate) => cashflows.reduce((s, cf, t) => {
    if (t === 0) return s;
    return s + (-t * cf) / Math.pow(1 + rate, t + 1);
  }, 0);

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
  return x;
}

/* ----- Core Calculation ----- */
function calcScenario(s) {
  const fx = Math.max(0.0001, num(s.fxAedPerEur));
  const aedToEur = (aed) => num(aed) / fx;
  const eurToAed = (eur) => num(eur) * fx;

  const priceAed = num(s.purchasePriceAed);
  const grossRentAed = num(s.annualRentAed);
  const holdYrs = Math.max(1, Math.round(num(s.holdYrs)));

  // 1. Upfront & Financing (Same as previous, calculates loan, downpayment, and fees)
  const regFeeAed = priceAed * toPct(s.regFeePct);
  const agentFeeAed = priceAed * toPct(s.agentPct);
  const agentVatAed = agentFeeAed * toPct(s.vatPct);

  let mortgageRegAed = 0;
  let bankFeesAed = 0;
  let bankFeesEur = 0;
  let loanAed = 0;
  let loanEur = 0;
  let annualDebtServiceAed = 0;
  let annualDebtServiceEur = 0;

  if (s.financingMode === "UAE Mortgage") {
    const downPct = clamp(num(s.uaeDownPct), 0, 100);
    loanAed = Math.max(0, priceAed * (1 - toPct(downPct)));
    mortgageRegAed = loanAed * toPct(s.uaeMortgageRegPct) + num(s.uaeMortgageRegAdminAed);
    bankFeesAed = loanAed * toPct(s.uaeBankFeePct) + num(s.uaeBankFeeAed);
    annualDebtServiceAed = pmt(loanAed, s.uaeRatePct, s.uaeTermYrs) * 12;
  } else if (s.financingMode === "NL Loan") {
    loanEur = Math.max(0, num(s.nlLoanAmountEur));
    bankFeesEur = loanEur * toPct(s.nlBankFeePct) + num(s.nlBankFeeEur);

    if (s.nlRepayment === "Interest-only") {
      annualDebtServiceEur = loanEur * toPct(s.nlRatePct);
    } else {
      annualDebtServiceEur = pmt(loanEur, s.nlRatePct, s.nlTermYrs) * 12;
    }
  }

  const upfrontAed =
    regFeeAed + num(s.regAdminAed) + agentFeeAed + agentVatAed +
    num(s.trusteeFeeAed) + num(s.nocFeeAed) + num(s.otherUpfrontAed) + 
    num(s.furnitureAed) + mortgageRegAed + bankFeesAed;

  const totalAcqCostAed = priceAed + upfrontAed;
  const totalAcqCostEur = aedToEur(totalAcqCostAed);

  let cashInvestedEur = totalAcqCostEur;
  if (s.financingMode === "UAE Mortgage") {
    const downPaymentAed = priceAed * toPct(s.uaeDownPct);
    cashInvestedEur = aedToEur(downPaymentAed + upfrontAed);
  } else if (s.financingMode === "NL Loan") {
    cashInvestedEur = Math.max(0, totalAcqCostEur - loanEur) + bankFeesEur;
  }
  
  // 2. Year 1 Operating
  const vacancy = toPct(s.vacancyPct);
  const collectedRent1 = grossRentAed * (1 - vacancy);

  const service1 = num(s.serviceChargesAedYr);
  const insurance1 = num(s.insuranceAedYr);
  const otherOp1 = num(s.otherOpAedYr);
  const mgmtPct = toPct(s.mgmtPct);
  const maintPct = toPct(s.maintPct);
  
  const opex1 = service1 + insurance1 + otherOp1 + (collectedRent1 * mgmtPct) + (collectedRent1 * maintPct);
  const noiAedYr1 = collectedRent1 - opex1;
    
  let debtServiceEurYr1 = 0;
  if (s.financingMode === "UAE Mortgage") debtServiceEurYr1 = aedToEur(annualDebtServiceAed);
  else if (s.financingMode === "NL Loan") debtServiceEurYr1 = annualDebtServiceEur;

  const annualCashflowEurYr1 = aedToEur(noiAedYr1) - debtServiceEurYr1;
  const monthlyCashflowEur = annualCashflowEurYr1 / 12;
  const monthlyCashflowAed = eurToAed(monthlyCashflowEur);

  // 3. IRR Calculation
  const rentGrowth = toPct(s.rentGrowthPct);
  const expGrowth = toPct(s.expenseGrowthPct);
  const appreciation = toPct(s.appreciationPct);
  const cashflowsEur = [-cashInvestedEur]; // Year 0

  for (let y = 1; y <= holdYrs; y++) {
    const rentY = grossRentAed * Math.pow(1 + rentGrowth, y - 1);
    const collectedRentY = rentY * (1 - vacancy);
    const serviceY = num(s.serviceChargesAedYr) * Math.pow(1 + expGrowth, y - 1);
    const opexY = serviceY + num(s.insuranceAedYr) * Math.pow(1 + expGrowth, y - 1) + num(s.otherOpAedYr) * Math.pow(1 + expGrowth, y - 1) + 
                  (collectedRentY * mgmtPct) + (collectedRentY * maintPct);
    const noiY = collectedRentY - opexY;
    
    let debtY_Eur = (s.financingMode === "UAE Mortgage") ? aedToEur(annualDebtServiceAed) : annualDebtServiceEur;
    
    cashflowsEur.push(aedToEur(noiY) - debtY_Eur);
  }

  // Reversion (Simplified: assumes all loan is paid off if term is shorter than hold)
  const sellPriceAed = priceAed * Math.pow(1 + appreciation, holdYrs);
  const sellAgentAed = sellPriceAed * toPct(s.sellAgentPct);
  const sellVatAed = sellAgentAed * toPct(s.sellVatPct);
  const saleNetAedBeforeDebt = sellPriceAed - sellAgentAed - sellVatAed - num(s.sellOtherAed);
  
  let remainingLoanAed = 0;
  if (s.financingMode === "UAE Mortgage") {
    remainingLoanAed = remainingBalance(loanAed, s.uaeRatePct, s.uaeTermYrs, holdYrs * 12);
  } else if (s.financingMode === "NL Loan") {
    const remainingLoanEur = (s.nlRepayment === "Interest-only") 
      ? loanEur 
      : remainingBalance(loanEur, s.nlRatePct, s.nlTermYrs, holdYrs * 12);
    remainingLoanAed = eurToAed(remainingLoanEur);
  }

  const netSaleAed = saleNetAedBeforeDebt - remainingLoanAed;
  const netSaleEur = aedToEur(netSaleAed);

  // Add reversion to the last period cashflow
  cashflowsEur[cashflowsEur.length - 1] += netSaleEur;
  
  // Final metrics
  const noiEurYr1 = aedToEur(noiAedYr1);
  const netYield = totalAcqCostEur > 0 ? (noiEurYr1 / totalAcqCostEur) : NaN;
  const cashOnCash = cashInvestedEur > 0 ? (annualCashflowEurYr1 / cashInvestedEur) : NaN;
  const irrVal = irr(cashflowsEur);

  return {
    priceAed, grossRentAed,
    totalAcqCostAed, totalAcqCostEur,
    cashInvestedEur,
    noiAedYr1, noiEurYr1,
    annualDebtServiceEur: debtServiceEurYr1,
    monthlyCashflowEur, monthlyCashflowAed,
    netYield, cashOnCash, irr: irrVal,
    fx: fx,
    label: s.name // Include name for footer
  };
}

/* ----- Rendering & Events ----- */
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

// Function to generate form elements (kept from v2 UX for tooltips/collapsibility)
function inputField(key, field, labelText, value, type="number", step="any", tooltip="") {
    const isChecked = type === "checkbox" && value;
    const isAedField = labelText.includes("(AED)") || labelText.includes("(% of loan)") || labelText.includes("(% of Rent)");
    
    let inputHtml = "";
    if (type === "checkbox") {
        inputHtml = `<input id="${key}-${field}" data-scenario="${key}" data-field="${field}" type="checkbox" ${isChecked ? "checked" : ""} />`;
    } else {
        inputHtml = `<input id="${key}-${field}" data-scenario="${key}" data-field="${field}" type="${type}" step="${step}" value="${escapeHtml(value)}" title="${escapeHtml(tooltip)}" />`;
    }

    let helperHtml = "";
    if (isAedField && type === "number" && !labelText.includes("(%")) {
        // Only add helper for direct AED input fields
        helperHtml = `<span class="currency-helper" id="hint-${key}-${field}"></span>`;
    }

    if (type === "checkbox") {
        return `<div class="inline">${inputHtml}<label for="${key}-${field}">${labelText}</label></div>`;
    }

    return `
      <div class="input-group">
        <label for="${key}-${field}" data-tooltip="${escapeHtml(tooltip)}">${labelText}</label>
        <div class="input-wrap">
          ${inputHtml}
          ${helperHtml}
        </div>
      </div>
    `;
}

function selectField(key, field, labelText, value, options, tooltip="") {
  const opts = options.map(o => `<option value="${escapeHtml(o)}" ${o===value?"selected":""}>${escapeHtml(o)}</option>`).join("");
  return `
    <div class="input-group">
      <label for="${key}-${field}" data-tooltip="${escapeHtml(tooltip)}">${labelText}</label>
      <select id="${key}-${field}" data-scenario="${key}" data-field="${field}" title="${escapeHtml(tooltip)}">${opts}</select>
    </div>
  `;
}

// Function to render the scenario cards (kept collapsible sections)
function scenarioCardHtml(key, s) {
  return `
  <div class="card scenario-card" data-scenario="${key}">
    <div class="card-header">
      <div class="scenario-title">
        <h3>Scenario ${key}: ${escapeHtml(s.name)}</h3>
        <span class="badge">${escapeHtml(s.financingMode)}</span>
      </div>
      <div class="muted tiny">Emirate: <strong>${escapeHtml(s.emirate)}</strong></div>
    </div>

    <div class="card-body">
      <div class="kpis" id="kpis-${key}">
        <div class="kpi" id="kpi-yield-${key}"><div class="label">Net Yield (Yr1)</div><div class="value">—</div></div>
        <div class="kpi" id="kpi-irr-${key}"><div class="label">IRR (${s.holdYrs} Yr)</div><div class="value">—</div></div>
      </div>

      <div class="fieldset-title open" data-toggle="general-${key}">
        General Assumptions <i class="fas fa-chevron-right"></i>
      </div>
      <div class="fieldset-content open" id="general-${key}">
        <div class="form-grid">
          ${inputField(key,"name","Scenario Name",s.name,"text")}
          ${selectField(key,"emirate","Emirate",s.emirate,["Dubai","Abu Dhabi"], "Selecting the emirate auto-fills default registration fees.")}
          ${selectField(key,"unitType","Unit Type",s.unitType,["Studio","1BHK","2BHK"])}
          ${inputField(key,"fxAedPerEur","FX: 1 EUR = ? AED",s.fxAedPerEur, "number", 0.0001, "The constant exchange rate used for all EUR conversions.")}
        </div>
        <div class="form-grid">
          ${inputField(key,"purchasePriceAed","Price (AED)",s.purchasePriceAed,0,0, "The cost of the property in local currency.")}
          ${inputField(key,"annualRentAed","Gross Rent (AED/Yr)",s.annualRentAed,0,0, "Annual rental income before any costs/vacancy.")}
          ${inputField(key,"vacancyPct","Vacancy (%)",s.vacancyPct,0.1,0.1, "Percentage of time the property is vacant (e.g., 5 for 5%).")}
          ${inputField(key,"rentGrowthPct","Rent Growth (%/Yr)",s.rentGrowthPct,0.01,0.01, "Expected annual growth rate of rental income.")}
        </div>
        ${inputField(key,"holdYrs","Hold Period (Years)",s.holdYrs,1,1, "Period used for IRR calculation and loan balance determination.")}
      </div>

      <div class="fieldset-title" data-toggle="upfront-${key}">
        Upfront Costs <i class="fas fa-chevron-right"></i>
      </div>
      <div class="fieldset-content" id="upfront-${key}">
        <div class="form-grid">
          ${inputField(key,"regFeePct","Registration Fee (%)",s.regFeePct,0.01,0.01, "DLD or equivalent fee based on sale price.")}
          ${inputField(key,"regAdminAed","Registration Admin (AED)",s.regAdminAed,0)}
          ${inputField(key,"agentPct","Agent Fee (%)",s.agentPct,0.01)}
          ${inputField(key,"vatPct","VAT on Agent Fee (%)",s.vatPct,0.01)}
          ${inputField(key,"trusteeFeeAed","Trustee/Admin (AED)",s.trusteeFeeAed,0)}
          ${inputField(key,"furnitureAed","Furniture/Setup (AED)",s.furnitureAed,0)}
        </div>
      </div>

      <div class="fieldset-title" data-toggle="operating-${key}">
        Annual Operating Expenses <i class="fas fa-chevron-right"></i>
      </div>
      <div class="fieldset-content" id="operating-${key}">
        <div class="form-grid">
          ${inputField(key,"serviceChargesAedYr","Service Charges (AED/Yr)",s.serviceChargesAedYr,0)}
          ${inputField(key,"mgmtPct","Property Mgmt (% of Rent)",s.mgmtPct,0.01, 0.01, "Percentage of collected rent paid to a property manager.")}
          ${inputField(key,"maintPct","Maintenance Reserve (% of Rent)",s.maintPct,0.01, 0.01, "An annual reserve for general repairs/maintenance.")}
          ${inputField(key,"insuranceAedYr","Insurance (AED/Yr)",s.insuranceAedYr,0)}
          ${inputField(key,"expenseGrowthPct","Expense Growth (%/Yr)",s.expenseGrowthPct,0.01)}
        </div>
      </div>
      
      <div class="fieldset-title" data-toggle="financing-${key}">
        Financing <i class="fas fa-chevron-right"></i>
      </div>
      <div class="fieldset-content" id="financing-${key}">
        ${selectField(key,"financingMode","Financing Mode",s.financingMode,["Cash","UAE Mortgage","NL Loan"])}

        <div class="subcard" id="uae-mortgage-${key}" style="display:none;">
          <h4 class="fieldset-title" style="border:none; margin-top:0;">UAE Mortgage Details</h4>
          <div class="form-grid">
            ${inputField(key,"uaeDownPct","Down Payment (%)",s.uaeDownPct,0.1)}
            ${inputField(key,"uaeRatePct","Interest Rate (%/Yr)",s.uaeRatePct,0.01)}
            ${inputField(key,"uaeTermYrs","Term (Years)",s.uaeTermYrs,1)}
            ${inputField(key,"uaeBankFeePct","Bank Fee (% of loan)",s.uaeBankFeePct,0.01)}
            ${inputField(key,"uaeMortgageRegPct","Mortgage Reg (% of loan)",s.uaeMortgageRegPct,0.01)}
          </div>
        </div>

        <div class="subcard" id="nl-loan-${key}" style="display:none;">
          <h4 class="fieldset-title" style="border:none; margin-top:0;">NL/Foreign Loan Details (EUR)</h4>
          <div class="form-grid">
            ${inputField(key,"nlLoanAmountEur","Loan Amount (EUR)",s.nlLoanAmountEur,0)}
            ${inputField(key,"nlRatePct","Interest Rate (%/Yr)",s.nlRatePct,0.01)}
            ${selectField(key,"nlRepayment","Repayment Type",s.nlRepayment,["Amortizing","Interest-only"])}
            ${inputField(key,"nlTermYrs","Term (Years)",s.nlTermYrs,1)}
          </div>
        </div>
      </div>

      <div class="fieldset-title" data-toggle="exit-${key}">
        Exit Strategy <i class="fas fa-chevron-right"></i>
      </div>
      <div class="fieldset-content" id="exit-${key}">
        <div class="form-grid">
          ${inputField(key,"appreciationPct","Appreciation (%/Yr)",s.appreciationPct,0.01, 0.01, "Expected annual growth rate of the property value.")}
          ${inputField(key,"sellAgentPct","Selling Agent Fee (%)",s.sellAgentPct,0.01)}
          ${inputField(key,"sellVatPct","VAT on Selling Agent (%)",s.sellVatPct,0.01)}
          ${inputField(key,"sellOtherAed","Other Selling Costs (AED)",s.sellOtherAed,0)}
        </div>
      </div>
      
    </div>
  </div>
  `;
}

function toggleFieldset(e) {
    const titleEl = e.currentTarget;
    const contentId = titleEl.getAttribute('data-toggle');
    const contentEl = document.getElementById(contentId);
    
    if (contentEl.classList.contains('open')) {
        contentEl.classList.remove('open');
        titleEl.classList.remove('open');
    } else {
        contentEl.classList.add('open');
        titleEl.classList.add('open');
    }
}

function showHideFinancingSections() {
  SCENARIO_KEYS.forEach(k => {
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
      const prevEmirate = state[key].emirate;
      
      if (el.type === "checkbox") state[key][field] = el.checked;
      else if (el.tagName === "SELECT" || el.type === "text") state[key][field] = el.value;
      else state[key][field] = num(el.value);

      if (field === "emirate") {
        const newEm = state[key].emirate;
        // Auto-update title if it looks generic
        if(state[key].name.includes("Scenario") || state[key].name.includes("Option") || state[key].name.includes("Investment")) {
            state[key].name = newEm + " Option";
        }
        
        // Update Fees defaults only if they are the OLD defaults
        if (Math.abs(num(state[key].regFeePct) - defaultRegFeePct(prevEmirate)) < 0.001) {
            state[key].regFeePct = defaultRegFeePct(newEm);
        }
        if (Math.abs(num(state[key].uaeMortgageRegPct) - defaultMortgageRegPct(prevEmirate)) < 0.001) {
            state[key].uaeMortgageRegPct = defaultMortgageRegPct(newEm);
        }
        
        render(); // Re-render to update inputs with new defaults/name
        return; 
      }
      
      // Instant Title Update
      if (field === "name") {
          document.querySelector(`.scenario-card[data-scenario="${key}"] .scenario-title h3`).textContent = `Scenario ${key}: ${el.value}`;
      }

      showHideFinancingSections();
      saveState(state);
      recalcAndRender();
    });
  });
  
  // Wire Collapsible Sections
  document.querySelectorAll(".fieldset-title").forEach(el => {
      el.addEventListener("click", toggleFieldset);
  });

  showHideFinancingSections();
}

function setText(id, text, target="textContent") {
  const el = document.getElementById(id);
  if (id.includes('.')) {
      const parentId = id.split(' ')[0];
      const selector = id.split(' ')[1];
      const parentEl = document.getElementById(parentId);
      if(parentEl) {
          const childEl = parentEl.querySelector(selector);
          if (childEl) childEl[target] = text;
      }
  } else {
      const el = document.getElementById(id);
      if (el) el[target] = text;
  }
}

function highlightBest(key, metric, value, results) {
    let bestValue = -Infinity;
    
    // Find the best value
    SCENARIO_KEYS.forEach(k => {
        const kValue = results[k][metric];
        if (Number.isFinite(kValue) && kValue > bestValue) {
            bestValue = kValue;
        }
    });

    // Reset and set best
    SCENARIO_KEYS.forEach(k => {
        const el = document.getElementById(`kpi-${metric}-${k}`);
        if(el) el.classList.remove('best');
        if (Number.isFinite(results[k][metric]) && Math.abs(results[k][metric] - bestValue) < 1e-12) {
            el.classList.add('best');
        }
    });
}

function updateCurrencyHints(results) {
  // Update currency helpers next to AED inputs
  document.querySelectorAll(".currency-helper").forEach(el => {
    const parent = el.closest(".input-group");
    if (!parent) return;

    const input = parent.querySelector("input[type='number']");
    if (!input) return;

    const key = input.getAttribute("data-scenario");
    const valAed = num(input.value);
    const fx = results[key].fx;

    if (fx > 0) {
        const valEur = valAed / fx;
        el.textContent = `≈ ${fmtMoney(valEur, "EUR")}`;
    } else {
        el.textContent = `Set FX`;
    }
  });
}

function renderFooter(results) {
    // 1. Update FX Display
    setText("fx-disp-eur", results.A.fx.toFixed(2));
    setText("fx-disp-inr", FX_INR_PER_AED.toFixed(2));

    // Helper for footer cells
    const footerCell = (label, aed, eur) => {
        const inr = aed * FX_INR_PER_AED;
        return `
            <div class="summ-item">
                <span class="summ-lbl">${label}</span>
                <div class="summ-val">${fmtCompact(aed)}<small>AED</small> | ${fmtCompact(eur)}<small>EUR</small></div>
                <div class="summ-val">${fmtCompact(inr)}<small>INR</small></div>
            </div>
        `;
    };

    // 2. Update Scenario A & B Summaries
    SCENARIO_KEYS.forEach(k => {
        const r = results[k];
        const html = 
            footerCell("Price", r.priceAed, r.priceAed / r.fx) +
            footerCell("Gross Rent/Yr", r.grossRentAed, r.grossRentAed / r.fx) +
            footerCell("Cashflow/Month", r.monthlyCashflowAed, r.monthlyCashflowEur);
        
        setText(`summ-title-${k.toLowerCase()}`, r.label);
        document.getElementById(`summ-metrics-${k.toLowerCase()}`).innerHTML = html;
    });
}


function recalcAndRender() {
  const results = {
    A: calcScenario(state.A),
    B: calcScenario(state.B),
  };

  SCENARIO_KEYS.forEach(k => {
    const r = results[k];
    
    // Update Scenario Card KPIs
    setText(`kpi-yield-${k} .value`, Number.isFinite(r.netYield) ? fmtPct(r.netYield * 100) : "n/a", 'textContent');
    
    // Update IRR label to reflect the actual hold period (which is dynamic)
    setText(`kpi-irr-${k} .label`, `IRR (${state[k].holdYrs} Yr)`, 'textContent');
    setText(`kpi-irr-${k} .value`, fmtIrr(r.irr), 'textContent');
    
    // Highlight Best KPIs on card
    highlightBest(k, 'netYield', r.netYield, results);
    highlightBest(k, 'irr', r.irr, results);
  });

  // Comparison Table
  const rows = [
    { label: "Purchase Price", fmt: (s, r) => `${fmtMoney(s.purchasePriceAed,"AED")}` },
    { label: "Total Acq. Cost", fmt: (s, r) => `${fmtMoney(r.totalAcqCostAed,"AED")} / ${fmtMoney(r.totalAcqCostEur,"EUR")}` },
    { label: "Cash Invested (EUR)", fmt: (s, r) => fmtMoney(r.cashInvestedEur,"EUR") },
    { label: "NOI (Year 1)", fmt: (s, r) => `${fmtMoney(r.noiAedYr1,"AED")} / ${fmtMoney(r.noiEurYr1,"EUR")}` },
    { label: "Debt Service (Year 1, EUR)", fmt: (s, r) => fmtMoney(r.annualDebtServiceEur,"EUR") },
    { label: "Monthly Cashflow (EUR)", metric: "monthlyCashflowEur", fmt: (s, r) => fmtMoney(r.monthlyCashflowEur,"EUR") },
    { label: "Net Yield (Year 1)", metric: "netYield", fmt: (s, r) => Number.isFinite(r.netYield) ? fmtPct(r.netYield*100) : "n/a" },
    { label: "Cash-on-Cash (Year 1)", metric: "cashOnCash", fmt: (s, r) => Number.isFinite(r.cashOnCash) ? fmtPct(r.cashOnCash*100) : "n/a" },
    { label: "IRR (Hold Period)", metric: "irr", fmt: (s, r) => fmtIrr(r.irr) }
  ];

  if (!compareBodyEl) return;
  setText("th-a", `A: ${state.A.name}`);
  setText("th-b", `B: ${state.B.name}`);

  compareBodyEl.innerHTML = rows.map(row => {
    const cells = SCENARIO_KEYS.map(k => {
      const r = results[k];
      const valStr = row.fmt(state[k], r);

      let cls = "";
      if (row.metric) {
        const vals = SCENARIO_KEYS.map(kk => results[kk][row.metric]).filter(v => Number.isFinite(v));
        if (vals.length) {
          const best = Math.max(...vals);
          if (Number.isFinite(results[k][row.metric]) && Math.abs(results[k][row.metric] - best) < 1e-12) cls = "best";
        }
      }
      return `<td class="${cls}">${escapeHtml(valStr)}</td>`;
    }).join("");

    return `<tr><td>${escapeHtml(row.label)}</td>${cells}</tr>`;
  }).join("");
  
  // New features requested
  updateCurrencyHints(results);
  renderFooter(results);
}

function render() {
  if (!scenariosEl) return;
  
  scenariosEl.innerHTML = SCENARIO_KEYS.map(k => scenarioCardHtml(k, state[k])).join("");
  
  wireInputs();
  recalcAndRender();
}

/* ----- Toolbar ----- */
function wireToolbar() {
  const resetBtn = document.getElementById("btn-reset");
  const copyABtn = document.getElementById("btn-copy-a-to-b");
  const exportBtn = document.getElementById("btn-export");

  if (resetBtn) resetBtn.addEventListener("click", () => {
    const fresh = clone(DEFAULTS);
    state.A = fresh.A; state.B = fresh.B; 
    saveState(state);
    render();
  });

  if (copyABtn) copyABtn.addEventListener("click", () => {
    state.B = JSON.parse(JSON.stringify(state.A));
    state.B.name = "Scenario B (Copy of A)";
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