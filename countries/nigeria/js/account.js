// ============================================================
// Nova Exchange - Account Module (account.js)
// Profile, Transactions, Referrals, Settings
// Depends on: api.js, auth.js, utils.js
// ============================================================

var currentTxnPage = 1, txnTotalPages = 1;
var downlineCache = {};

function initAccountPage() {
  if (!isLoggedIn()) {
    showToast("Please sign in first", "error");
    setTimeout(function() { window.location.href = "Nigeria.html"; }, 1000);
    return;
  }
  loadAccountData();
  loadSettings();
}

function switchAccountTab(tab) {
  var tabs = document.querySelectorAll('.account-tab');
  var contents = document.querySelectorAll('.account-tab-content');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  for (var i = 0; i < contents.length; i++) contents[i].classList.remove('active');
  var tabBtn = document.querySelector('.account-tab[onclick*="' + tab + '"]');
  if (tabBtn) tabBtn.classList.add('active');
  var tabContent = document.getElementById('tab-' + tab);
  if (tabContent) tabContent.classList.add('active');
}

function loadAccountData() {
  apiCall("GET", "/api/me").then(function(data) {
    if (data && !data.error) {
      var user = { name: data.name, email: data.email, phone: data.phone_masked || data.phone, public_id: data.public_id, role: data.role, balance: data.balance, referral_code: data.public_id };
      setUserData(user);
      renderProfile(user);
    }
  }).catch(function() { showToast("Failed to load profile", "error"); });
  loadTransactions(1);
  loadDownlines();
}

function renderProfile(user) {
  var name = user.name || user.username || "User";
  var phone = user.phone || "N/A";
  var email = user.email || "";
  var refId = user.referral_code || user.public_id || user.ref_id || "N/A";
  var refCount = user.referral_count || user.downline_count || 0;
  var avatarLetter = getAvatarLetter(user);
  var avatarColor = getAvatarColor(user.email || user.phone || user.id);

  // Hide @nova.local emails
  var displayEmail = email && email.indexOf("@nova.local") === -1 ? email : "";

  var el = document.getElementById("profileSection");
  if (!el) return;
  el.innerHTML =
    '<div style="text-align:center;margin-bottom:24px;">' +
      '<div class="account-avatar-lg" style="background:' + avatarColor + ';">' + avatarLetter + '</div>' +
      '<h2 style="font-size:22px;font-weight:700;color:#0a1c2f;">' + escapeHtml(name) + '</h2></div>' +
    '<div class="account-info-grid">' +
      '<div class="account-info-item"><span class="info-label">Phone</span><span class="info-value">' + escapeHtml(phone) + '</span></div>' +
      (displayEmail ? '<div class="account-info-item"><span class="info-label">Email</span><span class="info-value">' + escapeHtml(displayEmail) + '</span></div>' : '') +
      '<div class="account-info-item"><span class="info-label">Referral ID</span><span class="info-value">' + escapeHtml(refId) + '</span></div>' +
      '<div class="account-info-item"><span class="info-label">Referrals</span><span class="info-value">' + refCount + '</span></div>' +
    '</div>';
}

// ======================== TRANSACTIONS ========================
function loadTransactions(page) {
  currentTxnPage = page || 1;
  apiCall("GET", "/api/me/transactions?page=" + currentTxnPage + "&limit=10")
    .then(function(data) {
      var el = document.getElementById("transactionsBody");
      var pagEl = document.getElementById("txnPagination");
      if (!el) return;
      var txns = data.transactions || data.data || [];
      txnTotalPages = data.totalPages || data.total_pages || Math.ceil((data.total || txns.length) / 10) || 1;
      if (txns.length === 0) {
        el.innerHTML = "<tr><td colspan='3' style='text-align:center;padding:24px;color:#8aaeb9;'>No transactions yet</td></tr>";
      } else {
        el.innerHTML = txns.map(function(t) {
          return "<tr><td style='padding:10px 12px;border-bottom:1px solid #eef2f4;'>" + escapeHtml(t.created_at || t.date || t.time || "N/A") +
            "</td><td style='padding:10px 12px;border-bottom:1px solid #eef2f4;'>" + escapeHtml(t.account || t.account_name || t.type || "N/A") +
            "</td><td style='padding:10px 12px;border-bottom:1px solid #eef2f4;font-weight:600;color:#0a7b7b;'>$" + escapeHtml(String(t.amount || t.price || "0")) + "</td></tr>";
        }).join("");
      }
      if (pagEl) renderPagination(pagEl, currentTxnPage, txnTotalPages, "loadTransactions");
    }).catch(function() {
      var el = document.getElementById("transactionsBody");
      if (el) el.innerHTML = "<tr><td colspan='3' style='text-align:center;padding:24px;color:#d32f2f;'>Failed to load</td></tr>";
    });
}

function renderPagination(container, current, total, callback) {
  if (total <= 1) { container.innerHTML = ""; return; }
  var html = "", start = Math.max(1, current - 1), end = Math.min(total, current + 1);
  if (start > 1) { html += "<button class='page-btn' onclick=\"" + callback + "(1)\">1</button>"; if (start > 2) html += "<span class='page-dots'>...</span>"; }
  for (var i = start; i <= end; i++) html += "<button class='page-btn" + (i === current ? " active" : "") + "' onclick=\"" + callback + "(" + i + ")\">" + i + "</button>";
  if (end < total) { if (end < total - 1) html += "<span class='page-dots'>...</span>"; html += "<button class='page-btn' onclick=\"" + callback + "(" + total + ")\">" + total + "</button>"; }
  container.innerHTML = html;
}

// ======================== DOWNLINES ========================
function loadDownlines() {
  apiCall("GET", "/api/me/downlines")
    .then(function(data) {
      var el = document.getElementById("downlinesBody");
      if (!el) return;
      var downlines = data.downlines || data.data || [];
      downlines.sort(function(a, b) {
        return parseFloat(b.monthly_commission || b.commission || 0) - parseFloat(a.monthly_commission || a.commission || 0);
      });
      if (downlines.length === 0) {
        el.innerHTML = "<div style='text-align:center;padding:24px;color:#8aaeb9;'>No referrals yet. Share your referral link!</div>"; return;
      }
      el.innerHTML = downlines.map(function(d, idx) {
        var refId = d.referral_id || d.public_id || d.id || d.code || "REF" + (idx + 1);
        var safeId = refId.replace(/[^a-zA-Z0-9]/g, "_");
        return "<div class='downline-item'><div class='downline-header' onclick='toggleDownline(\"" + safeId + "\")'>" +
          "<span class='downline-id'>ID: " + escapeHtml(refId) + "</span>" +
          "<span class='downline-commission'>Commission: $" + parseFloat(d.monthly_commission || d.commission || 0).toFixed(2) + "</span></div>" +
          "<div class='downline-detail' id='downlineDetail_" + safeId + "' style='display:none;'>" +
          "<div class='downline-loading' id='downlineLoading_" + safeId + "'>Loading transactions...</div>" +
          "<div class='downline-txns' id='downlineTxns_" + safeId + "'></div></div></div>";
      }).join("");
    }).catch(function() {
      var el = document.getElementById("downlinesBody");
      if (el) el.innerHTML = "<div style='text-align:center;padding:24px;color:#d32f2f;'>Failed to load referrals</div>";
    });
}

function toggleDownline(refId) {
  var detailEl = document.getElementById("downlineDetail_" + refId);
  if (!detailEl) return;
  if (detailEl.style.display === "block") { detailEl.style.display = "none"; return; }
  detailEl.style.display = "block";
  var txnEl = document.getElementById("downlineTxns_" + refId);
  var loadingEl = document.getElementById("downlineLoading_" + refId);
  if (downlineCache[refId]) { renderDownlineTxns(txnEl, loadingEl, downlineCache[refId]); return; }
  apiCall("GET", "/api/me/downlines/" + encodeURIComponent(refId) + "/transactions")
    .then(function(data) {
      var txns = data.transactions || data.data || [];
      downlineCache[refId] = txns;
      renderDownlineTxns(txnEl, loadingEl, txns);
    }).catch(function() {
      if (loadingEl) loadingEl.style.display = "none";
      if (txnEl) txnEl.innerHTML = "<div style='color:#d32f2f;padding:8px;'>Failed to load</div>";
    });
}

function renderDownlineTxns(txnEl, loadingEl, txns) {
  if (loadingEl) loadingEl.style.display = "none";
  if (!txnEl) return;
  if (txns.length === 0) { txnEl.innerHTML = "<div style='color:#8aaeb9;padding:8px;font-size:13px;'>No transactions this month</div>"; return; }
  txnEl.innerHTML = "<table style='width:100%;border-collapse:collapse;font-size:13px;'>" +
    "<thead><tr style='background:#f0f7fa;'><th style='padding:8px;text-align:left;'>Date</th><th style='padding:8px;text-align:left;'>Amount</th><th style='padding:8px;text-align:left;'>Commission</th></tr></thead><tbody>" +
    txns.map(function(t) {
      return "<tr><td style='padding:6px 8px;border-bottom:1px solid #eef2f4;'>" + escapeHtml(t.created_at || t.date || t.time || "N/A") +
        "</td><td style='padding:6px 8px;border-bottom:1px solid #eef2f4;'>$" + escapeHtml(String(t.amount || t.price || "0")) +
        "</td><td style='padding:6px 8px;border-bottom:1px solid #eef2f4;color:#0a7b7b;font-weight:600;'>$" + parseFloat(t.commission || t.rebate || t.comm || 0).toFixed(2) + "</td></tr>";
    }).join("") + "</tbody></table>";
}

// ======================== SETTINGS ========================

// ======================== DOWNLINES ========================
function loadDownlines() {
  apiCall("GET", "/api/me/downlines").then(function(data) {
    var el = document.getElementById("downlineContainer");
    if (!el) return;
    var downlines = data.downlines || data.data || [];
    if (downlines.length === 0) {
      el.innerHTML = '<div class="acc-empty">No referrals yet. Share your referral link to earn commissions!</div>';
      return;
    }
    el.innerHTML = downlines.map(function(d, idx) {
      var pid = d.public_id || d.id || "N/A";
      var name = d.name || "";
      var phone = d.phone_masked || d.phone || "";
      var totalComm = parseFloat(d.total_commission || d.commission || 0).toFixed(2);
      var txnCount = d.transaction_count || d.txn_count || 0;
      return '<div class="acc-downline-item">' +
        '<div class="acc-downline-header" onclick="toggleDownline(' + idx + ')">' +
        '<div><span class="acc-downline-id">' + escapeHtml(name || pid) + '</span>' +
        '<span class="acc-downline-stats">Phone: ' + escapeHtml(phone) + ' | Transactions: ' + txnCount + ' | Comm:  {
  var user = getUserData();
  if (!user) return;
  var refId = user.referral_code || user.public_id || user.ref_id || "";
  var refLink = "https://alh777.com?ref=" + refId;
  var el = document.getElementById("settingsSection");
  if (!el) return;
  el.innerHTML =
    '<div class="settings-card"><h3>Referral Link</h3>' +
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
    '<input type="text" id="refLinkInput" value="' + escapeHtml(refLink) + '" readonly style="flex:1;min-width:200px;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;background:#f8fafc;color:#4a6a78;box-sizing:border-box;">' +
    '<button onclick="copyRefLink()" style="padding:10px 20px;background:#0a7b7b;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">Copy</button></div></div>' +

    '<div class="settings-card"><h3>Change Password</h3>' +
    '<div style="margin-bottom:10px;"><input type="password" id="chgOldPwd" placeholder="Current password" class="auth-input" style="width:100%;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;outline:none;background:#f8fafc;box-sizing:border-box;margin-bottom:8px;"></div>' +
    '<div style="margin-bottom:10px;"><input type="password" id="chgNewPwd" placeholder="New password (min 6 chars)" class="auth-input" style="width:100%;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;outline:none;background:#f8fafc;box-sizing:border-box;margin-bottom:8px;"></div>' +
    '<div style="margin-bottom:10px;"><input type="password" id="chgConfirmPwd" placeholder="Confirm new password" class="auth-input" style="width:100%;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;outline:none;background:#f8fafc;box-sizing:border-box;margin-bottom:8px;"></div>' +
    '<button onclick="handleChangePassword()" style="padding:10px 24px;background:#d32f2f;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Update Password</button></div>';
}

function copyRefLink() {
  var input = document.getElementById("refLinkInput");
  if (!input) return;
  input.select();
  try { document.execCommand("copy"); showToast("Referral link copied!", "success"); }
  catch(e) { showToast("Press Ctrl+C to copy", "info"); }
}

function handleChangePassword() {
  var oldPwd = document.getElementById("chgOldPwd").value;
  var newPwd = document.getElementById("chgNewPwd").value;
  var confirmPwd = document.getElementById("chgConfirmPwd").value;
  if (!oldPwd) { showToast("Enter current password", "error"); return; }
  if (!newPwd || newPwd.length < 6) { showToast("New password min 6 characters", "error"); return; }
  if (newPwd !== confirmPwd) { showToast("Passwords do not match", "error"); return; }
  var btn = document.querySelector(".settings-card button:last-of-type");
  if (btn) { btn.disabled = true; btn.textContent = "Updating..."; }
  apiCall("POST", "/api/reset-password", { password: oldPwd, new_password: newPwd })
    .then(function(data) {
      if (data.success || data.message) {
        showToast("Password changed!", "success");
        document.getElementById("chgOldPwd").value = "";
        document.getElementById("chgNewPwd").value = "";
        document.getElementById("chgConfirmPwd").value = "";
      } else if (data.error) { showToast(data.error, "error"); }
      else { showToast("Failed", "error"); }
      if (btn) { btn.disabled = false; btn.textContent = "Update Password"; }
    }).catch(function() { showToast("Network error", "error"); if (btn) { btn.disabled = false; btn.textContent = "Update Password"; } });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAccountPage);
} else {
  initAccountPage();
}

 + totalComm + '</span></div>' +
        '<span class="acc-downline-toggle">¨‹</span></div>' +
        '<div id="downlineDetail' + idx + '" class="acc-downline-details" style="display:none;">' +
        '<div class="acc-loading">Loading details...</div></div></div>';
    }).join("");
  }).catch(function() {
    var el = document.getElementById("downlineContainer");
    if (el) el.innerHTML = '<div class="acc-error">Failed to load referral data. <button onclick="loadDownlines()" style="background:none;border:none;color:#0a7b7b;cursor:pointer;font-size:14px;">Retry</button></div>';
  });
}

function toggleDownline(idx) {
  var detailEl = document.getElementById("downlineDetail" + idx);
  if (!detailEl) return;
  if (detailEl.style.display !== "none") {
    detailEl.style.display = "none";
    return;
  }
  detailEl.style.display = "block";
  // Load commission details from cache or API
  if (downlineCache[idx]) {
    renderDownlineDetail(detailEl, downlineCache[idx]);
    return;
  }
  detailEl.innerHTML = '<div class="acc-loading">Loading commissions...</div>';
  apiCall("GET", "/api/me/commissions?downline_idx=' + idx + '").then(function(data) {
    var comms = data.commissions || data.data || [];
    downlineCache[idx] = comms;
    renderDownlineDetail(detailEl, comms);
  }).catch(function() {
    detailEl.innerHTML = '<div class="acc-empty">Failed to load commissions</div>';
  });
}

function renderDownlineDetail(el, comms) {
  if (!comms || comms.length === 0) {
    el.innerHTML = '<div class="acc-empty">No commissions yet</div>';
    return;
  }
  var html = '<table class="acc-table acc-table-sm"><thead><tr><th>Date</th><th>Amount</th><th>Commission</th><th>Rate</th></tr></thead><tbody>';
  html += comms.map(function(c) {
    return '<tr><td>' + escapeHtml(c.created_at || c.date || "N/A") + '</td>' +
      '<td> {
  var user = getUserData();
  if (!user) return;
  var refId = user.referral_code || user.public_id || user.ref_id || "";
  var refLink = "https://alh777.com?ref=" + refId;
  var el = document.getElementById("settingsSection");
  if (!el) return;
  el.innerHTML =
    '<div class="settings-card"><h3>Referral Link</h3>' +
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
    '<input type="text" id="refLinkInput" value="' + escapeHtml(refLink) + '" readonly style="flex:1;min-width:200px;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;background:#f8fafc;color:#4a6a78;box-sizing:border-box;">' +
    '<button onclick="copyRefLink()" style="padding:10px 20px;background:#0a7b7b;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">Copy</button></div></div>' +

    '<div class="settings-card"><h3>Change Password</h3>' +
    '<div style="margin-bottom:10px;"><input type="password" id="chgOldPwd" placeholder="Current password" class="auth-input" style="width:100%;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;outline:none;background:#f8fafc;box-sizing:border-box;margin-bottom:8px;"></div>' +
    '<div style="margin-bottom:10px;"><input type="password" id="chgNewPwd" placeholder="New password (min 6 chars)" class="auth-input" style="width:100%;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;outline:none;background:#f8fafc;box-sizing:border-box;margin-bottom:8px;"></div>' +
    '<div style="margin-bottom:10px;"><input type="password" id="chgConfirmPwd" placeholder="Confirm new password" class="auth-input" style="width:100%;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;outline:none;background:#f8fafc;box-sizing:border-box;margin-bottom:8px;"></div>' +
    '<button onclick="handleChangePassword()" style="padding:10px 24px;background:#d32f2f;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Update Password</button></div>';
}

function copyRefLink() {
  var input = document.getElementById("refLinkInput");
  if (!input) return;
  input.select();
  try { document.execCommand("copy"); showToast("Referral link copied!", "success"); }
  catch(e) { showToast("Press Ctrl+C to copy", "info"); }
}

function handleChangePassword() {
  var oldPwd = document.getElementById("chgOldPwd").value;
  var newPwd = document.getElementById("chgNewPwd").value;
  var confirmPwd = document.getElementById("chgConfirmPwd").value;
  if (!oldPwd) { showToast("Enter current password", "error"); return; }
  if (!newPwd || newPwd.length < 6) { showToast("New password min 6 characters", "error"); return; }
  if (newPwd !== confirmPwd) { showToast("Passwords do not match", "error"); return; }
  var btn = document.querySelector(".settings-card button:last-of-type");
  if (btn) { btn.disabled = true; btn.textContent = "Updating..."; }
  apiCall("POST", "/api/reset-password", { password: oldPwd, new_password: newPwd })
    .then(function(data) {
      if (data.success || data.message) {
        showToast("Password changed!", "success");
        document.getElementById("chgOldPwd").value = "";
        document.getElementById("chgNewPwd").value = "";
        document.getElementById("chgConfirmPwd").value = "";
      } else if (data.error) { showToast(data.error, "error"); }
      else { showToast("Failed", "error"); }
      if (btn) { btn.disabled = false; btn.textContent = "Update Password"; }
    }).catch(function() { showToast("Network error", "error"); if (btn) { btn.disabled = false; btn.textContent = "Update Password"; } });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAccountPage);
} else {
  initAccountPage();
}

 + escapeHtml(String(c.amount || "0")) + '</td>' +
      '<td style="color:#0a7b7b;font-weight:600;"> {
  var user = getUserData();
  if (!user) return;
  var refId = user.referral_code || user.public_id || user.ref_id || "";
  var refLink = "https://alh777.com?ref=" + refId;
  var el = document.getElementById("settingsSection");
  if (!el) return;
  el.innerHTML =
    '<div class="settings-card"><h3>Referral Link</h3>' +
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
    '<input type="text" id="refLinkInput" value="' + escapeHtml(refLink) + '" readonly style="flex:1;min-width:200px;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;background:#f8fafc;color:#4a6a78;box-sizing:border-box;">' +
    '<button onclick="copyRefLink()" style="padding:10px 20px;background:#0a7b7b;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">Copy</button></div></div>' +

    '<div class="settings-card"><h3>Change Password</h3>' +
    '<div style="margin-bottom:10px;"><input type="password" id="chgOldPwd" placeholder="Current password" class="auth-input" style="width:100%;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;outline:none;background:#f8fafc;box-sizing:border-box;margin-bottom:8px;"></div>' +
    '<div style="margin-bottom:10px;"><input type="password" id="chgNewPwd" placeholder="New password (min 6 chars)" class="auth-input" style="width:100%;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;outline:none;background:#f8fafc;box-sizing:border-box;margin-bottom:8px;"></div>' +
    '<div style="margin-bottom:10px;"><input type="password" id="chgConfirmPwd" placeholder="Confirm new password" class="auth-input" style="width:100%;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;outline:none;background:#f8fafc;box-sizing:border-box;margin-bottom:8px;"></div>' +
    '<button onclick="handleChangePassword()" style="padding:10px 24px;background:#d32f2f;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Update Password</button></div>';
}

function copyRefLink() {
  var input = document.getElementById("refLinkInput");
  if (!input) return;
  input.select();
  try { document.execCommand("copy"); showToast("Referral link copied!", "success"); }
  catch(e) { showToast("Press Ctrl+C to copy", "info"); }
}

function handleChangePassword() {
  var oldPwd = document.getElementById("chgOldPwd").value;
  var newPwd = document.getElementById("chgNewPwd").value;
  var confirmPwd = document.getElementById("chgConfirmPwd").value;
  if (!oldPwd) { showToast("Enter current password", "error"); return; }
  if (!newPwd || newPwd.length < 6) { showToast("New password min 6 characters", "error"); return; }
  if (newPwd !== confirmPwd) { showToast("Passwords do not match", "error"); return; }
  var btn = document.querySelector(".settings-card button:last-of-type");
  if (btn) { btn.disabled = true; btn.textContent = "Updating..."; }
  apiCall("POST", "/api/reset-password", { password: oldPwd, new_password: newPwd })
    .then(function(data) {
      if (data.success || data.message) {
        showToast("Password changed!", "success");
        document.getElementById("chgOldPwd").value = "";
        document.getElementById("chgNewPwd").value = "";
        document.getElementById("chgConfirmPwd").value = "";
      } else if (data.error) { showToast(data.error, "error"); }
      else { showToast("Failed", "error"); }
      if (btn) { btn.disabled = false; btn.textContent = "Update Password"; }
    }).catch(function() { showToast("Network error", "error"); if (btn) { btn.disabled = false; btn.textContent = "Update Password"; } });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAccountPage);
} else {
  initAccountPage();
}

 + parseFloat(c.commission || c.rebate || c.comm || 0).toFixed(2) + '</td>' +
      '<td class="acc-rate">' + (c.rate ? (parseFloat(c.rate)*100).toFixed(1) + "%" : "-") + '</td></tr>';
  }).join("");
  html += '</tbody></table>';
  el.innerHTML = html;
}


function loadSettings() {
  var user = getUserData();
  if (!user) return;
  var refId = user.referral_code || user.public_id || user.ref_id || "";
  var refLink = "https://alh777.com?ref=" + refId;
  var el = document.getElementById("settingsSection");
  if (!el) return;
  el.innerHTML =
    '<div class="settings-card"><h3>Referral Link</h3>' +
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
    '<input type="text" id="refLinkInput" value="' + escapeHtml(refLink) + '" readonly style="flex:1;min-width:200px;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;background:#f8fafc;color:#4a6a78;box-sizing:border-box;">' +
    '<button onclick="copyRefLink()" style="padding:10px 20px;background:#0a7b7b;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">Copy</button></div></div>' +

    '<div class="settings-card"><h3>Change Password</h3>' +
    '<div style="margin-bottom:10px;"><input type="password" id="chgOldPwd" placeholder="Current password" class="auth-input" style="width:100%;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;outline:none;background:#f8fafc;box-sizing:border-box;margin-bottom:8px;"></div>' +
    '<div style="margin-bottom:10px;"><input type="password" id="chgNewPwd" placeholder="New password (min 6 chars)" class="auth-input" style="width:100%;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;outline:none;background:#f8fafc;box-sizing:border-box;margin-bottom:8px;"></div>' +
    '<div style="margin-bottom:10px;"><input type="password" id="chgConfirmPwd" placeholder="Confirm new password" class="auth-input" style="width:100%;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;outline:none;background:#f8fafc;box-sizing:border-box;margin-bottom:8px;"></div>' +
    '<button onclick="handleChangePassword()" style="padding:10px 24px;background:#d32f2f;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Update Password</button></div>';
}

function copyRefLink() {
  var input = document.getElementById("refLinkInput");
  if (!input) return;
  input.select();
  try { document.execCommand("copy"); showToast("Referral link copied!", "success"); }
  catch(e) { showToast("Press Ctrl+C to copy", "info"); }
}

function handleChangePassword() {
  var oldPwd = document.getElementById("chgOldPwd").value;
  var newPwd = document.getElementById("chgNewPwd").value;
  var confirmPwd = document.getElementById("chgConfirmPwd").value;
  if (!oldPwd) { showToast("Enter current password", "error"); return; }
  if (!newPwd || newPwd.length < 6) { showToast("New password min 6 characters", "error"); return; }
  if (newPwd !== confirmPwd) { showToast("Passwords do not match", "error"); return; }
  var btn = document.querySelector(".settings-card button:last-of-type");
  if (btn) { btn.disabled = true; btn.textContent = "Updating..."; }
  apiCall("POST", "/api/reset-password", { password: oldPwd, new_password: newPwd })
    .then(function(data) {
      if (data.success || data.message) {
        showToast("Password changed!", "success");
        document.getElementById("chgOldPwd").value = "";
        document.getElementById("chgNewPwd").value = "";
        document.getElementById("chgConfirmPwd").value = "";
      } else if (data.error) { showToast(data.error, "error"); }
      else { showToast("Failed", "error"); }
      if (btn) { btn.disabled = false; btn.textContent = "Update Password"; }
    }).catch(function() { showToast("Network error", "error"); if (btn) { btn.disabled = false; btn.textContent = "Update Password"; } });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAccountPage);
} else {
  initAccountPage();
}




// ======================== BIND EMAIL (Account Page) ========================
var _accBindToken = null;

function sendBindCode() {
  var email = document.getElementById("accBindEmail").value.trim();
  var btn = document.getElementById("accSendBindCodeBtn");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Please enter a valid email address", "error");
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = "Sending..."; startCountdown(btn, 60); }
  verificationApiCall("POST", "send-code", { email: email, type: "bind-email" })
    .then(function(data) {
      if (data.error || (data.data && data.data.error)) {
        var errMsg = typeof data.error === "string" ? data.error : (data.error && data.error.message) || "Failed";
        showToast(errMsg, "error");
        if (btn) { btn.disabled = false; btn.textContent = "Send Code"; }
        return;
      }
      _accBindToken = data.token || (data.data && data.data.token);
      showToast("Verification code sent to " + email, "success");
    }).catch(function() {
      showToast("Network error", "error");
      if (btn) { btn.disabled = false; btn.textContent = "Send Code"; }
    });
}

function verifyBindEmail() {
  var email = document.getElementById("accBindEmail").value.trim();
  var code = document.getElementById("accBindCode").value.trim();
  var msgEl = document.getElementById("bindMessage");
  if (!email) { showToast("Enter your email", "error"); return; }
  if (!code) { showToast("Enter the verification code", "error"); return; }
  if (!_accBindToken) { showToast("Please send verification code first", "error"); return; }

  var btn = document.querySelector(".acc-copy-btn[onclick*='verifyBindEmail']");
  if (btn) { btn.disabled = true; btn.textContent = "Binding..."; }

  verificationApiCall("POST", "verify-code", { token: _accBindToken, code: code })
    .then(function(data) {
      if (data.error || (data.data && data.data.error)) {
        var errMsg = typeof data.error === "string" ? data.error : (data.error && data.error.message) || "Verification failed";
        showToast(errMsg, "error");
        if (btn) { btn.disabled = false; btn.textContent = "Confirm Bind"; }
        return;
      }
      showToast("Code verified! Binding email...", "success");
      return apiCall("POST", "/api/me/bind-email", { email: email, code: code, verifyToken: _accBindToken });
    })
    .then(function(data) {
      if (data && (data.success || data.message)) {
        showToast("Email bound successfully!", "success");
        if (msgEl) msgEl.textContent = "Bind successful!";
        if (btn) { btn.disabled = false; btn.textContent = "Confirm Bind"; }
        _accBindToken = null;
      } else if (data && data.error) {
        var errMsg = typeof data.error === "string" ? data.error : (data.error && data.error.message) || "Bind failed";
        showToast(errMsg, "error");
        if (btn) { btn.disabled = false; btn.textContent = "Confirm Bind"; }
      }
    }).catch(function() {
      showToast("Network error", "error");
      if (btn) { btn.disabled = false; btn.textContent = "Confirm Bind"; }
    });
}

// ======================== RESET PASSWORD (Account Page) ========================
var _accResetToken = null;

function sendResetCode() {
  var email = document.getElementById("resetEmailInput").value.trim();
  var btn = document.getElementById("sendResetCodeBtn");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Please enter a valid email", "error");
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = "Sending..."; startCountdown(btn, 60); }
  verificationApiCall("POST", "send-code", { email: email, type: "forgot-password" })
    .then(function(data) {
      if (data.error) {
        showToast(typeof data.error === "string" ? data.error : "Failed to send", "error");
        if (btn) { btn.disabled = false; btn.textContent = "Send Code"; }
        return;
      }
      _accResetToken = data.token || (data.data && data.data.token);
      showToast("Reset code sent to " + email, "success");
    }).catch(function() {
      showToast("Network error", "error");
      if (btn) { btn.disabled = false; btn.textContent = "Send Code"; }
    });
}

function resetPasswordWithCode() {
  var email = document.getElementById("resetEmailInput").value.trim();
  var code = document.getElementById("resetCodeInput").value.trim();
  var oldPw = document.getElementById("resetOldPw").value;
  var newPw = document.getElementById("resetNewPw").value;
  var confirmPw = document.getElementById("resetConfirmPw").value;
  var msgEl = document.getElementById("resetMessage");

  if (!email) { showToast("Enter your email", "error"); return; }
  if (!code) { showToast("Enter the verification code", "error"); return; }
  if (!_accResetToken) { showToast("Please send verification code first", "error"); return; }
  if (!newPw || newPw.length < 6) { showToast("New password must be at least 6 characters", "error"); return; }
  if (newPw !== confirmPw) { showToast("Passwords do not match", "error"); return; }

  // First verify the code
  verificationApiCall("POST", "verify-code", { token: _accResetToken, code: code })
    .then(function(data) {
      if (data.error || (data.data && data.data.error)) {
        showToast("Invalid or expired code", "error");
        return;
      }
      // Then reset the password
      return apiCall("POST", "/api/reset-password", { email: email, password: newPw });
    })
    .then(function(data) {
      if (data && (data.success || data.message)) {
        showToast("Password reset successfully!", "success");
        if (msgEl) msgEl.textContent = "Password changed!";
        _accResetToken = null;
      } else if (data && data.error) {
        showToast(typeof data.error === "string" ? data.error : "Failed", "error");
      }
    }).catch(function() {
      showToast("Network error", "error");
    });
}

