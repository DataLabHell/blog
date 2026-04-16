# DLH Blog

Static blog for [blog.datalabhell.at](https://blog.datalabhell.at), served via GitHub Pages.

## Adding a new post

### 1. Create the post file

Copy `posts/_template.html` and rename it — use a date prefix so posts sort correctly:

```
posts/2026-04-16-my-post-title.html
```

### 2. Fill in the metadata

Edit the `<head>` and `<body>` attributes:

```html
<title>My Post Title — Data Lab Hell</title>
<meta name="description" content="One sentence shown as the card excerpt on the index page." />
```

```html
<body class="inner-page"
  data-post-title="My Post Title"
  data-post-date="April 2026"
  data-post-tag="Research"
  data-post-image="../static/images/my-cover.jpg">  ← optional, remove if no image
```

Available tags: `Research`, `Engineering`, `Company`

### 3. Write the content

Everything inside `<main>...</main>` is the article body. The hero, back link, and article wrapper are injected automatically. Use standard HTML:

```html
<main>
  <p>Intro paragraph.</p>

  <h2>Section heading</h2>
  <p>Body text.</p>

  <ul>
    <li>List item</li>
  </ul>

  <blockquote>A quote.</blockquote>

  <pre><code>some code</code></pre>
</main>
```

### 4. Register the post in posts.json

Add the filename at the top of `posts.json` (newest first):

```json
[
  "posts/2026-04-16-my-post-title.html",
  "posts/2026-02-01-introducing-the-dlh-blog.html"
]
```

### 5. Push

```bash
git add posts/2026-04-16-my-post-title.html posts.json
git commit -m "feat: add post — My Post Title"
git push
```

The post appears on the index automatically.

---

## Project structure

```
blog/
├── index.html            # Post listing (no edits needed beyond posts.json)
├── style.css             # All styles
├── components.js         # Shared header, footer, post layout injection
├── posts.json            # Ordered list of post files (edit this when adding posts)
├── posts/
│   ├── _template.html    # Copy this for every new post
│   └── *.html            # Individual posts
└── static/
    ├── brand/            # Logo, favicon
    └── images/           # Post cover images (optional)
```
