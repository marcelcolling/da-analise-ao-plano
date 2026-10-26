"""
Capturas de tela do portal no Edge headless, controlado pelo protocolo de depuração (CDP).
Sem dependências: tem um cliente WebSocket mínimo embutido.

Uso (na raiz do repositório):
    python ferramentas/capturar_telas.py <pasta-de-saída> [nomes das capturas...]

Sobe um servidor local na porta 8765, põe no navegador o caderno da AgroSense (assets/js/exemplo-agrosense.js)
como se fosse o de uma empresa, rola até o id indicado e salva PNGs em 1366px e 520px.
Também avisa se a página teve erro de JavaScript ou ficou mais larga que a tela.
Por que não usar só --screenshot: com âncoras e rolagem suave, o headless captura a página
no meio da rolagem; aqui a rolagem é instantânea e a captura espera os scripts.
"""
import base64
import json
import os
import pathlib
import random
import socket
import struct
import subprocess
import sys
import tempfile
import time
import urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent.parent
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORTA_SITE, PORTA_CDP = 8765, 9333

# (nome, página, alvo, largura, altura). O alvo é um id: na página da parte ele vai no endereço (#id),
# e o próprio portal abre o módulo certo e rola até o ponto, como acontece com o estudante.
CAPTURAS = [
    ("home", "/index.html", "", 1366, 1500),
    ("home-trilha", "/index.html", "trilha", 1366, 1500),
    ("f0", "/folhas/abertura.html", "", 1366, 1300),
    ("f0-futuro", "/folhas/abertura.html", "s-futuro", 1366, 1100),
    ("f1-externo", "/folhas/bloco1.html", "s-externo", 1366, 1300),
    ("f2-tows", "/folhas/bloco1.html", "s-tows", 1366, 1500),
    ("f3a-matriz", "/folhas/bloco2.html", "s-matriz", 1366, 1500),
    ("f3b-sistema", "/folhas/bloco2.html", "s-sistema", 1366, 1600),
    ("f4-bcg", "/folhas/bloco3.html", "s-bcg", 1366, 1400),
    ("f4-ansoff", "/folhas/bloco3.html", "s-ansoff", 1366, 1100),
    ("f5a-obj", "/folhas/bloco4.html", "s-objetivos", 1366, 1600),
    ("f5b-painel", "/folhas/bloco4.html", "s-painel", 1366, 1500),
    ("f5b-sim", "/folhas/bloco4.html", "s-simulacao", 1366, 1000),
    ("f6-acoes", "/folhas/bloco5.html", "s-acoes", 1366, 1600),
    ("fc-cadeia", "/folhas/fechamento.html", "s-cadeia", 1366, 1300),
    ("f7-mapa", "/folhas/bloco6.html", "s-mapa", 1366, 1500),
    ("f7-pronto", "/folhas/bloco6.html", "s-pronto", 1366, 1100),
    ("caderno", "/caderno.html", "", 1366, 1500),
    ("caderno-ex", "/caderno.html?exemplo", "p-bloco6", 1366, 1500),
    ("ex-f3b", "/folhas/bloco2.html?exemplo", "s-sistema", 1366, 1400),
    ("guia-05", "/guias/05-objetivos-indicadores-farois.html", "", 1366, 1100),
    ("guia-03-diagrama", "/guias/03-porter-atividades.html", "exemplo-agrosense", 1366, 1300),
    ("guia-00", "/guias/00-guia-de-uso.html", "a-logica-do-caderno-uma-cadeia-so", 1366, 1100),
    ("m-home", "/index.html", "", 520, 2000),
    ("m-f2-tows", "/folhas/bloco1.html", "s-tows", 520, 1800),
    ("m-f5a-obj", "/folhas/bloco4.html", "s-objetivos", 520, 1800),
    ("m-f7-mapa", "/folhas/bloco6.html", "s-mapa", 520, 1500),
    ("m-guia-07", "/guias/07-bsc-mapa-estrategico.html", "exemplo-agrosense", 520, 1400),
]


def encerrar(proc):
    """Encerra o processo e todos os filhos (no Windows, edge.kill() deixa os processos filhos do Edge vivos)."""
    subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True)


class WS:
    """Cliente WebSocket mínimo (só texto, sem extensões) para o CDP."""

    def __init__(self, url):
        host, resto = url[len("ws://"):].split("/", 1)
        h, p = host.split(":")
        self.s = socket.create_connection((h, int(p)))
        chave = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f"GET /{resto} HTTP/1.1\r\nHost: {host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                        f"Sec-WebSocket-Key: {chave}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
        resp = b""
        while b"\r\n\r\n" not in resp:
            resp += self.s.recv(4096)
        self.buf = resp.split(b"\r\n\r\n", 1)[1]
        self.n = 0

    def _ler(self, n):
        while len(self.buf) < n:
            self.buf += self.s.recv(1 << 20)
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def enviar(self, obj):
        dados = json.dumps(obj).encode()
        cab = bytearray([0x81])
        n = len(dados)
        if n < 126:
            cab.append(0x80 | n)
        elif n < 65536:
            cab += bytes([0x80 | 126]) + struct.pack(">H", n)
        else:
            cab += bytes([0x80 | 127]) + struct.pack(">Q", n)
        mask = os.urandom(4)
        self.s.sendall(bytes(cab) + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(dados)))

    def receber(self):
        partes = b""
        while True:
            b1, b2 = self._ler(2)
            n = b2 & 0x7F
            if n == 126:
                n = struct.unpack(">H", self._ler(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", self._ler(8))[0]
            partes += self._ler(n)
            if b1 & 0x80:
                return json.loads(partes)

    def cmd(self, metodo, **params):
        self.n += 1
        self.enviar({"id": self.n, "method": metodo, "params": params})
        while True:
            m = self.receber()
            if m.get("id") == self.n:
                if "error" in m:
                    raise RuntimeError(m["error"])
                return m.get("result", {})


def main(saida):
    saida = pathlib.Path(saida)
    saida.mkdir(parents=True, exist_ok=True)
    site = subprocess.Popen([sys.executable, "-m", "http.server", str(PORTA_SITE), "--bind", "127.0.0.1"],
                            cwd=RAIZ, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    perfil = tempfile.mkdtemp(prefix="ws-cdp-")
    edge = subprocess.Popen([EDGE, "--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
                             f"--remote-debugging-port={PORTA_CDP}", f"--user-data-dir={perfil}", "about:blank"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        alvo = None
        for _ in range(40):
            try:
                lista = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORTA_CDP}/json"))
                alvo = next(t for t in lista if t["type"] == "page")
                break
            except Exception:
                time.sleep(0.5)
        ws = WS(alvo["webSocketDebuggerUrl"])
        ws.cmd("Page.enable")
        ws.cmd("Runtime.enable")   # sem isto, o headless às vezes não executa os scripts da página a tempo
        ws.cmd("Page.bringToFront")
        ws.cmd("Emulation.setFocusEmulationEnabled", enabled=True)
        base = f"http://127.0.0.1:{PORTA_SITE}"
        # erros de JavaScript ficam em window.__erros (o script entra antes dos da página)
        ws.cmd("Page.addScriptToEvaluateOnNewDocument", source="window.__erros=[];addEventListener('error',function(e){window.__erros.push(String(e.message)+' @'+(e.filename||'').split('/').pop()+':'+e.lineno)});")
        ws.cmd("Page.navigate", url=base + "/index.html")
        time.sleep(1.5)
        ws.cmd("Runtime.evaluate", expression="localStorage.clear(); localStorage.setItem('ws_caderno_v1', JSON.stringify({formato:'caderno-estrategia', v:1, campos: window.WS_EXEMPLO.campos, atualizado: Date.now(), arquivo: null}))")
        filtro = sys.argv[2:] 
        for nome, pagina, sel, w, h in CAPTURAS:
            if filtro and nome not in filtro:
                continue
            ws.cmd("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=1, mobile=w < 700)
            marca = str(random.randint(1, 10**9))
            ws.cmd("Page.navigate", url=base + pagina + ("&" if "?" in pagina else "?") + "x=" + marca)
            # espera a página e o portal.js terminarem (barra superior montada)
            for k in range(80):
                pronto = ws.cmd("Runtime.evaluate", returnByValue=True, expression="JSON.stringify([location.search.indexOf('" + marca + "')>=0, document.readyState, !!document.querySelector('.vd-topbar'), document.fonts.status])")
                v = json.loads(pronto.get("result", {}).get("value") or "[false]")
                if v[0] and v[1] == "complete" and v[2] and v[3] == "loaded":
                    break
                if k in (20, 40, 60):   # o headless às vezes para no meio do carregamento: recarrega
                    ws.cmd("Page.reload", ignoreCache=True)
                time.sleep(0.25)
            else:
                print("  aviso: página não ficou pronta:", v)
                rec = ws.cmd("Runtime.evaluate", returnByValue=True, expression="JSON.stringify(performance.getEntriesByType('resource').map(function(e){return e.name.split('/').slice(-1)[0].slice(0,40)+' '+Math.round(e.duration)}))")
                print("  recursos carregados:", rec.get("result", {}).get("value"))
            time.sleep(0.6)
            if sel:
                # rola até o id sem animação (descontando a barra do portal e a navegação das seções)
                r = ws.cmd("Runtime.evaluate", returnByValue=True, expression=(
                    "(function(){document.documentElement.style.scrollBehavior='auto';"
                    f"var id={json.dumps(sel)}, el=document.getElementById(id); if(!el) return 'sem alvo';"
                    "window.scrollTo({top: el.getBoundingClientRect().top + scrollY - 120, behavior:'instant'}); return 'ok';})()"))
                if r.get("result", {}).get("value") != "ok":
                    print(f"  aviso: {nome}: alvo {sel} não encontrado ({r})")
                time.sleep(0.9)
            png = ws.cmd("Page.captureScreenshot", format="png")["data"]
            (saida / f"{nome}.png").write_bytes(base64.b64decode(png))
            # no celular, algo mais largo que a tela faz o navegador reduzir o zoom (innerWidth > largura do aparelho)
            larg = ws.cmd("Runtime.evaluate", returnByValue=True, expression="Math.max(innerWidth, document.documentElement.scrollWidth)")
            larg = larg.get("result", {}).get("value") or 0
            erros = ws.cmd("Runtime.evaluate", returnByValue=True, expression="JSON.stringify(window.__erros||[])").get("result", {}).get("value") or "[]"
            print("OK ", nome, "" if larg <= w else f"  AVISO: a página tem {larg}px de largura numa tela de {w}px", "" if erros == "[]" else "  ERRO JS: " + erros)
    finally:
        encerrar(edge)
        encerrar(site)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "capturas")
