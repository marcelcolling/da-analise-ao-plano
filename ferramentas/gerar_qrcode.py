"""
Gera o QR code do site (assets/img/qrcode.svg), mostrado na página inicial para projetar na sala.

Uso (na raiz do repositório):  python ferramentas/gerar_qrcode.py [endereço]
Precisa da biblioteca segno (pip install segno), só para gerar: o site usa o SVG pronto, sem serviço externo.
"""
import pathlib
import sys

import segno

RAIZ = pathlib.Path(__file__).resolve().parent.parent
URL = sys.argv[1] if len(sys.argv) > 1 else "https://marcelcolling.github.io/da-analise-ao-plano/"
DESTINO = RAIZ / "assets" / "img" / "qrcode.svg"

DESTINO.parent.mkdir(parents=True, exist_ok=True)
# correção de erro "M" e margem de 4 módulos: lê bem projetado e de longe; cor escura da identidade sobre branco
segno.make(URL, error="m", micro=False).save(str(DESTINO), kind="svg", scale=1, border=4, dark="#0E1D31", light="#ffffff",
                                             xmldecl=False, svgns=True, title="QR code: " + URL, omitsize=True)
# bordas nítidas quando o desenho é ampliado no projetor
DESTINO.write_text(DESTINO.read_text(encoding="utf-8").replace("<svg ", '<svg shape-rendering="crispEdges" ', 1), encoding="utf-8")
print("OK ", DESTINO.relative_to(RAIZ), "→", URL)
