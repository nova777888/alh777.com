// ============================================================
// Nova Exchange - Utilities Module (utils.js)
// Math captcha, toast, formatters, etc.
// ============================================================

// Math Captcha
function generateMathCaptcha() {
  var a = Math.floor(Math.random() * 9) + 1;
  var b = Math.floor(Math.random() * 9) + 1;
  var op = Math.random() < 0.5 ? "+" : "-";
  // Ensure non-negative result for subtraction
  if (op === "-" && a < b) { var t = a; a = b; b = t; }
  var answer = op === "+" ? a + b : a - b;
  return { question: a + " " + op + " " + b + " = ?", answer: answer };
}

// Toast notifications
function showToast(msg, type) {
  type = type || "info";
  var existing = document.querySelector(".nova-toast");
  if (existing) existing.remove();
  var toast = document.createElement("div");
  toast.className = "nova-toast";
  var bgColor = type === "success" ? "#0a7b7b" : type === "error" ? "#d32f2f" : "#0a1c2f";
  toast.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999999;background:" + bgColor + ";color:white;padding:14px 28px;border-radius:12px;font-size:14px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,0.2);max-width:90%;text-align:center;animation:fadeInDown 0.3s ease;font-family:Montserrat,Inter,sans-serif;";
  toast.textContent = msg;
  document.body.appendChild(toast);
  if (!document.getElementById("nova-toast-style")) {
    var s = document.createElement("style"); s.id = "nova-toast-style";
    s.textContent = "@keyframes fadeInDown{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes fadeInOverlay{from{opacity:0}to{opacity:1}}";
    document.head.appendChild(s);
  }
  setTimeout(function() {
    toast.style.opacity = "0"; toast.style.transition = "opacity 0.3s ease";
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getAvatarLetter(user) {
  if (!user) return "?";
  var name = user.name || user.username || user.email || user.phone || "";
  return name.charAt(0).toUpperCase() || "?";
}

function getAvatarColor(seed) {
  var colors = ["#0a7b7b","#d32f2f","#1976d2","#388e3c","#f57c00","#7b1fa2","#00838f","#c62828","#2e7d32","#6a1b9a","#e65100","#1565c0"];
  var hash = 0;
  if (seed) { for (var i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash); }
  return colors[Math.abs(hash) % colors.length];
}

function startCountdown(btn, seconds) {
  var remaining = seconds;
  var interval = setInterval(function() {
    remaining--;
    if (remaining <= 0) { clearInterval(interval); btn.disabled = false; btn.textContent = "Send Code"; }
    else { btn.textContent = remaining + "s"; }
  }, 1000);
}
