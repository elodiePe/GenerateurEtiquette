// ===================== Config / Supabase client =====================

const CFG = window.SUPABASE_CONFIG || {};
const CONFIG_IS_PLACEHOLDER =
  !CFG.url || !CFG.anonKey ||
  CFG.url.includes("TON-PROJET") || CFG.anonKey.includes("TON_ANON_KEY");

let supabaseClient = null;
if (!CONFIG_IS_PLACEHOLDER && window.supabase) {
  supabaseClient = window.supabase.createClient(CFG.url, CFG.anonKey);
}

// ===================== Label formats (mm) =====================
// Each format defines the physical page size and the inner layout geometry,
// mirroring the hand-built PDF labels this app replaces.

const FORMATS = {
  "10x15": {
    label: "10 × 15 cm",
    width: 100, height: 150, padding: 10,
    code: { top: 10, right: 10 },
    divider: { top: 45, left: 10, right: 10 },
    recipient: { top: 62, bottom: 35, left: 14, right: 10 },
    footer: { left: 10, right: 10, bottom: 10 },
  },
  "a6": {
    label: "A6 (105 × 148 mm)",
    width: 105, height: 148, padding: 6,
    code: { top: 6, right: 6 },
    divider: { top: 42, left: 6, right: 6 },
    recipient: { top: 60, bottom: 36, left: 10, right: 6 },
    footer: { left: 6, right: 6, bottom: 6 },
  },
  "c4": {
    label: "Enveloppe C4 (324 × 229 mm)",
    width: 324, height: 229, padding: 14,
    code: { top: 14, right: 14 },
    divider: { top: 58, left: 14, right: 14 },
    recipient: { top: 78, bottom: 50, left: 20, right: 14 },
    footer: { left: 14, right: 14, bottom: 10 },
  },
};

let currentFormat = "10x15";
let currentSender = null; // { name, address, npa, city, country, phone }
let senders = [];

// ===================== DOM refs =====================

const el = (id) => document.getElementById(id);

const loginScreen = el("login-screen");
const appScreen = el("app");
const loginForm = el("login-form");
const loginError = el("login-error");
const configHint = el("config-hint");
const whoEmail = el("who-email");

// ===================== Label rendering =====================

function mm(v) { return v + "mm"; }

function buildRecipient() {
  return {
    name: el("rcpt-name").value.trim(),
    address: el("rcpt-address").value.trim(),
    npa: el("rcpt-npa").value.trim(),
    city: el("rcpt-city").value.trim(),
    country: el("rcpt-country").value.trim() || "Suisse",
  };
}

function buildCode() {
  return [el("code-1").value.trim(), el("code-2").value.trim(), el("code-3").value.trim()]
    .map((s) => s.toUpperCase());
}

function labelInnerHTML(fmt, sender, code, recipient) {
  const s = sender || { name: "", address: "", npa: "", city: "", country: "Suisse", phone: "" };
  const r = recipient;
  const lines = code.filter((c) => c.length).length
    ? code.map((c) => `<div class="line">${(c || "----").split("").join(" ")}</div>`).join("")
    : `<div class="line" style="color:#bbb;">A B C D</div><div class="line" style="color:#bbb;">1 2 3 4</div><div class="line" style="color:#bbb;">5 6 7 8</div>`;

  return `
    <div class="sender-block" style="padding:${mm(fmt.padding)} ${mm(fmt.padding)} 0;">
      <span class="tag">Expéditeur</span>
      <div class="name">${s.name || "—"}</div>
      <div>${s.address || ""}</div>
      <div>${[s.npa, s.city].filter(Boolean).join(" ")}</div>
      <div>${s.country || ""}</div>
      ${s.phone ? `<div>Tél. ${s.phone}</div>` : ""}
      ${s.website ? `<div>${s.website}</div>` : ""}
    </div>

    <div class="code-zone" style="top:${mm(fmt.code.top)}; right:${mm(fmt.code.right)};">
      <div class="tag">Code DigitalStamp</div>
      <div class="code-box">${lines}</div>
    </div>

    <div class="divider" style="top:${mm(fmt.divider.top)}; left:${mm(fmt.divider.left)}; right:${mm(fmt.divider.right)};"></div>

    <div class="recipient-zone" style="top:${mm(fmt.recipient.top)}; bottom:${mm(fmt.recipient.bottom)}; left:${mm(fmt.recipient.left)}; right:${mm(fmt.recipient.right)};">
      <span class="tag">Destinataire</span>
      <div class="recipient">
        <div class="name">${r.name || "—"}</div>
        <div>${r.address || ""}</div>
        <div class="npa">${[r.npa, r.city].filter(Boolean).join(" ")}</div>
        <div>${r.country || ""}</div>
      </div>
    </div>
  `;
}

function renderPreview() {
  const fmt = FORMATS[currentFormat];
  const preview = el("label-preview");
  preview.style.width = mm(fmt.width);
  preview.style.height = mm(fmt.height);
  preview.innerHTML = labelInnerHTML(fmt, currentSender, buildCode(), buildRecipient());
  scalePreviewToStage();
}

function scalePreviewToStage() {
  const stage = document.querySelector(".preview-stage");
  const preview = el("label-preview");
  // Reset to measure natural (mm-based) size
  preview.style.transform = "none";
  const naturalWidth = preview.offsetWidth;
  const naturalHeight = preview.offsetHeight;
  const stageW = stage.clientWidth - 40; // minus stage padding
  const stageH = Math.max(stage.clientHeight - 40, 320);
  const scale = Math.min(1, stageW / naturalWidth, stageH / naturalHeight);
  preview.style.transformOrigin = "center center";
  preview.style.transform = `scale(${scale})`;
}

window.addEventListener("resize", () => {
  if (!appScreen.hidden) scalePreviewToStage();
});

// ===================== Format switcher =====================

document.querySelectorAll(".format-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".format-chip").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFormat = btn.dataset.format;
    renderPreview();
  });
});

// ===================== Live inputs =====================

["rcpt-name", "rcpt-address", "rcpt-npa", "rcpt-city", "rcpt-country", "code-1", "code-2", "code-3"].forEach((id) => {
  el(id).addEventListener("input", renderPreview);
});

// Auto-advance between the 3 code fields
["code-1", "code-2", "code-3"].forEach((id, idx, arr) => {
  el(id).addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase();
    if (e.target.value.length >= 4 && arr[idx + 1]) {
      el(arr[idx + 1]).focus();
    }
  });
});

// ===================== Senders =====================

const senderSelectBtn = el("sender-select-btn");
const senderSelectLabel = el("sender-select-label");
const senderSelectPanel = el("sender-select-panel");

function closeSenderPanel() {
  senderSelectPanel.hidden = true;
  senderSelectBtn.classList.remove("open");
}

function openSenderPanel() {
  senderSelectPanel.hidden = false;
  senderSelectBtn.classList.add("open");
}

function selectSender(id) {
  currentSender = senders.find((s) => s.id === id) || null;
  senderSelectLabel.textContent = currentSender ? currentSender.name : "Aucun expéditeur enregistré";
  renderSenderPanelOptions();
  closeSenderPanel();
  renderPreview();
}

function renderSenderPanelOptions() {
  senderSelectPanel.innerHTML = senders.length
    ? senders.map((s) => `
        <div class="custom-select-row">
          <button type="button" class="custom-select-option ${currentSender && currentSender.id === s.id ? "selected" : ""}" data-id="${s.id}">
            <span>${s.name}</span>
            <span class="opt-meta">${[s.npa, s.city].filter(Boolean).join(" ")}${s.website ? ` · ${s.website}` : ""}</span>
          </button>
          <button type="button" class="opt-del" data-id="${s.id}" aria-label="Supprimer ${s.name}" title="Supprimer">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      `).join("")
    : `<div class="custom-select-empty">Aucun expéditeur enregistré</div>`;

  senderSelectPanel.querySelectorAll(".custom-select-option").forEach((btn) => {
    btn.addEventListener("click", () => selectSender(btn.dataset.id));
  });
  senderSelectPanel.querySelectorAll(".opt-del").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteSender(btn.dataset.id);
    });
  });
}

senderSelectBtn.addEventListener("click", () => {
  if (senderSelectPanel.hidden) openSenderPanel(); else closeSenderPanel();
});

document.addEventListener("click", (e) => {
  if (!el("sender-custom-select").contains(e.target)) closeSenderPanel();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSenderPanel();
});

function populateSenderUI() {
  if (senders.length) {
    const alreadySelected = currentSender && senders.some((s) => s.id === currentSender.id);
    currentSender = alreadySelected ? senders.find((s) => s.id === currentSender.id) : senders[0];
  } else {
    currentSender = null;
  }
  senderSelectLabel.textContent = currentSender ? currentSender.name : "Aucun expéditeur enregistré";
  renderSenderPanelOptions();
  renderPreview();
}

// ===================== Add-sender toggle =====================

const addSenderToggle = el("add-sender-toggle");
const addSenderForm = el("add-sender-form");

addSenderToggle.addEventListener("click", () => {
  const show = addSenderForm.hidden;
  addSenderForm.hidden = !show;
  addSenderToggle.classList.toggle("active", show);
});

async function loadSenders() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from("senders")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.error(error);
    return;
  }
  senders = data || [];
  populateSenderUI();
}

async function addSender() {
  if (!supabaseClient) return;
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const payload = {
    user_id: user.id,
    name: el("new-sender-name").value.trim(),
    address: el("new-sender-address").value.trim(),
    npa: el("new-sender-npa").value.trim(),
    city: el("new-sender-city").value.trim(),
    country: "Suisse",
    phone: el("new-sender-phone").value.trim() || null,
    website: el("new-sender-website").value.trim() || null,
  };
  if (!payload.name || !payload.address) return;

  const { error } = await supabaseClient.from("senders").insert(payload);
  if (error) { console.error(error); return; }

  ["new-sender-name", "new-sender-address", "new-sender-npa", "new-sender-city", "new-sender-phone", "new-sender-website"]
    .forEach((id) => (el(id).value = ""));

  addSenderForm.hidden = true;
  addSenderToggle.classList.remove("active");

  await loadSenders();
}

async function deleteSender(id) {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.from("senders").delete().eq("id", id);
  if (error) { console.error(error); return; }
  await loadSenders();
}

el("add-sender-btn").addEventListener("click", addSender);

// ===================== Auth =====================

function showApp(email) {
  loginScreen.hidden = true;
  appScreen.hidden = false;
  whoEmail.textContent = email || "";
  renderPreview();
}

function showLogin() {
  appScreen.hidden = true;
  loginScreen.hidden = false;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";

  if (!supabaseClient) {
    loginError.textContent = "Configuration Supabase manquante (voir config.js).";
    return;
  }

  const email = el("login-email").value.trim();
  const password = el("login-password").value;
  el("login-btn").disabled = true;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  el("login-btn").disabled = false;

  if (error) {
    loginError.textContent = "Identifiants incorrects.";
    return;
  }

  showApp(data.user.email);
  loadSenders();
});

el("logout-btn").addEventListener("click", async () => {
  if (supabaseClient) await supabaseClient.auth.signOut();
  showLogin();
});

// ===================== Print =====================

el("print-btn").addEventListener("click", () => {
  const fmt = FORMATS[currentFormat];
  const printArea = el("print-area");
  printArea.innerHTML = `<div class="label" style="width:${mm(fmt.width)}; height:${mm(fmt.height)};">
    ${labelInnerHTML(fmt, currentSender, buildCode(), buildRecipient())}
  </div>`;

  let styleTag = document.getElementById("print-page-size");
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "print-page-size";
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = `@page { size: ${fmt.width}mm ${fmt.height}mm; margin: 0; }`;

  window.print();
});

// ===================== Boot =====================

(async function boot() {
  if (CONFIG_IS_PLACEHOLDER) {
    configHint.hidden = false;
    renderPreview();
    return;
  }

  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    showApp(data.session.user.email);
    loadSenders();
  } else {
    renderPreview(); // placeholder preview behind the login screen
  }
})();
