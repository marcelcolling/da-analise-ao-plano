"""
Conferências do portal (rodar na raiz do repositório):
    python ferramentas/conferir_integridade.py          (no Git Bash: PYTHONIOENCODING=utf-8)

1. Texto íntegro: cada guia (guias/*.html) contém, na mesma ordem, todas as palavras do Markdown de origem
   (conteudo/*.md). O que o portal acrescenta fica entre <!--g--> e <!--/g--> e é ignorado.
2. Links: todo href local das páginas estáticas aponta para um arquivo que existe e, se tiver #âncora, para um id que existe.
   Também confere as âncoras dos guias usadas em assets/js/folhas.js (guia: ['05', 'âncora']).
3. Privacidade: nenhum código de envio de dados (fetch, XMLHttpRequest, sendBeacon, formulário com action, Apps Script)
   nas páginas e scripts do portal. As respostas só podem ficar no navegador e no arquivo da empresa.
Sai com código 1 se algo falhar.
"""
import difflib
import html
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "ferramentas"))
from gerar_guias import GUIAS  # noqa: E402

falhas = 0


def palavras(t):
    return re.findall(r"\w+", t.lower())


def md_texto(md):
    linhas = []
    for l in md.splitlines():
        s = l.strip()
        if s.startswith("```") or re.fullmatch(r"-{3,}", s) or re.fullmatch(r"\|?[\s:\-|]+\|?", s or "x"):
            continue
        if re.match(r"^#{1,6}\s+", s):
            s = re.sub(r"^#{1,6}\s+", "", s)
        else:
            s = re.sub(r"^>\s?", "", s)
            s = re.sub(r"^[-*] \[[ xX]\]\s+", "", s)
            s = re.sub(r"^[-*]\s+", "", s)
            s = re.sub(r"^\d+\.\s+", "", s)
        s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
        linhas.append(s)
    return "\n".join(linhas)


def html_texto(h):
    h = re.sub(r"<!--g-->.*?<!--/g-->", " ", h, flags=re.S)
    m = re.search(r'<main class="wrapper">(.*)</main>', h, flags=re.S)
    h = m.group(1) if m else h
    h = re.sub(r'<div class="hero-tag">.*?</div>', " ", h, flags=re.S)   # selo do portal ("Guia 05 · Bloco 4")
    return html.unescape(re.sub(r"<[^>]+>", " ", h))


print("1. Texto íntegro dos guias")
for g in GUIAS:
    md = (RAIZ / "conteudo" / g["fonte"]).read_text(encoding="utf-8")
    pg = (RAIZ / "guias" / g["destino"]).read_text(encoding="utf-8")
    a = palavras(md_texto(md))
    # o número do título ("# 05 — ...") vira o selo do portal; não é texto do guia
    m = re.match(r"#\s+(\d\d)\s+—", md)
    if m and a and a[0] == m.group(1):
        a = a[1:]
    b = palavras(html_texto(pg))
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    faltam, sobram = [], []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op in ("delete", "replace"):
            faltam.append(" ".join(a[i1:i2]))
        if op in ("insert", "replace"):
            sobram.append(" ".join(b[j1:j2]))
    ok = not faltam and not sobram
    falhas += 0 if ok else 1
    print(f"  {'OK  ' if ok else 'FALHA'} {g['destino']}: {len(a)} palavras no Markdown, {len(b)} na página, semelhança {sm.ratio():.4f}")
    for f in faltam[:8]:
        print("      falta:", f[:120])
    for s in sobram[:8]:
        print("      sobra:", s[:120])

print("2. Links e âncoras")
ids_cache = {}


def ids(arq):
    if arq not in ids_cache:
        ids_cache[arq] = set(re.findall(r'\sid="([^"]+)"', arq.read_text(encoding="utf-8")))
    return ids_cache[arq]


paginas = [RAIZ / "index.html", RAIZ / "caderno.html"] + sorted((RAIZ / "guias").glob("*.html")) + sorted((RAIZ / "folhas").glob("*.html"))
n_links = 0
for p in paginas:
    for href in re.findall(r'href="([^"]+)"', p.read_text(encoding="utf-8")):
        if re.match(r"^(https?:|mailto:|#$)", href) or "'" in href:   # href montado por script (index.html)
            continue
        n_links += 1
        caminho, _, ancora = href.partition("#")
        caminho = caminho.split("?")[0]
        alvo = (p.parent / caminho).resolve() if caminho else p
        if not alvo.exists():
            print(f"  FALHA {p.relative_to(RAIZ)}: {href} → arquivo não existe"); falhas += 1; continue
        if ancora and alvo.suffix == ".html" and "folhas" not in alvo.parts and ancora not in ids(alvo):
            print(f"  FALHA {p.relative_to(RAIZ)}: {href} → âncora não existe"); falhas += 1
# âncoras dos guias usadas nas folhas
folhas_js = (RAIZ / "assets" / "js" / "folhas.js").read_text(encoding="utf-8")
destinos = {g["destino"][:2]: g["destino"] for g in GUIAS}
for num, anc in re.findall(r"guia: \['(\d\d)', '([^']+)'\]", folhas_js):
    if anc == "âncora":   # exemplo no comentário do topo
        continue
    n_links += 1
    if anc not in ids(RAIZ / "guias" / destinos[num]):
        print(f"  FALHA folhas.js: guia {num} #{anc} não existe"); falhas += 1
# âncoras das folhas usadas nos guias (#s-<id da seção>)
secoes = set(re.findall(r"\{ id: '([a-z0-9-]+)', n:", folhas_js))
for p in sorted((RAIZ / "guias").glob("*.html")):
    for anc in re.findall(r'href="\.\./folhas/[a-z0-9]+\.html#s-([a-z0-9-]+)"', p.read_text(encoding="utf-8")):
        n_links += 1
        if anc not in secoes:
            print(f"  FALHA {p.name}: seção s-{anc} não existe nas folhas"); falhas += 1
print(f"  {n_links} links conferidos")

print("3. Privacidade: nenhum envio de dados")
proibidos = re.compile(r"\bfetch\s*\(|XMLHttpRequest|sendBeacon|script\.google|<form[^>]+action=|navigator\.share|WebSocket\(|\.ajax\(", re.I)
arquivos = sorted((RAIZ / "assets" / "js").glob("*.js")) + paginas
for a in arquivos:
    for n, linha in enumerate(a.read_text(encoding="utf-8").splitlines(), 1):
        if proibidos.search(linha):
            print(f"  FALHA {a.relative_to(RAIZ)}:{n}: {linha.strip()[:100]}"); falhas += 1
externos = set()
for p in paginas:
    for src in re.findall(r'<(?:script|link)[^>]+(?:src|href)="(https?://[^"]+)"', p.read_text(encoding="utf-8")):
        externos.add(re.sub(r"^(https?://[^/]+).*", r"\1", src))
print(f"  {len(arquivos)} arquivos sem código de envio; recursos externos só de: {', '.join(sorted(externos)) or 'nenhum'}")

print("---")
print("TUDO OK" if not falhas else f"{falhas} FALHA(S)")
sys.exit(1 if falhas else 0)
