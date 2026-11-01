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

## Starting a new concert (start to finish)

You don't need VS Code for any of this. You need the Terminal app (press Cmd+Space, type "Terminal", press Enter), a free GitHub account and a Netlify account.

**1. Make a copy of the template.** Copy the whole `concert_program_template` folder and rename the copy (for example `2027-city-jazz`). Then delete the hidden `.git` folder inside the copy. If you keep it, the copy is still connected to the template's GitHub repo. In Finder, press Cmd+Shift+. to show hidden files, or in Terminal (from inside the copy):

```bash
rm -rf .git
```

**2. Fill in the spreadsheet.** Edit `data/concert-data.xlsx`, or send it out and save the returned file over it. The file name must stay exactly `concert-data.xlsx` and it must be saved inside the `data` folder. Skip any boxes you don't need.

**3. Preview it.** In Terminal, go into the project folder: type `cd ` (with a space after it), drag the project folder from Finder into the Terminal window, and press Enter. Then run:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` in your browser. After changing the spreadsheet, save it and refresh the page. Press Ctrl+C in Terminal to stop the preview. (Opening `index.html` by double-clicking won't work; browsers block loading the spreadsheet that way.)

**4. Put it on GitHub (first time only).** On github.com, click New repository, give it the same name as the folder, leave "Add a README" unchecked, and create it. GitHub then shows a page of commands; the first four below are the same ones, with your repo's address in the last line. In Terminal, inside the project folder:

```bash
git init
```

```bash
git add -A
```

```bash
git commit -m "First commit"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
```

```bash
git push -u origin main
```

**5. Publish it on Netlify (first time only).** In Netlify, choose Add new site, then Import an existing project, then GitHub, and pick the repo. This is a plain static site, so leave the build command empty and leave the publish directory as the default, then click Deploy. Under Site configuration you can change the site name, which sets the address (for example `2027-city-jazz.netlify.app`). The button names may be worded a little differently as Netlify updates its pages.

**6. Updating it later.** Change the spreadsheet, save it, then in Terminal inside the project folder:

```bash
git add -A
```

```bash
git commit -m "Update program"
```

```bash
git push
```

Netlify notices the push and republishes automatically, usually within a minute. There is no separate "deploy" step once the site is linked to the repo.

**Skipping GitHub (quick one-off):** drag the project folder onto app.netlify.com/drop. It publishes in seconds but keeps no history, and every later change needs another drag.

## Previewing locally

The spreadsheet is read in the browser (using the bundled SheetJS library in `assets/vendor/xlsx`), which browsers block on `file://` pages. That's why step 3 above uses a local server. Once deployed to Netlify it works normally.

If `concert-data.xlsx` is missing, the site falls back to `concert-info.json`, `program.json` and `students.json` in this folder.
