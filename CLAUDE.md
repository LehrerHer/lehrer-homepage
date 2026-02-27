# CLAUDE.md — AI Assistant Guide for lehrer-homepage

This file provides context for AI assistants (e.g., Claude Code) working on this repository.

---

## Project Overview

**lehrer-homepage** is a static teacher homepage for Jan Herrmann at Oberschule Spelle (Lower Saxony, Germany). It consists of two HTML pages, one CSS file, and one JavaScript file — no build tools, frameworks, or package managers are used.

- **Language**: German (UI content and code comments are in German)
- **Tech stack**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **External services**: Google Fonts (CDN), Formspree (form submissions)

---

## Repository Structure

```
lehrer-homepage/
├── index.html       # Main homepage: hero, subject cards, materials, contact
├── abgabe.html      # Student assignment submission form (Formspree-powered)
├── css/
│   └── style.css    # All site styles (~736 lines)
└── js/
    └── main.js      # All site JavaScript (~222 lines)
```

There are no subdirectories for components, no transpilation, and no generated output folders.

---

## How to Run

No installation or build step is needed. Open files directly:

```bash
# Option 1: Open in browser directly
open index.html

# Option 2: Serve with Python
python3 -m http.server 8000

# Option 3: Serve with Node
npx http-server .
```

Visit `http://localhost:8000` to view the site.

---

## Key Files and Their Roles

### `index.html`
- Main teacher profile page
- Sections: sticky navbar, hero, subjects (`#faecher`), materials (`#materialien`), contact (`#kontakt`), footer
- All section IDs are used by `main.js` for scroll-spy navigation
- Copyright year is set dynamically via `id="footer-jahr"`

### `abgabe.html`
- Student assignment upload form
- Integrates with **Formspree**: the form action URL contains `YOUR_FORM_ID` as a placeholder — this must be replaced with a real Formspree form ID before the form works
- Tagged `noindex, nofollow` — intentionally excluded from search engines
- Accepts: PDF, JPG, PNG, DOCX, ZIP (max 10 MB)

### `js/main.js`
Four self-contained IIFE modules, each independent:

| Module | Lines | Purpose |
|--------|-------|---------|
| Hamburger menu | 12–40 | Mobile nav toggle with ARIA support |
| Scroll-spy nav | 48–75 | Highlights active nav link on scroll |
| Footer year | 82–87 | Sets current year in copyright |
| Submission form | 96–221 | Validates and submits the assignment form via fetch |

### `css/style.css`
- Uses **CSS custom properties** defined at `:root`:
  - `--primary-color: #1e3a5f` (dark blue)
  - `--accent-color: #4a9eda` (light blue)
  - `--transition`, `--border-radius`, `--shadow` etc.
- Responsive breakpoints: `768px` (tablet) and `480px` (mobile)
- Mobile-first layout using CSS Grid and Flexbox

---

## Coding Conventions

### HTML
- Language: `lang="de"`, all user-visible text is in German
- Semantic elements: `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`
- ARIA attributes on interactive elements (hamburger button, nav links)
- Icons are Unicode emoji, not icon fonts or SVGs
- IDs follow `kebab-case` and match JavaScript selectors

### CSS
- **No preprocessors** — pure CSS only
- CSS variables for all repeated values (colors, spacing, transitions)
- Class names: `kebab-case`, semantic and descriptive
- Section comments use `/* === SECTION NAME === */` style headers
- Do not introduce utility classes or a CSS framework

### JavaScript
- **No frameworks, no npm packages** — vanilla ES6+ only
- Each feature is wrapped in an IIFE `(function() { ... })()` for isolation
- No global variables
- Variable/comment naming: German for domain concepts, English for code constructs
- Async form submission uses `fetch` with `async/await`
- Error handling uses `try/catch` with user-facing German error messages
- All DOM queries use `document.querySelector` / `document.querySelectorAll`

---

## Development Workflow

### Making Changes
1. Edit files directly — no build step required
2. Refresh the browser to test
3. Test on multiple viewport widths (desktop, tablet `768px`, mobile `480px`)

### No Tests or Linting
- There is no test suite, no CI/CD, and no linter configuration
- Validate HTML manually or with the W3C validator
- Check JavaScript in browser DevTools console

### Git
- Default branch: `master`
- Feature branches follow the pattern: `claude/<description>-<session-id>`
- Commit messages should be in English or German (existing commits are in German)

---

## Formspree Setup

The `abgabe.html` form requires a Formspree account:

1. Register at [formspree.io](https://formspree.io)
2. Create a new form and copy the form ID
3. Replace `YOUR_FORM_ID` in `abgabe.html` (line ~68) with your actual ID:
   ```html
   <!-- Before -->
   <form action="https://formspree.io/f/YOUR_FORM_ID" method="POST" ...>
   <!-- After -->
   <form action="https://formspree.io/f/abcd1234" method="POST" ...>
   ```

---

## Accessibility Requirements

All changes must maintain:
- Semantic HTML structure
- ARIA labels on interactive elements
- Visible focus states for keyboard navigation
- Sufficient color contrast (WCAG AA minimum)
- No information conveyed by color alone

---

## What NOT to Do

- Do not introduce npm, a bundler (webpack/vite), or a CSS preprocessor
- Do not add a JavaScript framework (React, Vue, Alpine, etc.)
- Do not create additional files unless clearly necessary
- Do not remove ARIA attributes or semantic HTML elements
- Do not change text content from German to another language
- Do not add global JavaScript variables (use IIFEs)
- Do not hardcode colors — use the existing CSS variables
