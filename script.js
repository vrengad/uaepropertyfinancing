/*********************************
 * UAE Property Financing (v3)
 * - 2 scenarios (A/B)
 * - LocalStorage persistence
 * - Cashflow, Net Yield, CoC, IRR
 * - AED inputs show EUR+INR hints
 *********************************/

/* -------- date (top-right) -------- */
(function setToday(){
  const el = document.getElementById("gregorian-date");
  if(!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString("en-GB", { weekday:"short", day:"2-digit", month:"short", year:"numeric" });
})();

/* -------- quotes -------- */
const quotes = [
  { tamil:"முயற்சி திருவினையாக்கும்.", english:"Effort will bring success." },
  { tamil:"கற்றது கைமண் அளவு, கல்லாதது உலகளவு.", english:"What we have learned is small; what we haven't is vast." },
  { tamil:"யாதும் ஊரே யாவரும் கேளிர்.", english:"All towns are ours; all people are our kin." },
  { tamil:"தீதும் நன்றும் பிறர் தர வாரா.", english:"Good and bad do not come from others." },
  { tamil:"ஒன்று பட்டால் உண்டு வாழ்வு.", english:"Unity is strength." },
  { tamil:"அறம் செய்ய விரும்பு.", english:"Desire to do good deeds." }
];

const tamilQuoteEl = document.getElementById("tamil-quote");
const englishMeaningEl = document.getElementById("english-meaning");
const newQuoteBtn = document.getElementById("new-quote-btn");
let currentQuoteIndex = -1;

function showRandomQuote(){
  if(!tamilQuoteEl || !englishMeaningEl) return;
  let idx;
  do { idx = Math.floor(Math.random() * quotes.length); }
  while (idx === currentQuoteIndex && quotes.length > 1);

  currentQuoteIndex = idx;
  tamilQuoteEl.style.opacity = 0;
  englishMeaningEl.style.opacity = 0;

  setTimeout(() => {
    tamilQuoteEl.textContent = `"${quotes[idx].tamil}"`;
    englishMeaningEl.textContent = quotes[idx].english;
    tamilQuoteEl.style.opacity = 1;
    englishMeaningEl.style.opacity = 1;
  }, 160);
}

if(newQuoteBtn) newQuoteBtn.addEventListener("click", showRandomQuote);
showRandomQuote();

/* -------- helpers -------- */
const STORAGE_KEY = "uaePropertyFinancing.v3";

const num = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function fmtMoney(v, cur){
  const x = num(v);
  const opts = { maximumFractionDigits: 0 };
  if(cur === "AED") return x.toLocaleString("en-GB", opts) + " AED";
  if(cur === "EUR") return x.toLocaleString("en-GB", opts) + " EUR";
  if(cur === "INR") return x.toLocaleString("en-GB", opts) + " INR";
  return x.toLocaleString("en-GB", { maximumFractionDigits: 2 });
}
function fmtPct(v){
  return num(v).toLocaleString("en-GB", { maximumFractionDigits: 2 }) + "%";
}
function fmtIrr(v){
  return Number.isFinite(v) ? fmtPct(v * 100) : "n/a";
}
function clone(obj){ return JSON.parse(JSON.stringify(obj)); }

/* Default fees by emirate */
function defaultRegFeePct(emirate){ return emirate === "Abu Dhabi" ? 2.0 : 4.0; }
function defaultMortgageRegPct(emirate){ return emirate === "Abu Dhabi" ? 0.10 : 0.25; }

/* PMT & balance */
function pmt(principal, annualRatePct, termYears){
  const P = num(principal);
  const r = num(annualRatePct) / 100 / 12;
  const n = Math.round(num(termYears) * 12);
  if(P <= 0 || n <= 0) return 0;
  if(Math.abs(r) < 1e-10) return P / n;
  const pow = Math.pow(1 + r, n);
  return P * r * pow / (pow - 1);
}
function remainingBalance(principal, annualRatePct, termYears, monthsPaid){
  const P = num(principal);
  const r = num(annualRatePct) / 100 / 12;
  const n = Math.round(num(termYears) * 12);
  const m = clamp(Math.round(num(monthsPaid)), 0, n);
  if(P <= 0 || n <= 0) return 0;
  if(Math.abs(r) < 1e-10){
    const paid = (P / n) * m;
    return Math.max(0, P - paid);
  }
  const PMT = pmt(P, annualRatePct, termYears);
  const pow = Math.pow(1 + r, m);
  const bal = P * pow - PMT * ((pow - 1) / r);
  return Math.max(0, bal);
}

/* IRR (yearly periods) */
function irr(cashflows){
  if(!cashflows || cashflows.length < 2) return NaN;
  const hasPos = cashflows.some(c => c > 0);
  const hasNeg = cashflows.some(c => c < 0);
  if(!hasPos || !hasNeg) return NaN;

  const npv = (rate) => cashflows.reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t), 0);
  const dnpv = (rate) => cashflows.reduce((s, cf, t) => t === 0 ? s : s + (-t * cf) / Math.pow(1 + rate, t + 1), 0);

  // Newton
  let x = 0.12;
  for(let i=0;i<80;i++){
    const f = npv(x);
    if(Math.abs(f) < 1e-7) return x;
    const df = dnpv(x);
    if(Math.abs(df) < 1e-10) break;
    const nx = x - f / df;
    if(nx <= -0.95 || nx > 5) break;
    x = nx;
  }

  // Bisection
  let lo = -0.9, hi = 2.5;
  let flo = npv(lo), fhi = npv(hi);
  if(flo * fhi > 0) return NaN;

  for(let i=0;i<120;i++){
    const mid = (lo + hi) / 2;
    const fmid = npv(mid);
    if(Math.abs(fmid) < 1e-7) return mid;
    if(flo * fmid < 0){ hi = mid; fhi = fmid; }
    else { lo = mid; flo = fmid; }
  }
  return (lo + hi) / 2;
}

/* -------- defaults / state -------- */
const DEFAULTS = {
  global: { inrPerEur: 90.0 },
  A: {
    name: "Scenario A",
    emirate: "Dubai",
    unitType: "1BHK",
    offPlan: false,

    fxAedPerEur: 4.00,          // 1 EUR = X AED
    purchasePriceAed: 800000,

    annualRentAed: 72000,
    vacancyPct: 5,
    rentGrowthPct: 3,
    expenseGrowthPct: 2,

    // Upfront
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
    nlRepayment: "Amortizing",    // Amortizing | Interest-only
    nlBankFeePct: 0.0,
    nlBankFeeEur: 0.0,

    // Exit
    holdYrs: 7,
    appreciationPct: 3.0,
    sellAgentPct: 2.0,
    sellVatPct: 5.0,
    sellOtherAed: 0
  },
  B: {
    name: "Scenario B",
    emirate: "Abu Dhabi",
    unitType: "1BHK",
    offPlan: false,

    fxAedPerEur: 4.00,
    purchasePriceAed: 750000,

    annualRentAed: 65000,
    vacancyPct: 5,
    rentGrowthPct: 3,
    expenseGrowthPct: 2,

    regFeePct: 2.0,
    regAdminAed: 580,
    agentPct: 2.0,
    vatPct: 5.0,
    trusteeFeeAed: 4000,
    nocFeeAed: 1500,
    otherUpfrontAed: 0,
    furnitureAed: 0,

    serviceChargesAedYr: 12000,
    mgmtPct: 8,
    maintPct: 5,
    insuranceAedYr: 800,
    otherOpAedYr: 0,

    financingMode: "NL Loan",
    uaeDownPct: 25,
    uaeRatePct: 5.5,
    uaeTermYrs: 25,
    uaeBankFeePct: 1.0,
    uaeBankFeeAed: 0,
    uaeMortgageRegPct: 0.10,
    uaeMortgageRegAdminAed: 290,

    nlLoanAmountEur: 120000,
    nlRatePct: 5.0,
    nlTermYrs: 20,
    nlRepayment: "Interest-only",
    nlBankFeePct: 0.0,
    nlBankFeeEur: 0.0,

    holdYrs: 7,
    appreciationPct: 3.0,
    sellAgentPct: 2.0,
    sellVatPct: 5.0,
    sellOtherAed: 0
  }
};

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return clone(DEFAULTS);
    const s = JSON.parse(raw);
    if(!s || !s.A || !s.B || !s.global) return clone(DEFAULTS);
    return s;
  }catch{
    return clone(DEFAULTS);
  }
}
const state = loadState();

function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const badge = document.getElementById("autosave-badge");
    if(badge){
      badge.textContent = "Auto-saved";
      badge.style.opacity = "1";
      setTimeout(() => badge.style.opacity = "0.95", 250);
    }
  }catch{}
}

/* -------- calculation -------- */
function calcScenario(s, global){
  const fxAedPerEur = Math.max(0.0001, num(s.fxAedPerEur));
  const inrPerEur = Math.max(0.0001, num(global.inrPerEur));

  const aedToEur = (aed) => num(aed) / fxAedPerEur;
  const eurToAed = (eur) => num(eur) * fxAedPerEur;
  const eurToInr = (eur) => num(eur) * inrPerEur;
  const aedToInr = (aed) => eurToInr(aedToEur(aed));

  const priceAed = num(s.purchasePriceAed);

  // Upfront
  const regFeeAed = priceAed * num(s.regFeePct) / 100;
  const agentFeeAed = priceAed * num(s.agentPct) / 100;
  const agentVatAed = agentFeeAed * num(s.vatPct) / 100;

  let mortgageRegAed = 0, bankFeesAed = 0, bankFeesEur = 0;
  let annualDebtServiceAed = 0, annualDebtServiceEur = 0;
  let remainingLoanAtExitAed = 0, remainingLoanAtExitEur = 0;

  if(s.financingMode === "UAE Mortgage"){
    const downPct = clamp(num(s.uaeDownPct), 0, 100);
    const loanAed = Math.max(0, priceAed * (1 - downPct / 100));

    mortgageRegAed = loanAed * num(s.uaeMortgageRegPct) / 100 + num(s.uaeMortgageRegAdminAed);
    bankFeesAed    = loanAed * num(s.uaeBankFeePct) / 100 + num(s.uaeBankFeeAed);

    const mPmt = pmt(loanAed, num(s.uaeRatePct), num(s.uaeTermYrs));
    annualDebtServiceAed = mPmt * 12;

    const monthsHeld = Math.round(num(s.holdYrs) * 12);
    remainingLoanAtExitAed = remainingBalance(loanAed, num(s.uaeRatePct), num(s.uaeTermYrs), monthsHeld);
  } else if(s.financingMode === "NL Loan"){
    const loanEur = Math.max(0, num(s.nlLoanAmountEur));
    bankFeesEur = loanEur * num(s.nlBankFeePct) / 100 + num(s.nlBankFeeEur);

    if(s.nlRepayment === "Interest-only"){
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

  // Operating Yr1
  const grossRent1 = num(s.annualRentAed);
  const vacancy = clamp(num(s.vacancyPct), 0, 100) / 100;
  const rentGrowth = num(s.rentGrowthPct) / 100;
  const expGrowth  = num(s.expenseGrowthPct) / 100;

  const service1   = num(s.serviceChargesAedYr);
  const insurance1 = num(s.insuranceAedYr);
  const otherOp1   = num(s.otherOpAedYr);

  const mgmtPct  = clamp(num(s.mgmtPct), 0, 100) / 100;
  const maintPct = clamp(num(s.maintPct), 0, 100) / 100;

  // Cashflows for IRR (EUR)
  const holdYrs = Math.max(1, Math.round(num(s.holdYrs)));
  const cashflowsEur = [];

  let cashInvestedEur = aedToEur(totalAcqCostAed) + bankFeesEur;

  if(s.financingMode === "UAE Mortgage"){
    const downPaymentAed = priceAed * (clamp(num(s.uaeDownPct), 0, 100) / 100);
    cashInvestedEur = aedToEur(downPaymentAed + upfrontAed);
  } else if(s.financingMode === "NL Loan"){
    const totalCostEur = aedToEur(totalAcqCostAed);
    cashInvestedEur = Math.max(0, totalCostEur - num(s.nlLoanAmountEur)) + bankFeesEur;
  }

  cashflowsEur.push(-cashInvestedEur);

  let noiAedYr1 = 0;
  let annualCashflowEurYr1 = 0;

  for(let y=1; y<=holdYrs; y++){
    const rentY = grossRent1 * Math.pow(1 + rentGrowth, y - 1);
    const collectedRentY = rentY * (1 - vacancy);

    const serviceY = service1 * Math.pow(1 + expGrowth, y - 1);
    const insuranceY = insurance1 * Math.pow(1 + expGrowth, y - 1);
    const otherOpY = otherOp1 * Math.pow(1 + expGrowth, y - 1);

    const mgmtY = collectedRentY * mgmtPct;
    const maintY = collectedRentY * maintPct;

    const noiY = collectedRentY - (serviceY + insuranceY + otherOpY + mgmtY + maintY);
    if(y === 1) noiAedYr1 = noiY;

    let debtY_Eur = 0;
    if(s.financingMode === "UAE Mortgage") debtY_Eur = aedToEur(annualDebtServiceAed);
    else if(s.financingMode === "NL Loan") debtY_Eur = annualDebtServiceEur;

    const cashflowY_Eur = aedToEur(noiY) - debtY_Eur;
    if(y === 1) annualCashflowEurYr1 = cashflowY_Eur;

    cashflowsEur.push(cashflowY_Eur);
  }

  // Exit (sell at end of hold)
  const salePriceAed = priceAed * Math.pow(1 + num(s.appreciationPct) / 100, holdYrs);
  const sellAgentAed = salePriceAed * num(s.sellAgentPct) / 100;
  const sellVatAed   = sellAgentAed * num(s.sellVatPct) / 100;
  const sellOtherAed = num(s.sellOtherAed);

  const saleNetAedBeforeDebt = salePriceAed - sellAgentAed - sellVatAed - sellOtherAed;

  let debtPayoffEur = 0;
  if(s.financingMode === "UAE Mortgage") debtPayoffEur = aedToEur(remainingLoanAtExitAed);
  else if(s.financingMode === "NL Loan") debtPayoffEur = remainingLoanAtExitEur;

  const saleProceedsEur = aedToEur(saleNetAedBeforeDebt) - debtPayoffEur;
  cashflowsEur[cashflowsEur.length - 1] += saleProceedsEur;

  const totalAcqCostEur = aedToEur(totalAcqCostAed);
  const noiEurYr1 = aedToEur(noiAedYr1);
  const netYield = totalAcqCostEur > 0 ? (noiEurYr1 / totalAcqCostEur) : NaN;

  const annualDebtServiceEurShown =
    (s.financingMode === "UAE Mortgage") ? aedToEur(annualDebtServiceAed) :
    (s.financingMode === "NL Loan") ? annualDebtServiceEur : 0;

  const monthlyCashflowEur = annualCashflowEurYr1 / 12;
  const monthlyCashflowAed = eurToAed(monthlyCashflowEur);
  const monthlyCashflowInr = eurToInr(monthlyCashflowEur);

  const cashOnCash = cashInvestedEur > 0 ? (annualCashflowEurYr1 / cashInvestedEur) : NaN;
  const irrVal = irr(cashflowsEur);

  return {
    fxAedPerEur, inrPerEur,
    priceAed, priceEur: aedToEur(priceAed), priceInr: aedToInr(priceAed),
    grossRentAedYr1: grossRent1, grossRentEurYr1: aedToEur(grossRent1), grossRentInrYr1: aedToInr(grossRent1),
    totalAcqCostAed, totalAcqCostEur,
    cashInvestedEur,
    noiAedYr1, noiEurYr1,
    annualDebtServiceEur: annualDebtServiceEurShown,
    monthlyCashflowEur, monthlyCashflowAed, monthlyCashflowInr,
    netYield, cashOnCash, irr: irrVal
  };
}

/* -------- UI rendering -------- */
const scenariosEl = document.getElementById("scenarios");
const compareBodyEl = document.getElementById("compare-body");

const scenarioKeys = ["A","B"];
const AED_FIELDS = [
  "purchasePriceAed","annualRentAed","serviceChargesAedYr",
  "regAdminAed","trusteeFeeAed","nocFeeAed","otherUpfrontAed","furnitureAed",
  "insuranceAedYr","otherOpAedYr",
  "uaeBankFeeAed","uaeMortgageRegAdminAed","sellOtherAed"
];
const EUR_FIELDS = ["nlLoanAmountEur","nlBankFeeEur"];

function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function inputNumber(key, field, labelText, value, step, currency=null, min=0, tooltip=""){
  const hintId = currency ? `hint-${key}-${field}` : "";
  const titleAttr = tooltip ? `title="${esc(tooltip)}"` : "";
  return `
    <div>
      <label for="${key}-${field}">${esc(labelText)}</label>
      <input id="${key}-${field}" ${titleAttr}
        data-scenario="${key}" data-field="${field}" data-currency="${currency ?? ""}"
        type="number" step="${step}" min="${min}" inputmode="decimal"
        value="${esc(value)}" />
      ${currency ? `<div class="hint" id="${hintId}"></div>` : ``}
    </div>
  `;
}
function inputText(key, field, labelText, value, tooltip=""){
  const titleAttr = tooltip ? `title="${esc(tooltip)}"` : "";
  return `
    <div>
      <label for="${key}-${field}">${esc(labelText)}</label>
      <input id="${key}-${field}" ${titleAttr}
        data-scenario="${key}" data-field="${field}"
        type="text" value="${esc(value)}" />
    </div>
  `;
}
function select(key, field, labelText, value, options, tooltip=""){
  const titleAttr = tooltip ? `title="${esc(tooltip)}"` : "";
  const opts = options.map(o => `<option value="${esc(o)}" ${o===value?"selected":""}>${esc(o)}</option>`).join("");
  return `
    <div>
      <label for="${key}-${field}">${esc(labelText)}</label>
      <select id="${key}-${field}" ${titleAttr} data-scenario="${key}" data-field="${field}">${opts}</select>
    </div>
  `;
}
function checkbox(key, field, labelText, checked, tooltip=""){
  const titleAttr = tooltip ? `title="${esc(tooltip)}"` : "";
  return `
    <div class="inlinecheck">
      <input id="${key}-${field}" ${titleAttr} data-scenario="${key}" data-field="${field}" type="checkbox" ${checked?"checked":""} />
      <label for="${key}-${field}">${esc(labelText)}</label>
    </div>
  `;
}
function detailsBlock(title, open, innerHtml){
  return `
    <details ${open?"open":""}>
      <summary>
        <span>${esc(title)}</span>
        <span class="chev" aria-hidden="true">›</span>
      </summary>
      <div style="margin-top:10px">${innerHtml}</div>
    </details>
  `;
}

function scenarioCardHtml(key, s){
  return `
    <div class="card" data-scenario="${key}">
      <div class="scHead">
        <div class="scTitle">
          <!-- Title includes emirate so it visibly updates when emirate changes -->
          <h3 id="title-${key}">${esc(key)}: ${esc(s.name)} (${esc(s.emirate)})</h3>
          <span class="modepill" id="badge-mode-${key}">${esc(s.financingMode)}</span>
        </div>
        <div class="meta">
          <span class="metapill">Emirate: <b id="emirate-display-${key}">${esc(s.emirate)}</b></span>
          <span class="metapill">FX: <b id="fx-display-${key}">1 EUR = ${esc(s.fxAedPerEur)} AED</b></span>
        </div>

        <div class="kpis" aria-label="Key metrics">
          <div class="kpi"><div class="kpi__k">Monthly Cashflow</div><div class="kpi__v" id="kpi-cf-${key}">—</div></div>
          <div class="kpi"><div class="kpi__k">Net Yield (Yr1)</div><div class="kpi__v" id="kpi-yield-${key}">—</div></div>
          <div class="kpi"><div class="kpi__k">Cash-on-Cash (Yr1)</div><div class="kpi__v" id="kpi-coc-${key}">—</div></div>
          <div class="kpi"><div class="kpi__k">IRR (Hold)</div><div class="kpi__v" id="kpi-irr-${key}">—</div></div>
        </div>
      </div>

      <div class="card__body">
        ${detailsBlock("Property", true, `
          <div class="inputrow">
            ${inputText(key,"name","Scenario name",s.name,"Your label for this scenario")}
            ${select(key,"emirate","Emirate",s.emirate,["Dubai","Abu Dhabi"],"Affects typical registration defaults")}
            ${select(key,"unitType","Unit type",s.unitType,["Studio","1BHK","2BHK"])}
            ${checkbox(key,"offPlan","Off-plan",s.offPlan,"Stored for now (future: payment plan modelling)")}
            ${inputNumber(key,"purchasePriceAed","Purchase price (AED)",s.purchasePriceAed,1,"AED",0,"Total unit price in AED")}
            ${inputNumber(key,"annualRentAed","Gross rent / year (AED)",s.annualRentAed,1,"AED",0,"Expected annual rent in AED")}
            ${inputNumber(key,"vacancyPct","Vacancy (%)",s.vacancyPct,0.1,null,0,"% of year vacant / unpaid")}
            ${inputNumber(key,"serviceChargesAedYr","Service charges / year (AED)",s.serviceChargesAedYr,1,"AED",0,"Community/service charges in AED per year")}
          </div>
        `)}

        ${detailsBlock("Upfront costs", false, `
          <div class="inputrow">
            ${inputNumber(key,"regFeePct","Registration fee (%)",s.regFeePct,0.01,null,0,"Dubai often ~4%; Abu Dhabi often ~2% (check)")}
            ${inputNumber(key,"regAdminAed","Registration admin (AED)",s.regAdminAed,1,"AED",0)}
            ${inputNumber(key,"agentPct","Agent fee (%)",s.agentPct,0.01,null,0)}
            ${inputNumber(key,"vatPct","VAT on agent fee (%)",s.vatPct,0.01,null,0)}
            ${inputNumber(key,"trusteeFeeAed","Trustee / admin (AED)",s.trusteeFeeAed,1,"AED",0)}
            ${inputNumber(key,"nocFeeAed","NOC fee (AED)",s.nocFeeAed,1,"AED",0)}
            ${inputNumber(key,"furnitureAed","Furniture / setup (AED)",s.furnitureAed,1,"AED",0)}
            ${inputNumber(key,"otherUpfrontAed","Other upfront (AED)",s.otherUpfrontAed,1,"AED",0)}
          </div>
        `)}

        ${detailsBlock("Operating assumptions", false, `
          <div class="inputrow">
            ${inputNumber(key,"mgmtPct","Property mgmt (% of collected rent)",s.mgmtPct,0.01,null,0)}
            ${inputNumber(key,"maintPct","Maintenance reserve (% of collected rent)",s.maintPct,0.01,null,0)}
            ${inputNumber(key,"insuranceAedYr","Insurance / year (AED)",s.insuranceAedYr,1,"AED",0)}
            ${inputNumber(key,"otherOpAedYr","Other operating / year (AED)",s.otherOpAedYr,1,"AED",0)}
            ${inputNumber(key,"rentGrowthPct","Rent growth (%/yr)",s.rentGrowthPct,0.01,null,0)}
            ${inputNumber(key,"expenseGrowthPct","Expense growth (%/yr)",s.expenseGrowthPct,0.01,null,0)}
          </div>
        `)}

        ${detailsBlock("Financing", true, `
          <div class="inputrow">
            ${select(key,"financingMode","Financing mode",s.financingMode,["Cash","UAE Mortgage","NL Loan"],"Choose how you fund the purchase")}
            ${inputNumber(key,"fxAedPerEur","FX: 1 EUR = (AED)",s.fxAedPerEur,0.0001,null,0,"Used for all AED↔EUR conversions")}
          </div>

          <div class="subcard" id="uae-mortgage-${key}" style="display:none;">
            <div class="hint"><b>UAE Mortgage</b></div>
            <div class="inputrow">
              ${inputNumber(key,"uaeDownPct","Down payment (%)",s.uaeDownPct,0.1,null,0)}
              ${inputNumber(key,"uaeRatePct","Interest rate (%/yr)",s.uaeRatePct,0.01,null,0)}
              ${inputNumber(key,"uaeTermYrs","Term (years)",s.uaeTermYrs,1,null,1)}
              ${inputNumber(key,"uaeBankFeePct","Bank fee (% of loan)",s.uaeBankFeePct,0.01,null,0)}
              ${inputNumber(key,"uaeBankFeeAed","Bank fee (fixed AED)",s.uaeBankFeeAed,1,"AED",0)}
              ${inputNumber(key,"uaeMortgageRegPct","Mortgage registration (% of loan)",s.uaeMortgageRegPct,0.01,null,0)}
              ${inputNumber(key,"uaeMortgageRegAdminAed","Mortgage reg admin (AED)",s.uaeMortgageRegAdminAed,1,"AED",0)}
            </div>
          </div>

          <div class="subcard" id="nl-loan-${key}" style="display:none;">
            <div class="hint"><b>NL Loan (EUR)</b></div>
            <div class="inputrow">
              ${inputNumber(key,"nlLoanAmountEur","Loan amount (EUR)",s.nlLoanAmountEur,1,"EUR",0)}
              ${inputNumber(key,"nlRatePct","Interest rate (%/yr)",s.nlRatePct,0.01,null,0)}
              ${inputNumber(key,"nlTermYrs","Term (years)",s.nlTermYrs,1,null,1)}
              ${select(key,"nlRepayment","Repayment type",s.nlRepayment,["Amortizing","Interest-only"])}
              ${inputNumber(key,"nlBankFeePct","Bank fee (% of loan)",s.nlBankFeePct,0.01,null,0)}
              ${inputNumber(key,"nlBankFeeEur","Bank fee (fixed EUR)",s.nlBankFeeEur,0.01,"EUR",0)}
            </div>
            <div class="hint">Cash invested ≈ (Total acquisition cost in EUR − Loan amount) + bank fees.</div>
          </div>
        `)}

        ${detailsBlock("Exit (for IRR)", false, `
          <div class="inputrow">
            ${inputNumber(key,"holdYrs","Hold period (years)",s.holdYrs,1,null,1)}
            ${inputNumber(key,"appreciationPct","Price appreciation (%/yr)",s.appreciationPct,0.01,null,0)}
            ${inputNumber(key,"sellAgentPct","Selling agent fee (%)",s.sellAgentPct,0.01,null,0)}
            ${inputNumber(key,"sellVatPct","VAT on selling agent fee (%)",s.sellVatPct,0.01,null,0)}
            ${inputNumber(key,"sellOtherAed","Other selling costs (AED)",s.sellOtherAed,1,"AED",0)}
          </div>
        `)}
      </div>
    </div>
  `;
}

/* Update title/meta instantly */
function setText(id, text){
  const el = document.getElementById(id);
  if(el) el.textContent = text;
}

/* Show/hide financing blocks */
function showHideFinancingSections(){
  scenarioKeys.forEach(k => {
    const mode = state[k].financingMode;
    const uae = document.getElementById(`uae-mortgage-${k}`);
    const nl  = document.getElementById(`nl-loan-${k}`);
    if(uae) uae.style.display = (mode === "UAE Mortgage") ? "block" : "none";
    if(nl)  nl.style.display  = (mode === "NL Loan") ? "block" : "none";
  });
}

/* Per-field currency hint */
function updateFieldHint(key, field, currency){
  const hintEl = document.getElementById(`hint-${key}-${field}`);
  if(!hintEl) return;

  const fxAedPerEur = Math.max(0.0001, num(state[key].fxAedPerEur));
  const inrPerEur = Math.max(0.0001, num(state.global.inrPerEur));
  const v = num(state[key][field]);

  if(currency === "AED"){
    const eur = v / fxAedPerEur;
    const inr = eur * inrPerEur;
    hintEl.textContent = `≈ ${fmtMoney(eur,"EUR")} • ≈ ${fmtMoney(inr,"INR")}`;
  } else if(currency === "EUR"){
    const aed = v * fxAedPerEur;
    const inr = v * inrPerEur;
    hintEl.textContent = `≈ ${fmtMoney(aed,"AED")} • ≈ ${fmtMoney(inr,"INR")}`;
  }
}
function updateAllHints(){
  scenarioKeys.forEach(k => {
    AED_FIELDS.forEach(f => updateFieldHint(k, f, "AED"));
    EUR_FIELDS.forEach(f => updateFieldHint(k, f, "EUR"));
  });
  setText("fx-inr-eur-display", `1 EUR = ${num(state.global.inrPerEur).toLocaleString("en-GB",{maximumFractionDigits:2})} INR`);
}

/* Basic input validation (non-negative for most numeric inputs) */
function sanitizeInput(el){
  if(!el || el.type !== "number") return;
  const min = el.getAttribute("min");
  const minVal = min !== null ? num(min) : -Infinity;

  const v = num(el.value);
  if(v < minVal){
    el.classList.add("input--bad");
  } else {
    el.classList.remove("input--bad");
  }
}

/* Wire all inputs */
function wireInputs(){
  document.querySelectorAll("[data-scenario][data-field]").forEach(el => {
    const key = el.getAttribute("data-scenario");
    const field = el.getAttribute("data-field");

    const handler = () => {
      const prev = state[key][field];

      if(el.type === "checkbox") state[key][field] = el.checked;
      else if(el.tagName === "SELECT" || el.type === "text") state[key][field] = el.value;
      else state[key][field] = num(el.value);

      sanitizeInput(el);

      // FIX: emirate changes should immediately update the visible header title/meta
      if(field === "emirate"){
        const newEm = state[key].emirate;

        // If regFeePct still equals the default of the previous emirate, auto-adjust to new default (nice UX)
        const oldDefault = defaultRegFeePct(prev);
        if(Math.abs(num(state[key].regFeePct) - oldDefault) < 0.001){
          state[key].regFeePct = defaultRegFeePct(newEm);
          const regEl = document.getElementById(`${key}-regFeePct`);
          if(regEl) regEl.value = state[key].regFeePct;
        }

        const oldMort = defaultMortgageRegPct(prev);
        if(Math.abs(num(state[key].uaeMortgageRegPct) - oldMort) < 0.001){
          state[key].uaeMortgageRegPct = defaultMortgageRegPct(newEm);
          const mortEl = document.getElementById(`${key}-uaeMortgageRegPct`);
          if(mortEl) mortEl.value = state[key].uaeMortgageRegPct;
        }

        setText(`emirate-display-${key}`, newEm);
        setText(`title-${key}`, `${key}: ${state[key].name} (${newEm})`);
      }

      if(field === "name"){
        setText(`title-${key}`, `${key}: ${state[key].name} (${state[key].emirate})`);
      }

      if(field === "financingMode"){
        setText(`badge-mode-${key}`, state[key].financingMode);
      }

      if(field === "fxAedPerEur"){
        setText(`fx-display-${key}`, `1 EUR = ${num(state[key].fxAedPerEur).toLocaleString("en-GB",{maximumFractionDigits:4})} AED`);
      }

      showHideFinancingSections();
      saveState();
      updateAllHints();
      recalcAndRender();
    };

    // Use both input + change to cover all browsers for selects
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
    sanitizeInput(el);
  });

  const inrInput = document.getElementById("global-inr-per-eur");
  if(inrInput){
    inrInput.addEventListener("input", () => {
      state.global.inrPerEur = num(inrInput.value);
      sanitizeInput(inrInput);
      saveState();
      updateAllHints();
      recalcAndRender();
    });
    inrInput.addEventListener("change", () => {
      state.global.inrPerEur = num(inrInput.value);
      sanitizeInput(inrInput);
      saveState();
      updateAllHints();
      recalcAndRender();
    });
    sanitizeInput(inrInput);
  }

  showHideFinancingSections();
}

/* Comparison table render */
function renderCompare(rows, results){
  if(!compareBodyEl) return;

  setText("th-a", `A: ${state.A.name} (${state.A.emirate})`);
  setText("th-b", `B: ${state.B.name} (${state.B.emirate})`);

  compareBodyEl.innerHTML = rows.map(row => {
    const tds = scenarioKeys.map(k => {
      const valStr = row.fmt(state[k], results[k]);
      let cls = "";

      if(row.metric){
        const vals = scenarioKeys.map(kk => results[kk][row.metric]).filter(v => Number.isFinite(v));
        if(vals.length){
          const best = row.better === "lower" ? Math.min(...vals) : Math.max(...vals);
          if(Number.isFinite(results[k][row.metric]) && Math.abs(results[k][row.metric] - best) < 1e-12) cls = "best";
        }
      }

      return `<td class="${cls}">${esc(valStr)}</td>`;
    }).join("");

    return `<tr><td>${esc(row.label)}</td>${tds}</tr>`;
  }).join("");
}

/* Recalc + all displays */
function recalcAndRender(){
  const res = {
    A: calcScenario(state.A, state.global),
    B: calcScenario(state.B, state.global)
  };

  // Title + meta (also fixes your “emirate not changing in header” issue)
  scenarioKeys.forEach(k => {
    setText(`title-${k}`, `${k}: ${state[k].name} (${state[k].emirate})`);
    setText(`emirate-display-${k}`, state[k].emirate);
    setText(`badge-mode-${k}`, state[k].financingMode);
    setText(`fx-display-${k}`, `1 EUR = ${num(state[k].fxAedPerEur).toLocaleString("en-GB",{maximumFractionDigits:4})} AED`);
  });

  // KPI tiles
  scenarioKeys.forEach(k => {
    const r = res[k];
    setText(`kpi-cf-${k}`, `${fmtMoney(r.monthlyCashflowAed,"AED")} / ${fmtMoney(r.monthlyCashflowEur,"EUR")}`);
    setText(`kpi-yield-${k}`, Number.isFinite(r.netYield) ? fmtPct(r.netYield * 100) : "n/a");
    setText(`kpi-coc-${k}`, Number.isFinite(r.cashOnCash) ? fmtPct(r.cashOnCash * 100) : "n/a");
    setText(`kpi-irr-${k}`, fmtIrr(r.irr));
  });

  // Comparison rows
  const rows = [
    { label:"Purchase price", fmt:(s, r) => `${fmtMoney(s.purchasePriceAed,"AED")} / ${fmtMoney(r.priceEur,"EUR")}` },
    { label:"Gross rent (year 1)", fmt:(s, r) => `${fmtMoney(s.annualRentAed,"AED")} / ${fmtMoney(r.grossRentEurYr1,"EUR")}` },
    { label:"Total acquisition cost", fmt:(s, r) => `${fmtMoney(r.totalAcqCostAed,"AED")} / ${fmtMoney(r.totalAcqCostEur,"EUR")}` },
    { label:"Cash invested (upfront)", fmt:(s, r) => `${fmtMoney(r.cashInvestedEur,"EUR")} / ${fmtMoney(r.cashInvestedEur * num(state.global.inrPerEur),"INR")}` },
    { label:"NOI (Year 1)", fmt:(s, r) => `${fmtMoney(r.noiAedYr1,"AED")} / ${fmtMoney(r.noiEurYr1,"EUR")}` },
    { label:"Debt service (Year 1)", fmt:(s, r) => fmtMoney(r.annualDebtServiceEur,"EUR") },
    { label:"Monthly cashflow (Year 1)", metric:"monthlyCashflowEur", better:"higher",
      fmt:(s, r) => `${fmtMoney(r.monthlyCashflowAed,"AED")} / ${fmtMoney(r.monthlyCashflowEur,"EUR")} / ${fmtMoney(r.monthlyCashflowInr,"INR")}`
    },
    { label:"Net yield (Year 1)", metric:"netYield", better:"higher",
      fmt:(s, r) => Number.isFinite(r.netYield) ? fmtPct(r.netYield * 100) : "n/a"
    },
    { label:"Cash-on-cash (Year 1)", metric:"cashOnCash", better:"higher",
      fmt:(s, r) => Number.isFinite(r.cashOnCash) ? fmtPct(r.cashOnCash * 100) : "n/a"
    },
    { label:"IRR (Hold)", metric:"irr", better:"higher", fmt:(s, r) => fmtIrr(r.irr) }
  ];
  renderCompare(rows, res);

  // Bottom bar (AED/EUR/INR)
  const triple = (aed, eur, inr) => `${fmtMoney(aed,"AED")} • ${fmtMoney(eur,"EUR")} • ${fmtMoney(inr,"INR")}`;

  setText("bottom-title-a", `A: ${state.A.name} (${state.A.emirate})`);
  setText("bottom-title-b", `B: ${state.B.name} (${state.B.emirate})`);

  setText("bottom-price-a", triple(res.A.priceAed, res.A.priceEur, res.A.priceInr));
  setText("bottom-price-b", triple(res.B.priceAed, res.B.priceEur, res.B.priceInr));

  setText("bottom-rent-a", triple(res.A.grossRentAedYr1, res.A.grossRentEurYr1, res.A.grossRentInrYr1));
  setText("bottom-rent-b", triple(res.B.grossRentAedYr1, res.B.grossRentEurYr1, res.B.grossRentInrYr1));

  setText("bottom-cf-a", triple(res.A.monthlyCashflowAed, res.A.monthlyCashflowEur, res.A.monthlyCashflowInr));
  setText("bottom-cf-b", triple(res.B.monthlyCashflowAed, res.B.monthlyCashflowEur, res.B.monthlyCashflowInr));

  setText("bottom-fx-a", `FX used: 1 EUR = ${res.A.fxAedPerEur} AED • 1 EUR = ${res.A.inrPerEur} INR`);
  setText("bottom-fx-b", `FX used: 1 EUR = ${res.B.fxAedPerEur} AED • 1 EUR = ${res.B.inrPerEur} INR`);
}

/* Toolbar */
function wireToolbar(){
  const resetBtn = document.getElementById("btn-reset");
  const copyBtn  = document.getElementById("btn-copy-a-to-b");
  const swapBtn  = document.getElementById("btn-swap");
  const exportBtn= document.getElementById("btn-export");

  if(resetBtn) resetBtn.addEventListener("click", () => {
    const fresh = clone(DEFAULTS);
    state.global = fresh.global;
    state.A = fresh.A;
    state.B = fresh.B;
    saveState();
    render();
  });

  if(copyBtn) copyBtn.addEventListener("click", () => {
    state.B = clone(state.A);
    state.B.name = "Scenario B";
    saveState();
    render();
  });

  if(swapBtn) swapBtn.addEventListener("click", () => {
    const tmp = clone(state.A);
    state.A = clone(state.B);
    state.B = tmp;
    saveState();
    render();
  });

  if(exportBtn) exportBtn.addEventListener("click", () => {
    const payload = { exportedAt: new Date().toISOString(), state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "uae-property-financing.json";
    a.click();
    URL.revokeObjectURL(url);
  });
}

/* Render */
function render(){
  // Global inputs
  const inr = document.getElementById("global-inr-per-eur");
  if(inr) inr.value = num(state.global.inrPerEur);

  // Scenario cards
  if(scenariosEl){
    scenariosEl.innerHTML = scenarioKeys.map(k => scenarioCardHtml(k, state[k])).join("");
  }

  wireInputs();
  updateAllHints();
  recalcAndRender();
}

wireToolbar();
render();
