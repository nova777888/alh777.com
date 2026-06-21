// Nova Exchange - Utility Functions
// Shared helpers used across the app.

function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function formatCurrency(amount) {
  return "$" + parseFloat(amount || 0).toFixed(2);
}

function getQueryParam(name) {
  name = name.replace(/[[]/, "\\[").replace(/[]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
