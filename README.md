# CrossPop Crossword

A mobile-first static crossword web app for GitHub Pages.

## Files

```text
index.html
styles.css
app.js
/data
  mixed-001.json
  movies-001.json
  music-001.json
  geography-001.json
README.md
```

## Deploy on GitHub Pages

1. Upload all files exactly as shown above.
2. Make sure `styles.css` is in the root folder.
3. Make sure all puzzle JSON files are inside the `/data` folder.
4. Go to **Settings → Pages**.
5. Select **Deploy from a branch**.
6. Branch: `main`
7. Folder: `/root`
8. Save.

Your test URL should look like:

```text
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
```

For your current repo, likely:

```text
https://mgaudone-cmyk.github.io/Crosswords/
```

## Add more puzzles

Create another JSON file inside `/data`, then add a button in `index.html` with:

```html
<button class="theme-card" data-puzzle="new-puzzle.json">
  <strong>Theme</strong><span>Title</span>
</button>
```
