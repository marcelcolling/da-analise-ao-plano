"""
Auditoria das páginas renderizadas (o que o conferidor estático não vê: as folhas são montadas por JavaScript).

Uso (na raiz do repositório):
    python ferramentas/verificar_paginas.py            (no Git Bash: PYTHONIOENCODING=utf-8)

Abre todas as páginas no Edge headless, em três estados (caderno vazio, caderno preenchido com os dados da
AgroSense, modo ?exemplo) e duas larguras (1366px e 500px), e confere em cada uma:
  - erros de JavaScript;
  - página mais larga que a tela (e quais elementos passam da borda);
  - ids repetidos, mais de um h1, campos sem rótulo acessível, botões e links sem texto;
  - texto quebrado na tela ("undefined", "NaN", "[object");
  - links locais (inclusive os gerados por JavaScript): o arquivo existe e a #âncora existe na página de destino renderizada.
E gera o PDF de cada folha e do caderno completo (Page.printToPDF), conferindo número de páginas e texto quebrado.
Sai com código 1 se algo falhar.
"""
import base64
import json
import pathlib
import random
import re
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "ferramentas"))
from capturar_telas import WS, EDGE, encerrar, servir, SCRIPTS_OK  # noqa: E402

# portas sorteadas: uma execução nunca conversa com o navegador ou o servidor de outra
PORTA_SITE = 8700 + random.randrange(90)
PORTA_CDP = PORTA_SITE + 700
FOLHAS = ["abertura", "bloco1", "bloco2", "bloco3", "bloco4", "bloco5", "fechamento", "bloco6"]
GUIAS = sorted(p.name for p in (RAIZ / "guias").glob("*.html"))
PAGINAS = ["/index.html", "/caderno.html"] + [f"/folhas/{f}.html" for f in FOLHAS] + [f"/guias/{g}" for g in GUIAS]

AUDITORIA = r"""(function(){
  var r = {};
  r.erros = window.__erros || [];
  r.largura = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  var ids = {}, dup = [];
  document.querySelectorAll('[id]').forEach(function (e) { if (ids[e.id]) dup.push(e.id); ids[e.id] = 1; });
  r.dup = dup; r.ids = Object.keys(ids);
  r.links = Array.prototype.map.call(document.querySelectorAll('a[href]'), function (a) { return a.getAttribute('href'); });
  function rotulado(e) {
    return e.getAttribute('aria-label') || e.closest('label') || (e.id && document.querySelector('label[for="' + e.id + '"]')) || e.title;
  }
  r.semRotulo = Array.prototype.filter.call(document.querySelectorAll('input:not([type=hidden]):not([type=file]), select, textarea'), function (e) { return !rotulado(e); })
    .map(function (e) { return e.dataset.k || e.name || e.outerHTML.slice(0, 70); });
  r.vazios = Array.prototype.filter.call(document.querySelectorAll('button, a[href]'), function (b) {
    return !(b.textContent.trim() || b.getAttribute('aria-label') || b.title);
  }).map(function (b) { return b.outerHTML.slice(0, 90); });
  var txt = document.body.innerText;
  r.lixo = (txt.match(/undefined|NaN|\[object|\bnull\b/g) || []);
  r.h1 = document.querySelectorAll('h1').length;
  r.largos = Array.prototype.filter.call(document.querySelectorAll('body *'), function (e) {
    var b = e.getBoundingClientRect();
    if (!b.width || b.right <= LARG + 1) return false;
    var s = getComputedStyle(e);
    if (s.position === 'fixed' || s.visibility === 'hidden') return false;
    return !e.closest('.svg-rolagem, .mat-wrap, .r-tab-wrap, .e-nav-in, pre, #sidebar, .vd-modal, .vd-toast');   // molduras que rolam de propósito
  }).slice(0, 6).map(function (e) { return e.tagName.toLowerCase() + '.' + String(e.className).slice(0, 40); });
  return JSON.stringify(r);
})()"""


def carregar(ws, url, marca):
    ws.cmd("Page.navigate", url=url)
    for k in range(100):
        v = ws.cmd("Runtime.evaluate", returnByValue=True,
                   expression=f"JSON.stringify([location.href.indexOf('{marca}')>=0, document.readyState, !!document.querySelector('.vd-topbar') && " + SCRIPTS_OK + ", document.fonts.status])")
        v = json.loads(v.get("result", {}).get("value") or "[false]")
        if v[0] and v[1] == "complete" and v[2] and v[3] == "loaded":
            break
        if k in (25, 50, 75):   # algum script não chegou: recarrega
            ws.cmd("Page.reload", ignoreCache=True)
        time.sleep(0.2)
    else:
        return False
    time.sleep(0.5)
    return True


def main():
    falhas = []
    site = servir(PORTA_SITE)
    edge = subprocess.Popen([EDGE, "--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
                             f"--remote-debugging-port={PORTA_CDP}", f"--user-data-dir={tempfile.mkdtemp(prefix='ws-audit-')}", "about:blank"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = f"http://127.0.0.1:{PORTA_SITE}"
    try:
        alvo = None
        for _ in range(40):
            try:
                alvo = next(t for t in json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORTA_CDP}/json")) if t["type"] == "page")
                break
            except Exception:
                time.sleep(0.5)
        ws = WS(alvo["webSocketDebuggerUrl"])
        ws.cmd("Page.enable"); ws.cmd("Runtime.enable"); ws.cmd("Page.bringToFront")
        ws.cmd("Emulation.setFocusEmulationEnabled", enabled=True)
        ws.cmd("Page.addScriptToEvaluateOnNewDocument", source="window.__erros=[];addEventListener('error',function(e){window.__erros.push(String(e.message)+' @'+(e.filename||'').split('/').pop()+':'+e.lineno)});")
        ids_por_pagina = {}
        n = 0
        for estado in ("vazio", "preenchido", "exemplo"):
            # estado do navegador
            carregar(ws, base + "/index.html?prep=" + estado, "prep=" + estado)
            for _ in range(40):
                if ws.cmd("Runtime.evaluate", returnByValue=True, expression="!!window.WS_EXEMPLO").get("result", {}).get("value"):
                    break
                time.sleep(0.2)
            semente = "localStorage.clear();" if estado != "preenchido" else \
                "localStorage.clear(); localStorage.setItem('ws_caderno_v1', JSON.stringify({formato:'caderno-estrategia', v:1, campos: window.WS_EXEMPLO.campos, atualizado: Date.now(), arquivo: null}))"
            ws.cmd("Runtime.evaluate", expression=semente)
            paginas = PAGINAS if estado != "exemplo" else ["/caderno.html"] + [f"/folhas/{f}.html" for f in FOLHAS]
            for largura in (1366, 500):
                ws.cmd("Emulation.setDeviceMetricsOverride", width=largura, height=1000, deviceScaleFactor=1, mobile=largura < 700)
                for pagina in paginas:
                    n += 1
                    marca = f"aud{n}"
                    q = ("?exemplo&" if estado == "exemplo" else "?") + "x=" + marca
                    rot = f"[{estado} {largura}px] {pagina}"
                    if not carregar(ws, base + pagina + q, marca):
                        falhas.append(f"{rot}: não carregou"); continue
                    r = json.loads(ws.cmd("Runtime.evaluate", returnByValue=True, expression=AUDITORIA.replace("LARG", str(largura)))["result"]["value"])
                    ids_por_pagina[(pagina, estado)] = set(r["ids"])
                    if r["erros"]: falhas.append(f"{rot}: erro de JavaScript {r['erros']}")
                    if r["largura"] > largura: falhas.append(f"{rot}: página com {r['largura']}px numa tela de {largura}px; passam da borda: {r['largos']}")
                    elif r["largos"]: falhas.append(f"{rot}: elementos passam da borda (cortados): {r['largos']}")
                    if r["dup"]: falhas.append(f"{rot}: ids repetidos {sorted(set(r['dup']))[:8]}")
                    if r["h1"] != 1: falhas.append(f"{rot}: {r['h1']} h1")
                    if r["semRotulo"]: falhas.append(f"{rot}: campos sem rótulo {r['semRotulo'][:6]}")
                    if r["vazios"]: falhas.append(f"{rot}: botões/links sem texto {r['vazios'][:4]}")
                    if r["lixo"]: falhas.append(f"{rot}: texto quebrado na tela {sorted(set(r['lixo']))}")
                    if largura == 1366:
                        for href in r["links"]:
                            if re.match(r"^(https?:|mailto:|#$|javascript:)", href):
                                continue
                            alvo_url = urllib.parse.urljoin(base + pagina, href)
                            u = urllib.parse.urlparse(alvo_url)
                            arq = RAIZ / urllib.parse.unquote(u.path).lstrip("/")
                            if u.path.endswith("/"):
                                arq = arq / "index.html"
                            if not arq.exists():
                                falhas.append(f"{rot}: link {href} → arquivo não existe"); continue
                            if u.fragment:
                                destino = "/" + arq.relative_to(RAIZ).as_posix()
                                ids_por_pagina.setdefault(("__pend", estado), []).append((rot, href, destino, u.fragment, "exemplo" in u.query))
        # âncoras: conferidas contra os ids renderizados da página de destino
        for estado in ("vazio", "preenchido", "exemplo"):
            for rot, href, destino, frag, ex in ids_por_pagina.get(("__pend", estado), []):
                ids = ids_por_pagina.get((destino, "exemplo" if ex else estado)) or ids_por_pagina.get((destino, "preenchido"))
                if ids is None or urllib.parse.unquote(frag) not in ids:
                    falhas.append(f"{rot}: link {href} → âncora #{frag} não existe em {destino}")
        print(f"{n} carregamentos de página auditados")

        # PDFs (caderno preenchido)
        ws.cmd("Emulation.setDeviceMetricsOverride", width=1366, height=1000, deviceScaleFactor=1, mobile=False)
        carregar(ws, base + "/index.html?prep=pdf", "prep=pdf")
        ws.cmd("Runtime.evaluate", expression="localStorage.clear(); localStorage.setItem('ws_caderno_v1', JSON.stringify({formato:'caderno-estrategia', v:1, campos: window.WS_EXEMPLO.campos, atualizado: Date.now(), arquivo: null}))")
        try:
            import pymupdf as fitz
        except ImportError:
            fitz = None
        for pagina in [f"/folhas/{f}.html" for f in FOLHAS] + ["/caderno.html"]:
            n += 1
            marca = f"pdf{n}"
            carregar(ws, base + pagina + "?x=" + marca, marca)
            ws.cmd("Runtime.evaluate", expression="dispatchEvent(new Event('beforeprint'))")
            time.sleep(0.4)
            ws.cmd("Emulation.setEmulatedMedia", media="")
            dados = base64.b64decode(ws.cmd("Page.printToPDF", printBackground=True, preferCSSPageSize=True)["data"])
            if fitz:
                doc = fitz.open(stream=dados, filetype="pdf")
                texto = "".join(p.get_text() for p in doc)
                lixo = sorted(set(re.findall(r"undefined|NaN|\[object|\bnull\b|Mão na massa|Ver como a AgroSense|marque você|conferido pelo caderno", texto)))
                print(f"  PDF {pagina}: {doc.page_count} página(s)")
                if doc.page_count < 1 or len(texto) < 200: falhas.append(f"PDF {pagina}: vazio")
                if lixo: falhas.append(f"PDF {pagina}: texto que não devia estar no PDF {lixo}")
    finally:
        encerrar(edge)
        encerrar(site)
    print("---")
    for f in falhas:
        print("FALHA", f)
    print("TUDO OK" if not falhas else f"{len(falhas)} FALHA(S)")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
