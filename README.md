# Pastel

Pastel is a Local first **post-processing tool for AI written text** that removes the subtle patterns that make writing feel artificial, heavy, or over-structured.

It’s built for text that is already complete - but still *doesn’t feel right*.

---

## What Pastel does

Pastel does not generate content.

It refines how your writing **reads and feels** by targeting:

- robotic tone  
- overly balanced or predictable phrasing  
- unnecessary complexity  
- repetition and rhythm issues  
- tone mismatches  

---

## Modes

### Standard Mode (no AI)

Runs fully in your browser.

Applies structural cleanup without changing meaning:

- normalizes spacing and line flow  
- cleans punctuation usage  
- removes formatting noise  
- smooths visual structure  

Best for: **quick cleanup without rewriting**

---

### AI Mode (controlled transformations)

Each action performs a **specific correction**, not a general rewrite.

#### Humanize
- removes stiffness and robotic phrasing  
- breaks predictable sentence patterns  

#### Simplify
- reduces complexity  
- improves clarity and flow  

#### Rewrite
- rephrases while preserving meaning  
- avoids unnecessary stylistic drift  

#### Shorten
- removes redundancy  
- keeps key information intact  

#### Fix Grammar
- corrects errors  
- preserves original tone  

---

## Tone control

Tone acts as a **constraint**, not a generator.

- **Neutral** → minimal changes  
- **Casual** → relaxed, lighter phrasing  
- **Professional** → clear and controlled  
- **Friendly** → softer, more natural flow  
- **Academic** → structured and precise  

---

## What makes Pastel different

Most tools either:
- generate new content, or  
- heavily rewrite existing text  

Pastel focuses on:

> removing detectable patterns while preserving authorship

The result should feel like:
- the same person wrote it  
- just cleaner, smoother, and more natural  

---

## What it is not

- not a content generator  
- not a paraphrasing tool  
- not a “make this sound smarter” button  

---

## Run

Open `index.html` in your browser.

If needed, run a local server:

# Python
python3 -m http.server 5173

# Node
npx serve .

Then open:
- http://localhost:5173

---

## API Key + Security

- Your OpenAI API key is stored **locally in your browser** (localStorage).
  Ref Doc- https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key
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
