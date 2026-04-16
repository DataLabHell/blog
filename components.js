/* ── Blog shared components ─────────────────────────────────────── */
(function () {
  var MAIN_SITE = 'https://datalabhell.at';

  /* ── Resolve static base path (works from / and /posts/) ── */
  var depth = window.location.pathname.split('/').filter(Boolean).length;
  var staticBase = depth <= 1 ? '/static/' : '../static/';
  var blogRoot   = depth <= 1 ? '/'        : '../';

  /* ── UI translations ── */
  var translations = {
    de: {
      blog_label:      'Blog',
      blog_title:      'Forschung &amp; Einblicke',
      blog_subtitle:   'Aktuelles aus unseren Projekten, Methoden und Ergebnissen.',
      read_more:       'Weiterlesen →',
      back_to_posts:   '← Alle Beiträge',
      footer_legal:    'Impressum',
      footer_privacy:  'Datenschutz',
    },
    en: {
      blog_label:      'Blog',
      blog_title:      'Research &amp; Insights',
      blog_subtitle:   'Updates from our projects, methods, and findings.',
      read_more:       'Read more →',
      back_to_posts:   '← All Posts',
      footer_legal:    'Legal Notice',
      footer_privacy:  'Privacy Policy',
    }
  };

  /* ── Language: same key as main site so they stay in sync ── */
  var savedLang  = localStorage.getItem('dlh_lang');
  var browserLang = (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
  var currentLang = savedLang || browserLang;

  /* ── applyLang: UI strings + optional per-post strings ── */
  function applyLang(lang) {
    var t = Object.assign({}, translations[lang] || translations['en']);
    if (window.POST_TRANSLATIONS && window.POST_TRANSLATIONS[lang]) {
      Object.assign(t, window.POST_TRANSLATIONS[lang]);
    }
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) el.textContent = t[key];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (t[key] !== undefined) el.innerHTML = t[key];
    });
    document.documentElement.lang = lang;
    var langBtn = document.getElementById('lang-toggle');
    if (langBtn) langBtn.textContent = lang === 'de' ? 'EN' : 'DE';
    return t;
  }

  /* ── Header ── */
  var headerEl = document.querySelector('header');
  if (headerEl) {
    headerEl.innerHTML =
      '<div class="container">' +
        '<a href="' + MAIN_SITE + '" class="logo" aria-label="Data Lab Hell">' +
          '<img src="' + staticBase + 'brand/LOGO_DLH_header.svg" alt="Data Lab Hell">' +
        '</a>' +
        '<nav id="main-nav">' +
          '<a href="' + MAIN_SITE + '/#about">About</a>' +
          '<a href="' + MAIN_SITE + '/#research">Scope</a>' +
          '<a href="' + MAIN_SITE + '/#team">Team</a>' +
          '<a href="' + MAIN_SITE + '/#kooperationen">Collaborations</a>' +
          '<a href="' + MAIN_SITE + '/#contact">Contact</a>' +
          '<a href="' + blogRoot + 'index.html" aria-current="page">Blog</a>' +
        '</nav>' +
        '<div class="header-right">' +
          '<button id="lang-toggle" class="lang-toggle">' + (currentLang === 'de' ? 'EN' : 'DE') + '</button>' +
          '<button class="burger" id="burger-btn" aria-label="Toggle menu" aria-expanded="false">' +
            '<span></span><span></span><span></span>' +
          '</button>' +
        '</div>' +
      '</div>';

    document.getElementById('lang-toggle').addEventListener('click', function () {
      currentLang = currentLang === 'de' ? 'en' : 'de';
      localStorage.setItem('dlh_lang', currentLang);
      applyLang(currentLang);
    });
  }

  /* ── Footer ── */
  var footerEl = document.querySelector('footer');
  if (footerEl) {
    footerEl.innerHTML =
      '<div class="container">' +
        '<div class="footer-bottom-inner">' +
          '<span class="copy">&copy; ' + new Date().getFullYear() + ' Data Lab Hell GmbH</span>' +
          '<div class="footer-legal">' +
            '<a href="' + MAIN_SITE + '/impressum.html" data-i18n="footer_legal">Legal Notice</a>' +
            '<a href="' + MAIN_SITE + '/datenschutz.html" data-i18n="footer_privacy">Privacy Policy</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ── Back-to-top ── */
  var btt = document.createElement('button');
  btt.id = 'back-to-top';
  btt.innerHTML = '&uarr;';
  btt.title = 'Back to top';
  document.body.appendChild(btt);
  btt.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ── Scroll: header + back-to-top ── */
  var header = document.querySelector('header');
  window.addEventListener('scroll', function () {
    if (header) header.classList.toggle('scrolled', window.scrollY > 20);
    btt.classList.toggle('visible', window.scrollY > 300);
  }, { passive: true });

  /* ── Burger menu ── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('#burger-btn');
    var nav = document.getElementById('main-nav');
    if (!btn || !nav) return;
    var open = nav.classList.toggle('nav-open');
    btn.classList.toggle('burger-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ── Blog index: render cards from post metadata ── */
  var grid = document.getElementById('post-grid');
  if (grid) {
    fetch(blogRoot + 'posts.json')
      .then(function (r) { return r.json(); })
      .then(function (paths) {
        return Promise.all(paths.map(function (path) {
          return fetch(path)
            .then(function (r) { return r.text(); })
            .then(function (html) {
              var doc    = new DOMParser().parseFromString(html, 'text/html');
              var body   = doc.body;
              var descEl = doc.querySelector('meta[name="description"]');
              return {
                path:  path,
                title: body.getAttribute('data-post-title')  || '',
                date:  body.getAttribute('data-post-date')   || '',
                tag:   body.getAttribute('data-post-tag')    || '',
                image: body.getAttribute('data-post-image')  || '',
                desc:  descEl ? descEl.getAttribute('content') : '',
              };
            });
        }));
      })
      .then(function (posts) {
        var t = translations[currentLang] || translations['en'];
        posts.forEach(function (p) {
          var card = document.createElement('a');
          card.className = 'post-card';
          card.href = p.path;
          card.innerHTML =
            '<div class="post-card-body">' +
              '<div class="post-card-meta">' +
                (p.tag  ? '<span class="post-tag">'  + p.tag  + '</span>' : '') +
                (p.date ? '<span class="post-date">' + p.date + '</span>' : '') +
              '</div>' +
              '<h2>' + p.title + '</h2>' +
              (p.desc ? '<p>' + p.desc + '</p>' : '') +
              '<span class="post-read-more">' + t.read_more + '</span>' +
            '</div>' +
            (p.image ? '<img class="post-card-image' + (p.image.indexOf('/brand/') !== -1 ? ' post-card-image--brand' : '') + '" src="' + p.image + '" alt="">' : '');
          grid.appendChild(card);
        });
      });
  }

  /* ── Post layout injection ── */
  var postTitle = document.body.getAttribute('data-post-title');
  if (postTitle) {
    var postTag    = document.body.getAttribute('data-post-tag')    || '';
    var postDate   = document.body.getAttribute('data-post-date')   || '';
    var postAuthor = document.body.getAttribute('data-post-author') || '';

    var mainEl = document.querySelector('main');
    if (mainEl) {
      var hero = document.createElement('div');
      hero.className = 'post-hero';
      hero.innerHTML =
        '<div class="container">' +
          (postTag   ? '<p class="section-label">' + postTag + '</p>' : '') +
          '<h1>' + postTitle + '</h1>' +
          '<div class="post-hero-meta">' +
            (postDate   ? '<span class="post-date">'   + postDate   + '</span>' : '') +
            (postAuthor ? '<span class="post-author">' + postAuthor + '</span>' : '') +
          '</div>' +
        '</div>';
      mainEl.parentNode.insertBefore(hero, mainEl);

      var content = mainEl.innerHTML;
      mainEl.innerHTML =
        '<div class="article-wrap">' +
          '<a class="article-back" href="' + blogRoot + 'index.html" data-i18n="back_to_posts">&larr; All Posts</a>' +
          '<article class="article-content">' + content + '</article>' +
        '</div>';
    }
  }

  /* ── Page transitions ── */
  document.body.classList.add('page-enter');

  /* ── Apply language (runs after all DOM injection above) ── */
  applyLang(currentLang);
})();
