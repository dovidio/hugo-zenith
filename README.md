# Zenith

A Hugo theme for a blog that reads like a file. Posts are shown in a **file tree**, the
front matter is rendered as the **comment block** it is, code sits on a tonal band with a
gutter of line numbers, and the whole page is set in the same three voices and the same six
palettes as [zenith](https://github.com/dovidio/zenith), the native reader it came from.

It carries the app's tools, on the web: a fuzzy **finder** for posts (`/` or `⌘P`), a
**file tree** you can drive from the keyboard (`tab`, `j k`, `l`, `h`), **zen mode** (`Z`),
a **focus lens** (`f`), the **source** of the page (`x`), **distilled code** (`d`), six
**themes** (`1`–`6`), type size (`-`/`=`), and `?` for the key map. No dependencies, no
build step of its own, no webfonts, no icons, no images.

## Install

As a git submodule, which is how a theme is usually shared:

```sh
git submodule add https://github.com/dovidio/hugo-zenith themes/zenith
```

Or as a Hugo module:

```sh
hugo mod init github.com/you/yoursite
hugo mod get github.com/dovidio/hugo-zenith
```

Then in your `hugo.toml`:

```toml
theme = "zenith"

[markup.highlight]
  noClasses = false   # the tones are applied by class
  useClasses = true
  lineNos = true      # the gutter
  lineNumbersInTable = false

[params]
  readingTime = true
  wordCount = true
```

## The ink

`assets/css/zenith.css` is **generated** — it is the same palette the native app draws
with, emitted as CSS:

```sh
zenith --css > themes/zenith/assets/css/zenith.css
```

Six palettes, named for places: **Lugano**, **Maionese**, **Bibione**, **Kununurra**,
**Panittha**, **Newsprint**. A reader picks one with `1`–`6` and it is remembered; the two
lamplit palettes also stand behind `prefers-color-scheme: dark`. The theme's own layout
lives in `assets/css/theme.css` and names no colour at all — everything comes from custom
properties, so the two files never have to be reconciled.

## What it expects

- Content in a section called `post` (`mainSections = ["post"]`).
- Chroma classes rather than inline styles, and line numbers, as configured above.
- A `content/_index.md` for the home page, which is rendered as the README of the tree.
- Translations: `en` and `it` ship with the theme; anything else falls back to the keys in
  `i18n/en.toml`.

## Try it

```sh
hugo server -s exampleSite
```

`exampleSite/themes/zenith` is a relative symlink back to the theme, so the demo builds
from a fresh clone with no flags and no install step.

## Licence

MIT.
