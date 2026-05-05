# CrossPop Crossword v2.1

This version removes all references to the old mobile clue drawer, so the `mobileCluesEl.innerHTML` error is fixed.

## Important GitHub upload instructions

Replace these old files completely:

```text
index.html
styles.css
app.js
README.md
/data
```

After uploading, open the site with a cache-busting URL:

```text
https://mgaudone-cmyk.github.io/Crosswords/?v=21
```

If it still shows the old error, Safari is caching the old JavaScript. Close the tab, reopen it, or use the `?v=21` URL above.
