const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = Array.from(document.querySelectorAll(".panel"));
const resetAllBtn = document.getElementById("resetAll");
const profileSelect = document.getElementById("profileSelect");
const profileName = document.getElementById("profileName");
const profileSave = document.getElementById("profileSave");
const profileDelete = document.getElementById("profileDelete");

const inputs = {
  kaufbetrag: document.getElementById("kaufbetrag"),
  zins: document.getElementById("zins"),
  laufzeit: document.getElementById("laufzeit"),
  ratenProJahr: document.getElementById("ratenProJahr"),
  rate: document.getElementById("rate"),
  currentHousingCost: document.getElementById("currentHousingCost"),
  expectedNkWhg: document.getElementById("expectedNkWhg"),
  expectedNkHaus: document.getElementById("expectedNkHaus"),
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
  newCostWhg: document.getElementById("newCostWhg"),
  diffWhg: document.getElementById("diffWhg"),
  newCostHaus: document.getElementById("newCostHaus"),
  diffHaus: document.getElementById("diffHaus"),
  investEndValue: document.getElementById("investEndValue"),
  loanEndValue: document.getElementById("loanEndValue"),
  breakEvenPoint: document.getElementById("breakEvenPoint"),
  expTotalMonth: document.getElementById("expTotalMonth"),
  expA: document.getElementById("expA"),
  expB: document.getElementById("expB")
};

const amortTable = document.querySelector("#amortTable tbody");
const anlageTable = document.querySelector("#anlageTable tbody");
const gehaltTable = document.querySelector("#gehaltTable tbody");
const expenseTable = document.querySelector("#expenseTable tbody");
const addExpenseBtn = document.getElementById("addExpense");
const compareChart = document.getElementById("compareChart");
const offerSelect = document.getElementById("offerSelect");
const offerNewBtn = document.getElementById("offerNew");
const offerSaveBtn = document.getElementById("offerSave");
const offerDeleteBtn = document.getElementById("offerDelete");
const offerList = document.getElementById("offerList");

const offerFields = {
  title: document.getElementById("offerTitle"),
  type: document.getElementById("offerType"),
  price: document.getElementById("offerPrice"),
  provision: document.getElementById("offerProvision"),
  parkingCount: document.getElementById("offerParkingCount"),
  parkingPrice: document.getElementById("offerParkingPrice"),
  area: document.getElementById("offerArea"),
  landArea: document.getElementById("offerLandArea"),
  link1: document.getElementById("offerLink1"),
  link2: document.getElementById("offerLink2"),
  link3: document.getElementById("offerLink3"),
  notes: document.getElementById("offerNotes")
};
const offerImagesInput = document.getElementById("offerImages");
const offerImagePreview = document.getElementById("offerImagePreview");

const storeKey = "immokredit_state_v1";
const profilesKey = "immokredit_profiles_v1";
const offerTypesToVersion = ["price", "provision", "parkingCount", "parkingPrice", "area", "landArea"];

let selectedOfferId = "";
let offers = [];
let stagedOfferImages = [];
let storageQuotaWarningShown = false;
let latestLoanSchedule = [];

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

function fmtDateTime(value) {
  return new Date(value).toLocaleString("de-DE");
}

function makeOfferSnapshot(data, changed = "initial") {
  return {
    at: new Date().toISOString(),
    changed,
    price: data.price,
    provision: data.provision,
    parkingCount: data.parkingCount,
    parkingPrice: data.parkingPrice,
    area: data.area,
    landArea: data.landArea
  };
}

function getOfferLabel(offer) {
  const title = (offer.title || "").trim();
  if (title) return title;
  const type = offer.type || "Objekt";
  if (offer.price > 0) return `${type} ${fmtMoney(offer.price)}`;
  return `${type} ${new Date(offer.createdAt).toLocaleDateString("de-DE")}`;
}

function getOfferDraft() {
  return {
    title: (offerFields.title.value || "").trim(),
    type: (offerFields.type.value || "Wohnung").trim(),
    price: parseNumber(offerFields.price.value),
    provision: parseNumber(offerFields.provision.value),
    parkingCount: parseNumber(offerFields.parkingCount.value),
    parkingPrice: parseNumber(offerFields.parkingPrice.value),
    area: parseNumber(offerFields.area.value),
    landArea: parseNumber(offerFields.landArea.value),
    links: [offerFields.link1.value, offerFields.link2.value, offerFields.link3.value]
      .map((v) => (v || "").trim())
      .filter(Boolean),
    notes: (offerFields.notes.value || "").trim()
  };
}

function hasOfferVersionChange(before, after) {
  return offerTypesToVersion.some((field) => parseNumber(before[field]) !== parseNumber(after[field]));
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
    expenses,
    offers,
    selectedOfferId
  };
  try {
    localStorage.setItem(storeKey, JSON.stringify(data));
    storageQuotaWarningShown = false;
  } catch {
    if (!storageQuotaWarningShown) {
      window.alert("Speicher voll: Bilder oder Daten sind zu groß für den Browser-Speicher.");
      storageQuotaWarningShown = true;
    }
  }
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
  if (Array.isArray(data.offers)) {
    offers = data.offers;
  }
  if (typeof data.selectedOfferId === "string") {
    selectedOfferId = data.selectedOfferId;
  }
}

function loadProfiles() {
  const raw = localStorage.getItem(profilesKey);
  return raw ? JSON.parse(raw) : {};
}

function saveProfiles(profiles) {
  try {
    localStorage.setItem(profilesKey, JSON.stringify(profiles));
    storageQuotaWarningShown = false;
  } catch {
    if (!storageQuotaWarningShown) {
      window.alert("Profil konnte nicht gespeichert werden (Browser-Speicher voll).");
      storageQuotaWarningShown = true;
    }
  }
}

function refreshProfileSelect() {
  const profiles = loadProfiles();
  profileSelect.innerHTML = "";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Profil wählen";
  profileSelect.appendChild(defaultOpt);
  Object.keys(profiles).sort().forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    profileSelect.appendChild(opt);
  });
}

function applyProfile(data) {
  if (!data) return;
  if (data.inputs) {
    Object.entries(data.inputs).forEach(([k, v]) => {
      if (inputs[k]) inputs[k].value = v;
    });
  }
  if (Array.isArray(data.expenses)) {
    expenses = data.expenses;
  }
  if (Array.isArray(data.offers)) {
    offers = data.offers;
  }
  if (typeof data.selectedOfferId === "string") {
    selectedOfferId = data.selectedOfferId;
  }
  syncOfferSelect();
  if (selectedOfferId) {
    loadOfferToForm(selectedOfferId);
  } else {
    clearOfferForm();
  }
  recalcAll();
  renderOfferList();
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

function calcHousingComparison() {
  const rate = parseNumber(inputs.rate.value);
  const currentCost = parseNumber(inputs.currentHousingCost.value);
  const nkWhg = parseNumber(inputs.expectedNkWhg.value);
  const nkHaus = parseNumber(inputs.expectedNkHaus.value);

  const newWhg = rate + nkWhg;
  const newHaus = rate + nkHaus;
  const diffWhg = newWhg - currentCost;
  const diffHaus = newHaus - currentCost;

  const fmtSigned = (value) => `${value >= 0 ? "+" : "-"}${fmtMoney(Math.abs(value))}`;
  outputs.newCostWhg.textContent = fmtMoney(newWhg);
  outputs.diffWhg.textContent = fmtSigned(diffWhg);
  outputs.newCostHaus.textContent = fmtMoney(newHaus);
  outputs.diffHaus.textContent = fmtSigned(diffHaus);
}

function buildInvestmentSeries(length) {
  const { ek } = calcNebenkosten();
  const annualRate = parseNumber(inputs.anlageZins.value) / 100;
  const ratenProJahr = Math.max(1, parseNumber(inputs.ratenProJahr.value));
  const anlageZahlungen = Math.max(1, parseNumber(inputs.anlageZahlungen.value));
  const monthlyContribution = parseNumber(inputs.anlageEinzahlung.value) * anlageZahlungen / 12;
  const periodContribution = monthlyContribution * (12 / ratenProJahr);
  const periodRate = annualRate / ratenProJahr;

  const series = [];
  let balance = Math.max(0, ek);
  for (let i = 0; i < length; i += 1) {
    balance = balance * (1 + periodRate) + periodContribution;
    series.push(balance);
  }
  return series;
}

function drawLine(ctx, points, color) {
  if (!points.length) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, idx) => {
    if (idx === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
}

function renderComparisonChart(schedule) {
  if (!compareChart) return;
  latestLoanSchedule = schedule;

  const ctx = compareChart.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.floor(compareChart.clientWidth || compareChart.width));
  const height = Math.max(220, Math.floor(compareChart.clientHeight || compareChart.height));
  compareChart.width = Math.floor(width * dpr);
  compareChart.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (!schedule.length) {
    outputs.investEndValue.textContent = "-";
    outputs.loanEndValue.textContent = "-";
    outputs.breakEvenPoint.textContent = "-";
    return;
  }

  const investSeries = buildInvestmentSeries(schedule.length);
  const loanSeries = schedule.map((row) => row.balance);
  const { ek } = calcNebenkosten();
  let cumulativeCost = Math.max(0, ek);
  const totalCostSeries = schedule.map((row) => {
    cumulativeCost += row.payment;
    return cumulativeCost;
  });
  const maxValue = Math.max(1, ...loanSeries, ...investSeries, ...totalCostSeries);

  const pad = { top: 14, right: 12, bottom: 28, left: 54 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const xAt = (i) => pad.left + (chartW * (schedule.length === 1 ? 0 : i / (schedule.length - 1)));
  const yAt = (v) => pad.top + chartH - (v / maxValue) * chartH;

  ctx.strokeStyle = "#273544";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.stroke();

  const loanPoints = loanSeries.map((value, idx) => ({ x: xAt(idx), y: yAt(value) }));
  const investPoints = investSeries.map((value, idx) => ({ x: xAt(idx), y: yAt(value) }));
  const totalCostPoints = totalCostSeries.map((value, idx) => ({ x: xAt(idx), y: yAt(value) }));
  drawLine(ctx, loanPoints, "#ff6b6b");
  drawLine(ctx, investPoints, "#4cd1a8");
  drawLine(ctx, totalCostPoints, "#ffd166");

  ctx.fillStyle = "#9fb0bd";
  ctx.font = "12px sans-serif";
  ctx.fillText(fmtMoney(maxValue), 4, pad.top + 10);
  ctx.fillText(fmtMoney(0), 4, pad.top + chartH);
  ctx.fillText("Start", pad.left, height - 8);
  ctx.fillText(`Ende (${schedule.length} Raten)`, Math.max(pad.left, pad.left + chartW - 110), height - 8);

  const investEnd = investSeries[investSeries.length - 1] || 0;
  const loanEnd = loanSeries[loanSeries.length - 1] || 0;
  const breakEvenIndex = investSeries.findIndex((value, idx) => value >= loanSeries[idx]);
  outputs.investEndValue.textContent = fmtMoney(investEnd);
  outputs.loanEndValue.textContent = fmtMoney(loanEnd);
  outputs.breakEvenPoint.textContent = breakEvenIndex >= 0
    ? `${breakEvenIndex + 1}. Rate`
    : "Kein Schnittpunkt";
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

function renderOfferImagePreview() {
  if (!offerImagePreview) return;
  offerImagePreview.innerHTML = "";
  if (!stagedOfferImages.length) {
    const hint = document.createElement("div");
    hint.className = "offer-empty";
    hint.textContent = "Keine Bilder ausgewählt.";
    offerImagePreview.appendChild(hint);
    return;
  }

  stagedOfferImages.forEach((img, idx) => {
    const item = document.createElement("div");
    item.className = "offer-preview-item";

    const image = document.createElement("img");
    image.src = img.dataUrl;
    image.alt = img.name || `Bild ${idx + 1}`;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "ghost offer-preview-remove";
    removeBtn.textContent = "Entfernen";
    removeBtn.addEventListener("click", () => {
      stagedOfferImages.splice(idx, 1);
      renderOfferImagePreview();
    });

    item.appendChild(image);
    item.appendChild(removeBtn);
    offerImagePreview.appendChild(item);
  });
}

function clearOfferForm() {
  selectedOfferId = "";
  offerSelect.value = "";
  offerFields.title.value = "";
  offerFields.type.value = "Wohnung";
  offerFields.price.value = "0";
  offerFields.provision.value = "0";
  offerFields.parkingCount.value = "0";
  offerFields.parkingPrice.value = "0";
  offerFields.area.value = "0";
  offerFields.landArea.value = "0";
  offerFields.link1.value = "";
  offerFields.link2.value = "";
  offerFields.link3.value = "";
  offerFields.notes.value = "";
  stagedOfferImages = [];
  renderOfferImagePreview();
}

function syncOfferSelect() {
  if (!offerSelect) return;
  const sorted = [...offers].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  offerSelect.innerHTML = "";

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Neues Angebot";
  offerSelect.appendChild(defaultOpt);

  sorted.forEach((offer) => {
    const opt = document.createElement("option");
    opt.value = offer.id;
    opt.textContent = getOfferLabel(offer);
    offerSelect.appendChild(opt);
  });

  if (selectedOfferId && sorted.some((offer) => offer.id === selectedOfferId)) {
    offerSelect.value = selectedOfferId;
  } else {
    selectedOfferId = "";
    offerSelect.value = "";
  }
}

function loadOfferToForm(offerId) {
  const offer = offers.find((entry) => entry.id === offerId);
  if (!offer) {
    clearOfferForm();
    return;
  }
  selectedOfferId = offer.id;
  offerSelect.value = offer.id;
  offerFields.title.value = offer.title || "";
  offerFields.type.value = offer.type || "Wohnung";
  offerFields.price.value = String(parseNumber(offer.price));
  offerFields.provision.value = String(parseNumber(offer.provision));
  offerFields.parkingCount.value = String(parseNumber(offer.parkingCount));
  offerFields.parkingPrice.value = String(parseNumber(offer.parkingPrice));
  offerFields.area.value = String(parseNumber(offer.area));
  offerFields.landArea.value = String(parseNumber(offer.landArea));
  const links = Array.isArray(offer.links) ? offer.links : [];
  offerFields.link1.value = links[0] || "";
  offerFields.link2.value = links[1] || "";
  offerFields.link3.value = links[2] || "";
  offerFields.notes.value = offer.notes || "";
  stagedOfferImages = Array.isArray(offer.images) ? offer.images.map((img) => ({ ...img })) : [];
  renderOfferImagePreview();
}

function renderOfferList() {
  if (!offerList) return;
  offerList.innerHTML = "";
  const sorted = [...offers].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  if (!sorted.length) {
    const empty = document.createElement("div");
    empty.className = "offer-empty";
    empty.textContent = "Noch keine Angebote gespeichert.";
    offerList.appendChild(empty);
    return;
  }

  sorted.forEach((offer) => {
    const card = document.createElement("article");
    card.className = `offer-card${offer.id === selectedOfferId ? " active" : ""}`;

    const head = document.createElement("div");
    head.className = "offer-card-head";
    const title = document.createElement("h3");
    title.textContent = getOfferLabel(offer);
    const meta = document.createElement("div");
    meta.className = "offer-meta";
    meta.textContent = `Aktualisiert: ${fmtDateTime(offer.updatedAt)}`;
    head.appendChild(title);
    head.appendChild(meta);
    card.appendChild(head);

    const metrics = document.createElement("div");
    metrics.className = "offer-metrics";
    const metricData = [
      ["Typ", offer.type || "-"],
      ["Preis", fmtMoney(offer.price)],
      ["Provision", `${fmtNumber(offer.provision, 2)} %`],
      ["Stellplätze", String(parseNumber(offer.parkingCount))],
      ["Preis/Stellplatz", fmtMoney(offer.parkingPrice)],
      ["m²", fmtNumber(offer.area, 1)],
      ["m² Grund", fmtNumber(offer.landArea, 1)]
    ];
    metricData.forEach(([name, value]) => {
      const row = document.createElement("div");
      row.className = "offer-metric";
      const label = document.createElement("span");
      label.className = "offer-metric-label";
      label.textContent = name;
      const val = document.createElement("strong");
      val.textContent = value;
      row.appendChild(label);
      row.appendChild(val);
      metrics.appendChild(row);
    });
    card.appendChild(metrics);

    if (Array.isArray(offer.links) && offer.links.length) {
      const links = document.createElement("div");
      links.className = "offer-links";
      offer.links.forEach((url, idx) => {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = `Link ${idx + 1}`;
        links.appendChild(a);
      });
      card.appendChild(links);
    }

    if (Array.isArray(offer.images) && offer.images.length) {
      const gallery = document.createElement("div");
      gallery.className = "offer-gallery";
      offer.images.forEach((img) => {
        const image = document.createElement("img");
        image.src = img.dataUrl;
        image.alt = img.name || "Immobilienbild";
        gallery.appendChild(image);
      });
      card.appendChild(gallery);
    }

    if (offer.notes) {
      const notes = document.createElement("div");
      notes.className = "offer-notes";
      notes.textContent = offer.notes;
      card.appendChild(notes);
    }

    const versions = Array.isArray(offer.versions) ? offer.versions : [];
    const versionWrap = document.createElement("div");
    versionWrap.className = "offer-version-wrap";
    const versionTitle = document.createElement("div");
    versionTitle.className = "offer-version-title";
    versionTitle.textContent = "Versionierung";
    versionWrap.appendChild(versionTitle);

    const table = document.createElement("table");
    table.className = "offer-version-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Zeitpunkt</th>
          <th>Änderung</th>
          <th>Preis</th>
          <th>Provision</th>
          <th>Stellplätze</th>
          <th>Preis/Stellplatz</th>
          <th>m²</th>
          <th>m² Grund</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");
    [...versions].reverse().forEach((version) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtDateTime(version.at)}</td>
        <td>${version.changed || "update"}</td>
        <td>${fmtMoney(version.price)}</td>
        <td>${fmtNumber(version.provision, 2)} %</td>
        <td>${parseNumber(version.parkingCount)}</td>
        <td>${fmtMoney(version.parkingPrice)}</td>
        <td>${fmtNumber(version.area, 1)}</td>
        <td>${fmtNumber(version.landArea, 1)}</td>
      `;
      tbody.appendChild(tr);
    });
    versionWrap.appendChild(table);
    card.appendChild(versionWrap);

    card.addEventListener("click", () => {
      loadOfferToForm(offer.id);
      renderOfferList();
      saveState();
    });

    offerList.appendChild(card);
  });
}

function saveOffer() {
  const draft = getOfferDraft();
  const now = new Date().toISOString();
  if (!selectedOfferId) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    offers.push({
      id,
      ...draft,
      images: stagedOfferImages.map((img) => ({ ...img })),
      createdAt: now,
      updatedAt: now,
      versions: [makeOfferSnapshot(draft, "initial")]
    });
    selectedOfferId = id;
  } else {
    const idx = offers.findIndex((offer) => offer.id === selectedOfferId);
    if (idx < 0) {
      clearOfferForm();
      return;
    }
    const current = offers[idx];
    const nextVersions = Array.isArray(current.versions) && current.versions.length
      ? [...current.versions]
      : [makeOfferSnapshot(current, "initial")];

    if (hasOfferVersionChange(current, draft)) {
      nextVersions.push(makeOfferSnapshot(draft, "update"));
    }

    offers[idx] = {
      ...current,
      ...draft,
      images: stagedOfferImages.map((img) => ({ ...img })),
      updatedAt: now,
      versions: nextVersions
    };
  }

  syncOfferSelect();
  offerSelect.value = selectedOfferId;
  renderOfferList();
  saveState();
}

function deleteOffer() {
  if (!selectedOfferId) return;
  offers = offers.filter((offer) => offer.id !== selectedOfferId);
  clearOfferForm();
  syncOfferSelect();
  renderOfferList();
  saveState();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function recalcAll() {
  const loanSchedule = calcLoan();
  calcHousingComparison();
  calcAnlage();
  calcGehalt();
  renderExpenses();
  renderComparisonChart(loanSchedule);
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

offerSelect.addEventListener("change", () => {
  const id = offerSelect.value;
  if (!id) {
    clearOfferForm();
  } else {
    loadOfferToForm(id);
  }
  renderOfferList();
  saveState();
});

offerNewBtn.addEventListener("click", () => {
  clearOfferForm();
  renderOfferList();
  saveState();
});

offerSaveBtn.addEventListener("click", () => {
  saveOffer();
});

offerDeleteBtn.addEventListener("click", () => {
  deleteOffer();
});

offerImagesInput.addEventListener("change", async () => {
  const files = Array.from(offerImagesInput.files || []);
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      stagedOfferImages.push({ name: file.name, dataUrl });
    } catch {
      window.alert(`Bild konnte nicht geladen werden: ${file.name}`);
    }
  }
  offerImagesInput.value = "";
  renderOfferImagePreview();
});

resetAllBtn.addEventListener("click", () => {
  localStorage.removeItem(storeKey);
  window.location.reload();
});

profileSave.addEventListener("click", () => {
  const name = profileName.value.trim();
  if (!name) return;
  const profiles = loadProfiles();
  profiles[name] = {
    inputs: Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value])),
    expenses,
    offers,
    selectedOfferId
  };
  saveProfiles(profiles);
  refreshProfileSelect();
  profileSelect.value = name;
});

profileSelect.addEventListener("change", () => {
  const name = profileSelect.value;
  if (!name) return;
  const profiles = loadProfiles();
  applyProfile(profiles[name]);
});

profileDelete.addEventListener("click", () => {
  const name = profileSelect.value;
  if (!name) return;
  const profiles = loadProfiles();
  delete profiles[name];
  saveProfiles(profiles);
  refreshProfileSelect();
});

function setDefaultStartDate() {
  const now = new Date();
  const val = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  inputs.startdatum.value = inputs.startdatum.value || val;
}

window.addEventListener("resize", () => {
  if (latestLoanSchedule.length) {
    renderComparisonChart(latestLoanSchedule);
  }
});

loadState();
refreshProfileSelect();
setDefaultStartDate();
syncOfferSelect();
if (selectedOfferId) {
  loadOfferToForm(selectedOfferId);
} else {
  clearOfferForm();
}
initTabs();
recalcAll();
renderOfferList();
