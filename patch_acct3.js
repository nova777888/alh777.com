const fs = require("fs");
const text = fs.readFileSync("countries/nigeria/js/account.js", "utf8");

let result = text.replace(
  "setUserData(user);\n      renderProfile(user);\n    }\n  }).catch",
  "setUserData(user);\n      renderProfile(user);\n      if (data.balance) renderBalance(data.balance);\n    }\n  }).catch"
);

fs.writeFileSync("countries/nigeria/js/account.js", result, "utf8");
console.log("Added renderBalance call");
