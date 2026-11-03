// Runs on Netlify each time the site is published (see netlify.toml). It does two things:
//
// 1. Reads the spreadsheet once and saves the result as data/site-data.json. Visitors' phones then
//    download that small file instead of the spreadsheet plus a large spreadsheet-reading library,
//    so the page appears much faster.
//
// 2. Writes the real title and description into index.html. Link previews (when you text or post the
//    link) read the page's HTML before any JavaScript runs, so they would otherwise show the
//    placeholder title.
//      Title:       "Browser Tab Title" if filled in, otherwise "<Big Title Line 1> - <Big Title Line 2>"
//      Description: "<Date> | <Time> | <Location>"
//
// It only changes Netlify's copy of the site, never the files in your repo, and it never fails the
// build: if anything goes wrong the website simply reads the spreadsheet itself, as before.
//
// To try it on your own computer:  node scripts/prepare-site.js --force
// (that edits your local index.html, so don't commit the result).

const fs = require("fs");
const path = require("path");

if (process.env.NETLIFY !== "true" && !process.argv.includes("--force")) {
  console.log("prepare-site: not running on Netlify, leaving everything alone");
  process.exit(0);
}

try {
  const root = path.join(__dirname, "..");
  const XLSX = require(path.join(root, "assets", "vendor", "xlsx", "xlsx.full.min.js"));
  const ConcertParser = require(path.join(root, "assets", "js", "parse-workbook.js"));

  // which spreadsheet: the one find-workbook.sh recorded, else the default name
  let workbookName = "concert-data.xlsx";
  try {
    const recorded = fs.readFileSync(path.join(root, "data", "workbook.txt"), "utf8").trim();
    if (/\.xlsx$/i.test(recorded) && !/[\\/]/.test(recorded)) workbookName = recorded;
  } catch (err) {
    // no workbook.txt: use the default
  }

  const workbook = XLSX.read(fs.readFileSync(path.join(root, "data", workbookName)), { type: "buffer" });
  const data = ConcertParser.parseWorkbook(XLSX, workbook);
  const info = data.info;

  // 1. the pre-read data for the website
  fs.writeFileSync(path.join(root, "data", "site-data.json"), JSON.stringify(data));
  console.log("prepare-site: saved data/site-data.json from " + workbookName);

  // 2. the title and description for link previews
  const title = info.websiteTitle || [info.concertTitleLine1, info.concertTitleLine2].filter(Boolean).join(" - ");
  const description = [info.concertDate, info.concertTime, info.concertLocation].filter(Boolean).join(" | ");

  if (!title) {
    console.log("prepare-site: no title in the spreadsheet yet, leaving the page title alone");
  } else {
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
    console.log('prepare-site: title "' + title + '"' + (description ? ', description "' + description + '"' : ""));
  }
} catch (err) {
  console.log("prepare-site: skipped (" + err.message + ")");
}
process.exit(0);
