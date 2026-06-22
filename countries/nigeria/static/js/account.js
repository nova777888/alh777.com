function escapeHtml(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\x22/g, "&#34;")
    .replace(/'/g, "&#39;");
}

var currentTxnPage = 1;
var currentTxnFilter = "all";
var currentDlPage = 1;
var currentDlMonth = "";
var allTransactions = [];
var allCommissions = [];
var allDownlines = [];
var downlineMonths = [];
var _profileTimeout;

function initAccountPage() {
  if (!isLoggedIn()) {
    showToast("Please sign in first", "error");
    setTimeout(function() { window.location.href = "Nigeria.html"; }, 1000);
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

function loadProfile() {
  _profileTimeout = setTimeout(function() {
    var el = document.getElementById("profileHeader");
    if (el && el.innerHTML.indexOf("loading-state") > -1) {
      el.innerHTML = "<div class="error-state">Could not load profile. <button onclick="location.reload()" class="dash-btn" style="margin-top:8px;">Refresh</button></div>";
    }
  }, 10000);

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
    if (el) el.innerHTML = "<div class="error-state">Failed to load profile</div>";
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
  var avatarColor = getAvatarColor ? getAvatarColor(user.email || user.phone || user.id) : "#0a7b7b";
  var displayEmail = email && email.indexOf("@nogin.nova.local") === -1 && email.indexOf("@nova.local") === -1 ? email : "";
  var joinedDate = joined ? new Date(joined).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A";

  var headerEl = document.getElementById("profileHeader");
  if (headerEl) {
    headerEl.innerHTML =
      "<div class="profile-avatar" style="background:" + avatarColor + ";">" + avatarLetter + "</div>" +
      "<div class="profile-info">" +
        "<h1>" + escapeHtml(name) + "</h1>" +
        "<div class="meta">" + (displayEmail || "No email") + " &middot; Joined " + joinedDate + "</div>" +
      "</div>";
  }

  var detailsEl = document.getElementById("profileDetails");
  if (detailsEl) {
    detailsEl.innerHTML =
      "<div class="item"><div class="label">&#128241; Phone</div><div class="value">" + escapeHtml(phone) + "</div></div>" +
      "<div class="item"><div class="label">&#128195; Referral ID</div><div class="value">" + escapeHtml(refId) + "</div></div>" +
      "<div class="item"><div class="label">&#128081; Role</div><div class="value">" + escapeHtml(user.role || "Customer") + "</div></div>" +
      (displayEmail ? "<div class="item"><div class="label">&#9993;&#65039; Email</div><div class="value">" + escapeHtml(displayEmail) + "</div></div>" : "<div class="item"><div class="label">&#9993;&#65039; Email</div><div class="value" style="color:#8aaeb9;">Not bound</div></div>");
  }
}

function loadDashboard() {
  apiCall("GET", "/api/me/dashboard").then(function(data) {
    var dash = data.data || data;
    if (dash) {
      renderCommissionGrid(dash);
      renderTodayPerformance(dash);
    }
  }).catch(function() {
    var el = document.getElementById("commissionGrid");
    if (el) el.innerHTML = "<div class="error-state" style="grid-column:1/-1;">Failed to load dashboard</div>";
  });
}

function renderCommissionGrid(dash) {
  if (!dash) return;
  var el = document.getElementById("commissionGrid");
  if (!el) return;

  var pending = parseFloat(dash.available_balance || dash.pending_balance || 0).toFixed(2);
  var totalEarned = parseFloat(dash.total_earned || 0).toFixed(2);
  var monthComm = parseFloat(dash.pending_commission || dash.month_commission || 0).toFixed(2);

  el.innerHTML =
    "<div class="comm-card" onclick="showCommissionDetail(&#39;pending&#39;)" title="Click to see details">" +
      "<div class="amount">$" + pending + "</div>" +
      "<div class="label">&#127973; Pending Settlement</div>" +
      "<div class="sub-label">Settles on 1st of next month</div>" +
    "</div>" +
    "<div class="comm-card" onclick="showCommissionDetail(&#39;earned&#39;)" title="Click to see monthly breakdown">" +
      "<div class="amount">$" + totalEarned + "</div>" +
      "<div class="label">&#128176; Total Income</div>" +
      "<div class="sub-label">All time commissions</div>" +
    "</div>" +
    "<div class="comm-card" onclick="showCommissionDetail(&#39;month&#39;)" title="Click to see this month">" +
      "<div class="amount">$" + monthComm + "</div>" +
      "<div class="label">&#128197; Monthly Commission</div>" +
      "<div class="sub-label">" + getMonthLabel() + " &middot; Settles on 1st</div>" +
    "</div>";
}

function getMonthLabel() {
  var d = new Date();
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function renderTodayPerformance(dash) {
  if (!dash) return;
  var el = document.getElementById("todayContent");
  if (!el) return;

  var todayVol = parseFloat(dash.today_volume || dash.todayVolume || 0).toFixed(2);
  var yesterdayVol = parseFloat(dash.yesterday_volume || dash.yesterdayVolume || 0).toFixed(2);
  var change = (parseFloat(dash.today_volume || 0) - parseFloat(dash.yesterday_volume || 0)).toFixed(2);
  var changeClass = change > 0 ? "today-pos" : (change < 0 ? "today-neg" : "today-neutral");
  var changeIcon = change > 0 ? "&#9650;" : (change < 0 ? "&#9660;" : "&mdash;");

  el.innerHTML =
    "<div class="today-grid">" +
      "<div class="today-item" onclick="showTodayCommissions()" style="cursor:pointer;" title="Click for details">" +
        "<div class="amount today-pos">$" + todayVol + "</div>" +
        "<div class="label">&#128200; Today&#39;s Commission</div>" +
      "</div>" +
      "<div class="today-item">" +
        "<div class="amount " + changeClass + "">$" + yesterdayVol + "</div>" +
        "<div class="label">&#128201; Yesterday&#39;s Commission</div>" +
        "<div class="change-badge " + changeClass + "">" + changeIcon + " $" + Math.abs(change).toFixed(2) + "</div>" +
      "</div>" +
    "</div>";
}

function loadAllTransactions() {
  var results = [];
  var page = 1;
  var totalPages = 1;

  function fetchPage() {
    apiCall("GET", "/api/me/transactions?page=" + page + "&limit=50").then(function(data) {
      var txns = data.transactions || data.data || [];
      totalPages = data.totalPages || data.total_pages || 1;
      results = results.concat(txns);
      if (page < totalPages) {
        page++;
        fetchPage();
      } else {
        allTransactions = results;
        renderTransactions();
      }
    }).catch(function() {
      renderTransactions();
    });
  }

  fetchPage();
}

function renderTransactions() {
  var contentEl = document.getElementById("txnContent");
  var filterBar = document.getElementById("txnFilterBar");
  var pagEl = document.getElementById("txnPagination");
  if (!contentEl) return;

  var filters = ["all", "deposit", "withdrawal", "commission", "exchange"];
  var labels = { all: "All", deposit: "&#128179; Deposit", withdrawal: "&#128184; Withdrawal", commission: "&#128176; Commission", exchange: "&#128260; Exchange" };

  if (filterBar) {
    filterBar.innerHTML = filters.map(function(f) {
      return "<button class="filter-btn" + (currentTxnFilter === f ? " active" : "") + "" onclick="setTxnFilter(&#39;" + f + "&#39;)">" + (labels[f] || f) + "</button>";
    }).join("");
  }

  var filtered = allTransactions;
  if (currentTxnFilter !== "all") {
    filtered = allTransactions.filter(function(t) {
      var type = (t.type || t.txn_type || t.category || "").toLowerCase();
      return type.indexOf(currentTxnFilter) > -1;
    });
  }

  if (filtered.length === 0) {
    contentEl.innerHTML = "<div class="empty-state">No transactions yet. <a href="./Nigeria.html" style="color:#0a7b7b;">Start trading</a></div>";
    if (pagEl) pagEl.innerHTML = "";
    return;
  }

  var groups = {};
  filtered.forEach(function(t) {
    var d = new Date(t.created_at || t.date || t.time);
    var ym = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    if (!groups[ym]) groups[ym] = [];
    groups[ym].push(t);
  });

  var sortedYM = Object.keys(groups).sort().reverse();
  var now = new Date();
  var recent3 = [];
  for (var i = 0; i < 3; i++) {
    var m = now.getMonth() + 1 - i;
    var y = now.getFullYear();
    if (m <= 0) { m += 12; y--; }
    recent3.push(y + "-" + String(m).padStart(2, "0"));
  }

  function getStatusBadge(s) {
    var st = (s || "").toLowerCase();
    if (st === "success" || st === "completed" || st === "settled") return "<span class="status-badge status-success">&#9989; Success</span>";
    if (st === "pending" || st === "processing" || st === "in_progress") return "<span class="status-badge status-pending">&#128260; Processing</span>";
    if (st === "failed" || st === "cancelled" || st === "rejected") return "<span class="status-badge status-failed">&#10060; Failed</span>";
    return "<span class="status-badge">" + escapeHtml(s || "&mdash;") + "</span>";
  }

  function getTypeLabel(t) {
    var type = (t.type || t.txn_type || t.category || "").toLowerCase();
    var icons = { deposit: "&#128179; Deposit", withdrawal: "&#128184; Withdrawal", commission: "&#128176; Commission", exchange: "&#128260; Exchange", payment: "&#128179; Payment", purchase: "&#128722; Purchase" };
    return icons[type.replace(/[^a-z]/g,"")] || escapeHtml(t.type || t.txn_type || t.category || "Transaction");
  }

  var html = "";
  sortedYM.forEach(function(ym) {
    var label = new Date(ym + "-01").toLocaleString("en-US", { month: "long", year: "numeric" });
    var isExpanded = recent3.indexOf(ym) > -1;
    var txns = groups[ym];
    var totalAmt = 0;
    txns.forEach(function(tx) { totalAmt += parseFloat(tx.amount || 0); });

    html += "<div class="month-group">";
    html += "<div class="month-header" + (isExpanded ? " expanded" : "") + "" onclick="toggleMonth(this)">";
    html += "<span class="month-label">" + label + "</span>";
    html += "<span class="month-count">" + txns.length + " txns</span>";
    html += "<span class="month-total">$" + totalAmt.toFixed(2) + "</span>";
    html += "<span class="month-arrow">" + (isExpanded ? "&#9650;" : "&#9660;") + "</span>";
    html += "</div>";

    if (isExpanded) {
      html += "<div class="month-body">";
      html += "<table class="dash-table"><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>";
      txns.forEach(function(tx) {
        var date = (tx.created_at || tx.date || tx.time || "").substring(0, 10);
        var amt = parseFloat(tx.amount || 0);
        var amtClass = amt >= 0 ? "amount-pos" : "amount-neg";
        html += "<tr><td>" + escapeHtml(date) + "</td><td>" + getTypeLabel(tx) + "</td><td class="" + amtClass + "">$" + Math.abs(amt).toFixed(2) + "</td><td>" + getStatusBadge(tx.status) + "</td></tr>";
      });
      html += "</tbody></table></div>";
    }

    html += "</div>";
  });

  contentEl.innerHTML = html;
  if (pagEl) pagEl.innerHTML = "";
}

function setTxnFilter(filter) {
  currentTxnFilter = filter;
  renderTransactions();
}

function toggleMonth(header) {
  var group = header.closest ? header.closest(".month-group") : header.parentNode;
  var body = group.querySelector(".month-body");
  if (body) {
    if (body.style.display === "none" || !body.style.display || body.style.display === "") {
      body.style.display = "block";
      header.classList.add("expanded");
      header.querySelector(".month-arrow").textContent = "\u25B2";
    } else {
      body.style.display = "none";
      header.classList.remove("expanded");
      header.querySelector(".month-arrow").textContent = "\u25BC";
    }
  }
}

function loadCommissions() {
  allCommissions = [];
  apiCall("GET", "/api/me/commissions?limit=200").then(function(data) {
    allCommissions = data.commissions || data.data || [];
  }).catch(function() {});
}

function showCommissionDetail(type) {
  if (!allCommissions || allCommissions.length === 0) {
    showToast("No commission data available", "info");
    return;
  }

  var html = "<div class="modal-header"><h3>";

  if (type === "pending") {
    html += "&#128176; Pending Settlement Details";
    html += "</h3><button onclick="closeModal(this.closest(&#39;.nova-modal-overlay&#39;))" class="modal-close">&#10005;</button></div>";
    html += "<div class="modal-body">";
    var unpaid = allCommissions.filter(function(c) {
      var st = (c.status || "").toLowerCase();
      return st !== "settled" && st !== "completed";
    });

    if (unpaid.length === 0) {
      html += "<div class="empty-state">All commissions have been settled! &#127881;</div>";
    } else {
      var groups = {};
      unpaid.forEach(function(c) {
        var d = new Date(c.created_at || c.date);
        var ym = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
        if (!groups[ym]) groups[ym] = 0;
        groups[ym] += parseFloat(c.amount || 0);
      });

      var sorted = Object.keys(groups).sort().reverse();
      html += "<table class="dash-table"><thead><tr><th>Month</th><th>Amount</th><th>Status</th></tr></thead><tbody>";
      sorted.forEach(function(ym) {
        html += "<tr><td>" + ym + "</td><td style="font-weight:600;color:#f39c12;">$" + groups[ym].toFixed(2) + "</td><td><span class="status-badge status-pending">&#128260; Pending</span></td></tr>";
      });
      html += "</tbody></table>";
    }
  } else if (type === "earned") {
    html += "&#128202; Monthly Income Breakdown";
    html += "</h3><button onclick="closeModal(this.closest(&#39;.nova-modal-overlay&#39;))" class="modal-close">&#10005;</button></div>";
    html += "<div class="modal-body">";
    var groups = {};
    allCommissions.forEach(function(c) {
      var d = new Date(c.created_at || c.date);
      var ym = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      if (!groups[ym]) groups[ym] = 0;
      groups[ym] += parseFloat(c.amount || 0);
    });

    var sorted = Object.keys(groups).sort().reverse();
    if (sorted.length === 0) {
      html += "<div class="empty-state">No commission records yet</div>";
    } else {
      html += "<table class="dash-table"><thead><tr><th>Month</th><th>Total Commission</th></tr></thead><tbody>";
      sorted.forEach(function(ym) {
        html += "<tr><td>" + ym + "</td><td style="font-weight:600;color:#0a7b7b;">$" + groups[ym].toFixed(2) + "</td></tr>";
      });
      html += "</tbody></table>";
    }
  } else if (type === "month") {
    html += "&#128197; This Month&#39;s Commission";
    html += "</h3><button onclick="closeModal(this.closest(&#39;.nova-modal-overlay&#39;))" class="modal-close">&#10005;</button></div>";
    html += "<div class="modal-body">";
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    var nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    var thisMonth = allCommissions.filter(function(c) {
      var d = c.created_at || c.date || "";
      return d >= monthStart && d < nextMonth;
    });

    if (thisMonth.length === 0) {
      html += "<div class="empty-state">No commissions this month yet. Keep trading! &#128170;</div>";
    } else {
      html += "<table class="dash-table"><thead><tr><th>Date</th><th>Source</th><th>Amount</th><th>Status</th></tr></thead><tbody>";
      thisMonth.forEach(function(c) {
        var date = (c.created_at || c.date || "").substring(0, 10);
        var source = c.downline_name || c.source || c.description || "Referral";
        var amt = parseFloat(c.amount || 0);
        var st = (c.status || "").toLowerCase();
        var statusBadge = st === "settled" || st === "completed" ? "<span class="status-badge status-success">&#9989; Settled</span>" : "<span class="status-badge status-pending">&#128260; Pending</span>";
        html += "<tr><td>" + escapeHtml(date) + "</td><td>" + escapeHtml(source) + "</td><td style="font-weight:600;color:#0a7b7b;">$" + amt.toFixed(2) + "</td><td>" + statusBadge + "</td></tr>";
      });
      html += "</tbody></table>";
    }
  }

  html += "</div>";
  showModalPopup(html);
}

function showTodayCommissions() {
  if (!allCommissions || allCommissions.length === 0) {
    showToast("No commissions today. Keep sharing your referral link! &#128640;", "info");
    return;
  }

  var now = new Date();
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  var todayComms = allCommissions.filter(function(c) {
    return (c.created_at || c.date || "") >= todayStart;
  });

  var html = "<div class="modal-header"><h3>&#128200; Today&#39;s Commission Details</h3><button onclick="closeModal(this.closest(&#39;.nova-modal-overlay&#39;))" class="modal-close">&#10005;</button></div>";
  html += "<div class="modal-body">";

  if (todayComms.length === 0) {
    html += "<div class="empty-state">No commissions earned today. Keep sharing your referral link! &#128640;</div>";
  } else {
    var totalToday = 0;
    todayComms.forEach(function(c) { totalToday += parseFloat(c.amount || 0); });
    html += "<div style="text-align:center;margin-bottom:16px;"><span style="font-size:28px;font-weight:800;color:#0a7b7b;">$" + totalToday.toFixed(2) + "</span><span style="display:block;font-size:13px;color:#6a8a98;">earned today from " + todayComms.length + " referral(s)</span></div>";
    html += "<table class="dash-table"><thead><tr><th>Time</th><th>Source</th><th>Amount</th></tr></thead><tbody>";
    todayComms.forEach(function(c) {
      var time = (c.created_at || c.date || "").substring(11, 19);
      var source = c.downline_name || c.source || c.description || "Referral";
      html += "<tr><td>" + escapeHtml(time) + "</td><td>" + escapeHtml(source) + "</td><td style="font-weight:600;color:#0a7b7b;">$" + parseFloat(c.amount || 0).toFixed(2) + "</td></tr>";
    });
    html += "</tbody></table>";
  }

  html += "</div>";
  showModalPopup(html);
}

function checkUpline(user) {
  var el = document.getElementById("uplineSection");
  if (!el) return;
  var referredBy = user.referred_by || user.referrer_id || null;
  if (!referredBy) {
    el.innerHTML = "<div class="upline-empty">You haven&#39;t been referred by anyone yet. <a href="./Nigeria.html" style="color:#0a7b7b;">Start trading</a></div>";
    return;
  }
  try {
    var sb = supabase.createClient(
      "https://ecikviwuxfieryrmfgdq.supabase.co",
      "sb_publishable_qZmFog48wGY8aMzEzl3P2Q_bFktF5X3"
    );
    sb.from("users").select("name, email, phone, created_at").eq("id", referredBy).single().then(function(res) {
      var ref = res.data;
      if (ref) {
        var refName = ref.name || ref.email || "Referrer";
        var avatarLetter = (refName.charAt(0) || "?").toUpperCase();
        var colors = ["#0a7b7b","#d32f2f","#1976d2","#388e3c","#f57c00"];
        var color = colors[Math.abs((referredBy.charCodeAt(0) || 0)) % colors.length];
        el.innerHTML =
          "<div class="upline-card">" +
            "<div class="upline-avatar" style="background:" + color + ";">" + avatarLetter + "</div>" +
            "<div class="upline-info">" +
              "<div class="name">&#128100; " + escapeHtml(refName) + "</div>" +
              "<div class="detail">Joined " + (ref.created_at || "").substring(0, 10) + " &middot; Your referrer</div>" +
            "</div>" +
          "</div>";
      }
    });
  } catch(e) {
    el.innerHTML = "<div style="font-size:13px;color:#8aaeb9;padding:8px 0;">You have a referrer (ID: " + escapeHtml(referredBy) + ")</div>";
  }
}

function loadDownlines() {
  var query = "/api/me/downlines?page=" + currentDlPage + "&limit=10";
  if (currentDlMonth) query += "&month=" + currentDlMonth;

  apiCall("GET", query).then(function(data) {
    allDownlines = data.downlines || data.data || [];
    downlineMonths = data.months || [];
    renderDownlines(data);
  }).catch(function() {
    var el = document.getElementById("downlineContent");
    if (el) el.innerHTML = "<div class="error-state">Failed to load downlines</div>";
  });
}

function renderDownlines(data) {
  var contentEl = document.getElementById("downlineContent");
  var filterBar = document.getElementById("dlMonthFilterBar");
  var pagEl = document.getElementById("dlPagination");
  var statsBar = document.getElementById("downlineStatsBar");
  if (!contentEl) return;

  var downlines = data.downlines || data.data || [];
  var total = data.total || 0;
  var pages = data.pages || 1;
  var page = data.page || currentDlPage;

  if (statsBar) {
    var totalComm = 0;
    var monthVol = 0;
    downlines.forEach(function(dl) {
      totalComm += parseFloat(dl.total_commission || 0);
      monthVol += parseFloat(dl.monthly_volume || 0);
    });
    statsBar.innerHTML =
      "<span>&#128101; <strong>" + total + "</strong> Referrals</span>" +
      "<span>&#128202; <strong>$" + monthVol.toFixed(2) + "</strong> Monthly Volume</span>" +
      "<span>&#128176; <strong>$" + totalComm.toFixed(2) + "</strong> Total Commission</span>";
  }

  if (filterBar) {
    var months = {};
    (data.downlines || []).forEach(function(dl) {
      var d = new Date(dl.created_at || "");
      if (d.getTime()) {
        var ym = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
        months[ym] = true;
      }
    });
    var sortedMonths = Object.keys(months).sort().reverse();

    var filterHtml = "<button class="filter-btn" + (currentDlMonth === "" ? " active" : "") + "" onclick="setDlMonth(&#39;&#39;)">All</button>";
    sortedMonths.forEach(function(ym) {
      var label = new Date(ym + "-01").toLocaleString("en-US", { month: "short", year: "numeric" });
      filterHtml += "<button class="filter-btn" + (currentDlMonth === ym ? " active" : "") + "" onclick="setDlMonth(&#39;" + ym + "&#39;)">" + label + "</button>";
    });
    filterBar.innerHTML = filterHtml;
  }

  if (downlines.length === 0) {
    contentEl.innerHTML = "<div class="empty-state">No referrals yet. Share your referral link to earn commissions!</div>";
    if (pagEl) pagEl.innerHTML = "";
    return;
  }

  var html = "<table class="dash-table"><thead><tr><th>Name</th><th>Joined</th><th>Monthly Volume</th><th>Monthly Commission</th><th>Total Commission</th></tr></thead><tbody>";
  downlines.forEach(function(dl) {
    var dlName = dl.name || dl.email || "User";
    var joined = (dl.created_at || "").substring(0, 10);
    var mVol = parseFloat(dl.monthly_volume || 0).toFixed(2);
    var mComm = parseFloat(dl.monthly_commission || 0).toFixed(2);
    var tComm = parseFloat(dl.total_commission || 0).toFixed(2);
    html += "<tr><td>" + escapeHtml(dlName) + "</td><td>" + escapeHtml(joined) + "</td><td>$" + mVol + "</td><td>$" + mComm + "</td><td style="font-weight:600;color:#0a7b7b;">$" + tComm + "</td></tr>";
  });
  html += "</tbody></table>";
  contentEl.innerHTML = html;

  if (pagEl) {
    if (pages <= 1) { pagEl.innerHTML = ""; return; }
    var ph = "<button class="page-btn" onclick="goDlPage(" + (page - 1) + ")" " + (page <= 1 ? "disabled" : "") + ">&#8249; Prev</button>";
    for (var pi = 1; pi <= pages; pi++) {
      if (pi === 1 || pi === pages || Math.abs(pi - page) <= 1) {
        ph += "<button class="page-btn" + (pi === page ? " active" : "") + "" onclick="goDlPage(" + pi + ")">" + pi + "</button>";
      } else if (Math.abs(pi - page) === 2) {
        ph += "<span class="page-dots">...</span>";
      }
    }
    ph += "<button class="page-btn" onclick="goDlPage(" + (page + 1) + ")" " + (page >= pages ? "disabled" : "") + ">Next &#8250;</button>";
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

function loadSettings() {
  var user = getUserData();
  if (!user) return;
  var refId = user.referral_code || user.public_id || (user.id ? user.id.substring(0, 6).toUpperCase() : "");
  var refInput = document.getElementById("refLinkDisplay");
  if (refInput) {
    refInput.value = "https://www.alh777.com/vip.html?ref=" + refId;
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

  var btn = document.querySelector(".settings-card:last-of-type .dash-btn, .pw-fields + .dash-btn");
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

function showModalPopup(html) {
  var existing = document.querySelector(".nova-modal-overlay");
  if (existing) existing.remove();
  var overlay = document.createElement("div");
  overlay.className = "nova-modal-overlay";
  overlay.innerHTML = "<div class="nova-modal">" + html + "</div>";
  document.body.appendChild(overlay);
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) closeModal(overlay);
  });
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

function sendBindCode() {
  var email = document.getElementById("accBindEmail");
  if (!email) return;
  var emailVal = email.value.trim();
  var btn = document.getElementById("accSendBindCodeBtn");
  if (!btn) return;
  if (typeof sendBindEmailCode === "function") {
    sendBindEmailCode(emailVal, btn).catch(function(err) {});
  }
}

function verifyBindEmail() {
  var emailEl = document.getElementById("accBindEmail");
  var codeEl = document.getElementById("accBindCode");
  var msgEl = document.getElementById("bindMessage");
  if (!emailEl || !codeEl || !msgEl) return;
  var email = emailEl.value.trim();
  var code = codeEl.value.trim();
  if (!email) { msgEl.innerHTML = "Please enter your email"; return; }
  if (!code) { msgEl.innerHTML = "Please enter the verification code"; return; }
  if (!_bindVerifyToken) { msgEl.innerHTML = "Please send verification code first"; return; }

  verifyBindEmailCode(code).then(function() {
    return apiCall("POST", "/api/me/bind-email", { email: email, code: code, verifyToken: _bindVerifyToken });
  }).then(function(data) {
    if (data.success || data.message) {
      msgEl.innerHTML = "";
      showToast("Email bound successfully!", "success");
      return refreshUserData();
    } else {
      msgEl.innerHTML = "Failed to bind email";
      showToast(data.error && (typeof data.error === "string" ? data.error : data.error.message) || "Failed to bind email", "error");
    }
  }).catch(function(err) {
    if (err && err.message) msgEl.innerHTML = err.message;
    else msgEl.innerHTML = "Verification failed";
  });
}

function getAvatarColor(str) {
  if (!str) return "#0a7b7b";
  var colors = ["#0a7b7b","#1976d2","#388e3c","#d32f2f","#f57c00","#6a1b9a","#00838f"];
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

document.addEventListener("DOMContentLoaded", initAccountPage);