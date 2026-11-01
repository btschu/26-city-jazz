/**
 * Loads data/concert-data.xlsx (Concert Info, Program, and one tab per
 * performing group) and renders it into the page, so the site content can
 * be edited without touching index.html. Falls back to data/concert-info.json,
 * data/program.json and data/students.json if concert-data.xlsx is missing.
 */
(function () {
  "use strict";

  const WORKBOOK_PATH = "data/concert-data.xlsx";
  const RESERVED_SHEET_NAMES = new Set(["start here", "instructions", "example", "concert info", "program"]);

  // Rows whose first cell starts with this mark are instructions for the
  // person filling out the spreadsheet, and are ignored when reading it.
  const NOTE_MARK = "►"; // ►

  async function fetchJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load " + path + " (" + res.status + ")");
    }
    return res.json();
  }

  function cellText(value) {
    return value === undefined || value === null ? "" : value.toString().trim();
  }

  function normalizeLabel(value) {
    return cellText(value).toLowerCase().replace(/\s+/g, " ");
  }

  // Rows of a sheet as arrays of cell text (as displayed in Excel), minus
  // the instruction rows.
  function readRows(sheet) {
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }).filter(function (row) {
      return cellText(row[0]).indexOf(NOTE_MARK) !== 0;
    });
  }

  function splitLines(value) {
    return (value === undefined || value === null ? "" : value.toString())
      .split(/\r\n|\r|\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);
  }

  // "Concert Info" tab: label in column A, answer in column B. Anything in
  // other columns (help text, examples) is ignored. "Director" and "Person
  // or Group to Thank" can repeat on as many rows as needed. The older
  // labels (e.g. "Concert Title Line 1") are still understood.
  const INFO_FIELDS = new Map([
    ["big title line 1 - school or group name", "concertTitleLine1"],
    ["big title line 2 - name of the concert", "concertTitleLine2"],
    ["date", "concertDate"],
    ["time", "concertTime"],
    ["location", "concertLocation"],
    ["director", "directors"],
    ["accompanist (optional)", "accompanist"],
    ["person or group to thank (optional)", "thankYou"],
    ["closing message", "closingStatement"],
    ["browser tab title (optional)", "websiteTitle"],
    ["top-left header text (optional)", "headerTitle"],
    ["hero image (leave as is)", "heroImage"],
    ["primary color (optional)", "primaryColor"],
    ["primary color", "primaryColor"],
    ["background dimming (optional)", "backgroundDimming"],
    // older labels
    ["concert title line 1", "concertTitleLine1"],
    ["concert title line 2", "concertTitleLine2"],
    ["concert date", "concertDate"],
    ["concert time", "concertTime"],
    ["concert location", "concertLocation"],
    ["accompanist", "accompanist"],
    ["thank you", "thankYou"],
    ["closing statement", "closingStatement"],
    ["website title", "websiteTitle"],
    ["header title", "headerTitle"],
    ["hero image", "heroImage"],
  ]);
  const INFO_LIST_FIELDS = new Set(["directors", "thankYou"]);

  function parseConcertInfoSheet(sheet) {
    const info = { directors: [], thankYou: [] };

    readRows(sheet).forEach(function (row) {
      const key = INFO_FIELDS.get(normalizeLabel(row[0]));
      if (!key) return;

      const value = cellText(row[1]);
      if (INFO_LIST_FIELDS.has(key)) {
        if (value) info[key].push(value);
      } else {
        info[key] = value;
      }
    });

    return info;
  }

  // "Program" tab: one row per song. The header row is found by looking for
  // the song-title column, so instructions above it are fine. A blank Group
  // cell continues the previous row's group. The notes cell supports
  // multiple lines (Alt+Enter in Excel) for multiple soloists. Rows without
  // a song title are skipped, so unused rows can stay blank.
  const PROGRAM_HEADERS = {
    group: ["group name", "group", "ensemble"],
    title: ["song title", "title", "song"],
    composer: ["composer / arranger", "composer/arranger", "composer", "arranger"],
    info: ["soloists or notes (optional)", "soloists or notes", "info", "soloist", "notes"],
  };

  function findColumn(headers, names) {
    return headers.findIndex(function (h) {
      return names.indexOf(h) !== -1;
    });
  }

  function parseProgramSheet(sheet) {
    const rows = readRows(sheet);
    const headerIndex = rows.findIndex(function (row) {
      return findColumn(row.map(normalizeLabel), PROGRAM_HEADERS.title) !== -1;
    });
    if (headerIndex === -1) return { groups: [] };

    const headers = rows[headerIndex].map(normalizeLabel);
    const groupCol = findColumn(headers, PROGRAM_HEADERS.group);
    const titleCol = findColumn(headers, PROGRAM_HEADERS.title);
    const composerCol = findColumn(headers, PROGRAM_HEADERS.composer);
    const infoCol = findColumn(headers, PROGRAM_HEADERS.info);

    const groups = [];
    const groupsByName = new Map();
    let lastGroupName = "";

    rows.slice(headerIndex + 1).forEach(function (row) {
      const title = cellText(row[titleCol]);
      if (!title) return;

      let groupName = groupCol === -1 ? "" : cellText(row[groupCol]);
      if (groupName) {
        lastGroupName = groupName;
      } else {
        groupName = lastGroupName;
      }
      if (!groupName) return;

      const composer = composerCol === -1 ? "" : cellText(row[composerCol]);
      const info = infoCol === -1 ? [] : splitLines(row[infoCol]);

      let group = groupsByName.get(groupName);
      if (!group) {
        group = { name: groupName, songs: [] };
        groupsByName.set(groupName, group);
        groups.push(group);
      }
      group.songs.push({ title: title, composer: composer, info: info });
    });

    return { groups: groups };
  }

  // A student group tab: the first row is the instrument names (one per
  // column) and the names go underneath. Columns may be different lengths.
  // Instruments with no students are left out, and a tab with no students
  // at all is skipped, so spare columns and spare tabs can stay as they are.
  // A tab that only has one column is shown as a plain list with no
  // instrument heading (e.g. a single-instrument class).
  function parseStudentGroupSheet(sheet, sheetName) {
    const rows = readRows(sheet);
    if (!rows.length) return null;

    const headerRow = rows[0];
    const dataRows = rows.slice(1);
    const columnCount = dataRows.reduce(function (max, r) {
      return Math.max(max, r.length);
    }, headerRow.length);

    const columns = [];
    for (let c = 0; c < columnCount; c++) {
      const header = cellText(headerRow[c]);
      const values = dataRows
        .map(function (r) {
          return cellText(r[c]);
        })
        .filter(Boolean);
      if (header || values.length) columns.push({ header: header, values: values });
    }

    const sections =
      columns.length === 1
        ? [{ instrument: "", students: columns[0].values }]
        : columns
            .filter(function (c) {
              return c.values.length;
            })
            .map(function (c) {
              return { instrument: c.header, students: c.values };
            });

    if (!sections.some(function (s) { return s.students.length; })) return null;
    return { name: sheetName, sections: sections };
  }

  async function loadFromWorkbook() {
    // no-store: always read the latest saved spreadsheet, never a cached copy
    const res = await fetch(WORKBOOK_PATH, { cache: "no-store" });
    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    let info = { directors: [], thankYou: [] };
    let program = { groups: [] };
    const studentGroups = [];

    workbook.SheetNames.forEach(function (name) {
      const normalized = name.trim().toLowerCase();
      const sheet = workbook.Sheets[name];
      if (normalized === "concert info") {
        info = parseConcertInfoSheet(sheet);
      } else if (normalized === "program") {
        program = parseProgramSheet(sheet);
      } else if (!RESERVED_SHEET_NAMES.has(normalized)) {
        const group = parseStudentGroupSheet(sheet, name);
        if (group) studentGroups.push(group);
      }
    });

    return { info: info, program: program, students: { groups: studentGroups } };
  }

  async function loadConcertData() {
    if (typeof XLSX !== "undefined") {
      try {
        const fromWorkbook = await loadFromWorkbook();
        if (fromWorkbook) return fromWorkbook;
      } catch (err) {
        console.error("Failed to read " + WORKBOOK_PATH + ", falling back to individual JSON files:", err);
      }
    }

    const [info, program, students] = await Promise.all([
      fetchJSON("data/concert-info.json"),
      fetchJSON("data/program.json"),
      fetchJSON("data/students.json"),
    ]);
    return { info: info, program: program, students: students };
  }

  function el(tag, opts = {}) {
    const node = document.createElement(tag);
    if (opts.className) node.className = opts.className;
    if (opts.text !== undefined) node.textContent = opts.text;
    if (opts.html !== undefined) node.innerHTML = opts.html;
    return node;
  }

  function slugify(str) {
    return String(str)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function renderConcertInfo(info) {
    // The tab title and top-left header are optional; if left blank, build
    // them from the big title so people don't have to type the same thing twice.
    const pageTitle = info.websiteTitle || [info.concertTitleLine1, info.concertTitleLine2].filter(Boolean).join(" - ");
    if (pageTitle) {
      document.title = pageTitle;
    }

    // Optional accent color (headings, links, highlights). Accepts a color name
    // ("red", "hot pink", "sky blue") or a hex code ("#ff0000"); anything the
    // browser doesn't understand is ignored and the default color stays.
    const accent = (info.primaryColor || "").replace(/\s+/g, "");
    if (accent && window.CSS && CSS.supports("color", accent)) {
      document.documentElement.style.setProperty("--primary-color", accent);
    }

    // Optional background dimming: a number from 0 (no dimming) to 100 (black).
    // Empty or not a number keeps the default (50).
    const dimText = (info.backgroundDimming || "").toString().replace("%", "").trim();
    if (dimText !== "" && !isNaN(Number(dimText))) {
      const dim = Math.min(100, Math.max(0, Number(dimText)));
      document.documentElement.style.setProperty("--hero-dim", String(dim / 100));
    }

    const hero = document.getElementById("hero");
    if (hero && info.heroImage) {
      hero.style.backgroundImage = 'url("' + info.heroImage + '")';
    }

    const headerTitle = document.getElementById("header-title-text");
    if (headerTitle) headerTitle.textContent = info.headerTitle || info.concertTitleLine2 || "";

    const schoolName = document.getElementById("concert-school-name");
    if (schoolName) schoolName.textContent = info.concertTitleLine1 || "";

    const concertName = document.getElementById("concert-name");
    if (concertName) concertName.textContent = info.concertTitleLine2 || "";

    const dtl = document.getElementById("concert-datetime-location");
    if (dtl) {
      const parts = [info.concertDate, info.concertTime, info.concertLocation].filter(Boolean);
      dtl.innerHTML = parts.join("<br>");
    }

    const directorsList = document.getElementById("directors-list");
    if (directorsList) {
      const directors = info.directors || [];
      directorsList.innerHTML = directors.join("<br>");
    }

    const accompanistBlock = document.getElementById("accompanist-block");
    const accompanistName = document.getElementById("accompanist-name");
    if (accompanistBlock) {
      if (info.accompanist && info.accompanist.trim()) {
        accompanistBlock.style.display = "";
        if (accompanistName) accompanistName.textContent = info.accompanist;
      } else {
        accompanistBlock.style.display = "none";
      }
    }

    const thankYouHeading = document.getElementById("thank-you-heading");
    const thankYouWrap = document.getElementById("thank-you-wrap");
    const thankYouList = document.getElementById("thank-you-list");
    const thankYouItems = info.thankYou || [];
    if (thankYouItems.length) {
      if (thankYouHeading) thankYouHeading.style.display = "";
      if (thankYouWrap) thankYouWrap.style.display = "";
      if (thankYouList) {
        thankYouList.innerHTML = "";
        thankYouItems.forEach(function (item) {
          thankYouList.appendChild(el("li", { text: item }));
        });
      }
    } else {
      if (thankYouHeading) thankYouHeading.style.display = "none";
      if (thankYouWrap) thankYouWrap.style.display = "none";
    }

    const closing = document.getElementById("closing-statement");
    if (closing) closing.textContent = info.closingStatement || "Thank you for your support!";
  }

  function renderProgram(program) {
    const container = document.getElementById("program-container");
    if (!container) return;
    container.innerHTML = "";

    (program.groups || []).forEach(function (group) {
      const item = el("div", { className: "col-lg-12 program-item" });
      item.appendChild(el("h2", { className: "text-center mb-4", html: "<span>" + group.name + "</span>" }));

      const tableWrap = el("div", { className: "table-responsive rounded" });
      const table = el("table", { className: "table table-borderless" });
      const tbody = el("tbody");

      (group.songs || []).forEach(function (song) {
        const tr = el("tr");
        const tdTitle = el("td");
        tdTitle.appendChild(document.createTextNode(song.title || ""));

        const infoItems = Array.isArray(song.info) ? song.info : song.info ? [song.info] : [];
        if (infoItems.length) {
          const ul = el("ul");
          infoItems.forEach(function (line) {
            ul.appendChild(el("li", { text: line }));
          });
          tdTitle.appendChild(ul);
        }

        const tdComposer = el("td", { className: "text-end", text: song.composer || "" });

        tr.appendChild(tdTitle);
        tr.appendChild(tdComposer);
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tableWrap.appendChild(table);
      item.appendChild(tableWrap);
      container.appendChild(item);
    });
  }

  function renderStudents(students) {
    const filters = document.getElementById("students-filters");
    const container = document.getElementById("students-container");
    if (!container) return;

    const groups = students.groups || [];
    const groupFilterClasses = groups.map(function (g) {
      return "filter-" + slugify(g.name);
    });

    if (filters) {
      filters.innerHTML = "";
      const allLi = el("li", { text: "All" });
      allLi.setAttribute("data-filter", "*");
      allLi.classList.add("filter-active-students");
      filters.appendChild(allLi);

      groups.forEach(function (g, i) {
        const li = el("li", { text: g.name });
        li.setAttribute("data-filter", "." + groupFilterClasses[i]);
        filters.appendChild(li);
      });
    }

    container.innerHTML = "";
    groups.forEach(function (g, i) {
      const col = el("div", { className: "col-lg-4 col-sm-12 mt-lg-0 students-item " + groupFilterClasses[i] });
      const box = el("div", { className: "box" });

      box.appendChild(el("span", { className: "text-center", text: g.name }));

      (g.sections || []).forEach(function (sec) {
        if (sec.instrument && sec.instrument.trim()) {
          box.appendChild(el("h4", { text: sec.instrument }));
        }
        const ul = el("ul");
        (sec.students || []).forEach(function (name) {
          ul.appendChild(el("li", { text: name }));
        });
        box.appendChild(ul);
      });

      col.appendChild(box);
      container.appendChild(col);
    });
  }

  function initIsotope() {
    if (typeof Isotope === "undefined") return;

    const programContainer = document.querySelector(".program-container");
    if (programContainer) {
      new Isotope(programContainer, { itemSelector: ".program-item", layoutMode: "fitRows" });
    }

    const studentsContainer = document.querySelector(".students-container");
    if (studentsContainer) {
      const studentsIsotope = new Isotope(studentsContainer, { itemSelector: ".students-item", layoutMode: "fitRows" });
      const studentsFilters = [...document.querySelectorAll("#students-filters li")];

      studentsFilters.forEach(function (li) {
        li.addEventListener("click", function () {
          studentsFilters.forEach(function (other) {
            other.classList.remove("filter-active-students");
          });
          this.classList.add("filter-active-students");

          studentsIsotope.arrange({ filter: this.getAttribute("data-filter") });
          studentsIsotope.on("arrangeComplete", function () {
            if (window.AOS) AOS.refresh();
          });
        });
      });
    }
  }

  async function init() {
    try {
      const data = await loadConcertData();

      renderConcertInfo(data.info);
      renderProgram(data.program);
      renderStudents(data.students);

      initIsotope();
    } catch (err) {
      console.error("Failed to load concert data:", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
