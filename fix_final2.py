import os
os.chdir("countries/nigeria/js")

with open("account.js", "rb") as f:
    raw = f.read()
text = raw.decode("utf-16")

# Fix 1: loadAccountData
old = 'function loadAccountData() {\n  apiCall("GET", "/api/me").then(function(data) {\n    if (data.user) {\n      setUserData(data.user);\n      renderProfile(data.user);\n    }\n  }).catch'
new = 'function loadAccountData() {\n  apiCall("GET", "/api/me").then(function(data) {\n    if (data && !data.error) {\n      var user = { name: data.name, email: data.email, phone: data.phone_masked || data.phone, public_id: data.public_id, role: data.role, balance: data.balance, referral_code: data.public_id, downline_count: data.downline_count };\n      setUserData(user);\n      renderProfile(user);\n      if (data.balance) renderBalance(data.balance);\n    }\n  }).catch'
text = text.replace(old, new, 1)

# Fix 2: loadSettings
old = 'function loadSettings() {\n  var user = getUserData();\n  if (!user) return;\n  var refId = user.referral_code || user.public_id || user.ref_id || "";\n  var refLink = "https://alh777.com?ref=" + refId;\n  var el = document.getElementById("settingsSection");\n  if (!el) return;\n  el.innerHTML ='
new = 'function loadSettings() {\n  var user = getUserData();\n  if (!user) return;\n  var refId = user.referral_code || user.public_id || user.ref_id || "";\n  var refLink = "https://alh777.com?ref=" + refId;\n  var refInput = document.getElementById("refLinkDisplay");\n  if (refInput) refInput.value = refLink;\n  var el = document.getElementById("settingsSection");\n  if (!el) return;\n  el.innerHTML ='
text = text.replace(old, new, 1)

# Fix 3: rename
text = text.replace("function handleChangePassword()", "function changePassword()")
text = text.replace('onclick="handleChangePassword()"', 'onclick="changePassword()"')

# Fix 4: renderBalance
rb = '\n\nfunction renderBalance(balance) {\n  var sec = document.getElementById("balanceSection");\n  var el = document.getElementById("balanceContent");\n  if (!sec || !el) return;\n  sec.style.display = "block";\n  if (!balance) {\n    el.innerHTML = "<div class=\\"acc-empty\\">No balance data</div>";\n    return;\n  }\n  el.innerHTML = "<div class=\\"acc-grid-2\\">" +\n    "<div class=\\"acc-info-item\\"><span class=\\"acc-label\\">Available Balance</span><span class=\\"acc-value acc-balance\\">$" + parseFloat(balance.available_balance || 0).toFixed(2) + "</span></div>" +\n    "<div class=\\"acc-info-item\\"><span class=\\"acc-label\\">Total Earned</span><span class=\\"acc-value\\">$" + parseFloat(balance.total_earned || 0).toFixed(2) + "</span></div>" +\n    "<div class=\\"acc-info-item\\"><span class=\\"acc-label\\">Total Withdrawn</span><span class=\\"acc-value\\">$" + parseFloat(balance.total_withdrawn || 0).toFixed(2) + "</span></div>" +\n    "</div>";\n}\n\n'
text = text.replace("function renderProfile", rb + "function renderProfile")

with open("account.js", "wb") as f:
    f.write(text.encode("utf-16"))

print("Done")