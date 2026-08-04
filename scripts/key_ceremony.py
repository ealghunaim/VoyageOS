"""Key ceremony helpers — generate, seal a proof, and restore from paper.

Three commands, in the order you use them.

    generate   mint a master key straight onto the clipboard, never on screen
    seal       encrypt a sentinel under the key you are about to write down,
               saving the ciphertext to a file that is safe to keep
    verify     type the key back from paper and prove it opens that sentinel

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
    raw = getpass.getpass(prompt).strip()
    try:
        key = base64.b64decode(raw)
    except Exception:
        print("  ✗ not valid base64 — check for a transcription slip"); sys.exit(1)
    if len(key) != 32:
        print(f"  ✗ decodes to {len(key)} bytes, expected 32 — likely a missing "
              "or extra character"); sys.exit(1)
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
    cmds = {"generate": cmd_generate, "seal": cmd_seal, "verify": cmd_verify}
    if len(sys.argv) < 2 or sys.argv[1] not in cmds:
        print(__doc__)
        print(f"  usage: {sys.argv[0]} [{' | '.join(cmds)}]")
        return 2
    return cmds[sys.argv[1]]()


if __name__ == "__main__":
    raise SystemExit(main())
