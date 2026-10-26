"""
Gera as páginas dos guias (guias/*.html) a partir dos Markdown em conteudo/ (00_guia_de_uso.md a 07_bsc_mapa_estrategico.md).

Uso (na raiz do repositório):
    python ferramentas/gerar_guias.py

O texto do Markdown é mantido na íntegra: o script só converte a marcação e organiza a página
(sumário lateral, tabelas que viram cartões no celular, diagramas em bloco monoespaçado).
O que o portal acrescenta (sem mexer no texto) fica entre <!--g--> e <!--/g--> (a conferência de
integridade ignora esses trechos): as "pontes" que levam do passo a passo, do exemplo e da lista final
para a folha correspondente, e o convite para a folha no fim da página.

Sintaxe aceita, além do Markdown comum:
    > texto                    citação em destaque (linhas seguidas viram quebras de linha)
    ```  ...  ```              diagrama (bloco monoespaçado, sem quebra automática)
    [texto](arquivo.md)        link para outro guia (vira o .html correspondente)
    1. item / - item           listas; linhas recuadas logo abaixo de um item continuam o item ou viram sublista
    - [ ] item                 lista de verificação (estática: a lista para marcar está na folha)
    **Pergunta?** + resposta   nas Dúvidas frequentes, a pergunta ganha destaque
"""
import html
import math
import pathlib
import re
import unicodedata

RAIZ = pathlib.Path(__file__).resolve().parent.parent
CONT = RAIZ / "conteudo"

F = "../folhas/"
GUIAS = [
    {"fonte": "00_guia_de_uso.md", "destino": "00-guia-de-uso.html", "selo": "Guia de uso", "curto": "Como usar o caderno",
     "etapa": "Todas", "folha": ("../index.html#trilha", "A trilha do workshop"),
     "cta": ("Comece pela Folha 0", "Cada guia leva à sua folha. A primeira é o ponto de partida: quem a empresa é hoje e aonde quer chegar.", F + "abertura.html", "Abrir a Folha 0"),
     "pontes": {}},
    {"fonte": "01_ponto_de_partida.md", "destino": "01-ponto-de-partida.html", "selo": "Guia 01 · Abertura", "curto": "Ponto de partida",
     "etapa": "Aula 1 · Abertura", "folha": (F + "abertura.html", "Folha 0 · Ponto de partida"),
     "pontes": {"passo-a-passo": ("abertura.html#s-hoje", "Folha 0 · as duas frases"),
                "exemplo-agrosense": ("abertura.html?exemplo", "Folha 0 da AgroSense, dentro do caderno"),
                "sua-folha-esta-pronta-quando": ("abertura.html#s-pronta", "Folha 0 · marque a lista final")}},
    {"fonte": "02_analise_de_ambiente.md", "destino": "02-analise-de-ambiente.html", "selo": "Guia 02 · Bloco 1", "curto": "Análise de ambiente",
     "etapa": "Aula 1 · Bloco 1", "folha": (F + "bloco1.html", "Folhas 1 e 2 · Radar e TOWS"),
     "pontes": {"passo-a-passo": ("bloco1.html#s-externo", "Folha 1 · Radar do ambiente"),
                "exemplo-agrosense": ("bloco1.html?exemplo", "Folhas 1 e 2 da AgroSense, dentro do caderno"),
                "suas-folhas-estao-prontas-quando": ("bloco1.html#s-pronta", "Folhas 1 e 2 · marque a lista final")}},
    {"fonte": "03_porter_atividades.md", "destino": "03-porter-atividades.html", "selo": "Guia 03 · Bloco 2", "curto": "Porter: a estratégia está nas atividades",
     "etapa": "Aula 1 · Bloco 2", "folha": (F + "bloco2.html", "Folhas 3A e 3B · Maturidade e sistema de atividades"),
     "pontes": {"passo-a-passo-folha-3a": ("bloco2.html#s-matriz", "Folha 3A · Diagnóstico de maturidade"),
                "passo-a-passo-folha-3b": ("bloco2.html#s-sistema", "Folha 3B · Sistema de atividades (o desenho se monta sozinho)"),
                "exemplo-agrosense": ("bloco2.html?exemplo", "Folhas 3A e 3B da AgroSense, dentro do caderno"),
                "suas-folhas-estao-prontas-quando": ("bloco2.html#s-pronta", "Folhas 3A e 3B · marque a lista final")}},
    {"fonte": "04_bcg_ansoff.md", "destino": "04-bcg-ansoff.html", "selo": "Guia 04 · Bloco 3", "curto": "Matrizes BCG e Ansoff",
     "etapa": "Aula 1 · Bloco 3", "folha": (F + "bloco3.html", "Folha 4 · Portfólio e crescimento"),
     "pontes": {"passo-a-passo-folha-4": ("bloco3.html#s-bcg", "Folha 4 · BCG e Ansoff (o quadrante aparece sozinho)"),
                "exemplo-agrosense": ("bloco3.html?exemplo", "Folha 4 da AgroSense, dentro do caderno"),
                "sua-folha-esta-pronta-quando": ("bloco3.html#s-pronta", "Folha 4 · marque a lista final")}},
    {"fonte": "05_objetivos_indicadores_farois.md", "destino": "05-objetivos-indicadores-farois.html", "selo": "Guia 05 · Bloco 4", "curto": "Objetivos, indicadores e faróis",
     "etapa": "Aula 1 · Bloco 4", "folha": (F + "bloco4.html", "Folhas 5A e 5B · Objetivos, indicadores e faróis"),
     "pontes": {"passo-a-passo": ("bloco4.html#s-objetivos", "Folhas 5A e 5B (as faixas do farol se calculam sozinhas)"),
                "exemplo-agrosense": ("bloco4.html?exemplo", "Folhas 5A e 5B da AgroSense, dentro do caderno"),
                "suas-folhas-estao-prontas-quando": ("bloco4.html#s-pronta", "Folhas 5A e 5B · marque a lista final")}},
    {"fonte": "06_acoes.md", "destino": "06-acoes.html", "selo": "Guia 06 · Bloco 5", "curto": "Ações que movem indicadores",
     "etapa": "Aula 1 · Bloco 5", "folha": (F + "bloco5.html", "Folha 6 · Ações priorizadas"),
     "pontes": {"passo-a-passo-folha-6": ("bloco5.html#s-acoes", "Folha 6 · Ações (a prioridade aparece sozinha)"),
                "exemplo-agrosense": ("bloco5.html?exemplo", "Folha 6 da AgroSense, dentro do caderno"),
                "sua-folha-esta-pronta-quando": ("bloco5.html#s-pronta", "Folha 6 · marque a lista final")}},
    {"fonte": "07_bsc_mapa_estrategico.md", "destino": "07-bsc-mapa-estrategico.html", "selo": "Guia 07 · Bloco 6", "curto": "BSC e mapa estratégico",
     "etapa": "Aula 2 · Bloco 6", "folha": (F + "bloco6.html", "Folha 7 · Mapa estratégico"),
     "pontes": {"passo-a-passo-folha-7": ("bloco6.html#s-perspectivas", "Folha 7 · Mapa estratégico (o desenho e o teste do equilíbrio são automáticos)"),
                "exemplo-agrosense": ("bloco6.html?exemplo", "Folha 7 da AgroSense, dentro do caderno"),
                "sua-folha-esta-pronta-quando": ("bloco6.html#s-pronto", "Folha 7 · pronto para o sistema do parque?")}},
]
DESTINO = {g["fonte"]: g["destino"] for g in GUIAS}


# ---------------------------------------------------------------- utilidades
def slug(texto, usados):
    s = unicodedata.normalize("NFD", texto_puro(texto))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:70].strip("-") or "secao"
    base, n = s, 2
    while s in usados:
        s = f"{base}-{n}"
        n += 1
    usados.add(s)
    return s


def inline(texto):
    s = html.escape(texto.replace("&nbsp;", " "), quote=False)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: f'<a href="{html.escape(DESTINO.get(m.group(2), m.group(2)), quote=True)}">{m.group(1)}</a>', s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    return s


def texto_puro(texto):
    return re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", re.sub(r"\*+", "", texto))


def celulas(linha):
    linha = linha.strip()
    if linha.startswith("|"):
        linha = linha[1:]
    if linha.endswith("|"):
        linha = linha[:-1]
    return [c.strip() for c in linha.split("|")]


# ---------------------------------------------------------------- blocos
INICIO = re.compile(r"^(#{1,6}\s|\||[-*] |\d+\.\s|>|```|-{3,}\s*$)")
CHK = re.compile(r"^[-*] \[[ xX]\]\s+")
ITEM_UL = re.compile(r"^[-*] ")
ITEM_OL = re.compile(r"^\d+\.\s")


def lista(linhas, i, padrao):
    """Lê uma lista a partir da linha i. Linhas recuadas logo abaixo de um item continuam o item ou viram sublista."""
    n, itens = len(linhas), []
    while i < n:
        bruta = linhas[i]
        s = bruta.strip()
        if padrao.match(s) and not bruta.startswith((" ", "\t")):
            itens.append({"texto": padrao.sub("", s, count=1), "cont": [], "sub": []})
            i += 1
            continue
        if s and bruta.startswith((" ", "\t")) and itens:
            if ITEM_UL.match(s):
                itens[-1]["sub"].append(s[2:])
            else:
                itens[-1]["cont"].append(s)
            i += 1
            continue
        break
    return itens, i


def blocos(linhas):
    i, n = 0, len(linhas)
    while i < n:
        s = linhas[i].strip()
        if not s:
            i += 1
            continue
        if re.fullmatch(r"-{3,}", s):
            yield ("hr",); i += 1; continue
        if s.startswith("```"):
            corpo = []
            i += 1
            while i < n and not linhas[i].strip().startswith("```"):
                corpo.append(linhas[i].rstrip()); i += 1
            i += 1
            yield ("code", "\n".join(corpo)); continue
        m = re.match(r"^(#{1,6})\s+(.*)$", s)
        if m:
            yield ("h", len(m.group(1)), m.group(2).strip()); i += 1; continue
        if s.startswith(">"):
            par = []
            while i < n and linhas[i].strip().startswith(">"):
                par.append(re.sub(r"^>\s?", "", linhas[i].strip())); i += 1
            yield ("quote", par); continue
        if s.startswith("|"):
            t = []
            while i < n and linhas[i].strip().startswith("|"):
                t.append(linhas[i].strip()); i += 1
            yield ("table", t); continue
        if CHK.match(s):
            itens = []
            while i < n and CHK.match(linhas[i].strip()):
                itens.append(CHK.sub("", linhas[i].strip())); i += 1
            yield ("check", itens); continue
        if ITEM_UL.match(s):
            itens, i = lista(linhas, i, ITEM_UL)
            yield ("ul", itens); continue
        if ITEM_OL.match(s):
            itens, i = lista(linhas, i, ITEM_OL)
            yield ("ol", itens); continue
        par = [s]
        i += 1
        while i < n and linhas[i].strip() and not INICIO.match(linhas[i].strip()):
            par.append(linhas[i].strip()); i += 1
        yield ("p", par)


def render_tabela(t):
    cab = celulas(t[0])
    corpo = [celulas(l) for l in t[1:] if not re.fullmatch(r"\|?[\s:\-|]+\|?", l)]
    classes = "tabela" + (" tabela-cards" if len(cab) >= 3 else "")
    out = [f'<div class="tabela-wrap"><table class="{classes}"><thead><tr>']
    out += [f"<th>{inline(c)}</th>" for c in cab]
    out.append("</tr></thead><tbody>")
    for linha in corpo:
        out.append("<tr>")
        for j, c in enumerate(linha):
            rot = html.escape(texto_puro(cab[j]) if j < len(cab) else "", quote=True)
            out.append(f'<td data-label="{rot}">{inline(c)}</td>')
        out.append("</tr>")
    out.append("</tbody></table></div>")
    return "".join(out)


def render_quote(linhas):
    pars, atual = [], []
    for l in linhas:
        if not l.strip():
            if atual:
                pars.append(atual); atual = []
        else:
            atual.append(l.strip())
    if atual:
        pars.append(atual)
    return '<blockquote class="citacao">' + "".join("<p>" + "<br>".join(inline(x) for x in p) + "</p>" for p in pars) + "</blockquote>"


def render_lista(tipo, itens):
    tag = "ol" if tipo == "ol" else "ul"
    classe = ' class="numerada"' if tipo == "ol" else ""
    out = []
    for it in itens:
        h = inline(it["texto"])
        if it["cont"]:
            h += "<br>" + " ".join(inline(x) for x in it["cont"])
        if it["sub"]:
            h += "<ul>" + "".join(f"<li>{inline(x)}</li>" for x in it["sub"]) + "</ul>"
        out.append(f"<li>{h}</li>")
    return f"<{tag}{classe}>" + "".join(out) + f"</{tag}>"


def render_paragrafo(linhas, secao):
    texto = " ".join(linhas)
    m = re.match(r"^\*\*([^*]+\?)\*\*\s+(.*)$", texto)
    if secao == "duvidas-frequentes" and m:
        return f'<div class="faq"><p class="faq-q">{inline(m.group(1))}</p><p>{inline(m.group(2))}</p></div>'
    return f"<p>{inline(texto)}</p>"


# ---------------------------------------------------------------- página
def gerar(cfg):
    md = (CONT / cfg["fonte"]).read_text(encoding="utf-8")
    palavras = len(re.findall(r"\w+", md))
    minutos = max(1, math.ceil(palavras / 220))
    usados = set()
    titulo, rotulo, sub = "", "", ""
    toc, corpo = [], []
    estado = {"secao": None}

    def fechar_secao():
        if estado["secao"] is not None:
            corpo.append("</section>")
            estado["secao"] = None

    def ponte(sid):
        if sid in cfg["pontes"]:
            url, nome = cfg["pontes"][sid]
            ex = "?exemplo" in url
            corpo.append(f'<!--g--><a class="ponte{" ponte-ex" if ex else ""}" href="../folhas/{html.escape(url, quote=True)}">'
                         f'<span class="ponte-ico" aria-hidden="true">{"◎" if ex else "✎"}</span>'
                         f'<span><span class="ponte-rot">{"Veja no caderno" if ex else "Aplique na sua empresa"}</span>'
                         f'<strong>{html.escape(nome)} →</strong></span></a><!--/g-->')

    for b in blocos(md.splitlines()):
        tipo = b[0]
        if tipo == "hr":
            continue
        if tipo == "h":
            nivel, txt = b[1], b[2]
            if nivel == 1 and not titulo:
                m = re.match(r"^(.+?)\s+[—–]\s+(.+)$", txt)
                rotulo, titulo = (m.group(1), m.group(2)) if m else ("", txt)
                continue
            if nivel == 3 and not toc and not corpo:
                sub = txt   # linha logo abaixo do título: "Bloco 4 · Folhas 5A e 5B"
                continue
            if nivel <= 2:
                fechar_secao()
                sid = slug(txt, usados)
                toc.append((1, sid, texto_puro(txt)))
                classe = "secao"
                if sid == "em-uma-frase":
                    classe += " secao-frase"
                elif sid == "para-saber-mais":
                    classe += " secao-fontes"
                corpo.append(f'<section class="{classe}" id="{sid}"><h2 class="secao-titulo">{inline(txt)}</h2>')
                estado["secao"] = sid
                ponte(sid)
                continue
            sid = slug(txt, usados)
            toc.append((2, sid, texto_puro(txt)))
            corpo.append(f'<h3 class="sub3" id="{sid}">{inline(txt)}</h3>')
            ponte(sid)
            continue
        if tipo == "p":
            corpo.append(render_paragrafo(b[1], estado["secao"]))
        elif tipo == "quote":
            corpo.append(render_quote(b[1]))
        elif tipo == "code":
            corpo.append(f'<pre class="diagrama">{html.escape(b[1])}</pre>')
        elif tipo == "table":
            corpo.append(render_tabela(b[1]))
        elif tipo in ("ul", "ol"):
            corpo.append(render_lista(tipo, b[1]))
        elif tipo == "check":
            corpo.append('<ul class="checklist-fixa">' + "".join(f'<li><span class="chk-caixa" aria-hidden="true"></span><span>{inline(x)}</span></li>' for x in b[1]) + "</ul>")
    fechar_secao()
    corpo_html = "\n".join(corpo)
    # nas listas finais, a ponte vai para depois da lista (e não logo abaixo do título)
    corpo_html = re.sub(r'(<section class="secao" id="(?:sua-folha-esta-pronta-quando|suas-folhas-estao-prontas-quando)"><h2 class="secao-titulo">.*?</h2>)\n(<!--g-->.*?<!--/g-->)\n(<ul class="checklist-fixa">.*?</ul>)',
                        r"\1\n\3\n\2", corpo_html, flags=re.S)

    nav = [f'<a class="nav-item{" sub" if nivel == 2 else ""}" href="#{sid}">{html.escape(rot)}</a>' for nivel, sid, rot in toc]
    url_f, nome_f = cfg["folha"]
    if "cta" in cfg:
        cta_t, cta_p, cta_u, cta_b = cfg["cta"]
    else:
        cta_t, cta_p, cta_u, cta_b = (nome_f, "Logo depois da exposição, cada passo deste guia vira uma seção da folha, com o exemplo da AgroSense ao lado. Tudo fica salvo no seu navegador e no arquivo da empresa.", url_f, "Abrir a folha")
    cta = (f'<!--g--><aside class="cta-atividade"><div><span class="cta-eyebrow">Hora de aplicar na sua empresa</span>'
           f'<h3>{html.escape(cta_t)}</h3><p>{html.escape(cta_p)}</p></div>'
           f'<a class="cta-btn" href="{cta_u}">{html.escape(cta_b)} →</a></aside><!--/g-->')
    m_f = re.search(r'<section class="secao secao-fontes"', corpo_html)
    corpo_html = (corpo_html[:m_f.start()] + cta + "\n" + corpo_html[m_f.start():]) if m_f else corpo_html + "\n" + cta

    pagina = MODELO.format(
        titulo=html.escape(texto_puro(titulo)), titulo_h1=inline(titulo), rotulo=html.escape(cfg["selo"]),
        sub=f'<p class="hero-sub">{inline(sub)}</p>' if sub else "",
        kicker="" if re.fullmatch(r"\d+", rotulo or "0") else f'<p class="hero-kicker">{inline(rotulo)}</p>',
        selo=html.escape(cfg["selo"]), curto=html.escape(cfg["curto"]), etapa=html.escape(cfg["etapa"]),
        minutos=minutos, nav="\n  ".join(nav), corpo=corpo_html, url_f=url_f, nome_f=html.escape(nome_f),
        rot_folha="Para aplicar" if "folhas/" in url_f else "Comece por")
    destino = RAIZ / "guias" / cfg["destino"]
    destino.parent.mkdir(exist_ok=True)
    destino.write_text(pagina, encoding="utf-8", newline="\n")
    print(f"OK  guias/{destino.name}  ({palavras} palavras, ~{minutos} min)")
    return destino


MODELO = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{titulo} — Da Análise ao Plano</title>
<!-- Página gerada por ferramentas/gerar_guias.py a partir do Markdown em conteudo/. Não edite à mão. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/portal.css">
<link rel="stylesheet" href="../assets/css/guia.css">
</head>
<body data-curto="{curto}">

<div id="progress-bar"></div>
<button id="sidebar-toggle" aria-label="Abrir sumário"><span></span><span></span><span></span></button>
<div id="overlay"></div>

<nav id="sidebar" aria-label="Sumário">
  <div class="sidebar-badge"><span class="dot"></span><span>{selo}</span></div>
  <div class="sidebar-title">{curto}</div>
  <a class="nav-item nav-voltar" href="../index.html#trilha">← Voltar à trilha</a>
  <a class="nav-item" href="#intro">Início</a>
  {nav}
  <a class="nav-item nav-atividade" href="{url_f}">✎ {nome_f}</a>
</nav>

<main class="wrapper">

  <section class="hero" id="intro">
    <div class="hero-tag"><span class="dot"></span>{rotulo}</div>
    {kicker}<h1>{titulo_h1}</h1>
    {sub}
    <!--g--><div class="hero-meta">
      <div class="meta-item"><span class="meta-label">Tempo de leitura</span><span class="meta-value">{minutos} min</span></div>
      <div class="meta-item"><span class="meta-label">Etapa</span><span class="meta-value">{etapa}</span></div>
      <div class="meta-item"><span class="meta-label">{rot_folha}</span><span class="meta-value">{nome_f}</span></div>
    </div>
    <div class="hero-acoes">
      <a class="hero-btn" href="{url_f}">✎ Abrir: {nome_f}</a>
      <button type="button" class="hero-btn hero-btn-ghost" onclick="window.print()">Imprimir / salvar PDF</button>
    </div><!--/g-->
  </section>

{corpo}

</main>

<button id="back-to-top" title="Voltar ao topo" aria-label="Voltar ao topo">&#8593;</button>
<script src="../assets/js/config.js"></script>
<script src="../assets/js/portal.js"></script>
<script src="../assets/js/guia.js"></script>
</body>
</html>
"""


if __name__ == "__main__":
    for cfg in GUIAS:
        gerar(cfg)
