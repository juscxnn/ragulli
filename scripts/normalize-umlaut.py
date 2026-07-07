#!/usr/bin/env python3
"""Normalize RAGülli umlaut byte sequence to canonical combining diaeresis form.

Per spec §10.1, the umlaut on the u is U+0308 (combining diaeresis) — NOT
the precomposed U+00FC (ü). The visible glyph is identical but the byte
sequence is canonical and stable across fonts.

Replaces every `ü` (UTF-8: \xc3\xbc) with `u\u0308` (UTF-8: \x75\xcc\x88).
Operates on a whitelist of files/directories we own.
"""
import os
import sys

ROOTS = [
    "index.html",
    "vite.config.ts",
    "app/index.html",
    "t",
    "compare",
    "privacy.html",
    "src/landing",
    "src/styles",
    "scripts",
]

EXTENSIONS = (".html", ".ts", ".tsx", ".css", ".mjs", ".json", ".md")

def should_process(path: str) -> bool:
    if not path.endswith(EXTENSIONS):
        return False
    for root in ROOTS:
        if path == root or path.startswith(root + os.sep):
            return True
    return False

def main() -> int:
    changed: list[str] = []
    for root in ROOTS:
        if os.path.isfile(root):
            targets = [root]
        else:
            targets = []
            for dirpath, _dirs, files in os.walk(root):
                for f in files:
                    targets.append(os.path.join(dirpath, f))
        for path in targets:
            if not should_process(path):
                continue
            try:
                with open(path, "rb") as fh:
                    data = fh.read()
            except OSError:
                continue
            if b"\xc3\xbc" not in data:
                continue
            new = data.replace(b"\xc3\xbc", b"u\xcc\x88")
            with open(path, "wb") as fh:
                fh.write(new)
            changed.append(path)
            print(f"  fixed {path} ({data.count(b'\\xc3\\xbc')} occurrence(s))")
    print(f"\nTotal: {len(changed)} file(s) normalized")
    return 0

if __name__ == "__main__":
    sys.exit(main())