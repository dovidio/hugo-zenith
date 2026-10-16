/* The reading room's tools, on the web. No dependencies.
   The keys are the app's keys: the point is that a reader who knows one knows
   the other. */
(function () {
  "use strict";
  var html = document.documentElement;
  var THEMES = ["lugano", "maionese", "bibione", "kununurra", "panittha", "newsprint"];
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---- themes ---------------------------------------------------------- */
  function theme(name) {
    if (!name || name === "lugano") html.removeAttribute("data-theme");
    else html.setAttribute("data-theme", name);
    store("zenith-theme", name || "lugano");
  }
  $$("[data-theme-set]").forEach(function (b) {
    b.addEventListener("click", function () { theme(b.getAttribute("data-theme-set")); });
  });

  /* ---- type size ------------------------------------------------------- */
  var size = parseFloat(store("zenith-size")) || 17;
  function setSize(px) {
    size = Math.max(14, Math.min(26, px));
    html.style.setProperty("--size", size + "px");
    store("zenith-size", size + "px");
  }
  if (store("zenith-size")) html.style.setProperty("--size", store("zenith-size"));

  /* ---- zen, focus, source, distil ------------------------------------- */
  function toggle(cls, key, on) {
    var next = on === undefined ? !html.classList.contains(cls) : on;
    html.classList.toggle(cls, next);
    store(key, next ? "1" : "0");
    return next;
  }
  var acts = {
    zen: function () { toggle("zen", "zenith-zen"); },
    focus: function () { var on = toggle("focus", "zenith-focus"); if (on) lens(); },
    distil: function () { toggle("distil", "zenith-distil"); },
    source: function () {
      var p = $("#prose"), s = $("#source");
      if (!p || !s) return;
      var showSource = !s.hidden;
      s.hidden = showSource; p.hidden = !showSource;
    },
    find: function () { finder(true); },
    help: function () { var h = $("#help"); if (h) h.hidden = !h.hidden; }
  };
  $$("[data-act]").forEach(function (b) {
    b.addEventListener("click", function () { (acts[b.getAttribute("data-act")] || function () {})(); });
  });

  /* The focus lens: the block at the reading line is the one in focus. */
  function lens() {
    var blocks = $$("#prose > *");
    if (!blocks.length) return;
    var line = window.innerHeight * 0.38, best = null, bestD = Infinity;
    blocks.forEach(function (b) {
      var r = b.getBoundingClientRect();
      var d = Math.abs(r.top - line);
      if (r.bottom > 0 && d < bestD) { bestD = d; best = b; }
    });
    blocks.forEach(function (b) { b.classList.toggle("lens", b === best); });
  }

  /* ---- the spine: where you are in the file ---------------------------- */
  var spine = $("#spine");
  function scrollSpine() {
    if (!spine) return;
    var max = document.body.scrollHeight - window.innerHeight;
    var at = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    spine.style.setProperty("--at", at.toFixed(4));
    if (html.classList.contains("focus")) lens();
    /* Mark the tree row you are reading, the way the app marks the file. */
  }
  window.addEventListener("scroll", function () { window.requestAnimationFrame(scrollSpine); }, { passive: true });
  scrollSpine();

  /* ---- the tree -------------------------------------------------------- */
  var tree = $("#tree");
  var items = [];
  /* Only the rows actually on screen: a link inside a folded folder is not a row you can
     move to, and focus cannot follow the cursor into something that is not rendered. The
     app's tree makes the same distinction — it walks the rows it is showing. */
  function collect() {
    items = $$("#tree summary, #tree .file").filter(function (el) {
      return el.offsetParent !== null;
    });
    items.forEach(function (el, i) { el.dataset.i = i; });
  }
  collect();
  var cur = -1;
  /* The vim cursor and the browser's focus are kept as one thing: moving with j/k moves
     focus, and tabbing into the tree moves the cursor. That is what makes the two ways of
     driving this agree instead of fighting — and it is why `tab` is left to the browser,
     where it belongs, rather than being swallowed by a modal "tree mode". */
  function cursor(i, scroll, focus) {
    if (!items.length) return;
    items.forEach(function (el) { el.classList.remove("cursor"); });
    cur = Math.max(0, Math.min(items.length - 1, i));
    var el = items[cur];
    el.classList.add("cursor");
    if (scroll !== false) el.scrollIntoView({ block: "nearest" });
    if (focus) el.focus({ preventScroll: true });
  }
  function inTree() { return !!(tree && tree.contains(document.activeElement)); }
  function rowOf(el) { return el && el.classList.contains("file") ? items.indexOf(el) : -1; }
  function openAt(el) {
    if (!el) return;
    if (el.classList.contains("file")) { location.href = el.getAttribute("href"); return; }
    var box = el.parentElement;
    if (box && box.tagName === "DETAILS") { box.open = !box.open; collect(); }
  }
  function back() {
    var el = items[cur];
    if (!el) return;
    if (el.parentElement && el.parentElement.tagName === "DETAILS" && el.parentElement.open) {
      el.parentElement.open = false; collect(); cursor(cur);
      return;
    }
    var box = el.closest("details");
    if (box && box.parentElement) {
      var parent = box.parentElement.closest("details");
      if (parent) { var i = rowOf(parent.querySelector("summary")); if (i >= 0) cursor(i); }
    }
  }
  if (tree) {
    /* Start where the reader already is: the current file. On a phone the tree is a
       scrollable peek, so this is also what puts the current file in the window. */
    var here = $(".tree .file.here");
    if (here) {
      cursor(rowOf(here) >= 0 ? rowOf(here) : 0, false);
      if (here.offsetTop > tree.clientHeight) {
        tree.scrollTop = here.offsetTop - tree.clientHeight / 2;
      }
    }
    tree.addEventListener("click", function (e) {
      var el = e.target.closest("summary, .file");
      if (el) cursor(rowOf(el) >= 0 ? rowOf(el) : items.indexOf(el), false);
    });
    /* Reaching the tree with tab, or with the mouse, puts the cursor where you are. */
    tree.addEventListener("focusin", function (e) {
      var i = items.indexOf(e.target);
      if (i >= 0) { cur = i; items.forEach(function (el) { el.classList.remove("cursor"); }); e.target.classList.add("cursor"); }
    });
  }

  /* ---- the finder ------------------------------------------------------ */
  var finderBox = $("#finder"), input = $("#finder-input"), list = $("#finder-list"), index = null;
  if (!index) {
    var node = document.getElementById("index");
    try { index = node ? JSON.parse(node.textContent) : []; } catch (e) { index = []; }
    /* On a post, the index is not in the page: fall back to the tree's own list. */
    if (!index.length) {
      index = $$(".tree .file").map(function (a) {
        return { t: a.getAttribute("title") || a.textContent, u: a.getAttribute("href"), p: a.textContent.replace(/\.md$/, "") };
      });
    }
  }
  function score(q, s) {
    q = q.toLowerCase(); s = (s || "").toLowerCase();
    var i = 0, sc = 0;
    for (var j = 0; j < s.length && i < q.length; j++) {
      if (s[j] === q[i]) { sc += j === 0 ? 2 : 1; i++; }
    }
    return i === q.length ? sc : -1;
  }
  function render(q) {
    var hits = index.map(function (it) {
      return { it: it, s: Math.max(score(q, it.p), score(q, it.t)) };
    }).filter(function (h) { return h.s > -1; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 40);
    list.innerHTML = "";
    hits.forEach(function (h, i) {
      var li = document.createElement("li");
      li.setAttribute("aria-selected", i === 0 ? "true" : "false");
      li.dataset.href = h.it.u;
      li.innerHTML = '<span class="f-name">' + (h.it.p || "") + '</span><span>' + h.it.t + "</span>";
      li.addEventListener("click", function () { location.href = h.it.u; });
      list.appendChild(li);
    });
  }
  function finder(open) {
    if (!finderBox) return;
    finderBox.hidden = !open;
    if (open) { input.value = ""; render(""); input.focus(); }
  }
  function moveHit(d) {
    var sels = $$("#finder-list li");
    if (!sels.length) return;
    var i = sels.findIndex(function (li) { return li.getAttribute("aria-selected") === "true"; });
    i = Math.max(0, Math.min(sels.length - 1, i + d));
    sels.forEach(function (li, j) { li.setAttribute("aria-selected", j === i ? "true" : "false"); });
    sels[i].scrollIntoView({ block: "nearest" });
  }
  if (input) input.addEventListener("input", function () { render(input.value); });
  function goHit() {
    var li = $('#finder-list li[aria-selected="true"]');
    if (li) location.href = li.dataset.href;
  }

  /* ---- moving through the post, the way the app does ------------------- */
  /* In zenith, j and k move *within* the file and n and p move *between* files. The first
     version of this got that backwards — j and k jumped to the next post — which made the
     page feel like it only knew how to leave. */
  function line() {
    var lh = parseFloat(getComputedStyle(document.body).lineHeight);
    return isNaN(lh) ? 26 : lh;
  }
  function scrollBy_(px) { window.scrollBy({ top: px, behavior: "smooth" }); }
  function toTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }
  function toBottom() { window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }
  function post(which) {
    var a = $(".nextprev ." + which);
    if (a) location.href = a.getAttribute("href");
  }

  /* ---- keys ------------------------------------------------------------ */
  var pendingG = 0;
  document.addEventListener("keydown", function (e) {
    var typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    var cmd = e.metaKey || e.ctrlKey;

    if (cmd && (e.key === "p" || e.key === "k")) { e.preventDefault(); finder(true); return; }
    if (e.key === "Escape") {
      if (!$("#help").hidden) { $("#help").hidden = true; return; }
      if (!finderBox.hidden) { finder(false); return; }
      /* Esc leaves the tree, because that is what it means everywhere else: out. */
      if (inTree()) { document.activeElement.blur(); return; }
      return;
    }
    if (!finderBox.hidden) {
      if (e.key === "ArrowDown") { e.preventDefault(); moveHit(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveHit(-1); }
      else if (e.key === "Enter") { e.preventDefault(); goHit(); }
      return;
    }
    if (typing) return;

    /* `tab` is not ours: it is how a keyboard reaches the tree, and how anyone using a
       keyboard reaches every link on the page. */
    if (e.key === "?") { e.preventDefault(); acts.help(); return; }
    if (e.key === "/") { e.preventDefault(); finder(true); return; }

    if (inTree()) {
      if (e.key === "j") { e.preventDefault(); cursor(cur + 1, true, true); return; }
      if (e.key === "k") { e.preventDefault(); cursor(cur - 1, true, true); return; }
      if (e.key === "l" || e.key === "Enter") { e.preventDefault(); openAt(items[cur]); return; }
      if (e.key === "h") { e.preventDefault(); back(); return; }
      if (e.key === "g") { e.preventDefault(); cursor(0, true, true); return; }
      if (e.key === "G") { e.preventDefault(); cursor(items.length - 1, true, true); return; }
      if (e.key === "n") { e.preventDefault(); post("next"); return; }
      if (e.key === "p") { e.preventDefault(); post("prev"); return; }
      return;
    }

    /* In the page: vim's own meanings. */
    if (e.key === "j") { e.preventDefault(); scrollBy_(line()); return; }
    if (e.key === "k") { e.preventDefault(); scrollBy_(-line()); return; }
    if (cmd && e.key === "d") { e.preventDefault(); scrollBy_(window.innerHeight / 2); return; }
    if (cmd && e.key === "u") { e.preventDefault(); scrollBy_(-window.innerHeight / 2); return; }
    if (e.key === "G") { e.preventDefault(); toBottom(); return; }
    if (e.key === "g") {
      e.preventDefault();
      var now = Date.now();
      if (now - pendingG < 400) { pendingG = 0; toTop(); } else { pendingG = now; }
      return;
    }
    if (e.key === "n") { e.preventDefault(); post("next"); return; }
    if (e.key === "p") { e.preventDefault(); post("prev"); return; }
    if (e.key === "x") { acts.source(); return; }
    if (e.key === "d") { acts.distil(); return; }
    if (e.key === "f") { acts.focus(); return; }
    if (e.key === "Z") { acts.zen(); return; }
    if (e.key === "-") { setSize(size - 1); return; }
    if (e.key === "=" || e.key === "+") { setSize(size + 1); return; }
    if (e.key >= "1" && e.key <= "6") { theme(THEMES[parseInt(e.key, 10) - 1]); }
  });

  /* ---- code: a copy button in our own ink, and the language named ---------
     Chroma already wraps every line in `<span class="line">` with its number in
     `<span class="ln">`, so the gutter is CSS's job and nothing here rewrites the
     markup. Rewriting it was the first version's mistake: it fought the markup it
     was given and put the numbers on lines of their own. */
  $$(".highlight").forEach(function (block) {
    var code = block.querySelector("code");
    if (!code) return;
    var lang = code.getAttribute("data-lang") || "";
    if (lang) block.setAttribute("data-lang", lang);

    var btn = document.createElement("button");
    btn.className = "copy-button";
    btn.type = "button";
    btn.textContent = "copy";
    btn.addEventListener("click", function () {
      // The numbers are in the gutter, not in the text.
      var text = $$(".cl", block).length
        ? $$(".cl", block).map(function (l) { return l.textContent; }).join("\n")
        : code.innerText;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = "copied";
        setTimeout(function () { btn.textContent = "copy"; }, 1500);
      });
    });
    block.appendChild(btn);
  });
})();
