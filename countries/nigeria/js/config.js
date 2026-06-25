// Nova Exchange - Global Configuration
// All config values in one place. Override via localStorage for testing.

(function() {
  window.NOVA_CONFIG = {
    SUPABASE_URL: "https://ecikviwuxfieryrmfgdq.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_qZmFog48wGY8aMzEzl3P2Q_bFktF5X3",
    API_BASE: "https://www.alh777.com",
    VERIFICATION_API_BASE: "https://www.alh777.com"
  };

  // Allow localStorage overrides (filter out old Railway URLs)
  try {
    var stored = localStorage.getItem("nova_api_base");
    if (stored && stored.indexOf("railway") === -1 && stored.indexOf("localhost") === -1 && stored.indexOf("127.0.0.1") === -1) {
      window.NOVA_CONFIG.API_BASE = stored;
    } else {
      try { localStorage.removeItem("nova_api_base"); } catch(e) {}
    }
    var storedV = localStorage.getItem("nova_verify_api_base");
    if (storedV && storedV.indexOf("railway") === -1 && storedV.indexOf("localhost") === -1 && storedV.indexOf("127.0.0.1") === -1) {
      window.NOVA_CONFIG.VERIFICATION_API_BASE = storedV;
    } else {
      try { localStorage.removeItem("nova_verify_api_base"); } catch(e) {}
    }
  } catch(e) {}

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

