// Nova Exchange - Shared Layout
// Injects common header/nav HTML and global CSS into any page that includes this script.
// Pages must have: <div class="header-auth-right"></div> for auth buttons
//                   <div class="container"> for page content

(function() {
  // --- Shared CSS (injected once) ---
  var sharedCSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #f8fafc;
  font-family: 'Montserrat', 'Inter', sans-serif;
  padding: 2rem 1rem;
  color: #0a1c2f;
}
.container { max-width: 1400px; margin: 0 auto; }

/* Header */
.site-header {
  border-bottom: 1px solid rgba(10,123,123,0.1);
  padding: 16px 0;
  background: white;
  margin-bottom: 2rem;
}
.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.logo { font-size: 26px; font-weight: 700; color: #0a1c2f; text-decoration: none; }
.logo span { color: #0a7b7b; }
.nav-links { display: flex; gap: 10px; flex-wrap: wrap; }
.nav-btn {
  padding: 6px 18px;
  background: #f0f7fa;
  border-radius: 40px;
  font-weight: 600;
  color: #0a1c2f;
  font-size: 13px;
  text-decoration: none;
  transition: 0.2s;
}
.nav-btn:hover { background: #e2ecef; }
.nav-btn.active { background: #0a7b7b; color: white; }
.tg-header {
  background: #26A5E4;
  color: white;
  padding: 6px 18px;
  border-radius: 40px;
  font-weight: 600;
  font-size: 13px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: 0.2s;
}
.tg-header:hover { background: #1e8ec4; transform: translateY(-1px); }

/* Auth buttons in header */
.auth-buttons { display: flex; align-items: center; gap: 8px; }
.auth-btn { padding: 6px 16px; border-radius: 40px; font-weight: 600; font-size: 12px; cursor: pointer; transition: 0.2s; border: none; font-family: inherit; }
.auth-btn-login { background: #f0f7fa; color: #0a1c2f; } .auth-btn-login:hover { background: #e2ecef; }
.auth-btn-register { background: #0a7b7b; color: white; } .auth-btn-register:hover { background: #086868; }
.auth-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 16px; cursor: pointer; transition: 0.2s; user-select: none; }
.auth-avatar:hover { transform: scale(1.05); }
.auth-user-dropdown { position: relative; display: inline-block; }
.auth-dropdown-menu { display: none; position: absolute; top: 44px; right: 0; background: white; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); min-width: 160px; z-index: 99999; overflow: hidden; }
.auth-dropdown-item { padding: 12px 16px; font-size: 13px; font-weight: 500; color: #0a1c2f; cursor: pointer; transition: 0.1s; }
.auth-dropdown-item:hover { background: #f0f7fa; }
.auth-dropdown-divider { height: 1px; background: #eef2f4; margin: 0; }
.header-auth-right { display: flex; align-items: center; gap: 8px; }

/* Back link */
.back-link { text-align: center; margin: 32px 0; }
.back-link a { color: #4a6a78; font-size: 14px; text-decoration: none; }
.back-link a:hover { color: #0a7b7b; }

/* Floating contact buttons */
.contact-float-wrapper { position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 9999; }
.whatsapp-float, .telegram-float { display: flex; align-items: center; justify-content: center; width: 50px; height: 50px; border-radius: 50%; color: white; font-size: 11px; font-weight: 600; text-decoration: none; box-shadow: 0 4px 12px rgba(0,0,0,0.15); text-align: center; line-height: 1.2; }
.whatsapp-float { background: #25D366; }
.telegram-float { background: #26A5E4; }

/* Loading spinner */
.nova-spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid #eef2f4; border-top-color: #0a7b7b; border-radius: 50%; animation: nova-spin 0.6s linear infinite; }
@keyframes nova-spin { to { transform: rotate(360deg); } }

/* Toast */
.nova-toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 999999; padding: 14px 28px; border-radius: 12px; font-size: 14px; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,0.2); max-width: 90%; text-align: center; animation: fadeInDown 0.3s ease; font-family: 'Montserrat','Inter',sans-serif; }

/* Modal overlay */
.auth-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 99999; display: flex; align-items: center; justify-content: center; animation: fadeInOverlay 0.2s ease; }

/* Buttons */
.public_btn { display: inline-block; padding: 12px 28px; border-radius: 40px; color: white; font-weight: 600; font-size: 14px; text-decoration: none; transition: 0.2s; cursor: pointer; border: none; }
.public_btn:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.15); }

/* Content card */
.content-card { background: white; border-radius: 40px; padding: 2.5rem; box-shadow: 0 8px 30px rgba(0,0,0,0.04); margin: 1.5rem 0; }
.content-card h1 { font-size: 2rem; font-weight: 800; background: linear-gradient(135deg, #0a1c2f, #0a7b7b); -webkit-background-clip: text; background-clip: text; color: transparent; }
.sub { color: #4a6a78; margin-bottom: 2rem; }
.search-wrapper { position: relative; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 8px; }
.search-icon { position: absolute; left: 14px; font-size: 16px; pointer-events: none; }
.search-wrapper input { width: 100%; padding: 12px 14px 12px 40px; border: 1.5px solid #dce4e8; border-radius: 40px; font-size: 14px; background: #f8fafc; transition: 0.2s; }
.search-wrapper input:focus { border-color: #0a7b7b; outline: none; background: white; }
.search-clear { padding: 8px 16px; background: #f0f7fa; border: none; border-radius: 40px; cursor: pointer; font-weight: 600; font-size: 13px; white-space: nowrap; display: none; }
.result-count { font-size: 13px; color: #4a6a78; white-space: nowrap; }
.gift-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin: 1rem 0; list-style: none; }
.gift-card-grid li { background: #f8fafc; border: 1px solid #eef2f4; border-radius: 14px; padding: 12px 10px; font-weight: 500; font-size: 13px; color: #0a1c2f; text-align: center; transition: 0.15s; cursor: default; }
.gift-card-grid li.hidden { display: none; }
.gift-card-grid li:hover { border-color: #0a7b7b; background: #f0f7fa; }
.footer-note { text-align: center; margin-top: 1.8rem; font-size: 0.75rem; color: #8aaeb9; border-top: 1px solid #eef2f4; padding-top: 1.2rem; }
.services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; margin: 1rem 0; }
.service-item { background: #f8fafc; border: 1px solid #eef2f4; border-radius: 18px; padding: 18px 14px; text-align: center; transition: 0.15s; }
.service-item:hover { border-color: #0a7b7b; transform: translateY(-2px); }
.service-icon { font-size: 28px; margin-bottom: 6px; }
.service-title { font-weight: 700; font-size: 14px; color: #0a1c2f; }
.service-desc { font-size: 12px; color: #4a6a78; margin-top: 4px; }
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; margin: 1rem 0; }
.physical-card { background: white; border: 1px solid #eef2f4; border-radius: 18px; padding: 16px 12px; text-align: center; transition: 0.15s; position: relative; }
.physical-card:hover { border-color: #0a7b7b; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
.hot-badge { position: absolute; top: 8px; left: 8px; background: #ff6b35; color: white; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
.card-img img { max-width: 80px; max-height: 80px; margin: 8px auto 10px; display: block; }
.card-name { font-weight: 700; font-size: 14px; color: #0a1c2f; }
.card-info { font-size: 11px; color: #4a6a78; margin-top: 4px; }
@keyframes fadeInDown { from { opacity:0; transform:translateX(-50%) translateY(-10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
@keyframes fadeInOverlay { from { opacity:0; } to { opacity:1; } }

@media (max-width: 768px) {
  .header-inner { flex-direction: column; align-items: center; gap: 8px; }
  .nav-links { justify-content: center; gap: 6px; }
  .nav-btn { font-size: 11px; padding: 5px 12px; }
  .tg-header { font-size: 11px; padding: 5px 12px; }
  body { padding: 1rem 0.5rem; }
  .header-auth-right { align-items: center; gap: 6px; }
  .auth-btn { padding: 8px 18px !important; font-size: 13px !important; min-height: 36px; touch-action: manipulation; }
  .auth-avatar { width: 40px; height: 40px; font-size: 20px; touch-action: manipulation; }
  .auth-dropdown-menu { min-width: 140px; }
  .auth-btn, .auth-avatar, .auth-dropdown-item { -webkit-tap-highlight-color: rgba(10,123,123,0.2); }
  .container_wrapper { flex-direction: column; align-items: stretch; gap: 8px; padding: 0 12px; }
  h1 { font-size: 1.4rem !important; text-align: center; }
  .sub { font-size: 0.8rem !important; text-align: center; }
  .search-wrapper { max-width: 100% !important; }
  .search-wrapper input { font-size: 13px; padding: 10px 38px 10px 14px; }
  .gift-card-grid, .cards-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px; }
  .services-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px; }
  .physical-card { padding: 10px; }
  .card-name { font-size: 11px; }
  .card-img img { max-height: 60px; }
  .service-item { padding: 12px; }
  .service-title { font-size: 13px; }
  .service-desc { font-size: 11px; }
  .back-link { text-align: center; }
  .back-link a { font-size: 12px; padding: 10px 20px !important; }
  .footer-note { font-size: 11px; text-align: center; }
  .hot-badge { font-size: 9px; padding: 1px 6px; top: 4px; right: 4px; }
  .auth-modal { max-width: 95% !important; padding: 28px 20px !important; }
  .contact-float-wrapper { bottom: 12px; right: 12px; }
  .whatsapp-float, .telegram-float { width: 44px; height: 44px; font-size: 10px; }
}

@media (max-width: 480px) {
  .gift-card-grid, .cards-grid, .services-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 6px; }
  .nav-links { gap: 4px; flex-wrap: wrap; justify-content: center; }
  .nav-btn { font-size: 10px; padding: 3px 8px; }
  .physical-card { padding: 8px; }
  .card-name { font-size: 10px; }
  .service-item { padding: 8px; }
  .hot-badge { font-size: 8px; padding: 1px 4px; }
}
`;

  if (!document.getElementById('nova-shared-style')) {
    var style = document.createElement('style');
    style.id = 'nova-shared-style';
    style.textContent = sharedCSS;
    document.head.appendChild(style);
  }

  // --- Inject header nav ---
  function injectHeader() {
    var existingHeader = document.querySelector('.site-header') || document.querySelector('header');
    if (existingHeader) return; // Already have one

    var container = document.querySelector('.container');
    if (!container) return;

    // Determine nav links based on current page depth
    var isInSubdir = window.location.pathname.indexOf('/cards/') > -1 || 
                     window.location.pathname.indexOf('/transfer/') > -1 ||
                     window.location.pathname.indexOf('/misc/') > -1;

    var prefix = isInSubdir ? '../' : './';

    var headerHTML = `
<header class="site-header">
  <div class="header-inner">
    <a href="${prefix}Nigeria.html" class="logo">NOVA<span>.</span></a>
    <div class="nav-links">
      <a href="${prefix}cards/cards.html" class="nav-btn">Gift Card Catalog</a>
      <a href="${prefix}cards/popularfastcards.html" class="nav-btn">Popular fast cards</a>
      <a href="${prefix}transfer/populartransfer.html" class="nav-btn">Popular Transfers</a>
      <a href="${prefix}transfer/support.html" class="nav-btn">Supported Transfers</a>
    </div>
    <div class="header-auth-right"></div>
  </div>
</header>`;

    container.insertAdjacentHTML('afterbegin', headerHTML);

    // Re-run updateAuthHeader if available
    if (typeof updateAuthHeader === 'function') updateAuthHeader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectHeader);
  } else {
    injectHeader();
  }
})();
