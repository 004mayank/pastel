# Pastel

**Pastel** is a local-first writing cleaner that turns AI-sounding text into crisp, natural copy — with a calm, modern UI.

- **100% local UI** (no backend)
- **Standard Mode**: instant cleanup on-device
- **AI Mode**: humanize / simplify / rewrite / shorten / fix grammar
- **Light / Dark / System** themes (saved locally)
- **API key stays in your browser** (localStorage)

---

## What Pastel does

### Standard Mode (no AI)
Cleans text locally:
- Trims and normalizes whitespace
- Fixes awkward line breaks
- Normalizes punctuation spacing
- Replaces em/en dashes with cleaner separators

### AI Mode (OpenAI)
Uses strong, action-specific prompts and returns **only the transformed text**:
- Humanize
- Simplify
- Rewrite
- Shorten
- Fix Grammar

Pastel also enforces consistent punctuation (e.g., avoids em dashes) for a more human read.

---

## Run

Just open **`index.html`** in your browser.

If your browser blocks API calls (CORS), run a tiny local server:

```bash
# Python
python3 -m http.server 5173

# Node
npx serve .
```

Then open:
- http://localhost:5173

---

## API Key + Security

- Your OpenAI API key is stored **locally in your browser** (localStorage).
- It never goes anywhere except **direct requests to OpenAI**.

**Do not use Pastel on shared devices**.

---

## Keyboard shortcuts

- **Cmd/Ctrl + Enter** → Process

---

## Tech

- Vanilla HTML/CSS/JS
- No build step required

---
