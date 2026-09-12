# Estudio de Español

A study website for Spanish class. Class materials go in, study activities built on
spaced repetition and active recall come out. Plain HTML, CSS, and JavaScript. No build step,
no accounts, no server.

## Run it locally

From this folder:

```
python -m http.server 8000
```

Then open http://localhost:8000 in a browser. (Opening `index.html` directly from the file
system does not work because the pages load their data with `fetch`.)

## Layout

```
index.html        Hoy: what to study today, upcoming due dates
vocab.html        Vocabulario: spaced-repetition flashcards
class.html        Clase: slides, assignments, links by unit
listen.html       Escuchar y ver: songs and videos with their vocab decks
progress.html     Progreso: streak, weak spots, settings, backup
verbs.html, grammar.html, review.html   placeholders for the next phases

css/style.css     styles (light and dark)
js/app.js         shared helpers and navigation
js/storage.js     progress in localStorage, export/import
js/srs.js         spaced-repetition scheduler (simplified SM-2)
js/decks.js       deck loading, answer checking, review queue
js/audio.js       Spanish text-to-speech via the browser
js/flashcards.js  the flashcard session
js/resources.js   resource cards for class materials
js/pages/*.js     one script per page

data/units.json   units, class materials, due dates
data/decks.json   list of vocabulary decks
data/vocab/*.json one file per deck
files/slides, files/assignments   PDFs
```

## Adding content

Hand the materials to Claude (slides, PDFs, links, a vocab list, or a note like
"we started the preterite"). Claude turns them into decks and unit entries and pushes the
update. Nothing here needs editing by hand.

## Progress and backups

Progress lives in the browser's localStorage under the key `spanish-study:v1`. The Progreso page
has Export and Import buttons to move it between devices or keep a backup.
