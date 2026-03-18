# Pastel

Local-first web app that transforms AI-generated text into clean, natural, human-like writing.

- **No backend** (runs from `index.html`)
- **Standard mode**: local cleaning (spaces, line breaks, punctuation, trimming)
- **AI mode**: uses OpenAI (key stored locally in your browser)
- **Themes**: Light / Dark / System

## Run

Just open `index.html` in a browser.

> Tip: If your browser blocks API requests due to CORS, run a tiny local server:
>
> - Python: `python3 -m http.server 5173`
> - Node: `npx serve .`

## Security

Your API key is stored locally in your browser (localStorage). Do not use on shared devices.
