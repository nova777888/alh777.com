with open("countries/nigeria/account.html", "rb") as f:
    raw = f.read()

# Replace garbled placeholder text with English
replacements = [
    (b"placeholder=\"\xef\xbf\xbd\xef\xbf\xbd\xc7\xb0\xc3\xdc\xc2\xeb\"", b'placeholder="Current Password"'),
    (b"placeholder=\"\xc0\xef\xc3\xdc\xc2\xeb\xa3\xa8\xd6\xc1\xc9\xd96\xce\xbb\xa3\xa9\"", b'placeholder="New Password (min 6 chars)"'),
]

for old, new in replacements:
    if old in raw:
        raw = raw.replace(old, new)
        print(f"Replaced: {old} -> {new}")
    else:
        print(f"Not found: {old}")

with open("countries/nigeria/account.html", "wb") as f:
    f.write(raw)
print("Done")