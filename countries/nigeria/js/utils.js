// Nova Exchange - Utilities
function showToast(msg, type) {
  type = type || "info";
  var e = document.querySelector(".nova-toast"); if (e) e.remove();
  var t = document.createElement("div"); t.className = "nova-toast";
  var bg = type === "success" ? "#0a7b7b" : type === "error" ? "#d32f2f" : "#0a1c2f";
  t.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999999;background:" + bg + ";color:white;padding:14px 28px;border-radius:12px;font-size:14px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,0.2);max-width:90%;text-align:center;animation:fadeInDown 0.3s ease;font-family:Montserrat,Inter,sans-serif;";
  t.textContent = msg; document.body.appendChild(t);
  if (!document.getElementById("nts")) { var s = document.createElement("style"); s.id = "nts"; s.textContent = "@keyframes fadeInDown{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes fadeInOverlay{from{opacity:0}to{opacity:1}}"; document.head.appendChild(s); }
  setTimeout(function() { t.style.opacity = "0"; t.style.transition = "opacity 0.3s ease"; setTimeout(function() { t.remove(); }, 300); }, 3000);
}

function getAvatarLetter(u) { if (!u) return "?"; return (u.name || u.username || u.email || u.phone || "").charAt(0).toUpperCase() || "?"; }
function getAvatarColor(s) { var c = ["#0a7b7b","#d32f2f","#1976d2","#388e3c","#f57c00","#7b1fa2","#00838f","#c62828","#2e7d32","#6a1b9a","#e65100","#1565c0"]; var h = 0; if (s) { for (var i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h); } return c[Math.abs(h) % c.length]; }
function escapeHtml(s) { if (!s) return ""; return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function startCountdown(btn, sec) { var r = sec; var i = setInterval(function() { r--; if (r <= 0) { clearInterval(i); btn.disabled = false; btn.textContent = "Send Code"; } else { btn.textContent = r + "s"; } }, 1000); }
function generateMathCaptcha() { var a = Math.floor(Math.random() * 9) + 1; var b = Math.floor(Math.random() * 9) + 1; if (a < b) { var t = a; a = b; b = t; } return { question: a + " - " + b + " = ?", answer: a - b }; }
