// Nova Exchange - Global Configuration
// All config values in one place. Override via localStorage for testing.

(function() {
  window.NOVA_CONFIG = {
    SUPABASE_URL: "https://ecikviwuxfieryrmfgdq.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_qZmFog48wGY8aMzEzl3P2Q_bFktF5X3",
    API_BASE: "https://api.alh777.com",
    VERIFICATION_API_BASE: "https://api.alh777.com"
  };

  // Allow localStorage overrides (check only, don't override)
  // API_BASE and VERIFICATION_API_BASE are fixed; localStorage overrides removed
  // to prevent stale values breaking authentication.

  // Configurable setter for debugging
  window.setApiBase = function(url) {
    try { localStorage.setItem("nova_api_base", url); } catch(e) {}
    window.NOVA_CONFIG.API_BASE = url;
  };
  window.setVerificationApiBase = function(url) {
    try { localStorage.setItem("nova_verify_api_base", url); } catch(e) {}
    window.NOVA_CONFIG.VERIFICATION_API_BASE = url;
  };
})();

