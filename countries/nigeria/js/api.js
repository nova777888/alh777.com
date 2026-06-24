// Nova Exchange - API Configuration (Legacy compatibility)
// Reads from config.js. All new code should use window.NOVA_CONFIG directly.
(function() {
  var cfg = window.NOVA_CONFIG || {};
  window.SUPABASE_URL = cfg.SUPABASE_URL || "https://ecikviwuxfieryrmfgdq.supabase.co";
  window.SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY || "sb_publishable_qZmFog48wGY8aMzEzl3P2Q_bFktF5X3";
  window.API_BASE = cfg.API_BASE || "https://www.alh777.com";
})();

