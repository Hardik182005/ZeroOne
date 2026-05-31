import os


def clean_env(name: str, default: str = "") -> str:
    """Read an env var, stripping a UTF-8 BOM (U+FEFF) and surrounding whitespace.

    Secrets uploaded via PowerShell / Secret Manager frequently carry a leading
    BOM and/or a trailing newline. Python's str.strip() does NOT remove U+FEFF,
    so a key like "﻿sk-...\n" stays malformed and triggers gRPC
    "Illegal header value" errors, ascii-codec crashes, or invalid Redis URLs.
    """
    return os.getenv(name, default).replace("﻿", "").strip()
