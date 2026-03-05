const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = Array.from(document.querySelectorAll(".panel"));
const resetAllBtn = document.getElementById("resetAll");

const inputs = {
  kaufbetrag: document.getElementById("kaufbetrag"),
  zins: document.getElementById("zins"),
  laufzeit: document.getElementById("laufzeit"),
  ratenProJahr: document.getElementById("ratenProJahr"),
  rate: document.getElementById("rate"),
  startdatum: document.getElementById("startdatum"),
  sonderTakt: document.getElementById("sonderTakt"),
  sonderBetrag: document.getElementById("sonderBetrag"),
  makler: document.getElementById("makler"),
  grunderwerb: document.getElementById("grunderwerb"),
  notar: document.getElementById("notar"),
  grundbuch: document.getElementById("grundbuch"),
  notarander: document.getElementById("notarander"),
  partnervertrag: document.getElementById("partnervertrag"),
  renovierung: document.getElementById("renovierung"),
  ekA: document.getElementById("ekA"),
  ekARes: document.getElementById("ekARes"),
  ekB: document.getElementById("ekB"),
  ekBRes: document.getElementById("ekBRes"),
  ekC: document.getElementById("ekC"),
  anlageStart: document.getElementById("anlageStart"),
  anlageZins: document.getElementById("anlageZins"),
  anlageJahre: document.getElementById("anlageJahre"),
  anlageZahlungen: document.getElementById("anlageZahlungen"),
  anlageEinzahlung: document.getElementById("anlageEinzahlung"),
  gehaltStart: document.getElementById("gehaltStart"),
  gehaltSteig: document.getElementById("gehaltSteig"),
  gehaltJahre: document.getElementById("gehaltJahre"),
  gehaltSplit: document.getElementById("gehaltSplit")
};

const outputs = {
  kreditbetrag: document.getElementById("kreditbetrag"),
  gesamtKosten: document.getElementById("gesamtKosten"),
  zinsKosten: document.getElementById("zinsKosten"),
  laufzeitMon: document.getElementById("laufzeitMon"),
  gesamtKostenOhneZins: document.getElementById("gesamtKostenOhneZins"),
  ekGesamt: document.getElementById("ekGesamt"),
  anlageGesamt: document.getElementById("anlageGesamt"),
  anlageErtrag: document.getElementById("anlageErtrag"),
  expTotalMonth: document.getElementById("expTotalMonth"),
  expA: document.getElementById("expA"),
  expB: document.getElementById("expB")
};

const amortTable = document.querySelector("#amortTable tbody");
const anlageTable = document.querySelector("#anlageTable tbody");
const gehaltTable = document.querySelector("#gehaltTable tbody");
const expenseTable = document.querySelector("#expenseTable tbody");
const addExpenseBtn = document.getElementById("addExpense");

const storeKey = "immokredit_state_v1";

function fmtMoney(value) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value || 0);
}

function fmtNumber(value, digits = 2) {
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value || 0);
}

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getDateInputValue() {
  if (inputs.startdatum.value) return new Date(inputs.startdatum.value);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function addMonths(date, months) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function saveState() {
  const data = {
    inputs: Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value])),
    expenses
  };
  localStorage.setItem(storeKey, JSON.stringify(data));
}

function loadState() {
  const raw = localStorage.getItem(storeKey);
  if (!raw) return;
  const data = JSON.parse(raw);
  if (data.inputs) {
    Object.entries(data.inputs).forEach(([k, v]) => {
      if (inputs[k]) inputs[k].value = v;
    });
  }
  if (Array.isArray(data.expenses)) {
    expenses = data.expenses;
  }
}

function calcNebenkosten() {
  const kaufbetrag = parseNumber(inputs.kaufbetrag.value);
  const fees = [
    parseNumber(inputs.makler.value) / 100,
    parseNumber(inputs.grunderwerb.value) / 100,
    parseNumber(inputs.notar.value) / 100,
    parseNumber(inputs.grundbuch.value) / 100,
    parseNumber(inputs.notarander.value) / 100,
    parseNumber(inputs.partnervertrag.value) / 100
  ];
  const renovierung = parseNumber(inputs.renovierung.value);
  const feeSum = fees.reduce((acc, v) => acc + v, 0);
  const gesamt = kaufbetrag * (1 + feeSum) + renovierung;

  const ek = parseNumber(inputs.ekA.value) - parseNumber(inputs.ekARes.value)
          + parseNumber(inputs.ekB.value) - parseNumber(inputs.ekBRes.value)
          + parseNumber(inputs.ekC.value);

  outputs.gesamtKostenOhneZins.textContent = fmtMoney(gesamt);
  outputs.ekGesamt.textContent = fmtMoney(ek);

  return { gesamt, ek };
}

function calcLoan() {
  const { gesamt, ek } = calcNebenkosten();
  const kredit = Math.max(0, gesamt - ek);
  const zinssatz = parseNumber(inputs.zins.value) / 100;
  const rate = parseNumber(inputs.rate.value);
  const ratenProJahr = Math.max(1, parseNumber(inputs.ratenProJahr.value));
  const sonderTakt = Math.max(0, parseNumber(inputs.sonderTakt.value));
  const sonderBetrag = parseNumber(inputs.sonderBetrag.value);
  const start = getDateInputValue();

  const periodRate = zinssatz / ratenProJahr;
  const schedule = [];

  let balance = kredit;
  let monthIndex = 0;
  let totalInterest = 0;
  let totalPaid = 0;

  while (balance > 0 && monthIndex < 2000) {
    const interest = balance * periodRate;
    let principal = Math.max(0, rate - interest);
    let extra = 0;
    if (sonderTakt > 0) {
      const monthsPerPay = Math.round(12 / ratenProJahr);
      const monthsElapsed = monthIndex * monthsPerPay;
      if (monthsElapsed > 0 && monthsElapsed % sonderTakt === 0) {
        extra = sonderBetrag;
      }
    }
    const payment = Math.min(balance + interest, rate + extra);
    principal = Math.min(balance, payment - interest);
    balance = Math.max(0, balance - principal);

    totalInterest += interest;
    totalPaid += payment;

    schedule.push({
      date: addMonths(start, Math.round(12 / ratenProJahr) * monthIndex),
      payment,
      principal,
      interest,
      balance
    });

    monthIndex += 1;
  }

  outputs.kreditbetrag.textContent = fmtMoney(kredit);
  outputs.zinsKosten.textContent = fmtMoney(totalInterest);
  outputs.gesamtKosten.textContent = fmtMoney(kredit + totalInterest + ek);
  outputs.laufzeitMon.textContent = schedule.length;

  renderAmort(schedule);

  return schedule;
}

function renderAmort(schedule) {
  amortTable.innerHTML = "";
  schedule.slice(0, 240).forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.date.toLocaleDateString("de-DE")}</td>
      <td>${fmtMoney(row.payment)}</td>
      <td>${fmtMoney(row.principal)}</td>
      <td>${fmtMoney(row.interest)}</td>
      <td>${fmtMoney(row.balance)}</td>
    `;
    amortTable.appendChild(tr);
  });
}

function calcAnlage() {
  const start = parseNumber(inputs.anlageStart.value);
  const zinssatz = parseNumber(inputs.anlageZins.value) / 100;
  const jahre = parseNumber(inputs.anlageJahre.value);
  const payments = Math.max(1, parseNumber(inputs.anlageZahlungen.value));
  const einzahlung = parseNumber(inputs.anlageEinzahlung.value);

  const periods = Math.round(jahre * payments);
  const rate = zinssatz / payments;
  let balance = start;
  let totalInterest = 0;
  const schedule = [];
  const startDate = new Date();

  for (let i = 0; i < periods; i += 1) {
    const interest = balance * rate;
    balance += interest + einzahlung;
    totalInterest += interest;
    schedule.push({
      date: addMonths(startDate, Math.round(12 / payments) * i),
      payment: einzahlung,
      interest,
      totalInterest,
      balance
    });
  }

  outputs.anlageGesamt.textContent = fmtMoney(balance);
  outputs.anlageErtrag.textContent = fmtMoney(totalInterest);
  renderAnlage(schedule);
}

function renderAnlage(schedule) {
  anlageTable.innerHTML = "";
  schedule.slice(0, 240).forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.date.toLocaleDateString("de-DE")}</td>
      <td>${fmtMoney(row.payment)}</td>
      <td>${fmtMoney(row.interest)}</td>
      <td>${fmtMoney(row.totalInterest)}</td>
      <td>${fmtMoney(row.balance)}</td>
    `;
    anlageTable.appendChild(tr);
  });
}

function calcGehalt() {
  const start = parseNumber(inputs.gehaltStart.value);
  const steig = parseNumber(inputs.gehaltSteig.value) / 100;
  const jahre = Math.max(1, parseNumber(inputs.gehaltJahre.value));
  const split = inputs.gehaltSplit.value.split("/").map(v => parseNumber(v));
  const fixPct = split[0] ? split[0] / 100 : 1;
  const varPct = split[1] ? split[1] / 100 : 0;

  gehaltTable.innerHTML = "";
  let salary = start;
  for (let i = 1; i <= jahre; i += 1) {
    const fix = salary * fixPct;
    const variabel = salary * varPct;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i}</td>
      <td>${fmtMoney(salary)}</td>
      <td>${fmtMoney(fix)}</td>
      <td>${fmtMoney(variabel)}</td>
      <td>${fmtMoney(fix / 12)}</td>
    `;
    gehaltTable.appendChild(tr);
    salary *= (1 + steig);
  }
}

let expenses = [
  { who: "Gemeinsam", what: "Nebenkosten Haus", perYear: 12, amount: 350 },
  { who: "Gemeinsam", what: "Strom", perYear: 12, amount: 65 }
];

function renderExpenses() {
  expenseTable.innerHTML = "";
  let totalMonth = 0;
  let totalA = 0;
  let totalB = 0;

  expenses.forEach((row, idx) => {
    const yearly = row.perYear * row.amount;
    const monthly = yearly / 12;
    totalMonth += monthly;
    if (row.who === "Person A") totalA += monthly;
    if (row.who === "Person B") totalB += monthly;
    if (row.who === "Gemeinsam") {
      totalA += monthly / 2;
      totalB += monthly / 2;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <select data-idx="${idx}" data-field="who">
          <option${row.who === "Gemeinsam" ? " selected" : ""}>Gemeinsam</option>
          <option${row.who === "Person A" ? " selected" : ""}>Person A</option>
          <option${row.who === "Person B" ? " selected" : ""}>Person B</option>
        </select>
      </td>
      <td><input data-idx="${idx}" data-field="what" value="${row.what}" /></td>
      <td><input data-idx="${idx}" data-field="perYear" type="number" value="${row.perYear}" /></td>
      <td><input data-idx="${idx}" data-field="amount" type="number" value="${row.amount}" /></td>
      <td>${fmtMoney(yearly)}</td>
      <td>${fmtMoney(monthly)}</td>
    `;
    expenseTable.appendChild(tr);
  });

  outputs.expTotalMonth.textContent = fmtMoney(totalMonth);
  outputs.expA.textContent = fmtMoney(totalA);
  outputs.expB.textContent = fmtMoney(totalB);

  expenseTable.querySelectorAll("input, select").forEach(el => {
    el.addEventListener("change", (e) => {
      const idx = Number(e.target.dataset.idx);
      const field = e.target.dataset.field;
      expenses[idx][field] = field === "what" || field === "who" ? e.target.value : parseNumber(e.target.value);
      renderExpenses();
      saveState();
    });
  });
}

function recalcAll() {
  calcLoan();
  calcAnlage();
  calcGehalt();
  renderExpenses();
  saveState();
}

function initTabs() {
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });
}

Object.values(inputs).forEach(input => {
  if (!input) return;
  input.addEventListener("input", recalcAll);
});

addExpenseBtn.addEventListener("click", () => {
  expenses.push({ who: "Gemeinsam", what: "Neu", perYear: 12, amount: 0 });
  renderExpenses();
  saveState();
});

resetAllBtn.addEventListener("click", () => {
  localStorage.removeItem(storeKey);
  window.location.reload();
});

function setDefaultStartDate() {
  const now = new Date();
  const val = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  inputs.startdatum.value = inputs.startdatum.value || val;
}

loadState();
setDefaultStartDate();
initTabs();
recalcAll();
