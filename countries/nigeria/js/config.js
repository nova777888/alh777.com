﻿// Nova Exchange - Global Configuration
// All config values in one place. Override via localStorage for testing.

(function() {
  window.NOVA_CONFIG = {
    SUPABASE_URL: \"https://ecikviwuxfieryrmfgdq.supabase.co\",
    SUPABASE_ANON_KEY: \"sb_publishable_qZmFog48wGY8aMzEzl3P2Q_bFktF5X3\",
    API_BASE: \"https://alh777-api.vercel.app\",
    VERIFICATION_API_BASE: \"https://alh777-api.vercel.app\"
  };

  // Allow localStorage overrides
  try {
    var stored = localStorage.getItem(\"nova_api_base\");
    if (stored) window.NOVA_CONFIG.API_BASE = stored;
    var storedV = localStorage.getItem(\"nova_verify_api_base\");
    if (storedV) window.NOVA_CONFIG.VERIFICATION_API_BASE = storedV;
  } catch(e) {}

  // Configurable setter for debugging
  window.setApiBase = function(url) {
    try { localStorage.setItem(\"nova_api_base\", url); } catch(e) {}
    window.NOVA_CONFIG.API_BASE = url;
  };
  window.setVerificationApiBase = function(url) {
    try { localStorage.setItem(\"nova_verify_api_base\", url); } catch(e) {}
    window.NOVA_CONFIG.VERIFICATION_API_BASE = url;
  };
})();
