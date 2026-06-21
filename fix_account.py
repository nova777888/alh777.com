import os
os.chdir('C:/Users/86156/Documents/Codex/2026-06-22/nova-exchange-https-github-com-nova777888/frontend')
with open('countries/nigeria/js/account.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add renderBalance function after "function renderProfile(user) {"
balance_func = '\n\nfunction renderBalance(balance) {\n  var sec = document.getElementById("balanceSection");\n  var el = document.getElementById("balanceContent");\n  if (!sec || !el) return;\n  sec.style.display = "block";\n  if (!balance) {\n    el.innerHTML = \'<div class="acc-empty">No balance data</div>\';\n    return;\n  }\n  el.innerHTML = \'<div class="acc-grid-2">\' +\n    \'<div class="acc-info-item"><span class="acc-label">Available Balance</span><span class="acc-value acc-balance">$\' + parseFloat(balance.available_balance || 0).toFixed(2) + \'</span></div>\' +\n    \'<div class="acc-info-item"><span class="acc-label">Total Earned</span><span class="acc-value">$\' + parseFloat(balance.total_earned || 0).toFixed(2) + \'</span></div>\' +\n    \'<div class="acc-info-item"><span class="acc-label">Total Withdrawn</span><span class="acc-value">$\' + parseFloat(balance.total_withdrawn || 0).toFixed(2) + \'</span></div>\' +\n    \'</div>\';\n}\n\n'
content = content.replace('function renderProfile(user) {', balance_func + 'function renderProfile(user) {')

# 2. Add balance loading to loadAccountData
old = 'setUserData(user);\n      renderProfile(user);\n    }\n  }).catch'
new = 'setUserData(user);\n      renderProfile(user);\n      if (data.balance) renderBalance(data.balance);\n    }\n  }).catch'
content = content.replace(old, new)

# 3. Fix loadSettings to update refLinkDisplay
old = 'function loadSettings() {\n  var user = getUserData();\n  if (!user) return;\n  var refId = user.referral_code || user.public_id || user.ref_id || "";\n  var refLink = "https://alh777.com?ref=" + refId;\n  var el = document.getElementById("settingsSection");\n  if (!el) return;\n  el.innerHTML ='
new = 'function loadSettings() {\n  var user = getUserData();\n  if (!user) return;\n  var refId = user.referral_code || user.public_id || user.ref_id || "";\n  var refLink = "https://alh777.com?ref=" + refId;\n  var refInput = document.getElementById("refLinkDisplay");\n  if (refInput) refInput.value = refLink;\n  var el = document.getElementById("settingsSection");\n  if (!el) return;\n  el.innerHTML ='
content = content.replace(old, new)

with open('countries/nigeria/js/account.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done - all fixes applied')