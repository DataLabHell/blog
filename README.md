# DLH Blog

Static blog for [blog.datalabhell.ac.at](https://blog.datalabhell.ac.at), served via Cloudflare Pages.

## Adding a new post

**1. Create the HTML file**

Copy `posts/_template.html` to `posts/your-post-slug.html` and fill in the content inside `<main>`.

Everything else (`<title>`, `<meta description>`, hero, tags) is injected automatically from `posts.json`. The only required attribute on `<body>` is `data-post`.

**English-only post** — no extra setup needed. Leave out `window.POST_TRANSLATIONS` entirely.

**Bilingual post (DE/EN)** — add a `window.POST_TRANSLATIONS` block and use `data-i18n` / `data-i18n-html` attributes on elements inside `<main>`. A "Auch auf Deutsch verfügbar" badge is shown automatically on the card and post hero when `titleDe` is present in `posts.json`.

**2. Add an entry to `posts.json`**

```json
{
  "path": "posts/your-post-slug.html",
  "title": "Your Post Title",
  "date": "YYYY-MM-DD",
  "tags": ["Tag1", "Tag2"],
  "author": "Author Name",
  "desc": "One-sentence English description shown in the card."
}
```

Optional fields:
- `titleDe` / `descDe` — German title and description; triggers the language badge
- `image` — path to a post thumbnail; SVG/brand images get a light background treatment, editorial images are shown full-bleed

`posts.json` is the single source of truth for all post metadata. The index page reads it to render cards; the post page reads it to render the hero.

Tag filter notes:
- Tags only appear in the filter bar once they are shared by **2 or more posts**
- Tags are sorted by frequency (most-used first)

## Cookie consent

Loaded from `https://datalabhell.ac.at/cookie-consent.js` — edit it there, both sites update automatically.
