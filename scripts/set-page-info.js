// Runs on Netlify each time the site is published (see netlify.toml).
//
// Link previews (when you text or post the link) read the page's HTML as it is stored, before any
// JavaScript runs. Our JavaScript fills in the real title from the spreadsheet, so previews would show
// the placeholder title. This script writes the real title and description into index.html while the
// site is being published. It only changes Netlify's copy, never the files in the repo.
//
// Title:       "Browser Tab Title" if filled in, otherwise "<Big Title Line 1> - <Big Title Line 2>"
// Description: "<Date> | <Time> | <Location>"
//
// It does nothing (and never fails the build) if the spreadsheet or title can't be found.
// To try it on your own computer, run:  NETLIFY=true node scripts/set-page-info.js
// (that edits your local index.html, so don't commit the result).

const fs = require("fs");
const path = require("path");

if (process.env.NETLIFY !== "true") {
  console.log("set-page-info: not running on Netlify, leaving index.html alone");
  process.exit(0);
}

try {
  const root = path.join(__dirname, "..");
  const XLSX = require(path.join(root, "assets", "vendor", "xlsx", "xlsx.full.min.js"));

  // which spreadsheet: the one find-workbook.sh recorded, else the default name
  let workbookName = "concert-data.xlsx";
  try {
    const recorded = fs.readFileSync(path.join(root, "data", "workbook.txt"), "utf8").trim();
    if (/\.xlsx$/i.test(recorded) && !/[\\/]/.test(recorded)) workbookName = recorded;
  } catch (err) {
    // no workbook.txt: use the default
  }

  const workbook = XLSX.read(fs.readFileSync(path.join(root, "data", workbookName)), { type: "buffer" });
  const sheetName = workbook.SheetNames.find(function (n) {
    return n.trim().toLowerCase() === "concert info";
  });
  if (!sheetName) throw new Error("no Concert Info tab in " + workbookName);

  // label in column A, answer in column B (current and older labels), skipping instruction rows
  const FIELDS = {
    "big title line 1 - school or group name": "line1",
    "concert title line 1": "line1",
    "big title line 2 - name of the concert": "line2",
    "concert title line 2": "line2",
    "date": "date",
    "concert date": "date",
    "time": "time",
    "concert time": "time",
    "location": "location",
    "concert location": "location",
    "browser tab title (optional)": "tabTitle",
    "website title": "tabTitle",
  };
  const info = {};
  XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "", raw: false }).forEach(function (row) {
    const label = String(row[0] || "").trim();
    if (label.indexOf("►") === 0) return;
    const key = FIELDS[label.toLowerCase().replace(/\s+/g, " ")];
    if (key) info[key] = String(row[1] || "").trim();
  });

  const title = info.tabTitle || [info.line1, info.line2].filter(Boolean).join(" - ");
  const description = [info.date, info.time, info.location].filter(Boolean).join(" | ");
  if (!title) throw new Error("no title found in the spreadsheet; leaving the placeholder");

  const esc = function (text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };

  const indexPath = path.join(root, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");

  html = html.replace(/<title>[\s\S]*?<\/title>/i, "<title>" + esc(title) + "</title>");

  // replace the existing description tag, and any preview tags from an earlier run
  html = html.replace(/\s*<meta[^>]*name="description"[^>]*>/gi, "");
  html = html.replace(/\s*<meta[^>]*property="og:[^"]*"[^>]*>/gi, "");
  const tags = [
    '<meta name="description" content="' + esc(description) + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:title" content="' + esc(title) + '">',
    '<meta property="og:description" content="' + esc(description) + '">',
  ];
  html = html.replace(/<\/head>/i, "  " + tags.join("\n  ") + "\n</head>");

  fs.writeFileSync(indexPath, html);
  console.log('set-page-info: title "' + title + '"' + (description ? ', description "' + description + '"' : ""));
} catch (err) {
  console.log("set-page-info: skipped (" + err.message + ")");
}
process.exit(0);
