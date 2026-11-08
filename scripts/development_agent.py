#!/usr/bin/env python3
"""Protótipo E1: executor determinístico e seguro para a equipe Desenvolvimento.

Sem IA externa, sem segredos, sem alterações no código-fonte.
Produz um relatório JSON reproduzível para auditoria.
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def command(args, timeout=90):
    try:
        p = subprocess.run(args, cwd=ROOT, capture_output=True, text=True,
                           timeout=timeout, check=False)
        return {"command": args, "exit_code": p.returncode,
                "stdout_tail": p.stdout[-2500:], "stderr_tail": p.stderr[-2500:]}
    except (OSError, subprocess.TimeoutExpired) as exc:
        return {"command": args, "exit_code": None, "error": str(exc)}

def run():
    package = ROOT / "package.json"
    if not package.exists():
        raise RuntimeError("package.json ausente")
    data = json.loads(package.read_text(encoding="utf-8"))
    scripts = data.get("scripts", {})
    results = []
    for name in ("test", "build"):
        if name in scripts:
            results.append(command(["npm", "run", name]))
    report = {"schema_version": 1, "team": "desenvolvimento",
              "generated_at": datetime.now(timezone.utc).isoformat(),
              "commit": os.environ.get("GITHUB_SHA", "local"),
              "mode": "deterministic-read-only",
              "checks": results,
              "passed": bool(results) and all(item["exit_code"] == 0 for item in results)}
    out = ROOT / "agent-reports"
    out.mkdir(exist_ok=True)
    (out / "development.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0 if report["passed"] else 1

if __name__ == "__main__":
    try:
        sys.exit(run())
    except Exception as exc:
        print(f"Erro controlado: {exc}", file=sys.stderr)
        sys.exit(1)
