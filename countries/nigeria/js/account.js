// ============================================================
// Nova Exchange - Account Module (account.js)
// Profile, Commissions, Transactions, Referrals, Settings
// ============================================================

function escapeHtml(s) { if (!s) return ""; return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

var currentTxnPage = 1;
var currentTxnFilter = "all";
var currentDlPage = 1;
var currentDlMonth = "";
var allTransactions = [];
var allCommissions = [];
var allDownlines = [];
var downlineMonths = [];

// Loading timeout
var _profileTimeout = setTimeout(function() {
  var el = document.getElementById("profileHeader");
  if (el && el.innerHTML.indexOf("loading-state") > -1) {
    el.innerHTML = '<div class="error-state">Could not load profile. <button onclick="location.reload()" class="dash-btn" style="margin-top:8px;">Refresh</button></div>';
  }
}, 10000);

// ======================== INIT ========================
function initAccountPage() {
  if (!isLoggedIn()) {
    if (window.location.pathname.indexOf("account.html") > -1) {
      showToast("Please sign in first", "error");
      setTimeout(function() { window.location.href = getBasePath() + "Nigeria.html"; }, 1000);
    }
    return;
  }
  loadAllData();
}

function loadAllData() {
  loadProfile();
  loadDashboard();
  loadCommissions();
  loadCommissionHistory();
  loadSettings();
}

// ======================== 1. PROFILE ========================
function loadProfile() {
  apiCall("GET", "/api/me").then(function(data) {
    clearTimeout(_profileTimeout);
    var user = data.user || (data && (data.id || data.name || data.phone || data.public_id) ? data : null);
    if (user) {
      setUserData(user);
      renderProfile(user);
      updateAuthHeader();
      checkUpline(user);
    }
  }).catch(function() {
    var el = document.getElementById("profileHeader");
    if (el) el.innerHTML = '<div class="error-state">Failed to load profile</div>';
  });
}

function renderProfile(user) {
  var name = user.name || user.username || "User";
  var phone = user.phone || user.phone_masked || "N/A";
  var email = user.email || "";
  var refId = user.referral_code || user.public_id || "N/A";
  var joined = user.created_at || "";
  if (joined.length > 10) joined = joined.substring(0, 10);
  var avatarLetter = (name.charAt(0) || "?").toUpperCase();
  var avatarColor = getAvatarColor(user.email || user.phone || user.id);
  var displayEmail = email && email.indexOf("@nogin.nova.local") === -1 && email.indexOf("@nova.local") === -1 ? email : "";

  var headerEl = document.getElementById("profileHeader");
  if (headerEl) {
    headerEl.innerHTML =
      '<div class="profile-avatar" style="background:' + avatarColor + ';">' + avatarLetter + '</div>' +
      '<div class="profile-info">' +
        '<h1>' + escapeHtml(name) + '</h1>' +
        '<div class="meta">' + (displayEmail || "No email") + ' · Joined ' + joined + '</div>' +
      '</div>';
  }

  var detailsEl = document.getElementById("profileDetails");
  if (detailsEl) {
    detailsEl.innerHTML =
      '<div class="item"><div class="label">Phone</div><div class="value">' + escapeHtml(phone) + '</div></div>' +
      '<div class="item"><div class="label">Referral ID</div><div class="value">' + escapeHtml(refId) + '</div></div>' +
      '<div class="item"><div class="label">Downline</div><div class="value" id="downlineCount">计算中...</div></div>' +
      (displayEmail ? '<div class="item"><div class="label">Email</div><div class="value">' + escapeHtml(displayEmail) + '</div></div>' : '<div class="item"><div class="label">Email</div><div class="value" style="color:#8aaeb9;">Not bound</div></div>');
  }


  // Query downline count (all 4 levels)
  if (user && user.id) {
    try {
      var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      sb.from("customers").select("id,parent_id").then(function(res) {
        var allCusts = res.data || [];
        var count = 0;
        var current = [user.id];
        for(var lvl=0; lvl<4; lvl++) {
          var next = allCusts.filter(function(x){ return current.indexOf(x.parent_id) !== -1; }).map(function(x){ return x.id; });
          count += next.length;
          current = next;
          if(next.length===0) break;
        }
        var countEl = document.getElementById("downlineCount");
        if (countEl) countEl.textContent = count;
      }).catch(function() {
        var countEl = document.getElementById("downlineCount");
        if (countEl) countEl.textContent = "0";
      });
    } catch(e) {
      var countEl = document.getElementById("downlineCount");
      if (countEl) countEl.textContent = "0";
    }
  }

// Show & fill referral link
  var refLinkSection = document.getElementById("profileRefLink");
  var refInput = document.getElementById("refLinkDisplay");
  if (refLinkSection && refInput) {
    refInput.value = "https://www.alh777.com/countries/nigeria/Nigeria.html?ref=" + refId;
    var refCodeEl = document.getElementById('refCodeDisplay');
    if (refCodeEl) refCodeEl.textContent = '🔗 Referral Code: ' + refId;
    refLinkSection.style.display = "block";
  }

  // Show phone number on Change Password heading
  var phoneSpan = document.getElementById("changePasswordPhone");
  if (phoneSpan && phone && phone !== "N/A") {
    phoneSpan.textContent = "(" + phone + ")";
  }
}
// ======================== 2. COMMISSION OVERVIEW ========================
function loadDashboard() {
  apiCall("GET", "/api/me/dashboard").then(function(data) {
    renderCommissionGrid(data.data || data);
    renderTodayPerformance(data.data || data);
  }).catch(function() {});
}

function renderCommissionGrid(dash) {
  if (!dash) return;
  var el = document.getElementById("commissionGrid");
  if (!el) return;
  var earned = parseFloat(dash.total_earned || 0).toFixed(2);
  var monthComm = parseFloat(dash.month_commission || 0).toFixed(2);

  el.innerHTML =
    '<div class="comm-card" onclick="showCommissionDetail(' + "'earned'" + ')" title="Click to see monthly breakdown">' +
      '<div class="amount">$' + monthComm + '</div>' +
      '<div class="label">This Month</div>' +
      '<div class="sub-label">' + getMonthLabel() + '</div>' +
    '</div>' +
    '<div class="comm-card">' +
      '<div class="amount">$' + earned + '</div>' +
      '<div class="label">Total Earned</div>' +
      '<div class="sub-label">All time commissions</div>' +
    '</div>';
}
function getMonthLabel() {
  var d = new Date();
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[d.getMonth()] + " " + d.getFullYear();
}

// ======================== 3. TODAY'S PERFORMANCE ========================
function renderTodayPerformance(dash) {
  if (!dash) return;
  var el = document.getElementById("todayContent");
  if (!el) return;
  var today = parseFloat(dash.today_volume || 0).toFixed(2);
  // Estimate yesterday from available data
  var yesterday = 0;
  if (dash.total_volume && dash.today_volume) {
    yesterday = Math.max(0, parseFloat((dash.total_volume - dash.today_volume) > 0 ? 0 : 0));
  }
  var diff = today - yesterday;
  var diffClass = diff > 0 ? "today-pos" : (diff < 0 ? "today-neg" : "today-neutral");
  var diffIcon = diff > 0 ? "▲" : (diff < 0 ? "▼" : "—");

  // Check if there are today's commission records
  var todayCommissions = allCommissions.filter(function(c) {
    if (!c.created_at) return false;
    var d = new Date();
    var todayStr = d.toISOString().substring(0, 10);
    return c.created_at.substring(0, 10) === todayStr;
  });
  var todayCommTotal = 0;
  for (var i = 0; i < todayCommissions.length; i++) {
    todayCommTotal += parseFloat(todayCommissions[i].amount) || 0;
  }

  if (todayCommissions.length > 0) {
    el.innerHTML =
      '<div class="today-grid">' +
        '<div class="today-item" onclick="showTodayCommissions()" style="cursor:pointer;border-color:#0a7b7b;" title="Click for details">' +
          '<div class="amount today-pos">$' + todayCommTotal.toFixed(2) + '</div>' +
          '<div class="label">Today\'s Commission · ' + todayCommissions.length + ' records</div>' +
        '</div>' +
        '<div class="today-item">' +
          '<div class="amount ' + diffClass + '">' + diffIcon + ' $' + Math.abs(diff).toFixed(2) + '</div>' +
          '<div class="label">vs Yesterday</div>' +
        '</div>' +
      '</div>';
  } else {
    el.innerHTML =
      '<div class="today-grid">' +
        '<div class="today-item" style="grid-column:1/-1;">' +
          '<div class="amount today-neutral">$0.00</div>' +
          '<div class="label">No commission yet today</div>' +
          '<div style="font-size:12px;color:#8aaeb9;margin-top:4px;">Share your referral link to start earning! 🚀</div>' +
        '</div>' +
      '</div>';
  }
}

function showTodayCommissions() {
  var d = new Date();
  var todayStr = d.toISOString().substring(0, 10);
  var items = allCommissions.filter(function(c) {
    return c.created_at && c.created_at.substring(0, 10) === todayStr;
  });
  if (items.length === 0) {
    showToast("No commissions today", "info");
    return;
  }
  var html = '<button class="close-btn" onclick="closeModal(this.closest(\'.nova-modal-overlay\'))">✕</button>';
  html += '<h3>📊 Today\'s Commission Details</h3>';
  html += '<div style="font-size:13px;color:#6a8a98;margin-bottom:12px;">' + todayStr + ' · ' + items.length + ' records</div>';
  for (var i = 0; i < items.length; i++) {
    var amt = parseFloat(items[i].amount || 0).toFixed(2);
    var status = (items[i].status || "pending");
    var statusClass = status === "settled" || status === "completed" ? "status-success" : (status === "pending" || status === "processing" ? "status-pending" : "status-failed");
    html += '<div class="modal-item"><span>From downline</span><span>$' + amt + ' <span class="status-badge ' + statusClass + '">' + status + '</span></span></div>';
  }
  showModalPopup(html);
}

// ======================== 4. COMMISSIONS (for detail popups) ========================
function loadCommissions() {
  apiCall("GET", "/api/me/commissions?limit=999").then(function(data) {
    allCommissions = data.commissions || data.data || [];
  }).catch(function() {});
}

function showCommissionDetail(type) {
  if (allCommissions.length === 0) {
    showToast("No commission data yet", "info");
    return;
  }

  // Group by month
  var monthly = {};
  for (var i = 0; i < allCommissions.length; i++) {
    var c = allCommissions[i];
    var ym = (c.created_at || "").substring(0, 7);
    if (!ym) continue;
    if (!monthly[ym]) monthly[ym] = { total: 0, items: [] };
    monthly[ym].total += parseFloat(c.amount || 0);
    monthly[ym].items.push(c);
  }

  var sortedMonths = Object.keys(monthly).sort().reverse();
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var html = '<button class="close-btn" onclick="closeModal(this.closest(\'.nova-modal-overlay\'))">✕</button>';

  if (type === "pending") {
    html += '<h3>⏳ Pending Settlement</h3>';
    html += '<div style="font-size:13px;color:#6a8a98;margin-bottom:12px;">Commissions not yet settled (status ≠ settled/completed)</div>';
    var pendingMonths = sortedMonths.filter(function(ym) {
      return monthly[ym].items.some(function(c) { return c.status !== "settled" && c.status !== "completed"; });
    });
    if (pendingMonths.length === 0) {
      html += '<div class="empty-state">🎉 All commissions settled!</div>';
    } else {
      for (var mi = 0; mi < pendingMonths.length; mi++) {
        var ym = pendingMonths[mi];
        var parts = ym.split("-");
        var label = months[parseInt(parts[1]) - 1] + " " + parts[0];
        var pendingTotal = 0;
        for (var ci = 0; ci < monthly[ym].items.length; ci++) {
          var c = monthly[ym].items[ci];
          if (c.status !== "settled" && c.status !== "completed") {
            pendingTotal += parseFloat(c.amount || 0);
          }
        }
        html += '<div class="modal-item"><span>' + label + '</span><span style="font-weight:600;color:#f39c12;">$' + pendingTotal.toFixed(2) + '</span></div>';
      }
    }
  } else {
    html += '<h3>💰 Monthly Commission Breakdown</h3>';
    html += '<div style="font-size:13px;color:#6a8a98;margin-bottom:12px;">Total commissions earned per month</div>';
    for (var mj = 0; mj < sortedMonths.length; mj++) {
      var ym2 = sortedMonths[mj];
      var parts2 = ym2.split("-");
      var label2 = months[parseInt(parts2[1]) - 1] + " " + parts2[0];
      var earnedTotal = 0;
      for (var cj = 0; cj < monthly[ym2].items.length; cj++) {
        earnedTotal += parseFloat(monthly[ym2].items[cj].amount || 0);
      }
      html += '<div class="modal-item"><span>' + label2 + '</span><span style="font-weight:600;color:#0a7b7b;">$' + earnedTotal.toFixed(2) + '</span></div>';
    }
  }
  showModalPopup(html);
}

// ======================== COMMISSION HISTORY ========================

var currentCommPage = 1;
var allCommissionsData = [];
var COMM_PAGE_SIZE = 10;

function loadCommissionHistory() {
  apiCall("GET", "/api/me/commissions?limit=999").then(function(data) {
    allCommissionsData = data.commissions || data.data || [];
    renderCommissionHistory();
  }).catch(function() {
    var el = document.getElementById("commHistoryBody");
    if (el) el.innerHTML = '<tr><td colspan="4" class="error-state">Failed to load commissions</td></tr>';
  });
}
function renderCommissionHistory() {
  var el = document.getElementById("commHistoryBody");
  var pagEl = document.getElementById("commHistoryPagination");
  if (!el) return;

  if (allCommissionsData.length === 0) {
    el.innerHTML = '<tr><td colspan="4" class="empty-state">No commissions yet. Refer friends to earn!</td></tr>';
    if (pagEl) pagEl.innerHTML = "";
    return;
  }

  var totalPages = Math.ceil(allCommissionsData.length / COMM_PAGE_SIZE);
  if (currentCommPage > totalPages) currentCommPage = totalPages;
  if (currentCommPage < 1) currentCommPage = 1;
  var start = (currentCommPage - 1) * COMM_PAGE_SIZE;
  var pageItems = allCommissionsData.slice(start, start + COMM_PAGE_SIZE);

  var html = "";
  for (var i = 0; i < pageItems.length; i++) {
    var c = pageItems[i];
    var date = c.created_at || c.date || "";
    var timeStr = date.substring(0, 10);
    var memberId = c.from_public_id || (c.from_customer_id ? c.from_customer_id.substring(0, 8) : "---");
    var amount = parseFloat(c.amount || 0).toFixed(2);
    var commission = parseFloat(c.commission || 0).toFixed(2);
    html += '<tr>' +
      '<td>' + timeStr + '</td>' +
      '<td>' + memberId + '</td>' +
      '<td>\u20A6' + amount + '</td>' +
      '<td>\u20A6' + commission + '</td>' +
      '</tr>';
  }
  el.innerHTML = html;

  if (pagEl) {
    if (totalPages <= 1) { pagEl.innerHTML = ""; return; }
    var phtml = "";
    if (currentCommPage > 1) phtml += '<button class="page-btn" onclick="goCommPage(' + (currentCommPage - 1) + ')">\u00AB</button>';
    for (var p = 1; p <= totalPages; p++) {
      if (p === currentCommPage) phtml += '<span class="page-btn active">' + p + '</span>';
      else if (p <= 3 || p > totalPages - 3 || Math.abs(p - currentCommPage) <= 2) phtml += '<button class="page-btn" onclick="goCommPage(' + p + ')">' + p + '</button>';
      else if (p === 4 && currentCommPage > 5) phtml += '<span class="page-dots">...</span>';
    }
    if (currentCommPage < totalPages) phtml += '<button class="page-btn" onclick="goCommPage(' + (currentCommPage + 1) + ')">\u00BB</button>';
    pagEl.innerHTML = phtml;
  }
}

function goCommPage(page) {
  if (page < 1) return;
  currentCommPage = page;
  renderCommissionHistory();
}




function checkUpline(user) {
  var el = document.getElementById("uplineSection");
  if (!el) return;
  var referredBy = user.referred_by;
  if (!referredBy) {
    el.innerHTML = '<div style="font-size:13px;color:#8aaeb9;padding:8px 0;">You haven\'t been referred by anyone yet. <a href="./Nigeria.html" style="color:#0a7b7b;">Start trading</a></div>';
    return;
  }
  // Try to get referrer info
  try {
    var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    sb.from("users").select("name, email, phone, created_at").eq("id", referredBy).single().then(function(res) {
      var ref = res.data;
      if (ref) {
        var name = ref.name || ref.email || "Referrer";
        var avatarLetter = (name.charAt(0) || "?").toUpperCase();
        var colors = ["#0a7b7b","#d32f2f","#1976d2","#388e3c","#f57c00"];
        var color = colors[Math.abs(referredBy.hashCode ? referredBy.hashCode() : (referredBy.charCodeAt(0) || 0)) % colors.length];
        el.innerHTML =
          '<div class="upline-card">' +
            '<div class="upline-avatar" style="background:' + color + ';">' + avatarLetter + '</div>' +
            '<div class="upline-info">' +
              '<div class="name">👤 ' + escapeHtml(name) + '</div>' +
              '<div class="detail">Joined ' + (ref.created_at || "").substring(0, 10) + ' · Your referrer</div>' +
            '</div>' +
          '</div>';
      }
    });
  } catch(e) {
    el.innerHTML = '<div style="font-size:13px;color:#8aaeb9;padding:8px 0;">You have a referrer (ID: ' + escapeHtml(referredBy) + ')</div>';
  }
}


// ======================== BIND REFERRER ========================
function confirmBindReferrer() {
  var codeInput = document.getElementById("accReferrerCode");
  var msgEl = document.getElementById("referrerMessage");
  if (!codeInput || !msgEl) return;
  
  var code = codeInput.value.trim();
  if (!code) {
    msgEl.innerHTML = '<span style="color:#d32f2f;">Please enter a referrer ID</span>';
    return;
  }
  
  // Show confirmation dialog
  if (!confirm("Please confirm referrer ID: " + code + "\n\nAdd this referrer? Note: Referrer can only be set once and cannot be changed.")) {
    return;
  }
  
  var btn = document.getElementById("bindReferrerBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Submitting..."; }
  msgEl.innerHTML = '<span style="color:#6a8a98;">Submitting...</span>';
  
  apiCall("POST", "/api/me/bind-referrer", { referral_code: code })
    .then(function(data) {
      if (data.success) {
        msgEl.innerHTML = '<span style="color:#0a7b7b;font-weight:600;">✓ Referrer bound successfully!</span>';
        codeInput.readOnly = true;
        if (btn) { btn.style.display = "none"; }
      } else {
        msgEl.innerHTML = '<span style="color:#d32f2f;">✗ ' + (data.error || 'Bind failed') + '</span>';
        if (btn) { btn.disabled = false; btn.textContent = "Confirm"; }
      }
    })
    .catch(function(err) {
      msgEl.innerHTML = '<span style="color:#d32f2f;">✗ Network error, please try again</span>';
      if (btn) { btn.disabled = false; btn.textContent = "Confirm"; }
    });
}

// ======================== 8. SETTINGS ========================
function loadSettings() {
  var user = getUserData();
  if (!user) return;
  var refId = user.referral_code || user.public_id || (user.id ? user.id.substring(0, 6).toUpperCase() : "");
  var refInput = document.getElementById("refLinkDisplay");
  if (refInput) {
    refInput.value = "https://www.alh777.com/countries/nigeria/Nigeria.html?ref=" + refId;
    var refCodeEl = document.getElementById('refCodeDisplay');
    if (refCodeEl) refCodeEl.textContent = '🔗 Referral Code: ' + refId;
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

  var btn = document.querySelector(".dash-card:last-of-type .dash-btn");
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
    }).catch(function() { showToast("Network error", "error"); })
    .then(function() {
      if (btn) { btn.disabled = false; btn.textContent = "Change Password"; }
    });
}

// ======================== UTILITY ========================
function showModalPopup(html) {
  var existing = document.querySelector(".nova-modal-overlay");
  if (existing) existing.remove();
  var overlay = document.createElement("div");
  overlay.className = "nova-modal-overlay";
  overlay.innerHTML = '<div class="nova-modal">' + html + '</div>';
  document.body.appendChild(overlay);
  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") { closeModal(overlay); document.removeEventListener("keydown", escHandler); }
  });
}

function closeModal(overlay) {
  if (overlay && overlay.parentNode) {
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.2s ease";
    setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
  }
}

// Bind email functions (from auth.js - reused)
function sendBindCode() {
  var email = document.getElementById("accBindEmail");
  if (!email) return;
  var emailVal = email.value.trim();
  var btn = document.getElementById("accSendBindCodeBtn");
  if (!btn) return;
  // Call the auth.js function
  if (typeof sendBindEmailCode === "function") {
    sendBindEmailCode(emailVal, btn).catch(function(err) {});
  }
}


// ======================== INIT ========================
document.addEventListener("DOMContentLoaded", initAccountPage);

