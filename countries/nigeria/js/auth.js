// Nova Exchange - Auth Module (auth.js)
// Login, Register with Email Verification, Forgot Password, Bind Email
// Depends on: api.js, utils.js
// ============================================================

var VERIFICATION_API_BASE = (function() {
  try { return localStorage.getItem("nova_verify_api_base") || "https://alh777-api.vercel.app"; }
  catch(e) { return "https://alh777-api.vercel.app"; }
})();

function verificationApiCall(method, path, body) {
  var url = VERIFICATION_API_BASE + "/api/" + path;
  var options = { method: method, headers: { "Content-Type": "application/json" } };
  if (body && (method === "POST" || method === "PUT")) options.body = JSON.stringify(body);
  return fetch(url, options).then(function(r) { return r.json(); });
}

// ---- Verification tokens ----
var _regVerifyToken = null;
var _forgotVerifyToken = null;

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

// ---- Cartoon animal avatars (non-human, fun, random) ----
var _animalAvatars = [
  { emoji: "\uD83D\uDC19", name: "Octopus" },
  { emoji: "\uD83E\uDD8A", name: "Fox" },
  { emoji: "\uD83D\uDC3C", name: "Panda" },
  { emoji: "\uD83E\uDD81", name: "Lion" },
  { emoji: "\uD83D\uDC2D", name: "Koala" },
  { emoji: "\uD83E\uDD84", name: "Unicorn" },
  { emoji: "\uD83D\uDC38", name: "Frog" },
  { emoji: "\uD83E\uDD89", name: "Owl" },
  { emoji: "\uD83D\uDC27", name: "Penguin" },
  { emoji: "\uD83E\uDD9D", name: "Raccoon" },
  { emoji: "\uD83D\uDC39", name: "Hamster" },
  { emoji: "\uD83E\uDD94", name: "Hedgehog" },
  { emoji: "\uD83D\uDC3E", name: "Turtle" },
  { emoji: "\uD83E\uDD8E", name: "Lizard" },
  { emoji: "\uD83E\uDD8B", name: "Butterfly" },
  { emoji: "\uD83D\uDC1D", name: "Bee" },
  { emoji: "\uD83E\uDD9C", name: "Parrot" },
  { emoji: "\uD83D\uDC33", name: "Whale" },
  { emoji: "\uD83E\uDDA9", name: "Flamingo" }
];

function getAnimalAvatar(seed) {
  if (!seed) seed = "default";
  var h = 0;
  for (var i = 0; i < seed.length; i++) {
    h = seed.charCodeAt(i) + ((h << 5) - h);
  }
  var idx = Math.abs(h) % _animalAvatars.length;
  return _animalAvatars[idx];
}

// ---- Update header auth state on ALL pages ----
function updateAuthHeader() {
  var user = getUserData();
  // Support both .header-auth-right and .nova-auth-container selectors
  var headers = document.querySelectorAll(".header-auth-right, .nova-auth-container");
  if (!headers.length) return;
  for (var i = 0; i < headers.length; i++) {
    var headerRight = headers[i];
    if (user && getToken()) {
      var animal = getAnimalAvatar(user.email || user.phone || user.id);
      var color = getAvatarColor(user.email || user.phone || user.id);
      var avatarHtml = '<div class="auth-user-dropdown">' +
        '<div class="auth-avatar" style="background:' + color + ';font-size:20px;" onclick="toggleUserDropdown(event)" title="' + animal.name + '">' + animal.emoji + '</div>' +
        '<div class="auth-dropdown-menu" id="authDropdownMenu">' +
          '<div class="auth-dropdown-item" onclick="navigateToAccount(event)">&#x1F464; My Account</div>' +
          '<div class="auth-dropdown-divider"></div>' +
          '<div class="auth-dropdown-item" onclick="logoutUser()">&#x1F6AA; Sign Out</div>' +
        '</div></div>';
      headerRight.innerHTML = avatarHtml;
    } else {
      headerRight.innerHTML = '<div class="auth-buttons">' +
        '<button class="auth-btn auth-btn-login" onclick="showLoginModal()">Login</button>' +
        '<button class="auth-btn auth-btn-register" onclick="showRegisterModal()">Register</button></div>';
    }
  }
}

// Close dropdown when clicking outside
document.addEventListener("click", function() {
  var menu = document.getElementById("authDropdownMenu");
  if (menu) menu.style.display = "none";
});

function navigateToAccount(e) {
  if (e) e.stopPropagation();
  location.href = "account.html";
}
function toggleUserDropdown(e) {
  if (e) e.stopPropagation();
  var menu = document.getElementById("authDropdownMenu");
  if (!menu) return;
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}


// ======================== REGISTER MODAL ========================
function showRegisterModal() {
  showModal(
    '<div style="background:white;border-radius:24px;padding:36px 32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;max-height:90vh;overflow-y:auto;">' +
    '<button onclick="closeModal(this.closest(\'.auth-modal-overlay\'))" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#8aaeb9;line-height:1;">&#x2715;</button>' +
    '<h2 style="font-size:24px;font-weight:700;color:#0a1c2f;margin-bottom:4px;">Create Account</h2>' +
    '<p style="color:#4a6a78;font-size:14px;margin-bottom:24px;">Join Nova Exchange and start trading</p>' +
    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Full Name</label>' +
    '<input type="text" id="regName" placeholder="Your name" class="auth-input" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;"></div>' +
    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Phone Number</label>' +
    '<input type="tel" id="regPhone" placeholder="+234 xxx xxx xxxx" class="auth-input" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;"></div>' +
    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Email Address</label>' +
    '<input type="email" id="regEmail" placeholder="your@email.com" class="auth-input" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;"></div>' +
    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Password</label>' +
    '<input type="password" id="regPassword" placeholder="Min 6 characters" class="auth-input" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;"></div>' +
    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Referral Code (Optional)</label>' +
    '<input type="text" id="regReferral" placeholder="Enter referral code" class="auth-input" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;"></div>' +
    '<div style="margin-bottom:16px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Security Check</label>' +
    '<div style="display:flex;gap:8px;align-items:center;" id="captchaArea">' +
    '<span id="captchaQuestion" style="font-size:15px;font-weight:600;color:#0a1c2f;min-width:80px;"></span>' +
    '<input type="text" id="captchaAnswer" placeholder="Answer" style="flex:1;padding:10px 14px;border:1.5px solid #e2edf2;border-radius:10px;font-size:15px;outline:none;background:#f8fafc;"></div></div>' +
    '<button onclick="handleRegister()" style="width:100%;padding:14px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;">Create Account</button>' +
    '<p style="text-align:center;margin-top:16px;font-size:14px;color:#4a6a78;">Already have an account? <a href="#" onclick="event.preventDefault();closeModal(this.closest(\'.auth-modal-overlay\'));showLoginModal();" style="color:#0a7b7b;font-weight:600;">Sign In</a></p>' +
    '</div>'
  );
  _regVerifyToken = null;
  var captcha = generateMathCaptcha();
  document.getElementById("captchaQuestion").textContent = captcha.question;
  document.getElementById("captchaQuestion").dataset.answer = captcha.answer;
}

function handleRegister() {
  var name = document.getElementById("regName").value.trim();
  var phone = document.getElementById("regPhone").value.trim();
  var email = document.getElementById("regEmail").value.trim();
  var password = document.getElementById("regPassword").value;
  var referral = document.getElementById("regReferral").value.trim();
  var captchaAnswer = document.getElementById("captchaAnswer").value.trim();
  var expectedAnswer = document.getElementById("captchaQuestion").dataset.answer;

  if (!name) { showToast("Please enter your name", "error"); return; }
  if (!phone) { showToast("Please enter your phone number", "error"); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast("Please enter a valid email", "error"); return; }
  if (!password || password.length < 6) { showToast("Password must be at least 6 characters", "error"); return; }
  if (captchaAnswer !== expectedAnswer) { showToast("Incorrect security answer", "error"); return; }

  var btn = document.querySelector(".auth-modal-overlay button[type=\"button\"]:last-of-type");
  if (btn) { btn.disabled = true; btn.textContent = "Registering..."; }

  // Step 1: Send verification code
  verificationApiCall("POST", "send-code", { email: email, type: "register" })
    .then(function(data) {
      if (data.error) { showToast(data.error, "error"); if (btn) { btn.disabled = false; btn.textContent = "Create Account"; } return; }
      _regVerifyToken = data.token;
      showToast("Verification code sent to " + email, "success");
      // Replace form with verification step
      replaceRegisterWithVerify(email, name, phone, password, referral);
    })
    .catch(function() { showToast("Network error", "error"); if (btn) { btn.disabled = false; btn.textContent = "Create Account"; } });
}

function replaceRegisterWithVerify(email, name, phone, password, referral) {
  var overlay = document.querySelector(".auth-modal-overlay div[style*='background:white']");
  if (!overlay) return;
  overlay.innerHTML =
    '<button onclick="closeModal(this.closest(\'.auth-modal-overlay\'))" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#8aaeb9;line-height:1;">&#x2715;</button>' +
    '<h2 style="font-size:24px;font-weight:700;color:#0a1c2f;margin-bottom:4px;">Verify Email</h2>' +
    '<p style="color:#4a6a78;font-size:14px;margin-bottom:24px;">Enter the 4-digit code sent to ' + escapeHtml(email) + '</p>' +
    '<div style="margin-bottom:20px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Verification Code</label>' +
    '<input type="text" id="regVerifyCode" placeholder="Enter 4-digit code" maxlength="4" class="auth-input" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;"></div>' +
    '<button onclick="completeRegister(\'' + escapeJs(email) + '\', \'' + escapeJs(name) + '\', \'' + escapeJs(phone) + '\', \'' + escapeJs(password) + '\', \'' + escapeJs(referral) + '\')" style="width:100%;padding:14px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;">Verify & Create Account</button>' +
    '<p style="text-align:center;margin-top:16px;font-size:14px;color:#4a6a78;">Didn\'t receive code? <a href="#" onclick="event.preventDefault();resendRegisterCode(\'' + escapeJs(email) + '\', \'' + escapeJs(name) + '\', \'' + escapeJs(phone) + '\', \'' + escapeJs(password) + '\', \'' + escapeJs(referral) + '\');" style="color:#0a7b7b;font-weight:600;">Resend</a></p>';
}

function escapeJs(s) {
  if (!s) return '';
  return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n');
}

function resendRegisterCode(email, name, phone, password, referral) {
  verificationApiCall("POST", "send-code", { email: email, type: "register" })
    .then(function(data) {
      if (data.error) { showToast(data.error, "error"); return; }
      _regVerifyToken = data.token;
      showToast("New code sent to " + email, "success");
    })
    .catch(function() { showToast("Network error", "error"); });
}

function completeRegister(email, name, phone, password, referral) {
  var code = document.getElementById("regVerifyCode").value.trim();
  if (!code) { showToast("Please enter the verification code", "error"); return; }

  var btn = document.querySelector(".auth-modal-overlay button:not([onclick])");
  if (btn) { btn.disabled = true; btn.textContent = "Verifying..."; }

  // First verify the code
  verificationApiCall("POST", "verify-code", { token: _regVerifyToken, code: code })
    .then(function(vdata) {
      if (vdata.error) { showToast(vdata.error, "error"); if (btn) { btn.disabled = false; btn.textContent = "Verify & Create Account"; } return Promise.reject(vdata.error); }
      // Then register via API
      return apiCall("POST", "/api/register", {
        name: name, phone: phone, email: email, password: password,
        referral_code: referral || null
      });
    })
    .then(function(data) {
      if (!data) return;
      if (data.success || data.token) {
        setToken(data.token);
        setUserData(data.user || { name: name, email: email, phone: phone });
        showToast("Registration successful! Welcome to Nova Exchange", "success");
        closeModal(document.querySelector(".auth-modal-overlay"));
        updateAuthHeader();
      } else if (data.error) {
        showToast(data.error, "error");
        if (btn) { btn.disabled = false; btn.textContent = "Verify & Create Account"; }
      } else {
        showToast("Registration completed", "success");
        closeModal(document.querySelector(".auth-modal-overlay"));
        updateAuthHeader();
      }
    })
    .catch(function(err) {
      if (err && err !== true) showToast("Network error", "error");
      if (btn) { btn.disabled = false; btn.textContent = "Verify & Create Account"; }
    });
}

// ======================== LOGIN MODAL ========================
function showLoginModal() {
  showModal(
    '<div style="background:white;border-radius:24px;padding:36px 32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;">' +
    '<button onclick="closeModal(this.closest(\'.auth-modal-overlay\'))" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#8aaeb9;line-height:1;">&#x2715;</button>' +
    '<h2 style="font-size:24px;font-weight:700;color:#0a1c2f;margin-bottom:4px;">Welcome Back</h2>' +
    '<p style="color:#4a6a78;font-size:14px;margin-bottom:24px;">Sign in to your Nova Exchange account</p>' +
    '<div style="margin-bottom:16px;">' +
    '<label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Phone Number or Email</label>' +
    '<input type="text" id="loginAccount" placeholder="Phone or Email" class="auth-input" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;">' +
    '</div>' +
    '<div style="margin-bottom:24px;">' +
    '<label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Password</label>' +
    '<input type="password" id="loginPassword" placeholder="Password" class="auth-input" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;">' +
    '</div>' +
    '<button onclick="handleLogin()" style="width:100%;padding:14px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;">Sign In</button>' +
    '<div style="display:flex;justify-content:space-between;margin-top:16px;">' +
    '<p style="font-size:14px;color:#4a6a78;">Don\'t have an account? <a href="#" onclick="event.preventDefault();closeModal(this.closest(\'.auth-modal-overlay\'));showRegisterModal();" style="color:#0a7b7b;font-weight:600;">Register</a></p>' +
    '<p style="font-size:14px;color:#4a6a78;"><a href="#" onclick="event.preventDefault();closeModal(this.closest(\'.auth-modal-overlay\'));showForgotModal();" style="color:#0a7b7b;font-weight:600;">Forgot Password?</a></p>' +
    '</div></div>'
  );
}

function handleLogin() {
  var account = document.getElementById("loginAccount").value.trim();
  var password = document.getElementById("loginPassword").value;
  if (!account) { showToast("Please enter your phone or email", "error"); return; }
  if (!password) { showToast("Please enter your password", "error"); return; }

  var btn = document.querySelector(".auth-modal-overlay button");
  if (btn) { btn.disabled = true; btn.textContent = "Signing in..."; }

  apiCall("POST", "/api/login", { account: account, password: password })
    .then(function(data) {
      if (data.success || data.token) {
        setToken(data.token);
        setUserData(data.user);
        showToast("Welcome back!", "success");
        closeModal(document.querySelector(".auth-modal-overlay"));
        updateAuthHeader();
      } else if (data.error) {
        showToast(data.error, "error");
        if (btn) { btn.disabled = false; btn.textContent = "Sign In"; }
      }
    })
    .catch(function() { showToast("Network error", "error"); if (btn) { btn.disabled = false; btn.textContent = "Sign In"; } });
}

// ======================== FORGOT PASSWORD MODAL ========================
function showForgotModal() {
  showModal(
    '<div style="background:white;border-radius:24px;padding:36px 32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;">' +
    '<button onclick="closeModal(this.closest(\'.auth-modal-overlay\'))" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#8aaeb9;line-height:1;">&#x2715;</button>' +
    '<h2 style="font-size:24px;font-weight:700;color:#0a1c2f;margin-bottom:4px;">Reset Password</h2>' +
    '<p style="color:#4a6a78;font-size:14px;margin-bottom:24px;">We will send a verification code to your email</p>' +
    '<div style="margin-bottom:16px;">' +
    '<label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Email Address</label>' +
    '<input type="email" id="forgotEmail" placeholder="your@email.com" class="auth-input" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;">' +
    '</div>' +
    '<button id="forgotSendCodeBtn" onclick="handleForgotSendCode()" style="width:100%;padding:14px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;">Send Code</button>' +
    '<p style="text-align:center;margin-top:16px;font-size:14px;color:#4a6a78;"><a href="#" onclick="event.preventDefault();closeModal(this.closest(\'.auth-modal-overlay\'));showLoginModal();" style="color:#0a7b7b;font-weight:600;">Back to Login</a></p>' +
    '</div>'
  );
  _forgotVerifyToken = null;
}

function handleForgotSendCode() {
  var email = document.getElementById("forgotEmail").value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Please enter a valid email address", "error");
    return;
  }
  var btn = document.getElementById("forgotSendCodeBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Sending..."; startCountdown(btn, 60); }

  verificationApiCall("POST", "send-code", { email: email, type: "forgot" })
    .then(function(data) {
      if (data.error) { showToast(data.error, "error"); if (btn) { btn.disabled = false; btn.textContent = "Send Code"; } return; }
      _forgotVerifyToken = data.token;
      showToast("Verification code sent to " + email, "success");
      // Replace with code entry form
      var overlay = document.querySelector(".auth-modal-overlay div[style*='background:white']");
      if (!overlay) return;
      overlay.innerHTML =
        '<button onclick="closeModal(this.closest(\'.auth-modal-overlay\'))" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#8aaeb9;line-height:1;">&#x2715;</button>' +
        '<h2 style="font-size:24px;font-weight:700;color:#0a1c2f;margin-bottom:4px;">Enter Verification Code</h2>' +
        '<p style="color:#4a6a78;font-size:14px;margin-bottom:24px;">Code sent to ' + escapeHtml(email) + '</p>' +
        '<div style="margin-bottom:16px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Verification Code</label>' +
        '<input type="text" id="forgotCode" placeholder="4-digit code" maxlength="4" class="auth-input" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;"></div>' +
        '<div style="margin-bottom:16px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">New Password</label>' +
        '<input type="password" id="forgotNewPwd" placeholder="Min 6 characters" class="auth-input" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;"></div>' +
        '<div style="margin-bottom:16px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Confirm New Password</label>' +
        '<input type="password" id="forgotConfirmPwd" placeholder="Confirm password" class="auth-input" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;"></div>' +
        '<button onclick="handleForgotReset(\'' + escapeJs(email) + '\')" style="width:100%;padding:14px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;">Reset Password</button>' +
        '<p style="text-align:center;margin-top:16px;font-size:14px;color:#4a6a78;"><a href="#" onclick="event.preventDefault();closeModal(this.closest(\'.auth-modal-overlay\'));showLoginModal();" style="color:#0a7b7b;font-weight:600;">Back to Login</a></p>';
    })
    .catch(function() { showToast("Network error", "error"); if (btn) { btn.disabled = false; btn.textContent = "Send Code"; } });
}

function handleForgotReset(email) {
  var code = document.getElementById("forgotCode").value.trim();
  var newPwd = document.getElementById("forgotNewPwd").value;
  var confirmPwd = document.getElementById("forgotConfirmPwd").value;
  if (!code) { showToast("Please enter the verification code", "error"); return; }
  if (!newPwd || newPwd.length < 6) { showToast("Password must be at least 6 characters", "error"); return; }
  if (newPwd !== confirmPwd) { showToast("Passwords do not match", "error"); return; }

  var btn = document.querySelector(".auth-modal-overlay button");
  if (btn) { btn.disabled = true; btn.textContent = "Resetting..."; }

  verificationApiCall("POST", "verify-code", { token: _forgotVerifyToken, code: code })
    .then(function(vdata) {
      if (vdata.error) { showToast(vdata.error, "error"); if (btn) { btn.disabled = false; btn.textContent = "Reset Password"; } return Promise.reject(vdata.error); }
      return apiCall("POST", "/api/reset-password", { email: email, new_password: newPwd });
    })
    .then(function(data) {
      if (!data) return;
      if (data.success || data.message) {
        showToast("Password reset successful! Please login.", "success");
        closeModal(document.querySelector(".auth-modal-overlay"));
        showLoginModal();
      } else if (data.error) {
        showToast(data.error, "error");
        if (btn) { btn.disabled = false; btn.textContent = "Reset Password"; }
      } else {
        showToast("Password reset successful!", "success");
        closeModal(document.querySelector(".auth-modal-overlay"));
        showLoginModal();
      }
    })
    .catch(function(err) {
      if (err && err !== true) showToast("Network error", "error");
      if (btn) { btn.disabled = false; btn.textContent = "Reset Password"; }
    });
}

// ======================== BIND EMAIL MODAL ========================
var _bindVerifyToken = null;

function showBindEmailModal() {
  _bindVerifyToken = null;
  showModal(
    '<div style="background:white;border-radius:24px;padding:36px 32px;max-width:440px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;">' +
    '<button onclick="closeModal(this.closest(\'.auth-modal-overlay\'))" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#8aaeb9;line-height:1;">&#x2715;</button>' +
    '<h2 style="font-size:22px;font-weight:700;color:#0a1c2f;margin-bottom:4px;">Bind Email</h2>' +
    '<p style="color:#4a6a78;font-size:14px;margin-bottom:20px;">Link your email to this account</p>' +
    '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Email Address</label>' +
    '<div style="display:flex;gap:8px;">' +
    '<input type="email" id="bindEmail" placeholder="your@gmail.com" class="auth-input" style="flex:1;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;">' +
    '<button id="bindSendCodeBtn" onclick="handleBindSendCode()" style="padding:12px 16px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;min-width:100px;">Send Code</button></div></div>' +
    '<div style="margin-bottom:20px;"><label style="display:block;font-size:13px;font-weight:600;color:#0a1c2f;margin-bottom:4px;">Verification Code</label>' +
    '<input type="text" id="bindCode" placeholder="Enter 4-digit code" maxlength="4" class="auth-input" style="width:100%;padding:12px 16px;border:1.5px solid #e2edf2;border-radius:12px;font-size:15px;outline:none;background:#f8fafc;box-sizing:border-box;"></div>' +
    '<button onclick="handleBindEmail()" style="width:100%;padding:14px;background:#0a7b7b;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;">Bind Email</button>' +
    '</div>'
  );
}

function handleBindSendCode() {
  var email = document.getElementById("bindEmail").value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Please enter a valid email address", "error");
    return;
  }
  var btn = document.getElementById("bindSendCodeBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Sending..."; startCountdown(btn, 60); }

  verificationApiCall("POST", "send-code", { email: email, type: "bind-email" })
    .then(function(data) {
      if (data.error) { showToast(data.error, "error"); if (btn) { btn.disabled = false; btn.textContent = "Send Code"; } return; }
      _bindVerifyToken = data.token;
      showToast("Verification code sent to " + email, "success");
    })
    .catch(function() { showToast("Network error", "error"); if (btn) { btn.disabled = false; btn.textContent = "Send Code"; } });
}

function handleBindEmail() {
  var email = document.getElementById("bindEmail").value.trim();
  var code = document.getElementById("bindCode").value.trim();
  if (!email) { showToast("Please enter your email", "error"); return; }
  if (!code) { showToast("Please enter the verification code", "error"); return; }

  var btn = document.querySelector(".auth-modal-overlay button:last-of-type");
  if (btn) { btn.disabled = true; btn.textContent = "Binding..."; }

  verificationApiCall("POST", "verify-code", { token: _bindVerifyToken, code: code })
    .then(function(vdata) {
      if (vdata.error) { showToast(vdata.error, "error"); if (btn) { btn.disabled = false; btn.textContent = "Bind Email"; } return Promise.reject(vdata.error); }
      return apiCall("POST", "/api/me/bind-email", { email: email });
    })
    .then(function(data) {
      if (!data) return;
      if (data.success || data.message) {
        showToast("Email bound successfully!", "success");
        closeModal(document.querySelector(".auth-modal-overlay"));
        refreshUserData().then(function() { if (window.loadAccountData) window.loadAccountData(); });
      } else if (data.error) { showToast(data.error, "error"); if (btn) { btn.disabled = false; btn.textContent = "Bind Email"; } }
      else { showToast("Failed to bind email", "error"); if (btn) { btn.disabled = false; btn.textContent = "Bind Email"; } }
    })
    .catch(function(err) {
      if (err && err !== true) showToast("Network error", "error");
      if (btn) { btn.disabled = false; btn.textContent = "Bind Email"; }
    });
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
