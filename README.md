# CrossPop Crossword App

A mobile-first static crossword web app that runs on GitHub Pages.

## What is included

- `index.html` — app shell
- `styles.css` — responsive iPhone-friendly styling
- `app.js` — crossword engine
- `/data/*.json` — sample 7x7 intersecting crossword puzzles

## Features

- Theme selection: Daily, Movies, Music, Geography, Mixed
- True intersecting grids with Across and Down clues
- Timer
- Best time saved locally with `localStorage`
- Check puzzle
- Reveal letter
- Reveal word
- Reset puzzle
- Mobile keyboard support
- Desktop keyboard support
- GitHub Pages compatible

## Deploy on GitHub Pages

1. Create a new GitHub repository.
2. Upload all files and folders from this package.
3. Go to **Settings** > **Pages**.
4. Under **Build and deployment**, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Save.
6. GitHub will generate your live URL.

## Add more puzzles

Create a new JSON file in `/data`, then add it to `puzzleFiles` in `app.js`.

Puzzle files use this format:

```json
{
  "id": "movies-002",
  "title": "Movie Night Mini 2",
  "theme": "Movies",
  "difficulty": "Easy-Medium",
  "gridSize": 7,
  "grid": [
    ["A", "V", "A", "T", "A", "R", "#"]
  ],
  "clues": {
    "across": [],
    "down": []
  }
}
```

Use `#` for blocked squares. Each clue needs:

- `number`
- `row`
- `col`
- `answer`
- `clue`

Rows and columns start at `0`.

## Recommended next upgrade

Add a puzzle generator script that takes a curated answer bank, attempts valid intersections, and exports JSON puzzles for review before publishing.
