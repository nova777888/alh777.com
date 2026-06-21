// Nova Exchange - API Configuration
// Configurable API base URL - defaults to Vercel production, can be overridden via localStorage

var SUPABASE_URL = "https://ecikviwuxfieryrmfgdq.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_qZmFog48wGY8aMzEzl3P2Q_bFktF5X3";

var API_BASE = (function() {
  try { return localStorage.getItem("nova_api_base") || "https://alh777-api.vercel.app"; }
  catch(e) { return "https://alh777-api.vercel.app"; }
})();

function setApiBase(url) {
  try { localStorage.setItem("nova_api_base", url); } catch(e) {}
  API_BASE = url;
}
