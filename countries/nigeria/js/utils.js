// Nova Exchange - Utility Functions
// Note: showToast, startCountdown, getAvatarLetter, getAvatarColor are also defined in auth.js
// (loaded after this file) and will override these if called from auth context.
// Unique functions below: escapeHtml, generateMathCaptcha

function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function generateMathCaptcha() {
  var a = Math.floor(Math.random() * 9) + 1;
  var b = Math.floor(Math.random() * 9) + 1;
  if (a < b) { var t = a; a = b; b = t; }
  return { question: a + " - " + b + " = ?", answer: a - b };
}
