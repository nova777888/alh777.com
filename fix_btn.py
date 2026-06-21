import os
os.chdir("countries/nigeria")
with open("account.html", "rb") as f:
    raw = f.read()
raw = raw.replace(b'onclick="resetPasswordWithCode()"', b'onclick="changePassword()"')
with open("account.html", "wb") as f:
    f.write(raw)
print("Fixed")