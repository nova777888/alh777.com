import os
os.chdir("countries/nigeria/js")
with open("account.js", "rb") as f:
    raw = f.read()
text = raw.decode("utf-16")

# Update changePassword to use account.html's field IDs (resetOldPw, resetNewPw, resetConfirmPw)
old_func = 'function changePassword() {\n  var oldPw = document.getElementById("chgOldPw").value;\n  var newPw = document.getElementById("chgNewPw").value;\n  var confirmPw = document.getElementById("chgConfirmPw").value;'
new_func = 'function changePassword() {\n  var oldPw = document.getElementById("resetOldPw").value;\n  var newPw = document.getElementById("resetNewPw").value;\n  var confirmPw = document.getElementById("resetConfirmPw").value;'
text = text.replace(old_func, new_func)

# Update the catch handler to find the right button
text = text.replace('document.querySelector("button[onclick*=' + "'changePassword']" + '");', 'document.querySelector(".acc-copy-btn:last-of-type");')

with open("account.js", "wb") as f:
    f.write(text.encode("utf-16"))
print("Done")