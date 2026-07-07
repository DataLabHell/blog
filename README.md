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

The `author` value drives the hero byline **and** is matched against `authors.json` to render the author card at the end of the post (see below).

Tag filter notes:
- Tags only appear in the filter bar once they are shared by **2 or more posts**
- Tags are sorted by frequency (most-used first)

**3. (If a new author) add them to `authors.json`**

See [Authors](#authors) — needed only the first time a given person publishes.

Clean directory URLs and explicit `index.html` URLs both work (e.g. `/posts/faraday/` and `/posts/faraday/index.html`); `components.js` resolves the blog root and matches the post either way.

## Authors

Author contact details live in `authors.json`, keyed by the **exact name string** used in `posts.json`:

```json
{
  "Author Name": {
    "role": "Author",
    "email": "name@datalabhell.at",
    "linkedin": "https://www.linkedin.com/in/…",
    "github": "https://github.com/…"
  }
}
```

`components.js` injects an author card at the end of every post, matching the post's `author` against this registry. It is the single source of truth for author info — do not hardcode the card in a post.

- Every field except the name key is **optional** — a person with no `github`, for example, just doesn't render that link.
- If a post's author is **not** in `authors.json` (e.g. an autonomously AI-generated piece), **no card is shown** — the hero byline still displays the name.
- Values are public — use company emails and public profile URLs only.

## Cookie consent

Loaded from `https://datalabhell.ac.at/cookie-consent.js` — edit it there, both sites update automatically.
