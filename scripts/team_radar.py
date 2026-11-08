#!/usr/bin/env python3
"""Weekly, bounded GitHub research and static navigation audit. Stdlib only."""
import datetime as dt
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

TOKEN = os.environ["GITHUB_TOKEN"]
REPO = os.environ["GITHUB_REPOSITORY"]
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json",
           "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "alfred-team-radar"}
TODAY = dt.datetime.now(dt.timezone.utc).date().isoformat()

def api(path, method="GET", payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request("https://api.github.com" + path, data=data, headers=HEADERS, method=method)
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.load(response)

def comment(issue, body):
    api(f"/repos/{REPO}/issues/{issue}/comments", "POST", {"body": body})

def design():
    source = Path("src/app/App.tsx").read_text(encoding="utf-8")
    sections = re.findall(r"\{ id: '([^']+)', label: '([^']+)', icon:", source)
    primary = re.search(r"const mobilePrimary: SectionId\[\] = \[([^]]+)\]", source)
    more = re.search(r"const mobileMore: SectionId\[\] = \[([^]]+)\]", source)
    parse = lambda m: re.findall(r"'([^']+)'", m.group(1)) if m else []
    p, m = parse(primary), parse(more)
    body = (f"### Auditoria estática automática — {TODAY}\n"
            f"- Seções encontradas ({len(sections)}): " + ", ".join(f"{label} (`{id}`)" for id,label in sections) + "\n"
            f"- Barra móvel: {', '.join(p) or 'não detectada'}\n"
            f"- Menu Mais: {', '.join(m) or 'não detectado'}\n"
            "- **Limitação:** leitura de código, não equivale a teste visual, acessibilidade ou validação em dispositivos.\n"
            "- **Próxima ação humana:** revisar jornadas e protótipos antes de alterar a interface.\n")
    comment(109, body)

def radar():
    queries = [
        ("voz", "speech recognition browser in:name,description"),
        ("agenda", "icalendar typescript in:name,description"),
        ("estudos", "spaced repetition typescript in:name,description"),
        ("automação", "workflow automation typescript in:name,description"),
    ]
    lines = [f"### Radar open source automático — {TODAY}",
             "Busca de repositórios públicos no GitHub; **candidatos, não recomendações validadas**.",
             "Não foram instaladas dependências nem enviados dados do usuário."]
    for category, query in queries:
        try:
            q = urllib.parse.quote(query + " archived:false fork:false")
            data = api(f"/search/repositories?q={q}&sort=updated&order=desc&per_page=3")
            lines.append(f"\n**{category.capitalize()}**")
            for item in data.get("items", []):
                license_name = (item.get("license") or {}).get("spdx_id") or "não identificada"
                lines.append(f"- [{item['full_name']}]({item['html_url']}) — licença: {license_name}; "
                             f"última atualização: {item.get('updated_at', '?')[:10]}; "
                             f"estrelas: {item.get('stargazers_count', '?')}.")
        except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as exc:
            lines.append(f"\n**{category.capitalize()}**: consulta indisponível ({type(exc).__name__}).")
    lines.extend(["\n**Pendente de avaliação humana:** compatibilidade PWA/offline, privacidade, "
                  "segurança, qualidade, manutenção, licença e custo total.",
                  "Nenhuma integração deve ocorrer automaticamente."])
    comment(110, "\n".join(lines))

if __name__ == "__main__":
    design()
    radar()
