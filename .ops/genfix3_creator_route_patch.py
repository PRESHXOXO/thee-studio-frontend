from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

replacements = [
    ('hL("/compat/creators")', 'hL("/creators")'),
    ('const n=r.data&&Array.isArray(r.data.rows)?r.data.rows:Array.isArray(r.data)?r.data:[]',
     'const n=r.data&&Array.isArray(r.data.creators)?r.data.creators:Array.isArray(r.data)?r.data:[]'),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected one occurrence of {old!r}, found {count}")
    text = text.replace(old, new, 1)

with path.open("w", encoding="utf-8", newline="") as handle:
    handle.write(text)
