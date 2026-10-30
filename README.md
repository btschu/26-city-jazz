# Editing this concert program

Everything on the website comes from one file: `data/concert-data.xlsx`. You never need to edit `index.html`.

- **`concert-data.xlsx`** — the blank spreadsheet. This is the one you send to people to fill out, and the one the website reads.
- **`EXAMPLE-concert-data.xlsx`** — the same spreadsheet already filled in with made-up sample data, so people can see what a finished one looks like. The website ignores this file; it's only for reference.

The spreadsheet explains itself: it opens on a **Start Here** tab with step-by-step instructions and a picture of where each answer shows up on the website, and every other tab has instructions at the top. Yellow boxes = type here; grey/blue = information.

## The tabs

| Tab | What it's for |
|---|---|
| **Start Here** | Instructions only. Ignored by the website. |
| **Concert Info** | Big title (Line 1 = school/group name, Line 2 = name of the concert), date, time, location, directors, accompanist, thank-you list, closing message. |
| **Program** | One row per song: Group Name, Song Title, Composer / Arranger, Soloists or Notes. Five group blocks are pre-built. |
| **Group 1 … Group 9** | One tab per band/choir/orchestra/class; the tab name is the group name shown on the website. Each column is an instrument; names go underneath. |

## Good to know

- **Blank is fine.** Empty boxes, unused program blocks, unused instrument columns and unused Group tabs are all ignored, so people never need to delete anything.
- **Group tabs** come pre-built for: Groups 1-5 band instruments, Group 6 orchestra, Group 7 choir (Soprano/Alto/Tenor/Bass), Group 8 jazz band (incl. Piano, Guitar, Bass, Drumset), Group 9 a plain list with no instrument headings. Rename the tab to the group's name. To add more, duplicate a tab. Any tab not named Start Here / Concert Info / Program is treated as a student group.
- **Instrument names are editable.** Type over any dark blue title to rename it (Percussion → Drumset), or type a new name in the next empty box at the end of the dark blue row to add an instrument (then list its students underneath). The title is whatever is typed there; it is not limited to the pre-built list.
- **A tab with a single column** is shown as a plain list with no instrument heading (like Group 9).
- **Primary Color** (Concert Info tab, section 6): sets the accent color for headings, links and highlights. Accepts a color name ("Hot Pink", "sky blue") or a hex code ("#ff0000"); empty keeps the standard yellow, and a value the browser doesn't understand is ignored. It overrides `--primary-color` at the top of `assets/css/style.css`, which is still the default.
- **Optional title boxes**: if "Browser Tab Title" or "Top-Left Header Text" is left blank, they're built from the Big Title automatically.
- **Instruction rows** start with the ► mark (in the first column). The website skips any row that starts that way, so you can add your own notes by starting them with ►.
- **Extra columns** on the Concert Info tab (Help, Example) are ignored; only the label (column A) and answer (column B) are read.
- **Older spreadsheets** (with the previous labels such as "Concert Title Line 1") still load correctly.

## Previewing locally

The spreadsheet is read in the browser (using the bundled SheetJS library in `assets/vendor/xlsx`), which browsers block on `file://` pages. To preview, run a local server from the project folder, e.g. `python3 -m http.server`, then open `http://localhost:8000`. Once deployed to Netlify it works normally.

If `concert-data.xlsx` is missing, the site falls back to `concert-info.json`, `program.json` and `students.json` in this folder.
