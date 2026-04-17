# DLH Blog

Static blog for [blog.datalabhell.at](https://blog.datalabhell.at), served via GitHub Pages.

## Posts

| Date | Title | File |
|------|-------|------|
| 2026-04-17 | Introducing the Data Lab Hell Blog | [posts/introducing-the-dlh-blog.html](posts/introducing-the-dlh-blog.html) |

## Adding a new post

**1. Create the HTML file**

Copy `posts/_template.html` to `posts/your-post-slug.html` and fill in:

- `window.POST_TRANSLATIONS` — DE/EN translations for the article body (remove the block entirely if the post is single-language)
- The content inside `<main>`

Everything else (`<title>`, `<meta description>`, hero, tags) is injected automatically from `posts.json`. The only required attribute on `<body>` is `data-post`.

**2. Add an entry to `posts.json`**

```json
{
  "path": "posts/your-post-slug.html",
  "title": "Your Post Title",
  "titleDe": "Ihr Beitragstitel",
  "date": "YYYY-MM-DD",
  "tags": ["Tag1", "Tag2"],
  "author": "Author Name",
  "desc": "One-sentence English description shown in the card.",
  "descDe": "Einzeiliger deutscher Beschreibungstext für die Karte."
}
```

`posts.json` is the single source of truth for all post metadata (title, date, author, tags, description). The index page reads it to render cards; the post page reads it to render the hero.

Optional fields:
- `image` — path to a post thumbnail (brand images are ignored; only editorial images are shown)

That's it. The card, tag filters, and post hero are all generated automatically.

## Cookie consent

Loaded from `https://datalabhell.at/cookie-consent.js` — edit it there, both sites update automatically.
