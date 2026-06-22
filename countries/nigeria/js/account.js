// ======================== Utility ========================
function escapeHtml(s) { if (!s) return ""; return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

// Nova Exchange - Account Module (account.js)
// Profile, Transactions, Referrals, Settings
// Depends on: api.js, auth.js, utils.js

var currentTxnPage = 1, txnTotalPages = 1;
var downlineCache = {};


// ======================== Loading State Helper ========================
function showLoading(el, msg) {
  if (!el) return;
  el.innerHTML = '<div class="acc-loading"><div class="nova-spinner" style="margin:0 auto 8px"></div>' + (msg || "Loading...") + '</div>';
}

function setButtonLoading(btn, loading, text) {
  if (!btn) return;
  if (loading) {
    btn._origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = text || "Processing...";
  } else {
    btn.disabled = false;
    btn.textContent = btn._origText || text || "Submit";
  }
}
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
  var tabs = document.querySelectorAll(".account-tab");
  var contents = document.querySelectorAll(".account-tab-content");
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove("active");
  for (var i = 0; i < contents.length; i++) contents[i].classList.remove("active");
  var tabBtn = document.querySelector('.account-tab[onclick*="' + tab + '"]');
  if (tabBtn) tabBtn.classList.add("active");
  var tabContent = document.getElementById("tab-" + tab);
  if (tabContent) tabContent.classList.add("active");
}

function loadAccountData() {
  apiCall("GET", "/api/me").then(function(data) {
    var user = data.user || (data && (data.id || data.name || data.phone || data.public_id) ? data : null);
    if (user) {
      setUserData(user);
      renderProfile(user);
      renderUserInHeader(user);
      var refId = user.referral_code || user.public_id || "";
      if (refId) {
        var refLinkDisplay = document.getElementById("refLinkDisplay");
        if (refLinkDisplay) {
          refLinkDisplay.value = "https://alh777.com/countries/nigeria/Nigeria.html?ref=" + refId;
        }
      }
    }
  }).catch(function() { showToast("Failed to load profile", "error"); });

  apiCall("GET", "/api/me/dashboard").then(function(data) {
    renderBalance(data.data || data);
  }).catch(function() {});

  loadTransactions(1);
  loadDownlines();
}

function renderUserInHeader(user) {
  var headerRight = document.querySelector(".header-auth-right");
  if (!headerRight) return;
  var emoji = getAvatarDisplay(user);
  headerRight.innerHTML =
    '<div class="auth-user-dropdown">' +
      '<div class="auth-avatar" style="background:#f0f7fa;font-size:22px;cursor:pointer;" onclick="toggleUserDropdown(event)">' + emoji + '</div>' +
      '<div class="auth-dropdown-menu" id="userDropdownMenu">' +
        '<div class="auth-dropdown-item" onclick="window.location.href=\'account.html\'">My Account</div>' +
        '<div class="auth-dropdown-divider"></div>' +
        '<div class="auth-dropdown-item" onclick="logoutUser()">Sign Out</div>' +
      '</div></div>';
}

function renderBalance(dashData) {
  var sec = document.getElementById("balanceSection");
  var el = document.getElementById("balanceContent");
  if (!sec || !el) return;
  sec.style.display = "block";
  if (!dashData) {
    el.innerHTML = '<div class="acc-empty">No balance data</div>';
    return;
  }
  el.innerHTML =
    '<div class="acc-grid-2">' +
      '<div class="acc-info-item"><span class="acc-label">Available Balance</span><span class="acc-value acc-balance">$' + parseFloat(dashData.available_balance || 0).toFixed(2) + '</span></div>' +
      '<div class="acc-info-item"><span class="acc-label">Total Earned</span><span class="acc-value">$' + parseFloat(dashData.total_earned || 0).toFixed(2) + '</span></div>' +
      '<div class="acc-info-item"><span class="acc-label">Pending Commission</span><span class="acc-value">$' + parseFloat(dashData.pending_commission || 0).toFixed(2) + '</span></div>' +
      '<div class="acc-info-item"><span class="acc-label">Downline Count</span><span class="acc-value">' + (dashData.downline_count || 0) + '</span></div>' +
      '<div class="acc-info-item"><span class="acc-label">Today Volume</span><span class="acc-value">$' + parseFloat(dashData.today_volume || 0).toFixed(2) + '</span></div>' +
      '<div class="acc-info-item"><span class="acc-label">Total Volume</span><span class="acc-value">$' + parseFloat(dashData.total_volume || 0).toFixed(2) + '</span></div>' +
    '</div>';
}

function renderProfile(user) {
  var name = user.name || user.username || "User";
  var phone = user.phone || user.phone_masked || "N/A";
  var email = user.email || "";
  var refId = user.referral_code || user.public_id || "N/A";
  var refCount = user.downline_count || user.referral_count || 0;
  var avatarLetter = getAvatarLetter(user);
  var avatarColor = getAvatarColor(user.email || user.phone || user.id);
  var displayEmail = email && email.indexOf("@nogin.nova.local") === -1 && email.indexOf("@nova.local") === -1 ? email : "";
  var el = document.getElementById("profileSection");
  if (!el) return;
  el.innerHTML =
    '<div style="text-align:center;margin-bottom:24px;">' +
      '<div class="account-avatar-lg" style="background:' + avatarColor + ';">' + avatarLetter + '</div>' +
      '<h2 style="font-size:22px;font-weight:700;color:#0a1c2f;">' + escapeHtml(name) + '</h2></div>' +
    '<div class="account-info-grid">' +
      '<div class="account-info-item"><span class="info-label">Phone</span><span class="info-value">' + escapeHtml(phone) + '</span></div>' +
      (displayEmail ? '<div class="account-info-item"><span class="info-label">Email</span><span class="info-value">' + escapeHtml(displayEmail) + '</span></div>' : "") +
      '<div class="account-info-item"><span class="info-label">Referral ID</span><span class="info-value">' + escapeHtml(refId) + '</span></div>' +
      '<div class="account-info-item"><span class="info-label">Referrals</span><span class="info-value">' + refCount + '</span></div>' +
    '</div>';
}

function loadTransactions(page) {
  currentTxnPage = page || 1;
  apiCall("GET", "/api/me/transactions?page=" + currentTxnPage + "&limit=10")
    .then(function(data) {
      var el = document.getElementById("transactionsBody");
      var pagEl = document.getElementById("txnPagination");
      if (!el) return;
      var txns = data.transactions || data.data || [];
      txnTotalPages = data.totalPages || data.total_pages || Math.ceil((data.total || txns.length || 1) / 10) || 1;
      if (txns.length === 0) {
        el.innerHTML = "<tr><td colspan='3' style='text-align:center;padding:24px;color:#8aaeb9;'>No transactions yet</td></tr>";
      } else {
        el.innerHTML = txns.map(function(t) {
          var dateStr = t.created_at || t.date || t.time || "N/A";
          if (dateStr.length > 16) dateStr = dateStr.substring(0, 16).replace("T", " ");
          var type = t.type || t.description || "";
          var amt = parseFloat(t.amount || t.price || 0);
          return "<tr><td style='padding:10px 12px;border-bottom:1px solid #eef2f4;'>" + escapeHtml(dateStr) +
            "</td><td style='padding:10px 12px;border-bottom:1px solid #eef2f4;'>" + escapeHtml(type) +
            "</td><td style='padding:10px 12px;border-bottom:1px solid #eef2f4;color:#0a7b7b;font-weight:600;'>$" + amt.toFixed(2) + "</td></tr>";
        }).join("");
      }
      if (pagEl) {
        var html = "";
        for (var i = 1; i <= txnTotalPages; i++) {
          html += '<button class="acc-page-btn' + (i === currentTxnPage ? " active" : "") + '" onclick="loadTransactions(' + i + ')">' + i + '</button>';
        }
        pagEl.innerHTML = html;
      }
    }).catch(function() {
      var el = document.getElementById("transactionsBody");
      if (el) el.innerHTML = "<tr><td colspan='3' style='text-align:center;padding:24px;color:#d32f2f;'>Failed to load transactions</td></tr>";
    });
}

function loadDownlines() {
  var container = document.getElementById("downlineContainer");
  if (!container) return;
  container.innerHTML = '<div class="acc-loading">Loading downlines...</div>';
  apiCall("GET", "/api/me/downlines").then(function(data) {
    var downlines = data.downlines || data.data || [];
    if (downlines.length === 0) {
      container.innerHTML = '<div class="acc-empty">No downlines yet. Share your referral link to earn commissions!</div>';
      return;
    }
    var html = "";
    for (var i = 0; i < downlines.length; i++) {
      var dl = downlines[i];
      var dateStr = dl.created_at || "";
      if (dateStr.length > 10) dateStr = dateStr.substring(0, 10);
      var name = dl.name || dl.email || "User";
      var phone = dl.phone || "";
      html +=
        '<div class="acc-downline-item">' +
          '<div class="acc-downline-header" onclick="toggleDownline(' + "'" + (dl.id || i) + "'" + ')">' +
            '<div><span class="acc-downline-id">' + escapeHtml(name) + '</span>' +
              (phone ? '<span class="acc-downline-stats">' + escapeHtml(phone) + '</span>' : "") +
            '</div>' +
            '<div style="text-align:right;"><span class="acc-downline-stats">Joined: ' + escapeHtml(dateStr) + '</span>' +
              '<span class="acc-downline-toggle" id="toggle-' + (dl.id || i) + '">\u25BC</span></div>' +
          '</div>' +
          '<div class="acc-downline-details" id="details-' + (dl.id || i) + '" style="display:none;">' +
            '<div class="acc-loading" style="padding:8px;">Loading commissions...</div>' +
          '</div>' +
        '</div>';
    }
    container.innerHTML = html;
  }).catch(function() {
    container.innerHTML = '<div class="acc-error">Failed to load downlines.</div>';
  });
}

function toggleDownline(downlineId) {
  var details = document.getElementById("details-" + downlineId);
  var toggle = document.getElementById("toggle-" + downlineId);
  if (!details) return;
  if (details.style.display === "block") {
    details.style.display = "none";
    if (toggle) toggle.textContent = "\u25BC";
    return;
  }
  details.style.display = "block";
  if (toggle) toggle.textContent = "\u25B2";
  if (!downlineCache[downlineId]) {
    apiCall("GET", "/api/me/commissions?downline_id=" + encodeURIComponent(downlineId))
      .then(function(data) {
        var commissions = data.commissions || data.data || [];
        downlineCache[downlineId] = commissions;
        renderDownlineCommissions(downlineId, commissions);
      }).catch(function() {
        details.innerHTML = '<div style="color:#d32f2f;padding:8px;font-size:13px;">Failed to load commissions</div>';
      });
  } else {
    renderDownlineCommissions(downlineId, downlineCache[downlineId]);
  }
}

function renderDownlineCommissions(downlineId, commissions) {
  var details = document.getElementById("details-" + downlineId);
  if (!details) return;
  if (!commissions || commissions.length === 0) {
    details.innerHTML = "<div style='color:#8aaeb9;padding:8px;font-size:13px;'>No commissions yet</div>";
    return;
  }
  details.innerHTML =
    "<table style='width:100%;border-collapse:collapse;font-size:13px;'>" +
    "<thead><tr style='background:#f0f7fa;'><th style='padding:8px;text-align:left;'>Date</th><th style='padding:8px;text-align:left;'>Amount</th><th style='padding:8px;text-align:left;'>Commission</th></tr></thead><tbody>" +
    commissions.map(function(t) {
      var dateStr = t.created_at || t.date || "";
      if (dateStr.length > 10) dateStr = dateStr.substring(0, 10);
      return "<tr><td style='padding:6px 8px;border-bottom:1px solid #eef2f4;'>" + escapeHtml(dateStr) +
        "</td><td style='padding:6px 8px;border-bottom:1px solid #eef2f4;'>$" + escapeHtml(String(t.amount || t.price || "0")) +
        "</td><td style='padding:6px 8px;border-bottom:1px solid #eef2f4;color:#0a7b7b;font-weight:600;'>$" + parseFloat(t.commission || t.rebate || t.comm || 0).toFixed(2) + "</td></tr>";
    }).join("") + "</tbody></table>";
}

function loadSettings() {
  var user = getUserData();
  if (!user) return;
  var refId = user.referral_code || user.public_id || "";
  var refInput = document.getElementById("refLinkDisplay");
  if (refInput) {
    refInput.value = "https://alh777.com/countries/nigeria/Nigeria.html?ref=" + refId;
  }
}

function copyRefLink() {
  var input = document.getElementById("refLinkDisplay");
  if (!input) return;
  input.select();
  try { document.execCommand("copy"); showToast("Referral link copied!", "success"); }
  catch(e) { showToast("Press Ctrl+C to copy", "info"); }
}

function changePassword() {
  var oldPwd = (document.getElementById("chgOldPwd") && document.getElementById("chgOldPwd").value) || "";
  var newPwd = (document.getElementById("chgNewPwd") && document.getElementById("chgNewPwd").value) || "";
  var confirmPwd = (document.getElementById("chgConfirmPwd") && document.getElementById("chgConfirmPwd").value) || "";
  if (!oldPwd) { showToast("Enter current password", "error"); return; }
  if (!newPwd || newPwd.length < 6) { showToast("New password min 6 characters", "error"); return; }
  if (newPwd !== confirmPwd) { showToast("Passwords do not match", "error"); return; }
  
  var btn = document.querySelector(".acc-section:last-of-type .acc-copy-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Updating..."; }
  
  apiCall("POST", "/api/reset-password", { current_password: oldPwd, password: newPwd })
    .then(function(data) {
      if (data.success || data.message) {
        showToast("Password changed successfully!", "success");
        ["chgOldPwd", "chgNewPwd", "chgConfirmPwd"].forEach(function(id) {
          var el = document.getElementById(id);
          if (el) el.value = "";
        });
      } else {
        showToast(data.error && (typeof data.error === "string" ? data.error : data.error.message) || "Failed to change password", "error");
      }
      if (btn) { btn.disabled = false; btn.textContent = "Change Password"; }
    }).catch(function() {
      showToast("Network error", "error");
      if (btn) { btn.disabled = false; btn.textContent = "Change Password"; }
    });
}

document.addEventListener("DOMContentLoaded", initAccountPage);
