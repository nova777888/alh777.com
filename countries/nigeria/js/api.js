// ============================================================
// Nova Exchange - API Module (api.js)
// Wraps all API calls with automatic token handling
// ============================================================

var API_BASE = (function() {
  try { return localStorage.getItem("nova_api_base") || "https://nova-api-production-f9f4.up.railway.app"; }
  catch(e) { return "https://nova-api-production-f9f4.up.railway.app"; }
})();

var SUPABASE_URL = "https://ecikviwuxfieryrmfgdq.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_qZmFog48wGY8aMzEzl3P2Q_bFktF5X3";

function getToken() {
  try { return localStorage.getItem("nova_token"); } catch(e) { return null; }
}
function setToken(token) {
  try { localStorage.setItem("nova_token", token); } catch(e) {}
}
function removeToken() {
  try { localStorage.removeItem("nova_token"); } catch(e) {}
}
function getUserData() {
  try { var raw = localStorage.getItem("nova_user"); return raw ? JSON.parse(raw) : null; }
  catch(e) { return null; }
}
function setUserData(user) {
  try { localStorage.setItem("nova_user", JSON.stringify(user)); } catch(e) {}
}
function clearUserData() {
  try { localStorage.removeItem("nova_user"); localStorage.removeItem("nova_token"); } catch(e) {}
}
function isLoggedIn() {
  return !!getToken();
}

function apiCall(method, path, body) {
  var url = API_BASE + path;
  var options = { method: method, headers: { "Content-Type": "application/json" } };
  var token = getToken();
  if (token) options.headers["Authorization"] = "Bearer " + token;
  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }
  return fetch(url, options).then(function(r) { return r.json(); });
}

function setApiBase(url) {
  try { localStorage.setItem("nova_api_base", url); } catch(e) {}
  API_BASE = url;
}
