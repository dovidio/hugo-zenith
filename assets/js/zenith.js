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
  function collect() {
    items = $$("#tree summary, #tree .file");
    items.forEach(function (el, i) { el.dataset.i = i; });
  }
  collect();
  var cur = -1;
  function cursor(i, scroll) {
    if (!items.length) return;
    items.forEach(function (el) { el.classList.remove("cursor"); });
    cur = Math.max(0, Math.min(items.length - 1, i));
    var el = items[cur];
    el.classList.add("cursor");
    if (scroll !== false) el.scrollIntoView({ block: "nearest" });
  }
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
    /* Start where the reader already is: the current file. */
    var here = $(".tree .file.here");
    if (here) cursor(rowOf(here) >= 0 ? rowOf(here) : 0, false);
    tree.addEventListener("click", function (e) {
      var el = e.target.closest("summary, .file");
      if (el) cursor(rowOf(el) >= 0 ? rowOf(el) : items.indexOf(el), false);
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

  /* ---- keys ------------------------------------------------------------ */
  var inTree = false;
  document.addEventListener("keydown", function (e) {
    var typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    var cmd = e.metaKey || e.ctrlKey;

    if (cmd && (e.key === "p" || e.key === "k")) { e.preventDefault(); finder(true); return; }
    if (e.key === "Escape") {
      if (!$("#help").hidden) { $("#help").hidden = true; return; }
      if (!finderBox.hidden) { finder(false); return; }
      inTree = false; html.classList.remove("in-tree");
      return;
    }
    if (!finderBox.hidden) {
      if (e.key === "ArrowDown") { e.preventDefault(); moveHit(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveHit(-1); }
      else if (e.key === "Enter") { e.preventDefault(); goHit(); }
      return;
    }
    if (typing) return;

    if (e.key === "tab") { e.preventDefault(); inTree = !inTree; html.classList.toggle("in-tree", inTree); if (inTree) cursor(cur < 0 ? 0 : cur); return; }
    if (e.key === "?") { e.preventDefault(); acts.help(); return; }
    if (e.key === "/") { e.preventDefault(); finder(true); return; }

    if (inTree) {
      if (e.key === "j") { e.preventDefault(); cursor(cur + 1); return; }
      if (e.key === "k") { e.preventDefault(); cursor(cur - 1); return; }
      if (e.key === "l" || e.key === "Enter") { e.preventDefault(); openAt(items[cur]); return; }
      if (e.key === "h") { e.preventDefault(); back(); return; }
      if (e.key === "g") { e.preventDefault(); cursor(0); return; }
      if (e.key === "G") { e.preventDefault(); cursor(items.length - 1); return; }
      return;
    }

    if (e.key === "j" || e.key === "J") { var n = $(".nextprev .next"); if (n) location.href = n.getAttribute("href"); return; }
    if (e.key === "k" || e.key === "K") { var p = $(".nextprev .prev"); if (p) location.href = p.getAttribute("href"); return; }
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
