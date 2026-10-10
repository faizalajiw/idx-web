"""Build Market-Labs-Dokumentasi-Menu.pdf dari docs/menu/*.md.

Jalankan dari folder docs/menu:
    ..\\..\\..\\idx-scraper\\.venv\\Scripts\\python.exe build-pdf.py

Alur: Markdown -> HTML (markdown-it-py) -> Mermaid dirender di Chromium
(Playwright, mermaid.min.js lokal dari node_modules) -> page.pdf().

Nomor halaman TOC diisi dengan dua pass: pass-1 mengukur posisi tiap heading
lewat named destination PDF (Chromium membuat destination per elemen ber-id),
pass-2 menulis PDF final dengan nomor halaman sudah terisi.
"""

from __future__ import annotations

import html
import re
from datetime import datetime
from pathlib import Path

from markdown_it import MarkdownIt
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
OUT = HERE / "Market-Labs-Dokumentasi-Menu.pdf"
MERMAID_JS = HERE / "node_modules" / "mermaid" / "dist" / "mermaid.min.js"
ORDER = ["README.md"] + sorted(
    p.name for p in HERE.glob("*.md") if p.name != "README.md"
)
SLUG_RE = re.compile(r"[^\w\- ]+")
MARGIN = {"top": "18mm", "bottom": "18mm", "left": "14mm", "right": "14mm"}
FOOTER = (
    '<div style="font-size:8px;width:100%;padding:0 14mm;color:#67718a;display:flex;'
    'justify-content:space-between"><span>Market Labs - Dokumentasi Menu</span>'
    '<span>Halaman <span class="pageNumber"></span> / <span class="totalPages"></span>'
    "</span></div>"
)
STYLE = """
  @page { size: A4; margin: 18mm 14mm 18mm 14mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10pt; color:#1d2433; line-height:1.45; }
  h1 { font-size: 18pt; color:#0f3d6e; border-bottom:2px solid #0f3d6e; padding-bottom:4px; page-break-before: always; }
  h2 { font-size: 13pt; color:#0f3d6e; margin-top:16px; }
  h3 { font-size: 11pt; color:#1f5b99; margin-top:12px; page-break-after: avoid; }
  table { border-collapse: collapse; width:100%; margin:6px 0 10px; font-size:8.5pt; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td { border:1px solid #c9d2e0; padding:3px 5px; vertical-align: top; text-align:left; }
  th { background:#eaf0f8; }
  code { font-family: Consolas, monospace; font-size:8.5pt; background:#f3f5f9; padding:0 2px; }
  pre { background:#f6f8fb; padding:6px; white-space: pre-wrap; font-size:8pt; }
  pre.mermaid { background:#fff; text-align:center; page-break-inside: avoid; }
  pre.mermaid svg { max-width: 100%; height:auto; }
  blockquote { border-left:3px solid #1f5b99; margin:6px 0; padding:2px 8px; color:#44506a; }
  .cover { height: 250mm; display:flex; flex-direction:column; justify-content:center; text-align:center; page-break-after: always; }
  .cover h1 { border:none; font-size:30pt; page-break-before: auto; }
  .cover .sub { font-size:14pt; color:#44506a; margin-top:8px; }
  .toc { page-break-after: always; }
  .toc ul { list-style:none; padding:0; }
  .toc li { display:flex; border-bottom:1px dotted #c9d2e0; padding:2px 0; }
  .toc li a { flex:1; color:#1d2433; text-decoration:none; }
  .toc li.lvl1 { font-weight:bold; margin-top:4px; }
  .toc li.lvl2 { padding-left:14px; }
  .pg::after { content: attr(data-page); }
"""


def slug(text: str) -> str:
    return SLUG_RE.sub("", text.lower()).strip().replace(" ", "-")


def render_markdown() -> tuple[str, list[tuple[int, str, str]]]:
    md = MarkdownIt("commonmark", {"html": False}).enable("table")
    chunks: list[str] = []
    headings: list[tuple[int, str, str]] = []
    for name in ORDER:
        src = (HERE / name).read_text(encoding="utf-8").replace("\r\n", "\n")
        mermaid_blocks: list[str] = []

        def _stash(m: re.Match) -> str:
            mermaid_blocks.append(m.group(1))
            return f"MERMAIDBLOCK{len(mermaid_blocks) - 1}X"

        src = re.sub(r"```mermaid\n(.*?)```", _stash, src, flags=re.S)
        body = md.render(src)
        for i, code in enumerate(mermaid_blocks):
            body = re.sub(
                rf"<p>MERMAIDBLOCK{i}X</p>|MERMAIDBLOCK{i}X",
                lambda _m, c=code: '<pre class="mermaid">' + html.escape(c) + "</pre>",
                body,
            )

        def _h(m: re.Match, _name: str = name) -> str:
            level, text = int(m.group(1)), re.sub(r"<[^>]+>", "", m.group(2))
            hid = f"{Path(_name).stem}-{slug(text)}"
            if level <= 2:
                headings.append((level, text, hid))
            return f'<h{level} id="{hid}">{m.group(2)}</h{level}>'

        body = re.sub(r"<h([1-3])>(.*?)</h\1>", _h, body, flags=re.S)
        chunks.append(f'<section class="doc">{body}</section>')
    return "\n".join(chunks), headings


def build_html(
    body: str, headings: list[tuple[int, str, str]], date_str: str, pages: dict[str, int]
) -> str:
    toc = "\n".join(
        f'<li class="lvl{lvl}"><a href="#{hid}">{html.escape(text)}</a>'
        f'<span class="pg" data-page="{pages.get(hid, "")}"></span></li>'
        for lvl, text, hid in headings
    )
    mermaid_js = MERMAID_JS.read_text(encoding="utf-8")
    return f"""<!doctype html><html lang="id"><head><meta charset="utf-8">
<style>{STYLE}</style>
<script>{mermaid_js}</script>
</head><body>
<div class="cover">
  <h1>Market Labs</h1>
  <div class="sub">Dokumentasi Teknis-Fungsional Per Menu</div>
  <div class="sub">Build: {date_str} &middot; Versi dokumen: 1.0</div>
  <div class="sub">Sumber: docs/menu/*.md &middot; idx-web &amp; idx-scraper</div>
</div>
<div class="toc"><h1 style="page-break-before:auto">Daftar Isi</h1><ul>{toc}</ul></div>
{body}
<script>
  mermaid.initialize({{ startOnLoad: false, securityLevel: "loose", theme: "default" }});
  window.mermaidDone = false;
  window.mermaidErrors = [];
  (async function () {{
    const nodes = Array.from(document.querySelectorAll("pre.mermaid"));
    for (let i = 0; i < nodes.length; i++) {{
      try {{
        const r = await mermaid.render("mmd-" + i, nodes[i].textContent);
        nodes[i].innerHTML = r.svg;
      }} catch (e) {{
        window.mermaidErrors.push("block " + i + ": " + (e && e.message ? e.message : e));
        nodes[i].classList.add("mermaid-error");
        nodes[i].textContent = "[Diagram gagal dirender: block " + i + "]";
      }}
    }}
    window.mermaidDone = true;
  }})();
</script>
</body></html>"""


def _render_pdf(html_text: str, tmp: Path, out: Path) -> None:
    tmp.write_text(html_text, encoding="utf-8")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(tmp.as_uri(), wait_until="load")
        page.wait_for_function("window.mermaidDone === true", timeout=90_000)
        errs = page.evaluate("window.mermaidErrors")
        if errs:
            print("Mermaid errors:", errs)
            raise SystemExit(f"{len(errs)} diagram gagal dirender")
        page.emulate_media(media="print")
        page.pdf(
            path=str(out),
            format="A4",
            print_background=True,
            display_header_footer=True,
            header_template="<span></span>",
            footer_template=FOOTER,
            margin=MARGIN,
        )
        browser.close()


def _dest_pages(pdf: Path) -> dict[str, int]:
    reader = PdfReader(str(pdf))
    idx = {}
    for i, page in enumerate(reader.pages):
        try:
            idx[page.indirect_reference.idnum] = i + 1
        except Exception:
            pass
    out: dict[str, int] = {}
    for name, dest in reader.named_destinations.items():
        page_ref = dest.get("/Page")
        num = getattr(page_ref, "idnum", None)
        if num is not None and num in idx:
            out[name.lstrip("/")] = idx[num]
    return out


def main() -> None:
    if not MERMAID_JS.exists():
        raise SystemExit("mermaid tidak ditemukan. Jalankan: npm install (di docs/menu)")
    body, headings = render_markdown()
    date_str = datetime.now().strftime("%d %B %Y %H:%M")
    tmp = HERE / "_build.html"
    probe = HERE / "_probe.pdf"
    try:
        _render_pdf(build_html(body, headings, date_str, {}), tmp, probe)
        pages = _dest_pages(probe)
        _render_pdf(build_html(body, headings, date_str, pages), tmp, OUT)
    finally:
        tmp.unlink(missing_ok=True)
        probe.unlink(missing_ok=True)
    filled = sum(1 for _, _, h in headings if h in pages)
    print(f"PDF: {OUT}")
    print(f"Heading dengan nomor halaman: {filled}/{len(headings)}")


if __name__ == "__main__":
    main()
