// ============================================================
// Nova Exchange - Auth Module (auth.js)
// Login, Register, Forgot Password, Bind Email, Token Management
// ============================================================

var SUPABASE_URL = "https://ecikviwuxfieryrmfgdq.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_qZmFog48wGY8aMzEzl3P2Q_bFktF5X3";

var API_BASE = (function() {
  try { return localStorage.getItem("nova_api_base") || "https://nova-api-production-f9f4.up.railway.app"; }
  catch(e) { return "https://nova-api-production-f9f4.up.railway.app"; }
})();

var VERIFICATION_API_BASE = (function() {
  try { return localStorage.getItem("nova_verify_api_base") || "https://alh777.com"; }
  catch(e) { return "https://alh777.com"; }
})();

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

function verificationApiCall(method, path, body) {
  var url = VERIFICATION_API_BASE + "/api/" + path;
  var options = { method: method, headers: { "Content-Type": "application/json" } };
  if (body && (method === "POST" || method === "PUT")) options.body = JSON.stringify(body);
  return fetch(url, options).then(function(r) { return r.json(); });
}

var _verifyToken = null;
var _forgotToken = null;
var _bindVerifyToken = null;
var _regEmailVerified = false;

function startCountdown(btn, seconds) {
  var remaining = seconds;
  var interval = setInterval(function() {
    remaining--;
    if (remaining <= 0) { clearInterval(interval); btn.disabled = false; btn.textContent = "Send Code"; }
    else { btn.textContent = remaining + "s"; }
  }, 1000);
}

function showToast(msg, type) {
  type = type || "info";
  var existing = document.querySelector(".nova-toast");
  if (existing) existing.remove();
  var toast = document.createElement("div");
  toast.className = "nova-toast";
  var bgColor = type === "success" ? "#0a7b7b" : type === "error" ? "#d32f2f" : "#0a1c2f";
  toast.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999999;background:" + bgColor + ";color:white;padding:14px 28px;border-radius:12px;font-size:14px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,0.2);max-width:90%;text-align:center;animation:fadeInDown 0.3s ease;font-family:Montserrat,Inter,sans-serif;";
  toast.textContent = msg;
  document.body.appendChild(toast);
  if (!document.getElementById("nova-toast-style")) {
    var s = document.createElement("style"); s.id = "nova-toast-style";
    s.textContent = "@keyframes fadeInDown{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}.nova-modal-fade{animation:fadeInOverlay 0.2s ease}@keyframes fadeInOverlay{from{opacity:0}to{opacity:1}}";
    document.head.appendChild(s);
  }
  setTimeout(function() {
    toast.style.opacity = "0"; toast.style.transition = "opacity 0.3s ease";
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}

function getAvatarLetter(user) {
  if (!user) return "?";
  var name = user.name || user.username || user.email || user.phone || "";
  return name.charAt(0).toUpperCase() || "?";
}

function getAvatarColor(seed) {
  var colors = ["#0a7b7b","#d32f2f","#1976d2","#388e3c","#f57c00","#7b1fa2","#00838f","#c62828","#2e7d32","#6a1b9a","#e65100","#1565c0"];
  var hash = 0;
  if (seed) { for (var i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash); }
  return colors[Math.abs(hash) % colors.length];
}

function updateAuthHeader() {
  var user = getUserData();
  var headerRight = document.querySelector(".header-auth-right");
  if (!headerRight) return;
  if (user && getToken()) {
    var letter = getAvatarLetter(user);
    var color = getAvatarColor(user.email || user.phone || user.id);
    headerRight.innerHTML = '<div class="auth-user-dropdown">' +
      '<div class="auth-avatar" style="background:' + color + ';cursor:pointer;" onclick="toggleUserDropdown()">' + letter + '</div>' +
      '<div class="auth-dropdown-menu" id="authDropdownMenu">' +
        '<div class="auth-dropdown-item" onclick="location.href=\'account.html\'">?? My Account</div>' +
        '<div class="auth-dropdown-divider"></div>' +
        '<div class="auth-dropdown-item" onclick="logoutUser()">?? Sign Out</div>' +
      '</div></div>';
  } else {
    headerRight.innerHTML = '<div class="auth-buttons">' +
      '<button class="auth-btn auth-btn-login" onclick="showLoginModal()">Login</button>' +
      '<button class="auth-btn auth-btn-register" onclick="showRegisterModal()">Register</button></div>';
  }
}

function toggleUserDropdown() {
  var menu = document.getElementById("authDropdownMenu");
  if (menu) menu.style.display = menu.style.display === "block" ? "none" : "block";
}

document.addEventListener("click", function(e) {
  var menu = document.getElementById("authDropdownMenu");
  if (menu && !e.target.closest(".auth-user-dropdown")) menu.style.display = "none";
});

function logoutUser() {
  clearUserData();
  showToast("Signed out successfully", "success");
  setTimeout(function() { location.reload(); }, 500);
}

function refreshUserData() {
  if (!getToken()) return Promise.reject("Not logged in");
  return apiCall("GET", "/api/me").then(function(data) {
    if (data.user) { setUserData(data.user); return data.user; }
    return null;
  });
}

function showModal(html, modalId) {
  var existing = document.querySelector(".auth-modal-overlay");
  if (existing) existing.remove();
  var overlay = document.createElement("div");
  overlay.className = "auth-modal-overlay" + (modalId ? " " + modalId : "");
  overlay.innerHTML = html;
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeInOverlay 0.2s ease;";
  document.body.appendChild(overlay);
  overlay.addEventListener("click", function(e) { if (e.target === overlay) closeModal(overlay); });
  document.addEventListener("keydown", function escHandler(e) { if (e.key === "Escape") { closeModal(overlay); document.removeEventListener("keydown", escHandler); } });
  return overlay;
}

function closeModal(overlay) {
  if (overlay && overlay.parentNode) {
    overlay.style.opacity = "0"; overlay.style.transition = "opacity 0.2s ease";
    setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
  }
}

// ======================== LOGIN ========================
function showLoginModal() {
  var overlay = showModal(
    '<div class="auth-modal" style="background:white;border-radius:24px;padding:36px 32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;max-height:90vh;overflow-y:auto;">' +
    '<button onclick="closeModal(this.closest(\'.auth-modal-overlay\'))" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#8aaeb9;line-height:1;">?</button>' +
    '<h2 style="font-size:24px;font-weight:700;color:#0a1c2f;margin-bottom:4px;">Welcome Back</h2>' +
    '<p style="color:#4a6a78;font-size:14px;margin-bottom:24px;">Sign in to your Nova Exchange account</p>' +
    '<div style="margin-bottom:16px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Phone Number</label>' +
    '<input type="tel" id="loginPhone" placeholder="+2348012345678" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +
    '<div style="margin-bottom:8px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Password</label>' +
    '<input type="password" id="loginPassword" placeholder="Enter your password" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +
    '<div style="text-align:right;margin-bottom:20px;"><a href="javascript:void(0)" onclick="closeModal(this.closest(\'.auth-modal-overlay\'));showForgotModal();" style="color:#0a7b7b;font-size:13px;font-weight:500;text-decoration:none;">Forgot Password?</a></div>' +
    '<button onclick="handleLogin()" style="width:100%;padding:14px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;">Sign In</button>' +
    '<p style="text-align:center;margin-top:16px;color:#4a6a78;font-size:13px;">Don\'t have an account? <a href="javascript:void(0)" onclick="closeModal(this.closest(\'.auth-modal-overlay\'));showRegisterModal();" style="color:#0a7b7b;font-weight:600;text-decoration:none;">Register</a></p>' +
    '</div>'
  );
  setTimeout(function() { var inp = document.getElementById("loginPhone"); if (inp) inp.focus(); }, 100);
}

function handleLogin() {
  var phone = document.getElementById("loginPhone").value.trim();
  var password = document.getElementById("loginPassword").value;
  if (!phone) { showToast("Please enter your phone number", "error"); return; }
  if (!password) { showToast("Please enter your password", "error"); return; }
  var btn = document.querySelector(".auth-modal button:last-of-type");
  if (btn) { btn.disabled = true; btn.textContent = "Signing in..."; }
  apiCall("POST", "/api/login", { phone: phone, password: password })
    .then(function(data) {
      if (data.token || data.success) {
        setToken(data.token);
        if (data.user) setUserData(data.user);
        showToast("Login successful!", "success");
        closeModal(document.querySelector(".auth-modal-overlay"));
        setTimeout(function() { location.reload(); }, 500);
      } else if (data.error) { showToast(data.error, "error"); if (btn) { btn.disabled = false; btn.textContent = "Sign In"; } }
      else { showToast("Login failed", "error"); if (btn) { btn.disabled = false; btn.textContent = "Sign In"; } }
    })
    .catch(function() { showToast("Network error", "error"); if (btn) { btn.disabled = false; btn.textContent = "Sign In"; } });
}

// ======================== REGISTER ========================
function showRegisterModal() {
  showModal(
    '<div class="auth-modal" style="background:white;border-radius:24px;padding:36px 32px;max-width:460px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;max-height:90vh;overflow-y:auto;">' +
    '<button onclick="closeModal(this.closest(\'.auth-modal-overlay\'))" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#8aaeb9;line-height:1;">?</button>' +
    '<h2 style="font-size:24px;font-weight:700;color:#0a1c2f;margin-bottom:4px;">Create Account</h2>' +
    '<p style="color:#4a6a78;font-size:14px;margin-bottom:20px;">Join Nova Exchange today</p>' +

    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Full Name</label>' +
    '<input type="text" id="regName" placeholder="Your full name" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +

    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Phone Number</label>' +
    '<input type="tel" id="regPhone" placeholder="+2348012345678" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +

    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Email Address <span style="color:#8aaeb9;font-weight:400;">(optional)</span></label>' +
    '<div style="display:flex;gap:8px;">' +
    '<input type="email" id="regEmail" placeholder="your@email.com" oninput="toggleRegSendBtn()" style="flex:1;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;">' +
    '<button id="regSendCodeBtn" onclick="handleRegSendCode()" style="padding:12px 16px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;min-width:100px;">Send Code</button></div></div>' +

    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Verification Code</label>' +
    '<input type="text" id="regCode" placeholder="Enter 4-digit code" maxlength="4" oninput="autoVerifyRegCode(this)" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +

    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Password</label>' +
    '<input type="password" id="regPassword" placeholder="Min 6 characters" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +

    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Confirm Password</label>' +
    '<input type="password" id="regConfirm" placeholder="Repeat password" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +

    '<div style="margin-bottom:20px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Referral Code <span style="color:#8aaeb9;font-weight:400;">(optional)</span></label>' +
    '<input type="text" id="regRef" placeholder="Enter referral code" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +

    '<button onclick="handleRegister()" style="width:100%;padding:14px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;">Create Account</button>' +

    '<p style="text-align:center;margin-top:16px;color:#4a6a78;font-size:13px;">Already have an account? <a href="javascript:void(0)" onclick="closeModal(this.closest(\'.auth-modal-overlay\'));showLoginModal();" style="color:#0a7b7b;font-weight:600;text-decoration:none;">Sign In</a></p>' +
    '</div>'
  );
}

function toggleRegSendBtn() {
  var email = document.getElementById("regEmail");
  var btn = document.getElementById("regSendCodeBtn");
  if (!email || !btn) return;
  btn.disabled = !email.value.trim();
}

function handleRegSendCode() {
  var email = document.getElementById("regEmail").value.trim();
  var btn = document.getElementById("regSendCodeBtn");
  sendRegisterCode(email, btn).catch(function(err) {});
}

function sendRegisterCode(email, btnEl) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Please enter a valid email address", "error");
    return Promise.reject("Invalid email");
  }
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = "Sending..."; startCountdown(btnEl, 60); }
  return verificationApiCall("POST", "send-code", { email: email, type: "register" })
    .then(function(data) {
      if (data.error) { showToast(data.error, "error"); if (btnEl) { btnEl.disabled = false; btnEl.textContent = "Send Code"; } throw new Error(data.error); }
      _verifyToken = data.token;
      showToast("Verification code sent to " + email, "success");
      return data;
    }).catch(function(err) { if (btnEl) { btnEl.disabled = false; btnEl.textContent = "Send Code"; } throw err; });
}

function verifyRegisterCode(code) {
  if (!_verifyToken) { showToast("Please send verification code first", "error"); return Promise.reject("No token"); }
  return verificationApiCall("POST", "verify-code", { token: _verifyToken, code: code })
    .then(function(data) {
      if (data.error) { showToast(data.error, "error"); throw new Error(data.error); }
      showToast("Email verified successfully!", "success");
      return data;
    });
}

function autoVerifyRegCode(input) {
  var code = input.value.trim();
  if (code.length === 4) {
    verifyRegisterCode(code).then(function() {
      _regEmailVerified = true;
      input.style.borderColor = "#0a7b7b";
      input.style.background = "#f0faf5";
    }).catch(function() {
      _regEmailVerified = false;
      input.style.borderColor = "#d32f2f";
    });
  } else {
    _regEmailVerified = false;
    input.style.borderColor = "";
    input.style.background = "";
  }
}

function handleRegister() {
  var name = document.getElementById("regName").value.trim();
  var phone = document.getElementById("regPhone").value.trim();
  var email = document.getElementById("regEmail").value.trim();
  var code = document.getElementById("regCode").value.trim();
  var password = document.getElementById("regPassword").value;
  var confirm = document.getElementById("regConfirm").value;
  var ref = document.getElementById("regRef").value.trim();

  if (!name) { showToast("Please enter your full name", "error"); return; }
  if (!phone) { showToast("Please enter your phone number", "error"); return; }
  if (!password || password.length < 6) { showToast("Password must be at least 6 characters", "error"); return; }
  if (password !== confirm) { showToast("Passwords do not match", "error"); return; }

  var btn = document.querySelector(".auth-modal .auth-modal button:first-of-type") || document.querySelector(".auth-modal button:last-of-type");
  if (btn) { btn.disabled = true; btn.textContent = "Creating account..."; }

  // If email is provided, require verification first
  if (email) {
    if (!code) { showToast("Please enter the verification code", "error"); if (btn) { btn.disabled = false; btn.textContent = "Create Account"; } return; }
    if (!_regEmailVerified) { showToast("Please verify your email first", "error"); if (btn) { btn.disabled = false; btn.textContent = "Create Account"; } return; }
  }

  var body = { name: name, phone: phone, email: email || "", password: password };
  if (ref) body.referral_code = ref;
  apiCall("POST", "/api/register", body).then(function(data) {
    if (data.token || data.success) {
      setToken(data.token);
      if (data.user) setUserData(data.user);
      showToast("Account created successfully!", "success");
      closeModal(document.querySelector(".auth-modal-overlay"));
      setTimeout(function() { location.reload(); }, 500);
    } else if (data.error) { showToast(data.error, "error"); if (btn) { btn.disabled = false; btn.textContent = "Create Account"; } }
    else { showToast("Registration failed", "error"); if (btn) { btn.disabled = false; btn.textContent = "Create Account"; } }
  }).catch(function(err) { if (btn) { btn.disabled = false; btn.textContent = "Create Account"; } });
}

// ======================== FORGOT PASSWORD ========================
function showForgotModal() {
  showModal(
    '<div class="auth-modal" style="background:white;border-radius:24px;padding:36px 32px;max-width:440px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;">' +
    '<button onclick="closeModal(this.closest(\'.auth-modal-overlay\'))" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#8aaeb9;line-height:1;">?</button>' +
    '<h2 style="font-size:22px;font-weight:700;color:#0a1c2f;margin-bottom:4px;">Reset Password</h2>' +
    '<p style="color:#4a6a78;font-size:14px;margin-bottom:20px;">Verify your email to reset password</p>' +

    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Phone Number (registered)</label>' +
    '<input type="tel" id="forgotPhone" placeholder="+2348012345678" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +

    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Registered Email</label>' +
    '<div style="display:flex;gap:8px;">' +
    '<input type="email" id="forgotEmail" placeholder="your@email.com" style="flex:1;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;">' +
    '<button id="forgotSendCodeBtn" onclick="handleForgotSendCode()" style="padding:12px 16px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;min-width:100px;">Send Code</button></div></div>' +

    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Verification Code</label>' +
    '<input type="text" id="forgotCode" placeholder="Enter 4-digit code" maxlength="4" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +

    '<div style="margin-bottom:20px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">New Password</label>' +
    '<input type="password" id="forgotNewPassword" placeholder="Min 6 characters" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +

    '<button onclick="handleForgotReset()" style="width:100%;padding:14px;background:#d32f2f;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;">Reset Password</button>' +

    '<p style="text-align:center;margin-top:16px;color:#4a6a78;font-size:13px;"><a href="javascript:void(0)" onclick="closeModal(this.closest(\'.auth-modal-overlay\'));showLoginModal();" style="color:#0a7b7b;font-weight:600;text-decoration:none;">Back to Sign In</a></p>' +
    '</div>'
  );
}

function handleForgotSendCode() {
  var email = document.getElementById("forgotEmail").value.trim();
  var btn = document.getElementById("forgotSendCodeBtn");
  sendForgotCode(email, btn).catch(function(err) {});
}

function sendForgotCode(email, btnEl) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Please enter a valid email address", "error");
    return Promise.reject("Invalid email");
  }
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = "Sending..."; startCountdown(btnEl, 60); }
  return verificationApiCall("POST", "send-code", { email: email, type: "forgot-password" })
    .then(function(data) {
      if (data.error) { showToast(data.error, "error"); if (btnEl) { btnEl.disabled = false; btnEl.textContent = "Send Code"; } throw new Error(data.error); }
      _forgotToken = data.token;
      showToast("Verification code sent to " + email, "success");
      return data;
    }).catch(function(err) { if (btnEl) { btnEl.disabled = false; btnEl.textContent = "Send Code"; } throw err; });
}

function verifyForgotCode(code) {
  if (!_forgotToken) { showToast("Please send verification code first", "error"); return Promise.reject("No token"); }
  return verificationApiCall("POST", "verify-code", { token: _forgotToken, code: code })
    .then(function(data) {
      if (data.error) { showToast(data.error, "error"); throw new Error(data.error); }
      showToast("Code verified! Set your new password.", "success");
      return data;
    });
}

function handleForgotReset() {
  var phone = document.getElementById("forgotPhone").value.trim();
  var email = document.getElementById("forgotEmail").value.trim();
  var code = document.getElementById("forgotCode").value.trim();
  var newPassword = document.getElementById("forgotNewPassword").value;

  if (!phone) { showToast("Please enter your registered phone number", "error"); return; }
  if (!email) { showToast("Please enter your registered email", "error"); return; }
  if (!code) { showToast("Please enter the verification code", "error"); return; }
  if (!newPassword || newPassword.length < 6) { showToast("Password must be at least 6 characters", "error"); return; }

  var btn = document.querySelector(".auth-modal button:last-of-type");
  if (btn) { btn.disabled = true; btn.textContent = "Resetting..."; }

  verifyForgotCode(code).then(function() {
    return apiCall("POST", "/api/reset-password", { phone: phone, email: email, password: newPassword });
  }).then(function(data) {
    if (data.success || data.message || data.token) {
      showToast("Password reset successfully! Please sign in.", "success");
      closeModal(document.querySelector(".auth-modal-overlay"));
      setTimeout(function() { showLoginModal(); }, 500);
    } else if (data.error) { showToast(data.error, "error"); if (btn) { btn.disabled = false; btn.textContent = "Reset Password"; } }
    else { showToast("Reset failed", "error"); if (btn) { btn.disabled = false; btn.textContent = "Reset Password"; } }
  }).catch(function(err) { if (btn) { btn.disabled = false; btn.textContent = "Reset Password"; } });
}

// ======================== BIND EMAIL ========================
function showBindEmailModal() {
  showModal(
    '<div class="auth-modal" style="background:white;border-radius:24px;padding:36px 32px;max-width:440px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;">' +
    '<button onclick="closeModal(this.closest(\'.auth-modal-overlay\'))" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#8aaeb9;line-height:1;">?</button>' +
    '<h2 style="font-size:22px;font-weight:700;color:#0a1c2f;margin-bottom:4px;">Bind Email</h2>' +
    '<p style="color:#4a6a78;font-size:14px;margin-bottom:20px;">Link a Google email to your account</p>' +

    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Email Address</label>' +
    '<div style="display:flex;gap:8px;">' +
    '<input type="email" id="bindEmail" placeholder="your@gmail.com" style="flex:1;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;">' +
    '<button id="bindSendCodeBtn" onclick="handleBindSendCode()" style="padding:12px 16px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;min-width:100px;">Send Code</button></div></div>' +

    '<div style="margin-bottom:20px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Verification Code</label>' +
    '<input type="text" id="bindCode" placeholder="Enter 4-digit code" maxlength="4" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;"></div>' +

    '<button onclick="handleBindEmail()" style="width:100%;padding:14px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;">Bind Email</button>' +
    '</div>'
  );
}

function handleBindSendCode() {
  var email = document.getElementById("bindEmail").value.trim();
  var btn = document.getElementById("bindSendCodeBtn");
  sendBindEmailCode(email, btn).catch(function(err) {});
}

function sendBindEmailCode(email, btnEl) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Please enter a valid email address", "error");
    return Promise.reject("Invalid email");
  }
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = "Sending..."; startCountdown(btnEl, 60); }
  return verificationApiCall("POST", "send-code", { email: email, type: "bind-email" })
    .then(function(data) {
      if (data.error) { showToast(data.error, "error"); if (btnEl) { btnEl.disabled = false; btnEl.textContent = "Send Code"; } throw new Error(data.error); }
      _bindVerifyToken = data.token;
      showToast("Verification code sent to " + email, "success");
      return data;
    }).catch(function(err) { if (btnEl) { btnEl.disabled = false; btnEl.textContent = "Send Code"; } throw err; });
}

function verifyBindEmailCode(code) {
  if (!_bindVerifyToken) { showToast("Please send verification code first", "error"); return Promise.reject("No token"); }
  return verificationApiCall("POST", "verify-code", { token: _bindVerifyToken, code: code })
    .then(function(data) {
      if (data.error) { showToast(data.error, "error"); throw new Error(data.error); }
      showToast("Email verified! Binding to your account...", "success");
      return data;
    });
}

function handleBindEmail() {
  var email = document.getElementById("bindEmail").value.trim();
  var code = document.getElementById("bindCode").value.trim();
  if (!email) { showToast("Please enter your email", "error"); return; }
  if (!code) { showToast("Please enter the verification code", "error"); return; }

  var btn = document.querySelector(".auth-modal button:last-of-type");
  if (btn) { btn.disabled = true; btn.textContent = "Binding..."; }

  verifyBindEmailCode(code).then(function() {
    return apiCall("POST", "/api/me/bind-email", { email: email, code: code, verifyToken: _bindVerifyToken });
  }).then(function(data) {
    if (data.success || data.message) {
      showToast("Email bound successfully!", "success");
      closeModal(document.querySelector(".auth-modal-overlay"));
      return refreshUserData();
    } else if (data.error) { showToast(data.error, "error"); if (btn) { btn.disabled = false; btn.textContent = "Bind Email"; } throw new Error(data.error); }
    else { showToast("Failed to bind email", "error"); if (btn) { btn.disabled = false; btn.textContent = "Bind Email"; } throw new Error("Bind failed"); }
  }).then(function() {
    if (window.loadAccountData) window.loadAccountData();
  }).catch(function(err) {});
}

function setApiBase(url) {
  try { localStorage.setItem("nova_api_base", url); } catch(e) {}
  API_BASE = url;
}

function setVerificationApiBase(url) {
  try { localStorage.setItem("nova_verify_api_base", url); } catch(e) {}
  VERIFICATION_API_BASE = url;
}

function initAuth() {
  updateAuthHeader();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuth);
} else {
  initAuth();
}
