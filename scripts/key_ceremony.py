"""Key ceremony helpers — generate, seal a proof, and restore from paper.

Three commands, in the order you use them.

    generate     mint a master key straight onto the clipboard, never on screen
    seal         encrypt a sentinel under the key you are about to write down,
                 saving the ciphertext to a file that is safe to keep
    verify       type the key back from paper and prove it opens that sentinel
    fingerprint  identify any copy of the key — Render, a password manager —
                 without storing or changing anything

The verify step is the part that matters. Copying a key into three places is
storage; typing it back from the paper copy and watching it decrypt something
is the only thing that proves the paper copy is correct and legible. An
untested backup is not a backup.

The key is never echoed and never passed as an argument — arguments land in
shell history and in process listings. It is read with getpass, so nothing
appears as you type.
"""
from __future__ import annotations

import base64
import getpass
import hashlib
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # noqa: E402

PROOF = os.path.expanduser("~/voyageos-key-proof.txt")
SENTINEL = b"voyageos master key proof"
AAD = b"key-ceremony"


def read_key(prompt: str) -> bytes:
    raw = getpass.getpass(prompt)
    # Strip every kind of whitespace, not just the ends: a key copied out of a
    # wrapped terminal or a password manager can arrive with a newline or a
    # space through the middle of it.
    raw = "".join(raw.split())

    if not raw:
        print("  ✗ nothing was entered.")
        print("    If you pasted several commands at once, the shell fed the next")
        print("    line into this prompt. Run one command at a time.")
        sys.exit(1)
    if raw.startswith(".venv") or raw.startswith("rm ") or "/" in raw and " " in raw:
        print("  ✗ that looks like a shell command, not a key.")
        print("    Pasting multiple commands at once feeds the next line into this")
        print("    prompt. Run one command at a time.")
        sys.exit(1)
    try:
        key = base64.b64decode(raw, validate=True)
    except Exception:
        print(f"  ✗ not valid base64 ({len(raw)} characters read).")
        print("    A master key is 44 characters ending in '='. Check for a")
        print("    dropped or doubled character — I and l, 0 and O are the usual ones.")
        sys.exit(1)
    if len(key) != 32:
        print(f"  ✗ decodes to {len(key)} bytes, expected 32 — a character is "
              "missing or extra."); sys.exit(1)
    return key


def fingerprint(key: bytes) -> str:
    """Short public identifier for a key. Safe to say out loud; not the key."""
    return hashlib.sha256(key).hexdigest()[:12]


def cmd_generate() -> int:
    key = base64.b64encode(os.urandom(32)).decode()
    subprocess.run(["pbcopy"], input=key.encode(), check=True)
    print("  A new master key is on your clipboard. It was not printed.")
    print(f"  fingerprint: {fingerprint(base64.b64decode(key))}")
    print("\n  Paste it into, in this order:")
    print("    1. Render  → MASTER_KEK_V1   (and MASTER_KEK_VERSION = 1)")
    print("    2. your password manager, marked never-delete")
    print("    3. paper, written by hand, stored offline")
    print("\n  Then run:  .venv/bin/python3 scripts/key_ceremony.py seal")
    return 0


def cmd_fingerprint() -> int:
    """Identify a key without storing, printing or comparing anything.

    For checking that a copy elsewhere — Render's environment field, a password
    manager entry — is the same key you verified from paper. Matching
    fingerprints mean matching keys; the fingerprint itself is safe to read
    aloud or write down, because sha256 does not run backwards.

    Read-only on purpose: seal would answer the same question but rewrites the
    proof file, and a command run to check something should not change it.
    """
    key = read_key("  Paste the key to identify (input hidden): ")
    print(f"\n  fingerprint: {fingerprint(key)}")
    print("  Compare it against the one you recorded. Equal means the same key.")
    return 0


def cmd_seal() -> int:
    key = read_key("  Paste the master key (input hidden): ")
    nonce = os.urandom(12)
    blob = nonce + AESGCM(key).encrypt(nonce, SENTINEL, AAD)
    with open(PROOF, "w") as f:
        f.write(base64.b64encode(blob).decode() + "\n")
    os.chmod(PROOF, 0o600)
    print(f"  fingerprint: {fingerprint(key)}   ← write this on the paper too")
    print(f"  proof written: {PROOF}")
    print("  That file is ciphertext. It is safe to keep and useless without the key.")
    print("\n  Now, from the PAPER copy — not the clipboard — run:")
    print("    .venv/bin/python3 scripts/key_ceremony.py verify")
    return 0


def cmd_verify() -> int:
    if not os.path.exists(PROOF):
        print(f"  ✗ no proof file at {PROOF} — run 'seal' first"); return 1
    blob = base64.b64decode(open(PROOF).read().strip())
    key = read_key("  Type the master key FROM PAPER (input hidden): ")
    try:
        opened = AESGCM(key).decrypt(blob[:12], blob[12:], AAD)
    except Exception:
        print(f"  ✗ RESTORE FAILED — this key does not open the proof.")
        print("    The paper copy is wrong, illegible, or transcribed with an error.")
        print("    Fix it now, while the correct key is still in your password manager.")
        return 1
    ok = opened == SENTINEL
    print(f"  fingerprint: {fingerprint(key)}")
    print(f"\n  {'✓ RESTORE VERIFIED — the paper copy works' if ok else '✗ decrypted, but wrong content'}")
    if ok:
        print("  Delete the proof file when you are done:  rm ~/voyageos-key-proof.txt")
    return 0 if ok else 1


def main() -> int:
    cmds = {"generate": cmd_generate, "seal": cmd_seal, "verify": cmd_verify,
            "fingerprint": cmd_fingerprint}
    if len(sys.argv) < 2 or sys.argv[1] not in cmds:
        print(__doc__)
        print(f"  usage: {sys.argv[0]} [{' | '.join(cmds)}]")
        return 2
    return cmds[sys.argv[1]]()


if __name__ == "__main__":
    raise SystemExit(main())
