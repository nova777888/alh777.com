const fs = require("fs");
const path = require("path");
const filePath = path.join(process.cwd(), "countries/nigeria/js/account.js");

let raw = fs.readFileSync(filePath);
// Try UTF-16, then fall back to others
let text;
if (raw[0] === 0xFF && raw[1] === 0xFE) {
    text = raw.toString("utf-16le");
} else {
    text = raw.toString("utf-8");
}

// 1. Add renderBalance after renderProfile
const bf = `

function renderBalance(balance) {
  var sec = document.getElementById("balanceSection");
  var el = document.getElementById("balanceContent");
  if (!sec || !el) return;
  sec.style.display = "block";
  if (!balance) {
    el.innerHTML = '<div class="acc-empty">No balance data</div>';
    return;
  }
  el.innerHTML = '<div class="acc-grid-2">' +
    '<div class="acc-info-item"><span class="acc-label">Available Balance</span><span class="acc-value acc-balance">$' + parseFloat(balance.available_balance || 0).toFixed(2) + '</span></div>' +
    '<div class="acc-info-item"><span class="acc-label">Total Earned</span><span class="acc-value">$' + parseFloat(balance.total_earned || 0).toFixed(2) + '</span></div>' +
    '<div class="acc-info-item"><span class="acc-label">Total Withdrawn</span><span class="acc-value">$' + parseFloat(balance.total_withdrawn || 0).toFixed(2) + '</span></div>' +
    '</div>';
}

`;
text = text.replace("function renderProfile(user) {", bf + "function renderProfile(user) {");

// 2. Balance loading in loadAccountData
text = text.replace(
  "setUserData(user);\n      renderProfile(user);\n    }\n  }).catch",
  "setUserData(user);\n      renderProfile(user);\n      if (data.balance) renderBalance(data.balance);\n    }\n  }).catch"
);

// 3. Fix loadSettings
text = text.replace(
  'function loadSettings() {\n  var user = getUserData();\n  if (!user) return;\n  var refId = user.referral_code || user.public_id || user.ref_id || "";\n  var refLink = "https://alh777.com?ref=" + refId;\n  var el = document.getElementById("settingsSection");\n  if (!el) return;\n  el.innerHTML =',
  'function loadSettings() {\n  var user = getUserData();\n  if (!user) return;\n  var refId = user.referral_code || user.public_id || user.ref_id || "";\n  var refLink = "https://alh777.com?ref=" + refId;\n  var refInput = document.getElementById("refLinkDisplay");\n  if (refInput) refInput.value = refLink;\n  var el = document.getElementById("settingsSection");\n  if (!el) return;\n  el.innerHTML ='
);

fs.writeFileSync(filePath, text, "utf8");
console.log("Account.js patched successfully");
