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
      blog_label:    'Blog',
      blog_title:    'Forschung &amp; Einblicke',
      blog_subtitle: 'Aktuelles aus unseren Projekten, Methoden und Ergebnissen.',
      read_more:     'Weiterlesen →',
      back_to_posts: '← Alle Beiträge',
      footer_legal:  'Impressum',
      footer_privacy:'Datenschutz',
      footer_revoke: 'Einwilligungen widerrufen',
      filter_all:    'Alle',
    },
    en: {
      blog_label:    'Blog',
      blog_title:    'Research &amp; Insights',
      blog_subtitle: 'Updates from our projects, methods, and findings.',
      read_more:     'Read more →',
      back_to_posts: '← All Posts',
      footer_legal:  'Legal Notice',
      footer_privacy:'Privacy Policy',
      footer_revoke: 'Revoke consent',
      filter_all:    'All',
    }
  };

  /* ── Language: same key as main site so they stay in sync ── */
  function getLang() {
    var m = document.cookie.match(/(?:^|;\s*)dlh_lang=([^;]+)/);
    return m ? m[1] : localStorage.getItem('dlh_lang');
  }
  function setLang(lang) {
    document.cookie = 'dlh_lang=' + lang + '; path=/; domain=.datalabhell.at; max-age=31536000; SameSite=Lax';
    localStorage.setItem('dlh_lang', lang);
  }

  var savedLang  = getLang();
  var browserLang = (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
  var currentLang = savedLang || browserLang;

  /* ── Date formatting ── */
  function formatDate(iso, lang) {
    var p = iso.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString(lang === 'de' ? 'de-AT' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

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
    document.querySelectorAll('[data-date]').forEach(function (el) {
      el.textContent = formatDate(el.getAttribute('data-date'), lang);
    });
    document.documentElement.lang = lang;
    var langBtn = document.getElementById('lang-toggle');
    if (langBtn) langBtn.textContent = lang === 'de' ? 'EN' : 'DE';
    // Update <title> and <meta description> on post pages
    if (t['post_hero_title']) {
      document.title = t['post_hero_title'] + ' — Data Lab Hell';
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && t['post_hero_desc']) metaDesc.setAttribute('content', t['post_hero_desc']);
    }
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
          '<a href="' + blogRoot + 'index.html" class="nav-blog-mobile" aria-current="page">Blog</a>' +
        '</nav>' +
        '<div class="header-right">' +
          '<a href="' + blogRoot + 'index.html" class="nav-blog" aria-current="page">Blog</a>' +
          '<button id="lang-toggle" class="lang-toggle">' + (currentLang === 'de' ? 'EN' : 'DE') + '</button>' +
          '<button class="burger" id="burger-btn" aria-label="Toggle menu" aria-expanded="false">' +
            '<span></span><span></span><span></span>' +
          '</button>' +
        '</div>' +
      '</div>';

    document.getElementById('lang-toggle').addEventListener('click', function () {
      currentLang = currentLang === 'de' ? 'en' : 'de';
      setLang(currentLang);
      applyLang(currentLang);
    });
  }

  /* ── Footer ── */
  var footerEl = document.querySelector('footer');
  if (footerEl) {
    footerEl.innerHTML =
      '<div class="container footer-bottom-inner">' +
        '<span class="copy">&copy; ' + new Date().getFullYear() + ' Data Lab Hell GmbH &middot; Zirl, Austria</span>' +
        '<nav class="footer-legal">' +
          '<a href="#" data-cc-revoke data-i18n="footer_revoke">Revoke consent</a>' +
          '<a href="' + MAIN_SITE + '/datenschutz.html" data-i18n="footer_privacy">Privacy Policy</a>' +
          '<a href="' + MAIN_SITE + '/impressum.html" data-i18n="footer_legal">Legal Notice</a>' +
        '</nav>' +
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

  // trigger once on load
  if (header) header.classList.toggle('scrolled', window.scrollY > 20);

  /* ── Burger menu ── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('#burger-btn');
    var nav = document.getElementById('main-nav');
    if (!btn || !nav) return;
    var open = nav.classList.toggle('nav-open');
    btn.classList.toggle('burger-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ── posts.json fetch (browser HTTP cache handles repeated requests) ── */
  async function fetchPosts() {
    const r = await fetch(blogRoot + 'posts.json');
    return r.json();
  }

  /* ── Blog index: render cards from post metadata ── */
  var grid = document.getElementById('post-grid');
  if (grid) {
    fetchPosts()
      .then(function (posts) { return posts; })
      .then(function (posts) {
        // Newest first
        posts.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

        // Count tag frequencies and sort by count desc
        var tagCounts = {};
        posts.forEach(function (p) {
          (p.tags || []).forEach(function (tag) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        });
        var allTags = Object.keys(tagCounts).sort(function (a, b) {
          return tagCounts[b] - tagCounts[a];
        });

        // Build tag filter UI
        if (allTags.length > 0) {
          var totalPosts = posts.length;
          var filterEl = document.createElement('div');
          filterEl.className = 'tag-filter';
          filterEl.innerHTML =
            '<button class="tag-filter-btn active" data-tag=""><span data-i18n="filter_all">All</span><span class="tag-filter-count" data-total="' + totalPosts + '">(' + totalPosts + ')</span></button>' +
            allTags.map(function (tag) {
              return '<button class="tag-filter-btn" data-tag="' + tag + '">' + tag + '<span class="tag-filter-count">(' + tagCounts[tag] + ')</span></button>';
            }).join('');
          var wrap = grid.closest('.post-grid-wrap') || grid.parentNode;
          wrap.insertBefore(filterEl, wrap.firstChild);

          filterEl.addEventListener('click', function (e) {
            var btn = e.target.closest('.tag-filter-btn');
            if (!btn) return;
            var active = btn.getAttribute('data-tag');
            filterEl.querySelectorAll('.tag-filter-btn').forEach(function (b) {
              b.classList.toggle('active', b === btn);
            });
            var visible = 0;
            grid.querySelectorAll('.post-card').forEach(function (card) {
              var cardTags = (card.getAttribute('data-tags') || '').split(',');
              var show = !active || cardTags.indexOf(active) !== -1;
              card.style.display = show ? '' : 'none';
              if (show) visible++;
            });
            // Update the "All" button count to reflect current filter
            var countEl = filterEl.querySelector('.tag-filter-count[data-total]');
            if (countEl) countEl.textContent = '(' + (active ? visible : totalPosts) + ')';
          });
        }

        // Render cards
        posts.forEach(function (p) {
          var slug     = p.path.split('/').pop().replace(/\.html$/, '').replace(/-/g, '_');
          var titleKey = 'post_title_' + slug;
          var descKey  = 'post_desc_'  + slug;

          translations.en[titleKey] = p.title;
          translations.de[titleKey] = p.titleDe || p.title;
          translations.en[descKey]  = p.desc;
          translations.de[descKey]  = p.descDe  || p.desc;

          var tags     = p.tags || [];
          var tagsHtml = tags.map(function (t) { return '<span class="post-tag">' + t + '</span>'; }).join('');

          var card = document.createElement('a');
          card.className = 'post-card';
          card.href = p.path;
          if (tags.length) card.setAttribute('data-tags', tags.join(','));
          card.innerHTML =
            '<div class="post-card-body">' +
              (tagsHtml ? '<div class="post-card-tags">' + tagsHtml + '</div>' : '') +
              '<h2 data-i18n="' + titleKey + '">' + p.title + '</h2>' +
              (p.desc ? '<p data-i18n="' + descKey + '">' + p.desc + '</p>' : '') +
              (p.date ? '<span class="post-date post-date--card" data-date="' + p.date + '">' + formatDate(p.date, currentLang) + '</span>' : '') +
              '<span class="post-read-more" data-i18n="read_more">Read more →</span>' +
            '</div>' +
            (p.image && p.image.indexOf('/brand/') === -1
              ? '<img class="post-card-image" src="' + p.image + '" alt="">'
              : '');
          grid.appendChild(card);
        });

        applyLang(currentLang);
      });
  }

  /* ── Post layout injection ── */
  if (document.body.hasAttribute('data-post')) {
    var currentPath = window.location.pathname.replace(/^\//, '');
    var mainEl = document.querySelector('main');

    if (mainEl) {
      // Wrap content immediately so layout doesn't jump
      var content = mainEl.innerHTML;
      mainEl.innerHTML =
        '<div class="article-wrap">' +
          '<a class="article-back" href="' + blogRoot + 'index.html" data-i18n="back_to_posts">&larr; All Posts</a>' +
          '<article class="article-content">' + content + '</article>' +
        '</div>';

      // Build hero from posts.json (single source of truth; cached after first visit)
      fetchPosts()
        .then(function (posts) {
          var match = posts.filter(function (p) {
            return p.path === currentPath || p.path.split('/').pop() === currentPath.split('/').pop();
          })[0];
          if (!match) return;

          var postDate = match.date   || '';
          var author   = match.author || '';
          var tags     = match.tags   || [];
          var isIso    = /^\d{4}-\d{2}-\d{2}$/.test(postDate);
          var tagsHtml = tags.map(function (t) { return '<span class="post-tag">' + t + '</span>'; }).join('');

          // Register translations so applyLang keeps title/desc in sync on language switch
          translations.en['post_hero_title'] = match.title;
          translations.de['post_hero_title'] = match.titleDe || match.title;
          translations.en['post_hero_desc']  = match.desc    || '';
          translations.de['post_hero_desc']  = match.descDe  || match.desc || '';

          // Create <meta description> if missing
          if (!document.querySelector('meta[name="description"]')) {
            var metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
          }

          var hero = document.createElement('div');
          hero.className = 'post-hero';
          hero.innerHTML =
            '<div class="container">' +
              (tagsHtml ? '<div class="post-hero-tags">' + tagsHtml + '</div>' : '') +
              '<h1 data-i18n="post_hero_title">' + match.title + '</h1>' +
              '<div class="post-hero-meta">' +
                (postDate ? '<span class="post-date"' + (isIso ? ' data-date="' + postDate + '"' : '') + '>' + (isIso ? formatDate(postDate, currentLang) : postDate) + '</span>' : '') +
                (author ? '<span class="post-author">' + author + '</span>' : '') +
              '</div>' +
            '</div>';
          mainEl.parentNode.insertBefore(hero, mainEl);
          applyLang(currentLang);
        });
    }
  }

  /* ── Apply language (runs after all DOM injection above) ── */
  applyLang(currentLang);
})();
