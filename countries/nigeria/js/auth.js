// ============================================================
// Nova Exchange - Auth Module (auth.js)
// Login, Register with Email Verification, User State
// Depends on: api.js, utils.js
// ============================================================

// Supabase email verification
var _supabase = null;
function getSupabase() {
  if (!_supabase) {
    try {
      if (typeof supabaseClient !== 'undefined' && supabaseClient.auth) {
        _supabase = supabaseClient;
      } else if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
        _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      } else {
        _supabase = { auth: { signInWithOtp: function() { return Promise.reject(new Error(\"Supabase not loaded\")); }, verifyOtp: function() { return Promise.reject(new Error(\"Supabase not loaded\")); } } };
      }
    } catch(e) { showToast(\"Auth service unavailable\", \"error\"); throw e; }
  }
  return _supabase;
}

// ---- Modal helpers ----
function showModal(html) {
  var existing = document.querySelector(".auth-modal-overlay");
  if (existing) existing.remove();
  var overlay = document.createElement("div");
  overlay.className = "auth-modal-overlay";
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", function(e) { if (e.target === overlay) closeModal(overlay); });
  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") { closeModal(overlay); document.removeEventListener("keydown", escHandler); }
  });
  return overlay;
}

function closeModal(overlay) {
  if (overlay && overlay.parentNode) {
    overlay.style.opacity = "0"; overlay.style.transition = "opacity 0.2s ease";
    setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
  }
}

// ---- Email verification via Supabase ----
var _verifiedEmail = null;

function sendEmailCode(email, btnEl) {
  if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    showToast("Please enter a valid email address", "error");
    return Promise.reject("Invalid email");
  }
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = "Sending..."; startCountdown(btnEl, 60); }

  var sb = getSupabase();
  return sb.auth.signInWithOtp({
    email: email,
    options: { shouldCreateUser: false }
  }).then(function(result) {
    if (result.error) {
      showToast(result.error.message, "error");
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = "Send Code"; }
      throw result.error;
    }
    showToast("Verification code sent to " + email, "success");
    return result;
  }).catch(function(err) {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = "Send Code"; }
    throw err;
  });
}

function verifyEmailCode(email, code) {
  if (!email || !code) {
    showToast("Email and code required", "error");
    return Promise.reject("Missing fields");
  }
  var sb = getSupabase();
  return sb.auth.verifyOtp({
    email: email,
    token: code,
    type: 'email'
  }).then(function(result) {
    if (result.error) {
      showToast(result.error.message, "error");
      throw result.error;
    }
    _verifiedEmail = email;
    showToast("Email verified successfully!", "success");
    return result;
  });
}

// ---- Update header auth state ----
function updateAuthHeader() {
  var user = getUserData();
  var headers = document.querySelectorAll(".header-auth-right");
  if (!headers.length) return;
  for (var i = 0; i < headers.length; i++) {
    var hr = headers[i];
    if (user && getToken()) {
      var letter = getAvatarLetter(user);
      var color = getAvatarColor(user.email || user.phone || user.id);
      hr.innerHTML = '<div class=\"auth-user-dropdown\">' +
        '<div class=\"auth-avatar\" style=\"background:' + color + ';\" onclick=\"toggleUserDropdown(event)\">' + letter + '</div>' +
        '<div class=\"auth-dropdown-menu\" id=\"authDropdownMenu\">' +
          '<div class=\"auth-dropdown-item\" onclick=\"location.href=\\'account.html\\'\">&#x1F464; My Account</div>' +
          '<div class=\"auth-dropdown-divider\"></div>' +
          '<div class=\"auth-dropdown-item\" onclick=\"logoutUser()\">&#x1F6AA; Sign Out</div>' +
        '</div></div>';
    } else {
      hr.innerHTML = '<div class=\"auth-buttons\">' +
        '<button class=\"auth-btn auth-btn-login\" onclick=\"showLoginModal()\">Login</button>' +
        '<button class=\"auth-btn auth-btn-register\" onclick=\"showRegisterModal()\">Register</button></div>';
    }
  }
}

function toggleUserDropdown(e) {
  if (e) e.stopPropagation();
  var menu = document.getElementById("authDropdownMenu");
  if (!menu) return;
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

document.addEventListener("click", function() {
  var menu = document.getElementById("authDropdownMenu");
  if (menu) menu.style.display = "none";
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

// ======================== LOGIN MODAL ========================
function showLoginModal() {
  showModal(
    '<div class=\"auth-modal\" style=\"background:white;border-radius:24px;padding:36px 32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;max-height:90vh;overflow-y:auto;font-family:Montserrat,Inter,sans-serif;\">' +
    '<button onclick=\"closeModal(this.closest(\\'.auth-modal-overlay\\'))\" style=\"position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#8aaeb9;line-height:1;\">&#x2715;</button>' +
    '<h2 style=\"font-size:24px;font-weight:700;color:#0a1c2f;margin-bottom:4px;\">Welcome Back</h2>' +
    '<p style=\"color:#4a6a78;font-size:14px;margin-bottom:24px;\">Sign in to your Nova Exchange account</p>' +
    '<div style=\"margin-bottom:16px;\"><label style=\"display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;\">Phone Number or Email</label>' +
    '<input type=\"text\" id=\"loginAccount\" placeholder=\"Phone or Email\" class=\"auth-input\" style=\"width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;\"></div>' +
    '<div style=\"margin-bottom:8px;\"><label style=\"display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;\">Password</label>' +
    '<input type=\"password\" id=\"loginPassword\" placeholder=\"Enter your password\" class=\"auth-input\" style=\"width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;\"></div>' +
    '<div style=\"text-align:right;margin-bottom:20px;\"><a href=\"javascript:void(0)\" onclick=\"closeModal(this.closest(\\'.auth-modal-overlay\\'));showForgotModal();\" style=\"color:#0a7b7b;font-size:13px;font-weight:500;text-decoration:none;\">Forgot Password?</a></div>' +
    '<button onclick=\"handleLogin()\" style=\"width:100%;padding:14px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;\">Sign In</button>' +
    '<p style=\"text-align:center;margin-top:16px;color:#4a6a78;font-size:13px;\">Don\\'t have an account? ' +
    '<a href=\"javascript:void(0)\" onclick=\"closeModal(this.closest(\\'.auth-modal-overlay\\'));showRegisterModal();\" style=\"color:#0a7b7b;font-weight:600;text-decoration:none;\">Register</a></p>' +
    '</div>'
  );
  setTimeout(function() { var inp = document.getElementById("loginAccount"); if (inp) inp.focus(); }, 100);
}

function handleLogin() {
  var account = document.getElementById("loginAccount").value.trim();
  var password = document.getElementById("loginPassword").value;
  if (!account) { showToast("Please enter your phone or email", "error"); return; }
  if (!password) { showToast("Please enter your password", "error"); return; }
  var btn = document.querySelector(".auth-modal button:last-of-type");
  if (btn) { btn.disabled = true; btn.textContent = "Signing in..."; }
  var body = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(account)
    ? { email: account, password: password }
    : { phone: account, password: password };
  apiCall("POST", "/api/login", body)
    .then(function(data) {
      if (data.token) {
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

// ======================== REGISTER MODAL ========================
function showRegisterModal() {
  var captcha = generateMathCaptcha();
  showModal(
    '<div class=\"auth-modal\" style=\"background:white;border-radius:24px;padding:36px 32px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;max-height:90vh;overflow-y:auto;font-family:Montserrat,Inter,sans-serif;\">' +
    '<button onclick=\"closeModal(this.closest(\\'.auth-modal-overlay\\'))\" style=\"position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#8aaeb9;line-height:1;\">&#x2715;</button>' +
    '<h2 style=\"font-size:24px;font-weight:700;color:#0a1c2f;margin-bottom:4px;\">Create Account</h2>' +
    '<p style=\"color:#4a6a78;font-size:14px;margin-bottom:20px;\">Join Nova Exchange today</p>' +

    '<div style=\"margin-bottom:14px;\"><label style=\"display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;\">Full Name</label>' +
    '<input type=\"text\" id=\"regName\" placeholder=\"Your full name\" class=\"auth-input\" style=\"width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;\"></div>' +

    '<div style=\"margin-bottom:14px;\"><label style=\"display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;\">Phone Number</label>' +
    '<input type=\"tel\" id=\"regPhone\" placeholder=\"+2348012345678\" class=\"auth-input\" style=\"width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;\"></div>' +

    '<div style=\"margin-bottom:14px;\"><label style=\"display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;\">Email Address <span style=\"color:#d32f2f;\">*</span></label>' +
    '<div style=\"display:flex;gap:8px;\">' +
    '<input type=\"email\" id=\"regEmail\" placeholder=\"your@email.com\" class=\"auth-input\" style=\"flex:1;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;\">' +
    '<button id=\"regSendCodeBtn\" onclick=\"handleRegSendCode()\" style=\"padding:12px 16px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;min-width:110px;\">Send Code</button></div></div>' +

    '<div style=\"margin-bottom:14px;\"><label style=\"display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;\">Verification Code</label>' +
    '<input type=\"text\" id=\"regCode\" placeholder=\"Enter 6-digit code\" maxlength=\"6\" class=\"auth-input\" style=\"width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;\">' +
    '<button id=\"regVerifyCodeBtn\" onclick=\"handleRegVerifyCode()\" style=\"margin-top:8px;padding:8px 20px;background:#0a7b7b;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;\">Verify Code</button>' +
    '<span id=\"regCodeStatus\" style=\"margin-left:12px;font-size:13px;color:#8aaeb9;\"></span></div>' +

    '<div style=\"margin-bottom:14px;\"><label style=\"display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;\">Password</label>' +
    '<input type=\"password\" id=\"regPassword\" placeholder=\"Min 6 characters\" class=\"auth-input\" style=\"width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;\"></div>' +

    '<div style=\"margin-bottom:14px;\"><label style=\"display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;\">Confirm Password</label>' +
    '<input type=\"password\" id=\"regConfirm\" placeholder=\"Repeat password\" class=\"auth-input\" style=\"width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;\"></div>' +

    '<div style=\"margin-bottom:14px;\"><label style=\"display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;\">Referral Code <span style=\"color:#8aaeb9;font-weight:400;\">(optional)</span></label>' +
    '<input type=\"text\" id=\"regRef\" placeholder=\"Enter referral code\" class=\"auth-input\" style=\"width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;\"></div>' +

    '<div style=\"margin-bottom:20px;background:#fef3e2;border-radius:12px;padding:12px 16px;\">' +
    '<label style=\"display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:6px;\">&#x1F9EE; Verification: <span id=\"captchaQuestion\" style=\"color:#0a7b7b;\">' + captcha.question + '</span></label>' +
    '<input type=\"text\" id=\"regCaptcha\" placeholder=\"Answer\" maxlength=\"2\" class=\"auth-input\" style=\"width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:white;box-sizing:border-box;\" data-captcha-answer=\"' + captcha.answer + '\"></div>' +

    '<button onclick=\"handleRegister()\" style=\"width:100%;padding:14px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;\">Create Account</button>' +

    '<p style=\"text-align:center;margin-top:16px;color:#4a6a78;font-size:13px;\">Already have an account? ' +
    '<a href=\"javascript:void(0)\" onclick=\"closeModal(this.closest(\\'.auth-modal-overlay\\'));showLoginModal();\" style=\"color:#0a7b7b;font-weight:600;text-decoration:none;\">Sign In</a></p>' +
    '</div>'
  );
}

function handleRegSendCode() {
  var email = document.getElementById("regEmail").value.trim();
  var btn = document.getElementById("regSendCodeBtn");
  _verifiedEmail = null;
  document.getElementById("regCodeStatus").textContent = "";
  sendEmailCode(email, btn).catch(function(err) {});
}

function handleRegVerifyCode() {
  var email = document.getElementById("regEmail").value.trim();
  var code = document.getElementById("regCode").value.trim();
  if (!code) { showToast("Please enter the verification code", "error"); return; }
  var btn = document.getElementById("regVerifyCodeBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Verifying..."; }
  verifyEmailCode(email, code).then(function() {
    document.getElementById("regCodeStatus").textContent = "? Verified";
    document.getElementById("regCodeStatus").style.color = "#0a7b7b";
    if (btn) { btn.disabled = false; btn.textContent = "Verified"; btn.style.background = "#388e3c"; }
  }).catch(function() {
    if (btn) { btn.disabled = false; btn.textContent = "Verify Code"; }
  });
}

function handleRegister() {
  var name = document.getElementById("regName").value.trim();
  var phone = document.getElementById("regPhone").value.trim();
  var email = document.getElementById("regEmail").value.trim();
  var password = document.getElementById("regPassword").value;
  var confirm = document.getElementById("regConfirm").value;
  var ref = document.getElementById("regRef").value.trim();
  var captchaInput = document.getElementById("regCaptcha");
  var captchaAnswer = parseInt(captchaInput.getAttribute("data-captcha-answer"), 10);
  var captchaValue = parseInt(captchaInput.value.trim(), 10);

  if (!name) { showToast("Please enter your full name", "error"); return; }
  if (!phone) { showToast("Please enter your phone number", "error"); return; }
  if (!email) { showToast("Please enter your email", "error"); return; }
  if (!_verifiedEmail || _verifiedEmail !== email) { showToast("Please verify your email first", "error"); return; }
  if (!password || password.length < 6) { showToast("Password must be at least 6 characters", "error"); return; }
  if (password !== confirm) { showToast("Passwords do not match", "error"); return; }
  if (isNaN(captchaValue) || captchaValue !== captchaAnswer) { showToast("Incorrect verification answer", "error"); return; }

  var btn = document.querySelector(".auth-modal button:last-of-type");
  if (btn) { btn.disabled = true; btn.textContent = "Creating account..."; }

  var body = { name: name, phone: phone, email: email, password: password };
  if (ref) body.referral_code = ref;

  apiCall("POST", "/api/register", body)
    .then(function(data) {
      if (data.token) {
        setToken(data.token);
        if (data.user) setUserData(data.user);
        showToast("Account created successfully!", "success");
        closeModal(document.querySelector(".auth-modal-overlay"));
        setTimeout(function() { location.reload(); }, 500);
      } else if (data.error) { showToast(data.error, "error"); if (btn) { btn.disabled = false; btn.textContent = "Create Account"; } }
      else { showToast("Registration failed", "error"); if (btn) { btn.disabled = false; btn.textContent = "Create Account"; } }
    })
    .catch(function() { showToast("Network error", "error"); if (btn) { btn.disabled = false; btn.textContent = "Create Account"; } });
}

// ======================== FORGOT PASSWORD MODAL ========================
function showForgotModal() {
  showModal(
    '<div class=\"auth-modal\" style=\"background:white;border-radius:24px;padding:36px 32px;max-width:440px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;font-family:Montserrat,Inter,sans-serif;\">' +
    '<button onclick=\"closeModal(this.closest(\\'.auth-modal-overlay\\'))\" style=\"position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#8aaeb9;line-height:1;\">&#x2715;</button>' +
    '<h2 style=\"font-size:22px;font-weight:700;color:#0a1c2f;margin-bottom:4px;\">Reset Password</h2>' +
    '<p style=\"color:#4a6a78;font-size:14px;margin-bottom:20px;\">Enter your registered phone or email</p>' +
    '<div style=\"margin-bottom:14px;\"><label style=\"display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;\">Registered Phone or Email</label>' +
    '<input type=\"text\" id=\"forgotAccount\" placeholder=\"Phone or Email\" class=\"auth-input\" style=\"width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;\"></div>' +
    '<div style=\"margin-bottom:20px;\"><label style=\"display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;\">New Password</label>' +
    '<input type=\"password\" id=\"forgotNewPassword\" placeholder=\"Min 6 characters\" class=\"auth-input\" style=\"width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;\"></div>' +
    '<button onclick=\"handleForgotReset()\" style=\"width:100%;padding:14px;background:#d32f2f;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;\">Reset Password</button>' +
    '<p style=\"text-align:center;margin-top:16px;color:#4a6a78;font-size:13px;\">' +
    '<a href=\"javascript:void(0)\" onclick=\"closeModal(this.closest(\\'.auth-modal-overlay\\'));showLoginModal();\" style=\"color:#0a7b7b;font-weight:600;text-decoration:none;\">Back to Sign In</a></p>' +
    '</div>'
  );
}

function handleForgotReset() {
  var account = document.getElementById("forgotAccount").value.trim();
  var newPassword = document.getElementById("forgotNewPassword").value;
  if (!account) { showToast("Please enter your phone or email", "error"); return; }
  if (!newPassword || newPassword.length < 6) { showToast("Password must be at least 6 characters", "error"); return; }
  var btn = document.querySelector(".auth-modal button:last-of-type");
  if (btn) { btn.disabled = true; btn.textContent = "Resetting..."; }
  var body = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(account)
    ? { email: account, password: newPassword }
    : { phone: account, password: newPassword };
  apiCall("POST", "/api/reset-password", body)
    .then(function(data) {
      if (data.success || data.message) {
        showToast("Password reset! Please sign in.", "success");
        closeModal(document.querySelector(".auth-modal-overlay"));
        setTimeout(function() { showLoginModal(); }, 500);
      } else if (data.error) { showToast(data.error, "error"); if (btn) { btn.disabled = false; btn.textContent = "Reset Password"; } }
      else { showToast("Reset failed", "error"); if (btn) { btn.disabled = false; btn.textContent = "Reset Password"; } }
    })
    .catch(function() { showToast("Network error", "error"); if (btn) { btn.disabled = false; btn.textContent = "Reset Password"; } });
}

// ======================== INIT ========================
function initAuth() {
  updateAuthHeader();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuth);
} else {
  initAuth();
}
