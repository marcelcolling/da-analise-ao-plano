/* Comportamentos das páginas de guia: barra de progresso, sumário ativo, sumário no celular e voltar ao topo.
   A barra do portal (salvar e abrir o caderno) vem de portal.js. */
(function () {
  'use strict';
  if (window.WS) {
    document.body.classList.add('com-topbar');
    WS.iniciarPagina({ crumb: document.body.dataset.curto || '' });
  }

  /* ---- progresso, sumário ativo e voltar ao topo ---- */
  var barra = document.getElementById('progress-bar');
  var topo = document.getElementById('back-to-top');
  var links = Array.prototype.slice.call(document.querySelectorAll('#sidebar a[href^="#"]'));
  var alvos = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var agendado = false;
  function aoRolar() {
    agendado = false;
    var total = document.documentElement.scrollHeight - window.innerHeight;
    barra.style.width = (total > 0 ? (window.scrollY / total) * 100 : 0) + '%';
    topo.style.display = window.scrollY > 600 ? 'flex' : 'none';
    var atual = -1;
    for (var i = 0; i < alvos.length; i++) {
      if (alvos[i] && alvos[i].getBoundingClientRect().top <= 140) atual = i;
    }
    links.forEach(function (a, i) { a.classList.toggle('active', i === atual); });
  }
  window.addEventListener('scroll', function () { if (!agendado) { agendado = true; requestAnimationFrame(aoRolar); } }, { passive: true });
  aoRolar();
  topo.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---- sumário no celular ---- */
  var toggle = document.getElementById('sidebar-toggle');
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('overlay');
  function fechar() { sidebar.classList.remove('open'); toggle.classList.remove('active'); overlay.style.display = 'none'; }
  toggle.addEventListener('click', function () {
    var aberto = sidebar.classList.toggle('open');
    toggle.classList.toggle('active', aberto);
    overlay.style.display = aberto ? 'block' : 'none';
  });
  overlay.addEventListener('click', fechar);
  sidebar.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', fechar); });
})();
