// A tiny Markdown renderer — just enough for short written lessons.
// Supports: # / ## / ### headings, **bold**, *italic*, `code`,
// [links](url), - and 1. lists, --- rules, paragraphs.
// Anything fancier should be a PDF instead.
import { esc } from "./format.js";

// Inline bits first: code, bold, italic, links. (Order matters: code
// is extracted before * and [ can touch it.)
function inline(s) {
  let out = esc(s);
  const codes = [];
  out = out.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
}

export function renderMarkdown(src) {
  const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
  let html = "", list = null; // list: "ul" | "ol" | null

  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };

  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.*)/);           // headings
    const ul = line.match(/^\s*[-•]\s+(.*)/);           // bullets
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);        // numbered
    if (m) {
      closeList();
      html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`;
    } else if (/^\s*---\s*$/.test(line)) {              // rule
      closeList();
      html += "<hr>";
    } else if (ul || ol) {                             // list items
      const kind = ul ? "ul" : "ol";
      const text = ul ? ul[1] : ol[1];
      if (list !== kind) { closeList(); html += `<${kind}>`; list = kind; }
      html += `<li>${inline(text)}</li>`;
    } else if (/^\s*$/.test(line)) {                   // blank line
      closeList();
    } else {                                           // paragraph
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}
