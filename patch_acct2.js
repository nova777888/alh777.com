const fs = require("fs");
const text = fs.readFileSync("countries/nigeria/js/account.js", "utf8");

let result = text.replace(
  'setUserData(user);\n      renderProfile(user);',
  'setUserData(user);\n      renderProfile(user);\n      if (data.balance) renderBalance(data.balance);'
);

result = result.replace(
  'document.getElementById("settingsSection");',
  'document.getElementById("refLinkDisplay");\n  if (refInput) refInput.value = refLink;\n  var el = document.getElementById("settingsSection");'
);

result = result.replace(
  'var refInput = document.getElementById("refLinkDisplay");\n  if (refInput) refInput.value = refLink;\n  var el = document.getElementById("refLinkDisplay");',
  'var refInput = document.getElementById("refLinkDisplay");\n  if (refInput) refInput.value = refLink;\n  var el = document.getElementById("settingsSection");'
);

fs.writeFileSync("countries/nigeria/js/account.js", result, "utf8");
console.log("Done");
