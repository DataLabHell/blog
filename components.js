/* ── Blog shared components ─────────────────────────────────────── */
(function () {
  var MAIN_SITE = 'https://datalabhell.ac.at';

  /* ── Resolve blog root from any URL shape ──
     Count directory levels below the root, handling BOTH clean directory URLs
     (production: /posts/faraday/) and explicit file URLs (/posts/faraday/index.html).
     A trailing path segment that looks like a file (has an extension) is the
     document name, not a directory, so it doesn't add a level.
       /                          → 0   → './'
       /index.html                → 0   → './'
       /posts/x.html              → 1   → '../'
       /posts/faraday/            → 2   → '../../'
       /posts/faraday/index.html  → 2   → '../../'  */
  var segs = window.location.pathname.split('/').filter(Boolean);
  if (segs.length && /\.[a-z0-9]+$/i.test(segs[segs.length - 1])) segs.pop();
  var up         = segs.length ? '../'.repeat(segs.length) : './';
  var staticBase = up + 'static/';
  var blogRoot   = up;

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
      by:            'von',
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
      by:            'by',
    }
  };

  /* ── Language: same key as main site so they stay in sync ── */
  function getLang() {
    var m = document.cookie.match(/(?:^|;\s*)dlh_lang=([^;]+)/);
    return m ? m[1] : localStorage.getItem('dlh_lang');
  }
  function setLang(lang) {
    document.cookie = 'dlh_lang=' + lang + '; path=/; domain=.datalabhell.ac.at; max-age=31536000; SameSite=Lax';
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
      if (t[key] !== undefined) {
        var anchor = el.querySelector('.heading-anchor');
        el.textContent = t[key];
        if (anchor) el.appendChild(anchor);
      }
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
    document.querySelectorAll('[data-lang-switch]').forEach(function (el) {
      if (el.classList.contains('lang-badge--hero')) {
        el.textContent = lang === 'de' ? 'Also available in English' : 'Auch auf Deutsch verfügbar';
      } else {
        el.textContent = lang === 'de' ? 'EN' : 'DE';
      }
    });
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

  document.addEventListener('click', function (e) {
    var badge = e.target.closest('[data-lang-switch]');
    if (!badge) return;
    e.preventDefault();
    e.stopPropagation();
    currentLang = currentLang === 'de' ? 'en' : 'de';
    setLang(currentLang);
    applyLang(currentLang);
  });

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

  /* ── authors.json fetch (people registry: name → {role,email,linkedin,github}) ── */
  async function fetchAuthors() {
    try { const r = await fetch(blogRoot + 'authors.json'); return await r.json(); }
    catch (e) { return {}; }
  }

  /* ── Author-card builder (icons mirror the original hardcoded block) ── */
  var AUTHOR_ICONS = {
    linkedin: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path></svg>',
    github:   '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path></svg>',
    email:    '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"></path></svg>'
  };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function authorNames(match) {
    if (Array.isArray(match.authors)) return match.authors;
    if (match.author) return [match.author];
    return [];
  }
  function authorCardHtml(name, info) {
    var links = [];
    if (info.linkedin) links.push('<a aria-label="LinkedIn" href="' + esc(info.linkedin) + '" rel="noopener" target="_blank">' + AUTHOR_ICONS.linkedin + 'LinkedIn</a>');
    if (info.github)   links.push('<a aria-label="GitHub" href="' + esc(info.github) + '" rel="noopener" target="_blank">' + AUTHOR_ICONS.github + 'GitHub</a>');
    if (info.email)    links.push('<a aria-label="Email" href="mailto:' + esc(info.email) + '">' + AUTHOR_ICONS.email + esc(info.email) + '</a>');
    return '<div class="authorcard">' +
        '<div class="who"><span class="nm">' + esc(name) + '</span> &middot; <span class="rl">' + esc(info.role || 'Author') + '</span></div>' +
        (links.length ? '<div class="lk">' + links.join('') + '</div>' : '') +
      '</div>';
  }
  // Append a card for each named author found in the registry (unknown / AI authors get none).
  function injectAuthorCards(match, authors, articleEl) {
    if (!articleEl) return;
    authorNames(match).forEach(function (name) {
      var info = authors[name];
      if (info) articleEl.insertAdjacentHTML('beforeend', authorCardHtml(name, info));
    });
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
        var allTags = Object.keys(tagCounts).filter(function (tag) {
          return tagCounts[tag] > 1;
        }).sort(function (a, b) {
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
          var tagsHtml = tags.map(function (t) { return '<button class="post-tag" data-tag="' + t + '">' + t + '</button>'; }).join('');

          var card = document.createElement('a');
          card.className = 'post-card';
          card.href = p.path;
          if (tags.length) card.setAttribute('data-tags', tags.join(','));
          card.innerHTML =
            '<div class="post-card-body">' +
              (tagsHtml ? '<div class="post-card-tags">' + tagsHtml + '</div>' : '') +
              '<h2 data-i18n="' + titleKey + '">' + p.title + '</h2>' +
              (p.desc ? '<p data-i18n="' + descKey + '">' + p.desc + '</p>' : '') +
              '<div class="post-card-meta">' +
                (p.date ? '<span class="post-date" data-date="' + p.date + '">' + formatDate(p.date, currentLang) + '</span>' : '') +
                (p.author ? '<span class="post-author" data-author="' + p.author + '"><span data-i18n="by">' + translations[currentLang].by + '</span> ' + p.author + '</span>' : '') +
                (p.titleDe ? '<button class="lang-badge" data-lang-switch title="Also available in German / Auch auf Deutsch verfügbar">DE</button>' : '') +
              '</div>' +
            '</div>' +
            (p.image
              ? (p.image.indexOf('/brand/') !== -1 || /\.svg$/i.test(p.image)
                ? '<div class="post-card-image post-card-image--brand"><img src="' + p.image + '" alt=""></div>'
                : '<img class="post-card-image" src="' + p.image + '" alt="">')
              : '');
          grid.appendChild(card);
        });

        grid.addEventListener('click', function (e) {
          var tag = e.target.closest('.post-tag[data-tag]');
          if (!tag) return;
          e.preventDefault();
          var btn = filterEl.querySelector('.tag-filter-btn[data-tag="' + tag.getAttribute('data-tag') + '"]');
          if (btn) btn.click();
        });

        applyLang(currentLang);
      });
  }

  /* ── Post layout injection ── */
  // Canonicalise a path so directory URLs and explicit index.html URLs compare
  // equal: '/posts/faraday/', '/posts/faraday/index.html' and 'posts/faraday/index.html'
  // all reduce to 'posts/faraday'.
  function canonPath(p) {
    return p.replace(/^\//, '')
            .replace(/(?:^|\/)index\.html?$/i, '')
            .replace(/\.html?$/i, '')
            .replace(/\/+$/, '');
  }
  if (document.body.hasAttribute('data-post')) {
    var currentPath = canonPath(window.location.pathname);
    var mainEl = document.querySelector('main');

    if (mainEl) {
      // Wrap content immediately so layout doesn't jump
      var content = mainEl.innerHTML;
      mainEl.innerHTML =
        '<div class="article-wrap">' +
          '<article class="article-content">' + content + '</article>' +
        '</div>';

      // Auto-anchor all headings
      mainEl.querySelectorAll('.article-content h2, .article-content h3').forEach(function (h) {
        var slug = h.textContent.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        h.id = slug;
        h.style.cursor = 'pointer';
        h.addEventListener('click', function (e) {
          if (!e.target.closest('a')) {
            window.location.hash = slug;
          }
        });
        var a = document.createElement('a');
        a.className = 'heading-anchor';
        a.href = '#' + slug;
        a.setAttribute('aria-hidden', 'true');
        a.textContent = '#';
        h.appendChild(a);
      });

      // Build hero from posts.json (single source of truth; cached after first visit)
      fetchPosts()
        .then(function (posts) {
          var match = posts.filter(function (p) {
            return canonPath(p.path) === currentPath;
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
              '<a class="article-back" href="' + blogRoot + 'index.html" data-i18n="back_to_posts">&larr; All Posts</a>' +
              (tagsHtml ? '<div class="post-hero-tags">' + tagsHtml + '</div>' : '') +
              '<h1 data-i18n="post_hero_title">' + match.title + '</h1>' +
              '<div class="post-hero-meta">' +
                (postDate ? '<span class="post-date"' + (isIso ? ' data-date="' + postDate + '"' : '') + '>' + (isIso ? formatDate(postDate, currentLang) : postDate) + '</span>' : '') +
                (author ? '<span class="post-author">' + author + '</span>' : '') +
                (match.titleDe ? '<button class="lang-badge lang-badge--hero" data-lang-switch>' + (currentLang === 'de' ? 'Also available in English' : 'Auch auf Deutsch verfügbar') + '</button>' : '') +
              '</div>' +
            '</div>';
          mainEl.parentNode.insertBefore(hero, mainEl);

          // Author card(s) at the end of the article, from authors.json
          fetchAuthors().then(function (authors) {
            injectAuthorCards(match, authors, mainEl.querySelector('.article-content'));
            applyLang(currentLang);
          });

          applyLang(currentLang);
        });
    }
  }

  /* ── Apply language (runs after all DOM injection above) ── */
  applyLang(currentLang);
})();
