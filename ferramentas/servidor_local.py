"""
Servidor local das ferramentas de teste (capturas, auditoria, teste de ponta a ponta).

Uso:  python ferramentas/servidor_local.py <porta> <pasta>

Por que não "python -m http.server": no Windows, a fila de conexões dele tem só 5 lugares; o navegador abre 6
de uma vez, e cerca de 8% dos pedidos esperavam até estourar o tempo. O navegador então pulava o script que não
chegou (ex.: motor.js) e a página quebrava no teste sem defeito nenhum no site. Aqui a fila é maior, cada pedido
tem a própria thread e nada fica em cache.
"""
import functools
import http.server
import sys


class Servidor(http.server.ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True


class Manipulador(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    porta, pasta = int(sys.argv[1]), sys.argv[2]
    Servidor(("127.0.0.1", porta), functools.partial(Manipulador, directory=pasta)).serve_forever()
