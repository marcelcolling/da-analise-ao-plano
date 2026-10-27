"""
Roda o teste de ponta a ponta (teste_ponta_a_ponta.html) num Edge headless, em tempo real,
controlado pelo protocolo de depuração (CDP), contra o próprio site servido localmente (ferramentas/servidor_local.py, com uma cópia do site).
Não há servidor de dados a simular: o caderno vive no localStorage do navegador de teste (perfil temporário).
Saída: uma linha PASS/FAIL por verificação; código de saída 1 se houver falha.

Uso (na raiz do repositório):  python ferramentas/testes/rodar_testes.py
(ou .\ferramentas\testes\rodar_testes.ps1, que chama este script)

Se nenhuma verificação aparecer em 30 s (o Edge headless às vezes trava o carregamento),
o teste recomeça do zero, com servidor e navegador novos.
"""
import json
import pathlib
import random
import subprocess
import sys
import tempfile
import time
import urllib.request

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
sys.path.insert(0, str(AQUI.parent))
from capturar_telas import WS, EDGE, encerrar, servir  # noqa: E402

# portas sorteadas: uma execução nunca conversa com o navegador ou o servidor de outra
PORTA_SITE = 8500 + random.randrange(100)
PORTA_CDP = PORTA_SITE + 700
LIMITE, ARRANQUE, TENTATIVAS = 600, 90, 3   # margem para as páginas recarregadas quando um script se perde


def rodar(tentativa):
    """Uma tentativa. Devolve (linhas, terminou, travou_no_inicio)."""
    porta_site, porta_cdp = PORTA_SITE + 10 * (tentativa - 1), PORTA_CDP + 10 * (tentativa - 1)
    srv = servir(porta_site)
    edge = subprocess.Popen([EDGE, "--headless=new", "--disable-gpu", "--no-first-run", f"--remote-debugging-port={porta_cdp}",
                             f"--user-data-dir={tempfile.mkdtemp(prefix='ws-teste-')}", "about:blank"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    linhas, fim = [], False
    try:
        time.sleep(1.5)
        alvo = None
        for _ in range(40):
            try:
                alvo = next(t for t in json.load(urllib.request.urlopen(f"http://127.0.0.1:{porta_cdp}/json")) if t["type"] == "page")
                break
            except Exception:
                time.sleep(0.5)
        if not alvo:
            return linhas, False, True
        ws = WS(alvo["webSocketDebuggerUrl"])
        ws.cmd("Page.enable")
        ws.cmd("Runtime.enable")
        ws.cmd("Page.bringToFront")
        ws.cmd("Emulation.setFocusEmulationEnabled", enabled=True)
        ws.cmd("Emulation.setDeviceMetricsOverride", width=1280, height=1400, deviceScaleFactor=1, mobile=False)
        ws.cmd("Page.navigate", url=f"http://127.0.0.1:{porta_site}/ferramentas/testes/teste_ponta_a_ponta.html")
        inicio = time.time()
        while time.time() - inicio < LIMITE and not fim:
            time.sleep(2)
            r = ws.cmd("Runtime.evaluate", returnByValue=True,
                       expression="(document.getElementById('log') || {textContent: ''}).textContent + '\\n@' + document.title")
            todas = str(r.get("result", {}).get("value", "")).split("\n")
            fim = todas[-1] == "@FIM"
            for l in todas[:-1]:
                if l.startswith(("PASS", "FAIL", "ERRO")) and l not in linhas:
                    linhas.append(l)
                    print(l, flush=True)
            if not linhas and time.time() - inicio > ARRANQUE:
                return linhas, False, True
        return linhas, fim, False
    finally:
        encerrar(edge)
        encerrar(srv)
        time.sleep(1)


for tentativa in range(1, TENTATIVAS + 1):
    linhas, fim, travou = rodar(tentativa)
    if not travou:
        break
    print(f"(o Edge headless travou ao carregar a página; recomeçando, tentativa {tentativa + 1} de {TENTATIVAS})", flush=True)

falhas = sum(1 for l in linhas if not l.startswith("PASS"))
if not fim:
    print("TIMEOUT: o teste não terminou")
    falhas += 1
print("---")
print(f"PASS: {sum(1 for l in linhas if l.startswith('PASS'))}  FAIL/ERRO: {falhas}")
sys.exit(1 if falhas else 0)
