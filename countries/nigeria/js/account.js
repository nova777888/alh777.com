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
  loadAllTransactions();
  loadCommissions();
  loadDownlines();
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
  var pending = parseFloat(dash.pending_commission || 0).toFixed(2);
  var earned = parseFloat(dash.total_earned || 0).toFixed(2);
  var monthComm = parseFloat(dash.month_commission || 0).toFixed(2);

  el.innerHTML =
    '<div class="comm-card" onclick="showCommissionDetail(\'pending\')" title="Click to see details">' +
      '<div class="amount">$' + pending + '</div>' +
      '<div class="label">Pending Settlement</div>' +
      '<div class="sub-label">Settles on 1st of next month</div>' +
    '</div>' +
    '<div class="comm-card" onclick="showCommissionDetail(\'earned\')" title="Click to see monthly breakdown">' +
      '<div class="amount">$' + earned + '</div>' +
      '<div class="label">Total Earned</div>' +
      '<div class="sub-label">All time commissions</div>' +
    '</div>' +
    '<div class="comm-card">' +
      '<div class="amount">$' + monthComm + '</div>' +
      '<div class="label">This Month</div>' +
      '<div class="sub-label">' + getMonthLabel() + '</div>' +
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

// ======================== 4. TRANSACTIONS ========================
function loadAllTransactions() {
  // Fetch first page to get total pages
  apiCall("GET", "/api/me/transactions?page=1&limit=100").then(function(data) {
    var txns = data.transactions || data.data || [];
    allTransactions = txns;
    var totalPages = data.totalPages || data.total_pages || 1;
    var total = data.total || txns.length || 0;

    // If there are more pages, fetch them all
    if (totalPages > 1 && total > txns.length) {
      var promises = [];
      for (var p = 2; p <= totalPages; p++) {
        promises.push(apiCall("GET", "/api/me/transactions?page=" + p + "&limit=100"));
      }
      Promise.all(promises).then(function(results) {
        for (var r = 0; r < results.length; r++) {
          var more = results[r].transactions || results[r].data || [];
          allTransactions = allTransactions.concat(more);
        }
        renderTransactions();
      }).catch(function() { renderTransactions(); });
    } else {
      renderTransactions();
    }
  }).catch(function() {
    document.getElementById("txnContent").innerHTML = '<div class="error-state">Failed to load transactions</div>';
  });
}

function renderTransactions() {
  var el = document.getElementById("txnContent");
  var pagEl = document.getElementById("txnPagination");
  if (!el) return;

  // Build filter bar
  var filterEl = document.getElementById("txnFilterBar");
  if (filterEl) {
    var filters = ["all", "deposit", "withdrawal", "commission", "exchange"];
    var labels = {all:"All",deposit:"Deposit",withdrawal:"Withdrawal",commission:"Commission",exchange:"Exchange"};
    var html = "";
    for (var f = 0; f < filters.length; f++) {
      html += '<button class="filter-btn' + (currentTxnFilter === filters[f] ? " active" : "") + '" onclick="setTxnFilter(\'' + filters[f] + '\')">' + labels[filters[f]] + '</button>';
    }
    filterEl.innerHTML = html;
  }

  var filtered = allTransactions;
  if (currentTxnFilter !== "all") {
    filtered = allTransactions.filter(function(t) {
      var type = (t.type || t.description || "").toLowerCase();
      return type.indexOf(currentTxnFilter) > -1;
    });
  }

  if (filtered.length === 0) {
    el.innerHTML = '<div class="empty-state">No transactions yet. Start trading to see your history here.</div>';
    if (pagEl) pagEl.innerHTML = "";
    return;
  }

  // Group by year-month
  var groups = {};
  for (var i = 0; i < filtered.length; i++) {
    var t = filtered[i];
    var dateStr = t.created_at || t.date || "";
    var ym = dateStr.substring(0, 7); // "2026-01"
    if (!ym || ym === "") ym = "unknown";
    if (!groups[ym]) groups[ym] = [];
    groups[ym].push(t);
  }

  var sortedMonths = Object.keys(groups).sort().reverse();
  var now = new Date();
  var recentMonths = [];
  for (var m = 0; m < 3; m++) {
    var y = now.getFullYear();
    var mo = now.getMonth() - m;
    if (mo < 0) { mo += 12; y--; }
    recentMonths.push(y + "-" + String(mo + 1).padStart(2, "0"));
  }

  var html = "";
  for (var mi = 0; mi < sortedMonths.length; mi++) {
    var ym = sortedMonths[mi];
    var txns = groups[ym];
    var totalAmt = 0;
    for (var ti = 0; ti < txns.length; ti++) {
      totalAmt += parseFloat(txns[ti].amount || 0);
    }
    var isOpen = recentMonths.indexOf(ym) > -1;
    var monthLabel = ym;
    if (ym.length === 7) {
      var parts = ym.split("-");
      var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      monthLabel = months[parseInt(parts[1]) - 1] + " " + parts[0];
    }

    html += '<div class="month-group">' +
      '<div class="month-header" onclick="toggleMonth(this)">' +
        '<span>' + monthLabel + ' <span class="month-total">$' + totalAmt.toFixed(2) + '</span></span>' +
        '<span style="color:#6a8a98;font-size:12px;">' + txns.length + ' records ' + (isOpen ? "▲" : "▼") + '</span>' +
      '</div>' +
      '<div class="month-body' + (isOpen ? " open" : "") + '">' +
      '<table class="dash-table"><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>';

    for (var tj = 0; tj < txns.length; tj++) {
      var t = txns[tj];
      var dateVal = (t.created_at || t.date || "").substring(0, 10);
      var typeVal = t.type || t.description || "-";
      var amtVal = parseFloat(t.amount || 0).toFixed(2);
      var statusVal = t.status || "completed";
      var statusClass = statusVal === "completed" || statusVal === "settled" || statusVal === "success" ? "status-success" :
                        (statusVal === "pending" || statusVal === "processing" ? "status-pending" : "status-failed");
      var statusLabel = statusVal === "completed" || statusVal === "settled" || statusVal === "success" ? "✅ Success" :
                        (statusVal === "pending" || statusVal === "processing" ? "🔄 Processing" : "❌ Failed");
      html += '<tr><td>' + escapeHtml(dateVal) + '</td><td>' + escapeHtml(typeVal) + '</td>' +
        '<td style="font-weight:600;color:#0a7b7b;">$' + amtVal + '</td>' +
        '<td><span class="status-badge ' + statusClass + '">' + statusLabel + '</span></td></tr>';
    }
    html += '</tbody></table></div></div>';
  }
  el.innerHTML = html;
  if (pagEl) pagEl.innerHTML = "";
}

function setTxnFilter(filter) {
  currentTxnFilter = filter;
  renderTransactions();
}

function toggleMonth(header) {
  var body = header.nextElementSibling;
  if (body) {
    body.classList.toggle("open");
    var arrow = header.querySelector("span:last-child");
    if (arrow) arrow.textContent = body.classList.contains("open") ? "▲" : "▼";
  }
}

// ======================== 5. COMMISSIONS (for detail popups) ========================
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

// ======================== 6. REFERRAL / DOWNLINES ========================
function loadDownlines() {
  var monthParam = currentDlMonth ? "&month=" + currentDlMonth : "";
  apiCall("GET", "/api/me/downlines?page=" + currentDlPage + "&limit=20" + monthParam).then(function(data) {
    allDownlines = data.downlines || [];
    renderDownlines(data);
  }).catch(function() {
    document.getElementById("downlineContent").innerHTML = '<div class="error-state">Failed to load downlines</div>';
  });
}

function renderDownlines(data) {
  var el = document.getElementById("downlineContent");
  var pagEl = document.getElementById("dlPagination");
  var statsEl = document.getElementById("downlineStatsBar");
  if (!el) return;

  var downlines = data.downlines || [];
  var total = data.total || 0;
  var pages = data.pages || 1;
  var currentMonth = data.month || "";

  // Calculate stats
  var totalMonthlyVolume = 0;
  var totalMonthlyComm = 0;
  var totalAllComm = 0;
  for (var i = 0; i < downlines.length; i++) {
    totalMonthlyVolume += parseFloat(downlines[i].monthly_volume || 0);
    totalMonthlyComm += parseFloat(downlines[i].monthly_commission || 0);
    totalAllComm += parseFloat(downlines[i].total_commission || 0);
  }

  if (statsEl) {
    statsEl.innerHTML =
      '<span>👥 Total referrals: <strong>' + total + '</strong></span>' +
      '<span>📊 Monthly volume: <strong>$' + totalMonthlyVolume.toFixed(2) + '</strong></span>' +
      '<span>💰 Monthly commission: <strong>$' + totalMonthlyComm.toFixed(2) + '</strong></span>';
  }

  // Build month filter
  var monthFilterEl = document.getElementById("dlMonthFilterBar");
  if (monthFilterEl) {
    if (downlineMonths.length === 0) {
      // Generate recent months
      var d = new Date();
      for (var mi = 0; mi < 12; mi++) {
        var y = d.getFullYear();
        var m = d.getMonth() - mi;
        if (m < 0) { m += 12; y--; }
        downlineMonths.push(y + "-" + String(m + 1).padStart(2, "0"));
      }
    }
    var html = '<button class="filter-btn' + (currentDlMonth === "" ? " active" : "") + '" onclick="setDlMonth(\'\')">All</button>';
    for (var mj = 0; mj < downlineMonths.length; mj++) {
      var ym = downlineMonths[mj];
      var parts = ym.split("-");
      var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      var label = months[parseInt(parts[1]) - 1] + " " + parts[0];
      html += '<button class="filter-btn' + (currentDlMonth === ym ? " active" : "") + '" onclick="setDlMonth(\'' + ym + '\')">' + label + '</button>';
    }
    // Only show first 6 months, add "more" if needed
    monthFilterEl.innerHTML = html;
    // Show only first 6 + active (if beyond 6)
    var btns = monthFilterEl.querySelectorAll(".filter-btn");
    var activeIdx = -1;
    for (var bi = 0; bi < btns.length; bi++) {
      if (btns[bi].classList.contains("active")) activeIdx = bi;
      if (bi > 6 && bi !== activeIdx) btns[bi].style.display = "none";
    }
  }

  if (downlines.length === 0) {
    el.innerHTML = '<div class="empty-state">No downlines yet. Share your referral link to earn commissions!</div>';
    if (pagEl) pagEl.innerHTML = "";
    return;
  }

  var html = '<table class="dash-table"><thead><tr><th>Name</th><th>Joined</th><th>Monthly Volume</th><th>Monthly Comm</th><th>Total Comm</th></tr></thead><tbody>';
  for (var i2 = 0; i2 < downlines.length; i2++) {
    var dl = downlines[i2];
    var name = dl.name || "User";
    var joined = (dl.created_at || "").substring(0, 10);
    var mVol = parseFloat(dl.monthly_volume || 0).toFixed(2);
    var mComm = parseFloat(dl.monthly_commission || 0).toFixed(2);
    var tComm = parseFloat(dl.total_commission || 0).toFixed(2);
    html += '<tr><td><strong>' + escapeHtml(name) + '</strong></td><td style="color:#6a8a98;">' + joined + '</td>' +
      '<td>$' + mVol + '</td><td style="color:#0a7b7b;">$' + mComm + '</td><td style="color:#0a7b7b;font-weight:600;">$' + tComm + '</td></tr>';
  }
  html += '</tbody></table>';
  el.innerHTML = html;

  // Pagination
  if (pagEl) {
    var ph = "";
    ph += '<button class="page-btn" onclick="goDlPage(' + (currentDlPage - 1) + ')" ' + (currentDlPage <= 1 ? "disabled" : "") + '>‹ Prev</button>';
    for (var pi = 1; pi <= pages; pi++) {
      if (pages > 10 && pi > 3 && pi < pages - 2 && pi !== currentDlPage) {
        if (pi === 4) ph += '<button class="page-btn" disabled>...</button>';
        continue;
      }
      ph += '<button class="page-btn' + (pi === currentDlPage ? " active" : "") + '" onclick="goDlPage(' + pi + ')">' + pi + '</button>';
    }
    ph += '<button class="page-btn" onclick="goDlPage(' + (currentDlPage + 1) + ')" ' + (currentDlPage >= pages ? "disabled" : "") + '>Next ›</button>';
    pagEl.innerHTML = ph;
  }
}

function setDlMonth(month) {
  currentDlMonth = month;
  currentDlPage = 1;
  loadDownlines();
}

function goDlPage(page) {
  if (page < 1) return;
  currentDlPage = page;
  loadDownlines();
}

// ======================== UPLINE ========================
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

