// ============================================================
// Nova Exchange - Account Page Module (account.js)
// Profile, Transactions, Referral Performance, Settings
// ============================================================

var currentTxnPage = 1;
var txnTotalPages = 1;

function initAccountPage() {
  var token = getToken();
  if (!token) {
    showToast("Please sign in first", "error");
    setTimeout(function() { window.location.href = "Nigeria.html"; }, 1000);
    return;
  }
  loadAccountData();
}

function loadAccountData() {
  apiCall("GET", "/api/me").then(function(data) {
    if (data.user) {
      setUserData(data.user);
      renderProfile(data.user);
    } else if (data.error) {
      showToast(data.error, "error");
    }
  }).catch(function() {
    showToast("Failed to load profile", "error");
  });

  loadTransactions(1);
  loadDownlines();
}

function renderProfile(user) {
  var name = user.name || user.username || "User";
  var phone = user.phone || "N/A";
  var email = user.email || "N/A";
  var refId = user.referral_code || user.ref_id || "N/A";
  var refCount = user.referral_count || user.downline_count || 0;
  var avatarLetter = (name || phone).charAt(0).toUpperCase();
  var avatarColor = getAvatarColor(user.email || user.phone || user.id);

  // Only show non-novalocal emails
  var displayEmail = "";
  if (email && email.indexOf("@nova.local") === -1) {
    displayEmail = email;
  }

  var el = document.getElementById("profileSection");
  if (!el) return;

  el.innerHTML =
    '<div style="text-align:center;margin-bottom:24px;">' +
      '<div class="account-avatar" style="width:80px;height:80px;border-radius:50%;background:' + avatarColor + ';color:white;font-size:36px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">' + avatarLetter + '</div>' +
      '<h2 style="font-size:22px;font-weight:700;color:#0a1c2f;">' + escapeHtml(name) + '</h2>' +
    '</div>' +
    '<div class="account-info-grid">' +
      '<div class="account-info-item"><span class="info-label">?? Phone</span><span class="info-value">' + escapeHtml(phone) + '</span></div>' +
      (displayEmail ? '<div class="account-info-item"><span class="info-label">?? Email</span><span class="info-value">' + escapeHtml(displayEmail) + '</span></div>' : '') +
      '<div class="account-info-item"><span class="info-label">?? Referral ID</span><span class="info-value">' + escapeHtml(refId) + '</span></div>' +
      '<div class="account-info-item"><span class="info-label">?? Referrals</span><span class="info-value">' + refCount + '</span></div>' +
    '</div>';
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
          var time = t.created_at || t.date || t.time || "N/A";
          var account = t.account || t.account_name || t.type || "N/A";
          var amount = t.amount || t.price || "0";
          return "<tr><td>" + escapeHtml(time) + "</td><td>" + escapeHtml(account) + "</td><td style='font-weight:600;color:#0a7b7b;'>$" + escapeHtml(amount) + "</td></tr>";
        }).join("");
      }

      if (pagEl) {
        renderPagination(pagEl, currentTxnPage, txnTotalPages, "loadTransactions");
      }
    }).catch(function() {
      var el = document.getElementById("transactionsBody");
      if (el) el.innerHTML = "<tr><td colspan='3' style='text-align:center;padding:24px;color:#d32f2f;'>Failed to load transactions</td></tr>";
    });
}

function renderPagination(container, current, total, callback) {
  if (total <= 1) { container.innerHTML = ""; return; }
  var html = "";
  var start = Math.max(1, current - 1);
  var end = Math.min(total, current + 1);
  if (start > 1) { html += "<button class='page-btn' onclick=\"" + callback + "(1)\">1</button>"; if (start > 2) html += "<span class='page-dots'>...</span>"; }
  for (var i = start; i <= end; i++) {
    html += "<button class='page-btn" + (i === current ? " active" : "") + "' onclick=\"" + callback + "(" + i + ")\">" + i + "</button>";
  }
  if (end < total) { if (end < total - 1) html += "<span class='page-dots'>...</span>"; html += "<button class='page-btn' onclick=\"" + callback + "(" + total + ")\">" + total + "</button>"; }
  container.innerHTML = html;
}

// ======================== DOWNLINES (Referral Performance) ========================
function loadDownlines() {
  apiCall("GET", "/api/me/downlines")
    .then(function(data) {
      var el = document.getElementById("downlinesBody");
      if (!el) return;

      var downlines = data.downlines || data.data || [];

      // Sort by total commission this month (descending)
      downlines.sort(function(a, b) {
        var aComm = parseFloat(a.monthly_commission || a.commission || 0);
        var bComm = parseFloat(b.monthly_commission || b.commission || 0);
        return bComm - aComm;
      });

      if (downlines.length === 0) {
        el.innerHTML = "<div style='text-align:center;padding:24px;color:#8aaeb9;'>No referrals yet. Share your referral link to earn commissions!</div>";
        return;
      }

      el.innerHTML = downlines.map(function(d, idx) {
        var refId = d.referral_id || d.id || d.code || "REF" + (idx + 1);
        var safeId = refId.replace(/[^a-zA-Z0-9]/g, "_");
        return "<div class='downline-item'>" +
          "<div class='downline-header' onclick='toggleDownline("" + safeId + "")'>" +
            "<span class='downline-id'>? " + escapeHtml(refId) + "</span>" +
            "<span class='downline-commission'>Commission: $" + parseFloat(d.monthly_commission || d.commission || 0).toFixed(2) + "</span>" +
          "</div>" +
          "<div class='downline-detail' id='downlineDetail_" + safeId + "' style='display:none;'>" +
            "<div class='downline-loading' id='downlineLoading_" + safeId + "'>Loading transactions...</div>" +
            "<div class='downline-txns' id='downlineTxns_" + safeId + "'></div>" +
          "</div>" +
        "</div>";
      }).join("");
    }).catch(function() {
      var el = document.getElementById("downlinesBody");
      if (el) el.innerHTML = "<div style='text-align:center;padding:24px;color:#d32f2f;'>Failed to load referrals</div>";
    });
}

var downlineCache = {};

function toggleDownline(refId) {
  var detailEl = document.getElementById("downlineDetail_" + refId);
  if (!detailEl) return;

  if (detailEl.style.display === "block") {
    detailEl.style.display = "none";
    return;
  }

  detailEl.style.display = "block";

  var txnEl = document.getElementById("downlineTxns_" + refId);
  var loadingEl = document.getElementById("downlineLoading_" + refId);

  if (downlineCache[refId]) {
    renderDownlineTxns(txnEl, loadingEl, downlineCache[refId]);
    return;
  }

  apiCall("GET", "/api/me/downlines/" + encodeURIComponent(refId) + "/transactions")
    .then(function(data) {
      var txns = data.transactions || data.data || [];
      downlineCache[refId] = txns;
      renderDownlineTxns(txnEl, loadingEl, txns);
    }).catch(function() {
      if (loadingEl) loadingEl.style.display = "none";
      if (txnEl) txnEl.innerHTML = "<div style='color:#d32f2f;padding:8px;'>Failed to load transactions</div>";
    });
}

function renderDownlineTxns(txnEl, loadingEl, txns) {
  if (loadingEl) loadingEl.style.display = "none";
  if (!txnEl) return;
  if (txns.length === 0) {
    txnEl.innerHTML = "<div style='color:#8aaeb9;padding:8px;font-size:13px;'>No transactions this month</div>";
    return;
  }
  txnEl.innerHTML =
    "<table style='width:100%;border-collapse:collapse;font-size:13px;'>" +
    "<thead><tr style='background:#f0f7fa;'><th style='padding:8px;text-align:left;'>Date</th><th style='padding:8px;text-align:left;'>Amount</th><th style='padding:8px;text-align:left;'>Commission</th></tr></thead><tbody>" +
    txns.map(function(t) {
      var time = t.created_at || t.date || t.time || "N/A";
      var amount = t.amount || t.price || "0";
      var comm = t.commission || t.rebate || t.comm || "0";
      return "<tr><td style='padding:6px 8px;border-bottom:1px solid #eef2f4;'>" + escapeHtml(time) + "</td>" +
        "<td style='padding:6px 8px;border-bottom:1px solid #eef2f4;'>$" + escapeHtml(amount) + "</td>" +
        "<td style='padding:6px 8px;border-bottom:1px solid #eef2f4;color:#0a7b7b;font-weight:600;'>$" + parseFloat(comm).toFixed(2) + "</td></tr>";
    }).join("") +
    "</tbody></table>";
}

// ======================== SETTINGS ========================
function loadSettings() {
  var user = getUserData();
  if (!user) return;

  var refId = user.referral_code || user.ref_id || "";
  var refLink = "https://alh777.com?ref=" + refId;

  var el = document.getElementById("settingsSection");
  if (!el) return;

  el.innerHTML =
    '<div class="settings-card">' +
      '<h3 style="font-size:16px;font-weight:700;color:#0a1c2f;margin-bottom:12px;">?? Referral Link</h3>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
        '<input type="text" id="refLinkInput" value="' + escapeHtml(refLink) + '" readonly style="flex:1;min-width:200px;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:14px;background:#f8fafc;color:#4a6a78;">' +
        '<button onclick="copyRefLink()" style="padding:10px 20px;background:#0a7b7b;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">?? Copy</button>' +
      '</div>' +
    '</div>' +

    '<div class="settings-card">' +
      '<h3 style="font-size:16px;font-weight:700;color:#0a1c2f;margin-bottom:12px;">?? Bind Email</h3>' +
      '<p style="color:#4a6a78;font-size:13px;margin-bottom:12px;">Link a Google email to your account for login & recovery</p>' +
      '<button onclick="showBindEmailModal()" style="padding:10px 24px;background:#0a7b7b;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Bind Email</button>' +
    '</div>' +

    '<div class="settings-card">' +
      '<h3 style="font-size:16px;font-weight:700;color:#0a1c2f;margin-bottom:12px;">?? Change Password</h3>' +
      '<p style="color:#4a6a78;font-size:13px;margin-bottom:12px;">Verify your identity before changing password</p>' +
      '<button onclick="showChangePasswordModal()" style="padding:10px 24px;background:#d32f2f;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Change Password</button>' +
    '</div>';
}

function copyRefLink() {
  var input = document.getElementById("refLinkInput");
  if (!input) return;
  input.select();
  try {
    document.execCommand("copy");
    showToast("Referral link copied!", "success");
  } catch(e) {
    showToast("Press Ctrl+C to copy", "info");
  }
}

// ======================== CHANGE PASSWORD ========================
function showChangePasswordModal() {
  showModal(
    '<div class="auth-modal" style="background:white;border-radius:24px;padding:36px 32px;max-width:440px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;">' +
    '<button onclick="closeModal(this.closest(\'.auth-modal-overlay\'))" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#8aaeb9;line-height:1;">?</button>' +
    '<h2 style="font-size:22px;font-weight:700;color:#0a1c2f;margin-bottom:4px;">Change Password</h2>' +
    '<p style="color:#4a6a78;font-size:14px;margin-bottom:20px;">Verify with your bind email</p>' +

    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Current Password</label>' +
    '<input type="password" id="chgOldPassword" placeholder="Enter current password" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +

    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">New Password</label>' +
    '<input type="password" id="chgNewPassword" placeholder="Min 6 characters" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +

    '<div style="margin-bottom:20px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Confirm New Password</label>' +
    '<input type="password" id="chgConfirmPassword" placeholder="Repeat new password" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +

    '<button onclick="handleChangePassword()" style="width:100%;padding:14px;background:#d32f2f;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;">Update Password</button>' +
    '</div>'
  );
}

function handleChangePassword() {
  var oldPwd = document.getElementById("chgOldPassword").value;
  var newPwd = document.getElementById("chgNewPassword").value;
  var confirmPwd = document.getElementById("chgConfirmPassword").value;

  if (!oldPwd) { showToast("Please enter current password", "error"); return; }
  if (!newPwd || newPwd.length < 6) { showToast("New password must be at least 6 characters", "error"); return; }
  if (newPwd !== confirmPwd) { showToast("Passwords do not match", "error"); return; }

  var btn = document.querySelector(".auth-modal button:last-of-type");
  if (btn) { btn.disabled = true; btn.textContent = "Updating..."; }

  apiCall("POST", "/api/me/change-password", { old_password: oldPwd, new_password: newPwd })
    .then(function(data) {
      if (data.success || data.message) {
        showToast("Password changed successfully!", "success");
        closeModal(document.querySelector(".auth-modal-overlay"));
      } else if (data.error) {
        // If old password is wrong, fallback to email verification
        if (data.error.indexOf("old password") !== -1 || data.error.indexOf("incorrect") !== -1) {
          showToast("Old password is incorrect. Using email verification instead.", "info");
          closeModal(document.querySelector(".auth-modal-overlay"));
          showForgotModal();
        } else {
          showToast(data.error, "error");
        }
        if (btn) { btn.disabled = false; btn.textContent = "Update Password"; }
      } else {
        showToast("Failed to change password", "error");
        if (btn) { btn.disabled = false; btn.textContent = "Update Password"; }
      }
    }).catch(function() {
      showToast("Network error", "error");
      if (btn) { btn.disabled = false; btn.textContent = "Update Password"; }
    });
}

// ======================== INIT ========================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAccountPage);
} else {
  initAccountPage();
}
