# SAKAN Interiors: website source

This branch holds what the website is built from. The live site is the `main` branch, which GitHub Pages serves at https://sakan-interiors.github.io/. This branch is never shown on the site.

## What's here
- `tools/build.py`: builds the whole site from `src/`.
- `src/data/`: the words and settings.
  - `site.json`: name, phone, WhatsApp, Instagram, email. An empty Instagram or email hides its buttons.
  - `studio.json`: the client's Arabic text with its English translation.
  - `projects.json`: the five projects and their photos.
- `src/css/style.css`, `src/js/main.js`: the design and the behaviour (door entrance, menus, photo viewer).
- `src/img/brand/`: the logo files. `logo-en.webp` is the front-page logo.
- `src/photos/`: every photo in three sizes (1080, 1920, 3840 px wide where available).
- `originals/`: the client's 43 photos as received.
- `tools/process_photos.py`: the photo enhancement used to make `src/photos/` from `originals/`.
- `brand/`: the logo as cut from the brand board.
- `tests/`: browser checks (Playwright): clicking through the site, the photo viewer, the door entrance.

## Change and publish
1. Edit `src/` (words in `src/data/`, design in `src/css/style.css`).
2. Run `python3 tools/build.py` (needs Python 3 with Pillow). It writes:
   - `dist/`: the website, one HTML file per page.
   - `artifact/`: a single-page copy for the claude.ai preview.
3. Copy the contents of `dist/` to the `main` branch, keeping `.nojekyll`, and push. The live site updates in a minute or two.
