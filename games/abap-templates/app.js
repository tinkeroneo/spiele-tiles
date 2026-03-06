const grid = document.getElementById("grid");
const search = document.getElementById("search");
const category = document.getElementById("category");
const clearBtn = document.getElementById("clear");
const nameInput = document.getElementById("name");
const descInput = document.getElementById("desc");
const authorInput = document.getElementById("author");
const packageInput = document.getElementById("package");
const tableInput = document.getElementById("table");

const templates = [
  {
    id: "report-basic",
    title: "Report Basic",
    category: "report",
    description: "Einfacher Report mit Selection-Text und Ausgabe.",
    snippet: `REPORT {{NAME}}.\n\n* {{DESCRIPTION}}\n\nPARAMETERS p_test TYPE char10.\n\nSTART-OF-SELECTION.\n  WRITE: / 'Hallo', p_test.`
  },
  {
    id: "class-basic",
    title: "Class Skeleton",
    category: "class",
    description: "ABAP OO Class mit Konstruktor und Methode.",
    snippet: `CLASS {{NAME}} DEFINITION PUBLIC FINAL CREATE PUBLIC.\n  PUBLIC SECTION.\n    METHODS constructor.\n    METHODS run.\nENDCLASS.\n\nCLASS {{NAME}} IMPLEMENTATION.\n  METHOD constructor.\n  ENDMETHOD.\n\n  METHOD run.\n    WRITE: / 'Hello from {{NAME}}'.\n  ENDMETHOD.\nENDCLASS.`
  },
  {
    id: "cds-basic",
    title: "CDS View",
    category: "cds",
    description: "CDS View auf Basis einer Tabelle.",
    snippet: `@AbapCatalog.sqlViewName: '{{NAME}}'\n@AccessControl.authorizationCheck: #NOT_REQUIRED\n@EndUserText.label: '{{DESCRIPTION}}'\ndefine view {{NAME}} as select from {{TABLE}} {\n  key *\n}`
  },
  {
    id: "alv-basic",
    title: "ALV Grid",
    category: "alv",
    description: "SALV Table Grid Grundgerüst.",
    snippet: `DATA: lt_data TYPE TABLE OF {{TABLE}}.\n\nSELECT * FROM {{TABLE}} INTO TABLE lt_data UP TO 50 ROWS.\n\nDATA(lo_alv) = cl_salv_table=>factory( r_container = cl_gui_container=>default_screen\n                                    t_table     = lt_data ).\nlo_alv->display( ).`
  },
  {
    id: "unit-test",
    title: "ABAP Unit",
    category: "test",
    description: "Testklasse mit Given/When/Then Struktur.",
    snippet: `CLASS ltcl_{{NAME}} DEFINITION FINAL FOR TESTING DURATION SHORT RISK LEVEL HARMLESS.\n  PRIVATE SECTION.\n    METHODS should_do_something FOR TESTING.\nENDCLASS.\n\nCLASS ltcl_{{NAME}} IMPLEMENTATION.\n  METHOD should_do_something.\n    " Given\n    " When\n    " Then\n    cl_abap_unit_assert=>assert_true( act = abap_true ).\n  ENDMETHOD.\nENDCLASS.`
  }
];

function applyPlaceholders(text) {
  return text
    .replaceAll("{{NAME}}", nameInput.value.trim() || "ZCL_SAMPLE")
    .replaceAll("{{DESCRIPTION}}", descInput.value.trim() || "Beschreibung")
    .replaceAll("{{AUTHOR}}", authorInput.value.trim() || "Author")
    .replaceAll("{{PACKAGE}}", packageInput.value.trim() || "$TMP")
    .replaceAll("{{TABLE}}", tableInput.value.trim() || "SFLIGHT");
}

function render() {
  const term = search.value.trim().toLowerCase();
  const cat = category.value;
  const list = templates.filter((tpl) => {
    if (cat !== "all" && tpl.category !== cat) return false;
    if (!term) return true;
    return (
      tpl.title.toLowerCase().includes(term) ||
      tpl.description.toLowerCase().includes(term)
    );
  });

  grid.innerHTML = "";
  list.forEach((tpl) => {
    const card = document.createElement("article");
    card.className = "card";
    const rendered = applyPlaceholders(tpl.snippet);
    card.innerHTML = `
      <div class="meta">${tpl.category}</div>
      <h3>${tpl.title}</h3>
      <div class="lead">${tpl.description}</div>
      <pre><code>${rendered}</code></pre>
      <div class="actions-row">
        <button class="btn copy" data-copy="${encodeURIComponent(rendered)}">Copy</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

grid.addEventListener("click", async (e) => {
  const btn = e.target.closest(".copy");
  if (!btn) return;
  const content = decodeURIComponent(btn.dataset.copy || "");
  try {
    await navigator.clipboard.writeText(content);
    btn.textContent = "Kopiert";
    setTimeout(() => (btn.textContent = "Copy"), 1200);
  } catch {
    btn.textContent = "Nicht möglich";
  }
});

[search, category, nameInput, descInput, authorInput, packageInput, tableInput].forEach((el) => {
  el.addEventListener("input", render);
  el.addEventListener("change", render);
});

clearBtn.addEventListener("click", () => {
  nameInput.value = "";
  descInput.value = "";
  authorInput.value = "";
  packageInput.value = "";
  tableInput.value = "";
  render();
});

render();
