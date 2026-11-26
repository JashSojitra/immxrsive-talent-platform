"""Adapt ThreeUI's Complete Shelf (complete-shelf-v2.html, SHA-256 606f200f...f198e) into the
ImmXrsive Stories House shelf. Scene, shaders, motion and interactions are kept verbatim; only
content, branding, the cover atlas and the three.js source location change."""
import json, re, sys

src = open(sys.argv[1]).read()
out = src

def rep(old, new, count=1):
    global out
    n = out.count(old)
    assert n == count, f"expected {count} of {old[:70]!r}, found {n}"
    out = out.replace(old, new)

# 1. Attribution header.
rep("<!doctype html>\n", """<!doctype html>
<!--
  ImmXrsive Stories House shelf.
  Adapted from ThreeUI "Complete Shelf" (complete-shelf-v2.html, SHA-256 606f200fed86...)
  from @designcodeio/threeui@1.2.0, MIT License, Copyright (c) 2026 Meng To.
  three.js r165 is self-hosted under /world/vendor (MIT, Copyright 2010-2024 three.js authors).
  Changes: student content, ImmXrsive accent, cover atlas removed (covers are drawn in code),
  optional student photo on covers, local three.js, Escape hand-off to the parent world.
-->
""")

# 2. Metadata.
rep('content="Working Volumes is an original interactive Three.js library of seven tactile field guides for contemporary creative tools."',
    'content="The ImmXrsive Stories House: a shelf of student volumes from Algoma University\'s NCoE ImmXrsive."')
rep("<title>Working Volumes — Seven Tools for Making</title>", "<title>Stories House — ImmXrsive</title>")

# 3. Self-hosted three.js r165 (no CDN dependency at events).
rep('"three": "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js"', '"three": "/world/vendor/three-0.165.0/build/three.module.min.js"')
rep('"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/"', '"three/addons/": "/world/vendor/three-0.165.0/examples/jsm/"')

# 4. Primary colour (configured primaryColor) -> ImmXrsive pink.
rep("--accent: #c87046;", "--accent: #e31c79;")
rep('<meta name="theme-color" content="#171a24">', '<meta name="theme-color" content="#2a0f2b">')

# 5. Editorial copy.
rep("<strong>Working Volumes</strong>\n        <span>Seven field guides for making</span>",
    "<strong>Stories House</strong>\n        <span>Student volumes · NCoE ImmXrsive</span>")
rep("<span>Edition 02 · 2026</span>", "<span>Algoma University · 2026</span>")
rep('<span id="palette-label">Ultramarine · bone · copper</span>', '<span id="palette-label">ImmXrsive pink · bone · plum</span>')
rep('<span id="pointer-label-index">Volume 01</span>\n      <strong id="pointer-label-title">Codex</strong>',
    '<span id="pointer-label-index">Volume 01</span>\n      <strong id="pointer-label-title">Jash Sojitra</strong>')
rep('<h1 class="selection__title" id="selection-title">Codex</h1>', '<h1 class="selection__title" id="selection-title">Jash Sojitra</h1>')
rep('<p class="selection__note" id="selection-note">Precise intent, translated into tested systems.</p>',
    '<p class="selection__note" id="selection-note">Built this platform and the ImmXrsive World.</p>')
rep('<p class="eyebrow" id="detail-eyebrow">Volume I · Agentic craft</p>', '<p class="eyebrow" id="detail-eyebrow">Volume I · Platform &amp; partnerships</p>')
rep('<h2 class="detail-title" id="detail-title">Codex</h2>', '<h2 class="detail-title" id="detail-title">Jash Sojitra</h2>')
rep("""        A field manual for turning clear intent into working software, with verification treated as part of the craft.""",
    """        Developer of this platform and the ImmXrsive World.""")
rep("<dt>Binding</dt>", "<dt>Home</dt>")
rep("<dt>Format</dt>", "<dt>Role</dt>")
rep("<dt>Theme</dt>", "<dt>Work</dt>")
rep('<dd id="detail-binding">Evergreen cloth · antique brass foil</dd>', '<dd id="detail-binding">Algoma University · Brampton</dd>')
rep('<dd id="detail-format">148 × 216 mm · imagined edition</dd>', '<dd id="detail-format">XR Program &amp; Partnership Student Coordinator</dd>')
rep('<dd id="detail-theme">Intent into implementation</dd>', '<dd id="detail-theme">ImmXrsive platform · SYNC · Canon DNA · Project Nexus</dd>')
rep('<dd id="detail-motif">Nested brackets</dd>', '<dd id="detail-motif">Spark</dd>')
rep('<p class="fallback__kicker">Working Volumes · Static catalog</p>', '<p class="fallback__kicker">Stories House · Static shelf</p>')
rep('<h2 id="fallback-title">Seven tools for making.</h2>', '<h2 id="fallback-title">The people behind the work.</h2>')
rep('aria-label="Seven conceptual hardcovers"', 'aria-label="Student volumes"')

# 6. Student volumes. Only Jash is a real person; the rest are explicitly reserved.
walnut = {"shelf": "#3a2118", "shelfDark": "#1c0e0a"}
def palette(paper, deep, pale, ink, soft, light, fill):
    return {"paper": paper, "paperDeep": deep, "paperPale": pale, "ink": ink, "inkSoft": soft, "wall": paper, **walnut, "light": light, "fill": fill}

books = [
    {
        "id": "jash-sojitra", "title": "Jash Sojitra", "roman": "I", "discipline": "Platform & partnerships",
        "note": "Built this platform and the ImmXrsive World.",
        "deck": "Jash is the developer of this platform and the ImmXrsive World, and works with the NCoE as XR Program & Partnership Student Coordinator. His full story is being written.",
        "binding": "Algoma University · Brampton", "format": "XR Program & Partnership Student Coordinator",
        "theme": "ImmXrsive platform · SYNC · Canon DNA · Project Nexus", "motif": "Spark", "motifKey": "orbits",
        "paletteLabel": "ImmXrsive pink · bone · plum", "color": "#c2185f", "foil": "#ffd7e8",
        "palette": palette("#2a0f2b", "#1c0a1d", "#ffe3ef", "#fff0f6", "#e6b6cc", "#ffc6de", "#b0406f"),
        "width": 1.04, "height": 1.62, "depth": 0.28, "chapters": ["The platform", "The work", "What's next"], "seed": 11, "initials": "JS",
        "photo": "/world/students/jash-sojitra.jpg",
    },
]
reserved = [
    ("extended-reality", "Extended Reality", "II", "brackets", "#582c83", "#e9d7ff", "Cold purple · lilac · bone", palette("#1d1236", "#130b25", "#ece2ff", "#f6f0ff", "#c9b7ea", "#e2d2ff", "#7d5bb8"), 1.1, 1.48, 0.29),
    ("spatial-computing", "Spatial Computing", "III", "paths", "#00205b", "#b9d4ff", "Dark blue · sky · silver", palette("#0b1a3f", "#07112b", "#dfe9ff", "#f2f6ff", "#b4c6ea", "#d9e6ff", "#3d63b8"), 0.94, 1.55, 0.23),
    ("interactive-design", "Interactive Design", "IV", "modules", "#981d97", "#ffc2f5", "Warm purple · blush · bone", palette("#2c0f33", "#1d0922", "#ffe0fa", "#fff0fc", "#e3b3dc", "#ffd2f6", "#b04aa8"), 1.06, 1.66, 0.25),
    ("software-engineering", "Software Engineering", "V", "caret", "#3c3c3b", "#8ef0d4", "Graphite · ion · bone", palette("#17191f", "#0f1115", "#e6f2ee", "#f3f6f5", "#b8c4c0", "#e0f5ee", "#5f8c80"), 1.0, 1.5, 0.3),
    ("artificial-intelligence", "Artificial Intelligence", "VI", "frames", "#991e66", "#f4f0e8", "Plum · rose · bone", palette("#2a0c1f", "#1c0714", "#ffe2f0", "#fff1f7", "#e0b0c8", "#ffcde4", "#a8467c"), 0.98, 1.58, 0.24),
    ("open-call", "Open call", "VII", "compass", "#1f3d8f", "#ffd7a8", "Indigo · amber · bone", palette("#121a3d", "#0b1029", "#e4e9ff", "#f2f4ff", "#b7c0e8", "#dfe5ff", "#4a62b8"), 1.12, 1.63, 0.27),
]
for i, (bid, area, roman, motif, color, foil, label, pal, w, h, d) in enumerate(reserved):
    books.append({
        "id": bid, "title": "Coming Soon", "roman": roman, "discipline": area,
        "initials": "?",
        "note": "A student story is being prepared.",
        "deck": f"This volume is reserved for an ImmXrsive student story ({area.lower()}). Their photo, story and projects will appear here once they are approved.",
        "binding": "Reserved volume", "format": "Story in preparation", "theme": area, "motif": motif.capitalize(), "motifKey": motif,
        "paletteLabel": label, "color": color, "foil": foil, "palette": pal, "width": w, "height": h, "depth": d,
        "chapters": ["Coming soon", "Projects", "What's next"], "seed": 22 + i * 11, "photo": None,
    })

start = out.index("    const BOOKS = [")
end = out.index("    ];\n", start) + len("    ];\n")
out = out[:start] + "    const BOOKS = " + json.dumps(books, indent=2, ensure_ascii=False).replace("\n", "\n    ") + ";\n" + out[end:]

# Fallback grid mirrors the volumes.
grid_start = out.index('<div class="fallback__grid"')
grid_inner = out.index(">", grid_start) + 1
grid_end = out.index("</div>", grid_inner)
items = "\n".join(
    f'        <article class="fallback-book" style="--book-color:{b["color"]};--book-foil:{b["foil"]};--book-height:{int(240 * b["height"])}px"><span>Volume {b["roman"]}</span><strong>{b["title"]}</strong></article>'
    for b in books)
out = out[:grid_inner] + "\n" + items + "\n      " + out[grid_end:]

# 7. Remove the third-party tool cover atlas; covers are drawn procedurally from each volume.
out = re.sub(r'const COVER_ATLAS_DATA = "data:image/webp;base64,[A-Za-z0-9+/=]+";', 'const COVER_ATLAS_DATA = "";', out)
assert 'const COVER_ATLAS_DATA = "";' in out
rep("// The walnut map and the new GPT Image cover atlas are embedded so the browser\n    // never calls a generation service or depends on an asset host.",
    "// The walnut map is embedded. The original tool cover atlas was removed for ImmXrsive:\n    // every cover is drawn in code from its volume, with an optional student photo.")

# 7b. Without the atlas, the metallic foil layer already prints the label, title and discipline.
#     Drop the duplicate flat print from the procedural cover so the text appears once, in foil.
rep("""      ctx.fillStyle = book.foil;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '500 18px Inter, "Helvetica Neue", Arial, sans-serif';
      ctx.letterSpacing = "4px";
      ctx.fillText(`WORKING VOLUMES  /  ${book.roman}`, canvasTexture.width / 2, 92);

      const titleSize = book.title.length > 10 ? 72 : 88;
      ctx.font = `400 ${titleSize}px "Iowan Old Style", Baskerville, Georgia, serif`;
      ctx.fillText(book.title, canvasTexture.width / 2, canvasTexture.height * 0.72);
      ctx.font = '500 16px Inter, "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(book.discipline.toUpperCase(), canvasTexture.width / 2, canvasTexture.height * 0.79);
""", """      // ImmXrsive: print label, title and discipline at exactly the foil positions (makeFoilTexture),
      // so covers stay readable on any GPU and the metallic foil adds shine on top.
      ctx.fillStyle = book.foil;
      ctx.strokeStyle = book.foil;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = '500 15px Inter, "Helvetica Neue", Arial, sans-serif';
      ctx.letterSpacing = "2.8px";
      ctx.fillText(`IMMXRSIVE STORIES  /  ${pad(BOOKS.indexOf(book) + 1)}`, 58, 70);
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(58, 86);
      ctx.lineTo(164, 86);
      ctx.stroke();
      ctx.globalAlpha = 1;
      const printedTitleSize = book.title.length > 10 ? 64 : 78;
      ctx.font = `400 ${printedTitleSize}px "Iowan Old Style", Baskerville, Georgia, serif`;
      ctx.letterSpacing = "0px";
      ctx.fillText(book.title, 58, 1020);
      ctx.font = '500 14px Inter, "Helvetica Neue", Arial, sans-serif';
      ctx.letterSpacing = "2.4px";
      ctx.fillText(book.discipline.toUpperCase(), 60, 1066);
""")

# 7c. The foil layer floats slightly above the cover, so with flat-printed text it would read as a
#     doubled ghost. Keep the foil sheet but leave it empty: the printed text is the single source.
rep("""      const index = BOOKS.indexOf(book) + 1;

      ctx.clearRect(0, 0, foilCanvas.width, foilCanvas.height);
      ctx.fillStyle = "#ffffff";""", """      const index = BOOKS.indexOf(book) + 1;

      ctx.clearRect(0, 0, foilCanvas.width, foilCanvas.height);
      if (index > 0) return configureCanvasTexture(new THREE.CanvasTexture(foilCanvas));
      ctx.fillStyle = "#ffffff";""")

# 8. Printed strings on covers, spines and pages.
rep("`WORKING VOLUMES  /  ${book.roman}`", "`IMMXRSIVE STORIES  /  ${book.roman}`", 2)
rep("`WORKING VOLUMES  /  ${pad(index)}`", "`IMMXRSIVE STORIES  /  ${pad(index)}`")
rep("Conceived as an original editorial study for Working Volumes.", "Part of the ImmXrsive Stories House shelf.")
rep("`SPECIMEN ${book.roman} / ${book.seed}  ·  IMAGINED EDITION`", "`VOLUME ${book.roman}  ·  NCOE IMMXRSIVE`")
rep('"AN IMAGINED EDITION"', '"NCOE IMMXRSIVE"')

# 9. Optional student photo on the cover (drawn in an arched window instead of the motif).
rep("      drawMotif(ctx, book, canvasTexture.width, canvasTexture.height);\n\n      // ImmXrsive: print label, title and discipline",
    """      if (book.photoImage) {
        const frameX = canvasTexture.width * 0.2;
        const frameY = canvasTexture.height * 0.15;
        const frameW = canvasTexture.width * 0.6;
        const frameH = canvasTexture.height * 0.44;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(frameX, frameY + frameW / 2);
        ctx.arc(frameX + frameW / 2, frameY + frameW / 2, frameW / 2, Math.PI, 0);
        ctx.lineTo(frameX + frameW, frameY + frameH);
        ctx.lineTo(frameX, frameY + frameH);
        ctx.closePath();
        ctx.clip();
        const image = book.photoImage;
        const scale = Math.max(frameW / image.width, frameH / image.height);
        ctx.drawImage(image, frameX + (frameW - image.width * scale) / 2, frameY + (frameH - image.height * scale) / 2, image.width * scale, image.height * scale);
        ctx.restore();
        ctx.strokeStyle = book.foil;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(frameX, frameY + frameW / 2);
        ctx.arc(frameX + frameW / 2, frameY + frameW / 2, frameW / 2, Math.PI, 0);
        ctx.lineTo(frameX + frameW, frameY + frameH);
        ctx.lineTo(frameX, frameY + frameH);
        ctx.closePath();
        ctx.stroke();
      } else {
        drawMotif(ctx, book, canvasTexture.width, canvasTexture.height);
      }

      // ImmXrsive: print label, title and discipline""")
rep("""      try {
        await coverAtlasImage.decode();
        coverAtlasReady = true;
      } catch (error) {
        coverAtlasReady = false;
      }
""", """      try {
        await coverAtlasImage.decode();
        coverAtlasReady = true;
      } catch (error) {
        coverAtlasReady = false;
      }

      // Student photos (same-origin files under /world/students) are optional.
      await Promise.all(BOOKS.filter(book => book.photo).map(async book => {
        const image = new Image();
        image.src = book.photo;
        try {
          await image.decode();
          book.photoImage = image;
        } catch (error) {
          book.photoImage = null;
        }
      }));
""")

# 9b. Hover preview card: avatar, name and short preview text.
rep("""    <div class="pointer-label" id="pointer-label" aria-hidden="true">
      <span id="pointer-label-index">Volume 01</span>
      <strong id="pointer-label-title">Jash Sojitra</strong>
    </div>""", """    <div class="pointer-label" id="pointer-label" aria-hidden="true">
      <span class="pointer-label__avatar" id="pointer-label-avatar">JS</span>
      <span class="pointer-label__text">
        <span id="pointer-label-index">Volume 01</span>
        <strong id="pointer-label-title">Jash Sojitra</strong>
        <span class="pointer-label__note" id="pointer-label-note">Built this platform and the ImmXrsive World.</span>
      </span>
    </div>""")
rep("""    @media (pointer: coarse) {
      .pointer-label {
        display: none;
      }
    }""", """    @media (pointer: coarse) {
      .pointer-label {
        display: none;
      }
    }

    /* ImmXrsive: the hover label becomes a small preview card. */
    .pointer-label {
      grid-template-columns: 44px minmax(0, 1fr);
      align-items: center;
      gap: 12px;
      width: max-content;
      max-width: 300px;
      padding: 10px 14px 10px 10px;
      border-radius: 14px;
      border-color: rgba(227, 28, 121, 0.55);
      background: rgba(22, 8, 26, 0.9);
      color: #fff0f6;
      backdrop-filter: blur(12px);
      box-shadow: 0 16px 40px rgba(10, 2, 12, 0.45);
    }
    .pointer-label #pointer-label-index {
      color: #ff8cc0;
    }
    .pointer-label__avatar {
      display: grid;
      width: 44px;
      height: 44px;
      place-items: center;
      overflow: hidden;
      border-radius: 50%;
      background: linear-gradient(140deg, #e31c79, #582c83);
      background-size: cover;
      background-position: center;
      color: #fff;
      font-size: 0.8rem;
      letter-spacing: 0.04em;
    }
    .pointer-label__avatar[data-photo] {
      color: transparent;
    }
    .pointer-label__text {
      display: grid;
      gap: 2px;
      min-width: 0;
    }
    .pointer-label__note {
      max-width: 220px;
      font-size: 0.72rem;
      letter-spacing: 0;
      line-height: 1.4;
      text-transform: none;
      opacity: 0.78;
    }""")
rep("""    const pointerLabelTitle = document.querySelector("#pointer-label-title");""", """    const pointerLabelTitle = document.querySelector("#pointer-label-title");
    const pointerLabelNote = document.querySelector("#pointer-label-note");
    const pointerLabelAvatar = document.querySelector("#pointer-label-avatar");""")
rep("""        pointerLabelTitle.textContent = book.title;
        pointerLabel.setAttribute("aria-hidden", "false");""", """        pointerLabelTitle.textContent = book.title;
        pointerLabelNote.textContent = book.note;
        pointerLabelAvatar.textContent = book.initials || "?";
        if (book.photo) {
          pointerLabelAvatar.style.backgroundImage = `url("${book.photo}")`;
          pointerLabelAvatar.dataset.photo = "true";
        } else {
          pointerLabelAvatar.style.backgroundImage = "";
          delete pointerLabelAvatar.dataset.photo;
        }
        pointerLabel.setAttribute("aria-hidden", "false");""")

# 9c. Re-enable the hover label for fine pointers (the source hides it in its minimal presentation).
rep("""    .hero-word,
    .pointer-label,
    .folio {
      display: none !important;
    }""", """    .hero-word,
    .folio {
      display: none !important;
    }""")

# 9d. Phones have no hover, so keep the selected volume's preview visible (two lines) on small screens.
rep("""      .editorial-index span:last-child,
      .selection__note,
      .microcopy {
        display: none;
      }""", """      .editorial-index span:last-child,
      .microcopy {
        display: none;
      }

      .selection__note {
        display: -webkit-box;
        overflow: hidden;
        margin-top: 6px;
        font-size: 0.78rem;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }""")

# 10. Escape on the shelf (with no open volume) returns to the world.
rep("</body>", """  <script>
    // ImmXrsive: hand Escape to the parent world when no volume is open.
    window.addEventListener("keydown", event => {
      if (event.key !== "Escape" || window.parent === window) return;
      const panel = document.getElementById("detail-panel");
      if (panel && panel.getAttribute("aria-hidden") === "false") return;
      window.parent.postMessage({ type: "immxrsive:shelf-escape" }, window.location.origin);
    });
  </script>
</body>""")

# 11. A CPU rasterizer (no GPU, a blocklisted GPU, CI runners) draws this scene at about 1 fps and can
#     take minutes to show the first frame, so show the static catalog instead. Same pattern as
#     src/components/world/engine/software-renderer.ts.
rep("""        showFallback("WebGL is unavailable in this browser. The complete static catalog remains available.");
        return;
      }
""", """        showFallback("WebGL is unavailable in this browser. The complete static catalog remains available.");
        return;
      }

      // ImmXrsive: software rendering cannot run this scene interactively; show the static catalog.
      const gl = renderer.getContext();
      const rendererInfo = gl.getExtension("WEBGL_debug_renderer_info");
      const rendererName = String(gl.getParameter(rendererInfo ? rendererInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
      if (/swiftshader|llvmpipe|softpipe|software|basic render driver|microsoft basic render/i.test(rendererName)) {
        renderer.dispose();
        renderer = null;
        showFallback("This device has no graphics acceleration, so the shelf is shown as a static catalog.");
        return;
      }
""")

leftovers = [w for w in ["Working Volumes", "WORKING VOLUMES", "Codex", "Claude Code", "Cursor", "Antigravity", "Figma", "Framer", "Xcode", "imagined edition"] if w in out]
print("leftover strings:", leftovers)
open(sys.argv[2], "w").write(out)
print(len(src), "->", len(out))
