'use strict';

// O servidor autoriza cada leitura; o navegador recebe apenas o conteúdo permitido.
let posts = [];
let loadState = "loading";
let user = null;
let requestVersion = 0;
let routeError = '';

const main = document.querySelector('main');
const areaName = area => area === 'biologia' ? 'Biologia' : 'Matemática';
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function safePost(post) {
  const escaped = Object.fromEntries(Object.entries(post).map(([key, value]) => [key, escapeHtml(value)]));
  // Apenas parágrafos e títulos sem atributos são aceitos no conteúdo do banco.
  escaped.body = escapeHtml(post.body).replace(/&lt;(\/?)(h2|p)&gt;/g, '<$1$2>');
  return escaped;
}
const art = '<div class="illustration" aria-hidden="true"><span class="formula">∑ ∞</span><small>DUAS ÁREAS. NOVAS DESCOBERTAS.</small></div>';
function card(post) {
  const math = post.area === 'matematica' ? ' math' : '';
  return `<article class="card"><div class="card-art${math}" aria-hidden="true">${post.symbol}</div><div class="card-body"><span class="meta${math}">${areaName(post.area)} · ${post.time} de leitura</span><h3><a href="#post/${post.id}">${post.title}</a></h3><p>${post.summary}</p><a class="read-link" href="#post/${post.id}" aria-label="Ler artigo: ${post.title}">Ler artigo <span aria-hidden="true">→</span></a></div></article>`;
}
function render() {
  const route = user ? (location.hash.slice(1) || 'inicio') : 'login';
  const account = document.querySelector('.header > .button');
  account.textContent = user ? 'Sair' : 'Entrar';
  account.href = '#login';
  account.onclick = user ? logout : null;
  document.querySelectorAll('nav [data-nav]').forEach(link => { link.hidden = !user || !['inicio', user.perfil].includes(link.dataset.nav); });
  if (user && routeError) {
    main.innerHTML = `<section class="article"><h1>${escapeHtml(routeError)}</h1><a class="button" href="#inicio">Voltar ao início</a></section>`;
    document.title = 'Acesso ao conteúdo | Saber Seguro';
    return;
  }
  if (route !== 'login' && loadState !== 'ready') {
    document.title = 'Artigos | Saber Seguro';
    document.querySelectorAll('[data-nav]').forEach(link => link.removeAttribute('aria-current'));
    main.innerHTML = loadState === 'loading'
      ? '<p role="status">Carregando artigos…</p>'
      : '<section class="article"><h1>Não foi possível carregar os artigos.</h1><p>Confira se o servidor está rodando e tente novamente.</p><button class="button" id="retry">Tentar novamente</button></section>';
    document.querySelector('#retry')?.addEventListener('click', loadPosts);
    return;
  }
  let active = route;
  let title = 'Início';
  if (route === 'login') {
    title = 'Entrar';
    main.innerHTML = `<section class="login-layout"><div class="login-intro"><p class="eyebrow">Seu espaço de aprendizado</p><h1>Conhecimento começa com curiosidade.</h1><p>Acesse os conteúdos da sua área e continue aprendendo.</p>${art}</div><div class="login-card"><h2>Bem-vindo de volta</h2><p>Entre com as credenciais da sua conta.</p><form id="login-form"><label for="username">Usuário</label><input id="username" name="username" autocomplete="username" placeholder="Seu usuário" required maxlength="100"><label for="password">Senha</label><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Sua senha" required maxlength="128"><button class="button" type="submit">Entrar <span aria-hidden="true">→</span></button><div class="form-message" role="status" id="login-message"></div></form><p class="login-hint">Use a conta fornecida para sua área de estudo.</p></div></section>`;
    document.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button');
      const message = form.querySelector('#login-message');
      button.disabled = true; button.textContent = 'Entrando…';
      const body = JSON.stringify({ username: form.username.value, password: form.password.value });
      try {
        const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(15000) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        user = data.user;
        history.replaceState(null, '', '#inicio');
        await loadPosts();
      } catch (error) { message.textContent = error.name === 'TimeoutError' || error instanceof TypeError ? 'Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.' : error.message || 'Não foi possível entrar. Tente novamente.'; }
      finally { form.password.value = ''; button.disabled = false; button.textContent = 'Entrar'; }
    });
  } else if (route.startsWith('post/')) {
    const post = posts.find(item => item.id === route.slice(5));
    if (post) {
      active = post.area;
      title = post.title;
      main.innerHTML = `<article class="article"><a class="back" href="#${post.area}">← Voltar para ${areaName(post.area)}</a><div class="meta">${areaName(post.area)} · ${post.time} de leitura</div><h1>${post.title}</h1><p class="lead">${post.summary}</p><div class="article-content">${post.body}</div></article>`;
    } else notFound();
  } else if (['inicio', 'biologia', 'matematica'].includes(route)) {
    const home = route === 'inicio';
    const selected = home ? posts : posts.filter(post => post.area === route);
    title = home ? 'Início' : areaName(route);
    main.innerHTML = `<section class="hero"><div><p class="eyebrow">${home ? 'Aprender. Entender. Descobrir.' : 'Explore sua área'}</p><h1>${home ? 'Um espaço para<br>ampliar seu mundo.' : areaName(route)}</h1><p>${home ? 'Da vida em suas menores formas à lógica dos números. Explore ideias, entenda conceitos e descubra algo novo.' : route === 'biologia' ? 'Explore a vida, das estruturas celulares aos processos que sustentam os ecossistemas.' : 'Entenda os números, reconheça padrões e encontre caminhos para resolver problemas.'}</p></div>${art}</section><section aria-labelledby="posts-title"><div class="section-heading"><h2 id="posts-title">${home ? 'Explore os conteúdos' : 'Artigos de ' + areaName(route)}</h2><span>${selected.length} artigos</span></div>${selected.length ? `<div class="grid">${selected.map(card).join('')}</div>` : '<p>Nenhum artigo disponível nesta área.</p>'}</section>`;
  } else notFound();
  function notFound() {
    title = 'Página não encontrada';
    main.innerHTML = '<section class="article"><p class="eyebrow">Página não encontrada</p><h1>Esse conteúdo não está aqui.</h1><a class="button" href="#inicio">Voltar ao início</a></section>';
  }
  document.title = `${title} | Saber Seguro`;
  document.querySelectorAll('[data-nav]').forEach(link => {
    if (link.dataset.nav === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
window.addEventListener('hashchange', () => { loadPosts(); main.focus({ preventScroll: true }); window.scrollTo(0, 0); });
window.addEventListener('pageshow', event => { if (event.persisted) loadPosts(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { posts = []; if (user) main.innerHTML = '<p role="status">Conteúdo pausado.</p>'; }
  else if (user) loadPosts();
});
async function logout(event) {
  event.preventDefault();
  try {
    const response = await fetch('/api/logout', { method: 'POST', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error();
    requestVersion++; user = null; posts = []; routeError = '';
    history.replaceState(null, '', '#login'); render();
  } catch { main.innerHTML = '<p role="alert">Não foi possível sair. Verifique a conexão e clique em Sair novamente.</p>'; }
}
async function loadPosts() {
  const version = ++requestVersion;
  routeError = '';
  posts = [];
  loadState = 'loading';
  render();
  try {
    const session = await fetch('/api/session', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (version !== requestVersion) return;
    if (session.status === 401) { user = null; history.replaceState(null, '', '#login'); render(); return; }
    if (!session.ok) throw new Error();
    user = (await session.json()).user;
    if (version !== requestVersion) return;
    if (location.hash === '#login') history.replaceState(null, '', '#inicio');
    const route = location.hash.slice(1) || 'inicio';
    const endpoint = route.startsWith('post/') ? '/api/posts/' + encodeURIComponent(route.slice(5)) : '/api/posts' + (['biologia', 'matematica'].includes(route) ? '?area=' + route : '');
    const response = await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (version !== requestVersion) return;
    if (response.status === 401) { user = null; history.replaceState(null, '', '#login'); render(); return; }
    if ([403, 404].includes(response.status)) { routeError = response.status === 403 ? 'Acesso negado para seu perfil.' : 'Artigo não encontrado.'; render(); return; }
    if (!response.ok) throw new Error('Falha na API');
    const data = await response.json();
    if (version !== requestVersion) return;
    if (data.post) data.posts = [data.post];
    if (!Array.isArray(data.posts) || !data.posts.every(post =>
      post && ['id', 'area', 'title', 'summary', 'symbol', 'time', 'body'].every(key => typeof post[key] === 'string') &&
      /^[a-z0-9-]+$/.test(post.id) && ['biologia', 'matematica'].includes(post.area))) {
      throw new Error('Resposta inválida');
    }
    posts = data.posts.map(safePost);
    loadState = 'ready';
  } catch {
    if (version !== requestVersion) return;
    loadState = 'error';
  }
  render();
}
loadPosts();
setInterval(() => { if (user && !document.hidden) loadPosts(); }, 60000);
