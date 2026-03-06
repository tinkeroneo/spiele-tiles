const objectType = document.getElementById("objectType");
const objectName = document.getElementById("objectName");
const author = document.getElementById("author");
const packageInput = document.getElementById("package");
const table = document.getElementById("table");
const checks = Array.from(document.querySelectorAll(".checks input"));
const result = document.querySelector("#result code");
const copyBtn = document.getElementById("copy");
const resetBtn = document.getElementById("reset");

function buildHeader() {
  const name = objectName.value.trim() || "ZCL_OBJECT";
  const pkg = packageInput.value.trim() || "$TMP";
  const auth = author.value.trim() || "Author";
  return `* Object: ${name}\n* Package: ${pkg}\n* Author: ${auth}\n* Generated: ${new Date().toISOString().split("T")[0]}\n`;
}

function reportTemplate() {
  const name = objectName.value.trim() || "ZREP_REPORT";
  const tbl = table.value.trim() || "SFLIGHT";
  const hasSelection = checks.find(c => c.value === "selection")?.checked;
  const hasAlv = checks.find(c => c.value === "alv")?.checked;
  const hasLogging = checks.find(c => c.value === "logging")?.checked;

  let body = `REPORT ${name}.\n\n`;
  if (hasSelection) {
    body += `PARAMETERS p_limit TYPE i DEFAULT 50.\n\n`;
  }
  body += `DATA: lt_data TYPE TABLE OF ${tbl}.\n\n`;
  if (hasLogging) {
    body += `DATA: gv_start TYPE timestampl.\nGET TIME STAMP FIELD gv_start.\n\n`;
  }
  body += `SELECT * FROM ${tbl} INTO TABLE lt_data UP TO ${hasSelection ? "p_limit" : "50"} ROWS.\n\n`;
  if (hasAlv) {
    body += `DATA(lo_alv) = cl_salv_table=>factory(\n  r_container = cl_gui_container=>default_screen\n  t_table     = lt_data ).\nlo_alv->display( ).\n`;
  } else {
    body += `LOOP AT lt_data ASSIGNING FIELD-SYMBOL(<ls_row>).\n  WRITE: / <ls_row>.\nENDLOOP.\n`;
  }
  return body;
}

function classTemplate() {
  const name = objectName.value.trim() || "ZCL_CLASS";
  const hasLogging = checks.find(c => c.value === "logging")?.checked;
  let body = `CLASS ${name} DEFINITION PUBLIC FINAL CREATE PUBLIC.\n  PUBLIC SECTION.\n    METHODS constructor.\n    METHODS run.\nENDCLASS.\n\n`;
  body += `CLASS ${name} IMPLEMENTATION.\n  METHOD constructor.\n  ENDMETHOD.\n\n  METHOD run.\n`;
  if (hasLogging) {
    body += `    DATA(lv_start) = sy-uzeit.\n`;
  }
  body += `    WRITE: / 'Hello from ${name}'.\n`;
  if (hasLogging) {
    body += `    WRITE: / 'Startzeit:', lv_start.\n`;
  }
  body += `  ENDMETHOD.\nENDCLASS.\n`;
  return body;
}

function functionTemplate() {
  const name = objectName.value.trim() || "ZFM_SAMPLE";
  const hasLogging = checks.find(c => c.value === "logging")?.checked;
  let body = `FUNCTION ${name}.\n  " Interface\n  " Importing\n  " Exporting\n  " Tables\n  " Exceptions\n\n`;
  if (hasLogging) {
    body += `  DATA lv_start TYPE timestampl.\n  GET TIME STAMP FIELD lv_start.\n\n`;
  }
  body += `  " TODO: Implement logic\nENDFUNCTION.\n`;
  return body;
}

function cdsTemplate() {
  const name = objectName.value.trim() || "ZC_CDS_VIEW";
  const tbl = table.value.trim() || "SFLIGHT";
  return `@AbapCatalog.sqlViewName: '${name}'\n@AccessControl.authorizationCheck: #NOT_REQUIRED\n@EndUserText.label: 'Generated view'\ndefine view ${name} as select from ${tbl} {\n  key *\n}`;
}

function unitTemplate() {
  const name = objectName.value.trim() || "ZCL_TEST";
  return `CLASS ltcl_${name} DEFINITION FINAL FOR TESTING DURATION SHORT RISK LEVEL HARMLESS.\n  PRIVATE SECTION.\n    METHODS should_do_something FOR TESTING.\nENDCLASS.\n\nCLASS ltcl_${name} IMPLEMENTATION.\n  METHOD should_do_something.\n    cl_abap_unit_assert=>assert_true( act = abap_true ).\n  ENDMETHOD.\nENDCLASS.\n`;
}

function buildCode() {
  const header = buildHeader();
  let body = "";
  switch (objectType.value) {
    case "class":
      body = classTemplate();
      break;
    case "function":
      body = functionTemplate();
      break;
    case "cds":
      body = cdsTemplate();
      break;
    default:
      body = reportTemplate();
  }
  if (checks.find(c => c.value === "unit")?.checked) {
    body += `\n${unitTemplate()}`;
  }
  result.textContent = `${header}\n${body}`;
}

function update() {
  buildCode();
}

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(result.textContent);
    copyBtn.textContent = "Kopiert";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
  } catch {
    copyBtn.textContent = "Nicht möglich";
  }
});

resetBtn.addEventListener("click", () => {
  objectType.value = "report";
  objectName.value = "";
  author.value = "";
  packageInput.value = "";
  table.value = "";
  checks.forEach(c => { c.checked = c.value === "selection"; });
  update();
});

[objectType, objectName, author, packageInput, table].forEach((el) => {
  el.addEventListener("input", update);
  el.addEventListener("change", update);
});

checks.forEach(el => el.addEventListener("change", update));

update();
