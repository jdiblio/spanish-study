# Spanish Study Website – Plan

## Goal
A study website for Spanish class. Class materials (slides, assignments, Señor Wooly songs,
Edpuzzles, videos) go in; study activities built on proven learning methods come out.
Simple to use: open the site, it tells you what to practice today, you practice.

## How updates work
1. You give me the new materials: slide files, assignment PDFs, Señor Wooly / Edpuzzle / YouTube
   / Quizlet links, vocab lists, or just "we started the preterite this week."
2. I read them, pull out the vocabulary, verbs, grammar points, and sentences, and turn them
   into flashcard decks, drills, and practice sets for the right unit.
3. I add the class materials to the unit page, push, and the live site updates within a minute.

You never edit code or JSON. You hand me stuff, I update the site.

## Study methods the site is built on
These are the methods with the strongest research support for language learning, and each one
maps to a feature on the site.

| Method | What the research says | Feature on the site |
|---|---|---|
| **Spaced repetition** | Reviewing at growing intervals (1 day, 3 days, 1 week...) beats cramming by a wide margin for long-term retention. | Flashcards are scheduled automatically. The home page shows "X cards due today." |
| **Active recall** | Pulling an answer from memory strengthens it far more than rereading or recognizing. | You type or say the answer before flipping. Multiple choice is the fallback, not the default. |
| **Production, not just recognition** | Knowing "gato = cat" is easier than producing "cat = gato." Producing is what tests and speaking require. | Every deck runs both directions. English → Spanish typing counts as the "real" pass. |
| **Interleaving** | Mixing topics (ser/estar with por/para with preterite) in one session beats practicing one topic at a time. | The "Mixed Review" mode shuffles due items across all units and skill types. |
| **Retrieval with immediate feedback** | Getting corrected right away, then trying again, fixes errors fast. | Wrong answers show the correct form, then the card comes back later in the same session. |
| **Comprehensible input** | Listening/reading to material slightly above your level builds real understanding. | Señor Wooly, Edpuzzle, and YouTube are organized as "Listen & Watch" with the vocab from each one turned into a deck. |
| **Sentence-level learning** | Words learned inside sentences stick better and teach grammar for free. | Cloze (fill-in-the-blank) cards use real sentences from the slides and songs. |
| **Dual coding / audio** | Hearing a word while seeing it uses two memory channels. | Spanish audio on every card using the browser's built-in Spanish voice (free, no account). |
| **Short daily sessions** | 10–15 minutes a day beats 2 hours on Sunday. | Streak counter and a "Today" page sized for about 10 minutes. |
| **Weak-spot targeting** | Time spent on what you already know is wasted. | Progress page shows weakest words, verbs, and grammar points; drills can target them. |

## Site sections
Kept to a small number so it stays easy.

1. **Hoy (Today)** – home page. Cards due, streak, one-click "Start review." Upcoming
   assignments and due dates from class.
2. **Vocabulario** – flashcard decks by unit and by song/video. Spaced repetition, both
   directions, audio, typed answers with an accent-key helper (á é í ó ú ñ ¿ ¡).
3. **Verbos** – conjugation drills. Pick tenses and pronouns, type the form, instant feedback.
   Tracks which verbs and tenses you miss.
4. **Gramática** – one short explanation per topic (ser vs estar, por vs para, preterite vs
   imperfect, gender and agreement, etc.) followed by cloze and multiple-choice practice.
5. **Escuchar y Ver (Listen & Watch)** – Señor Wooly songs, Edpuzzles, and YouTube by unit,
   each with its vocab deck and a few comprehension questions.
6. **Repaso Mixto (Mixed Review)** – interleaved session pulling from everything that is due.
   Also a "Quiz me like a test" mode for the night before an exam.
7. **Clase** – the raw class materials: slides (viewable in-page), assignments, due dates,
   organized by unit.
8. **Progreso** – streak, words learned, accuracy by unit, weakest items.

## Technical approach
**Static site on GitHub Pages. Vanilla HTML/CSS/JS, no framework, no build step, no accounts.**

- All study logic runs in the browser. Progress and the spaced-repetition schedule are saved in
  the browser (localStorage). An Export/Import button backs progress up to a file so it is
  never lost and can move between devices.
- Content lives in JSON files that I generate from your materials.
- Slides and assignments are stored as PDFs in the repo and viewed in-page.
- Señor Wooly and Edpuzzle are linked, not copied (paywalled and copyrighted). Their vocab
  becomes a deck on the site, which is the useful part anyway.
- YouTube and Quizlet embed directly.
- Spanish audio uses the browser's built-in speech synthesis. Works in Chrome, Edge, Safari.

```
Spanish Study Website/
├── index.html                # Hoy
├── vocab.html  verbs.html  grammar.html  listen.html  review.html  class.html  progress.html
├── css/style.css
├── js/
│   ├── app.js                # navigation, shared UI
│   ├── srs.js                # spaced-repetition scheduler (SM-2 style)
│   ├── flashcards.js         # card session, typing, feedback
│   ├── verbs.js              # conjugation drill engine
│   ├── grammar.js            # cloze + multiple choice
│   ├── audio.js              # speech synthesis
│   └── storage.js            # localStorage + export/import
├── data/
│   ├── units.json            # units, class materials, due dates, media links
│   ├── vocab/<unit>.json     # flashcard decks
│   ├── verbs.json            # verb list + conjugation tables
│   ├── grammar/<topic>.json  # explanation + practice items
│   └── sentences/<unit>.json # cloze sentences
└── files/
    ├── slides/
    └── assignments/
```

## Status
- **Phase 1 done (2026-09-12).** Site scaffolded and tested in a browser. Run locally with
  `python -m http.server 8000` and open http://localhost:8000.
- **Phase 2 done (2026-09-12).** Live at https://jdiblio.github.io/spanish-study/
  (repo: https://github.com/jdiblio/spanish-study). Every push to `main` redeploys in about a minute.
- **Phase 3 started (2026-09-12).** Real content loaded from class slides 1–72, the Todo sobre mí
  worksheet, and the Guapo worksheet: 13 vocab decks (523 words), 2 readings, 6 grammar topics
  with typed practice (the Gramática page is live). Placeholder deck removed.
- **Rule:** study content comes only from class materials. Nothing invented.
- Class is at slide 72. Do not use later slides until Jeffrey says so.
- Next: verbs (when the class gets there), mixed review, more songs as they are assigned.

## Phases

### Phase 1 – Core (first build session) ✅
- Site shell, navigation, styling, mobile-friendly.
- Vocabulario with spaced repetition, both directions, typed answers, accent helper, audio.
- Hoy page with cards due + streak.
- Clase page with one example unit so the layout is visible.
- Export/Import progress.
- Local testing.

### Phase 2 – Deploy ✅
- GitHub repo, GitHub Pages enabled. Live URL you can open on phone or laptop.

### Phase 3 – First real content
- You send the materials from the units so far. I build the decks, sentences, and unit pages.

### Phase 4 – Verbs and grammar
- Conjugation drills with the verbs and tenses your class has covered.
- Grammar topics with explanation + practice.

### Phase 5 – Listen & Watch, Mixed Review, Progress
- Song/video pages with vocab decks and comprehension questions.
- Interleaved review and test-prep quiz mode.
- Progress page with weak-spot targeting.

### Later, if wanted
- Cross-device sync without Export/Import (needs a small backend).
- Password-gated site.
- Reading passages with tap-to-gloss words.
- Speaking practice using browser speech recognition.

## Watch-outs
- **Public site.** GitHub Pages is public. No grades or personal info go on it. Your progress
  stays in your own browser, never on the server.
- **Copyright.** Señor Wooly and Edpuzzle stay on their platforms. Slides are for personal
  study; ask your teacher before sharing the link widely.
- **Progress lives in the browser.** Clearing browser data wipes it. Export regularly, or we
  add sync later.
