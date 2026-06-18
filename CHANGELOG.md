# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-18

A modernized fork of [`webpack-strip-block`](https://github.com/jballant/webpack-strip-block),
rebuilt for webpack 5 and published as `modern-webpack-strip-block`.

### Changed (Breaking)

- **Renamed** the package `webpack-strip-block` → `modern-webpack-strip-block`. The default
  replacement marker is now `modern-webpack-strip-block:removed`.
- **webpack 5 required.** Dropped webpack 2–4 support; the peer dependency is now `webpack ^5.0.0`.
- **Node.js ≥ 14 required** (`engines`).
- **`replacementText` is now emitted literally.** It was previously regex-escaped, which mangled
  backslashes and special characters in the output.

### Added

- **`blocks`** — an array of independent block rules, each able to override the top-level defaults.
  An explicit empty array (`blocks: []`) strips nothing.
- **`prefix` / `postfix`** — custom comment delimiters, enabling line-comment markers
  (`prefix: '//'`, `postfix: ''`).
- **`strip` + `env`** — environment-specific stripping. `strip` accepts a `string`, `string[]`, or
  `boolean`; blocks are kept or removed by matching against `env`.
- **Nested-block detection** — blocks that reuse the same `start`/`end` markers now throw a clear
  error instead of mis-stripping.
- **Strict option validation** with typed, namespaced error messages
  (e.g. ``option `blocks[0].start` must be a string``), including a guard against identical
  `start`/`end` markers.

### Fixed

- Removed the duplicated regex/whitespace-matcher block from the original loader and corrected
  `removeOuterWhitespace` so the replacement stays on its own line.

### Removed

- The `loader-utils` dependency — options are now read via webpack 5's native `this.getOptions()`.

### Internal

- Source rewritten to `const`/`let` with small single-purpose helpers.
- Test suite and fixtures rewritten (`example-env-blocks`, `example-nested`,
  `example-outer-whitespace`); the test compiler was updated for webpack 5 with a `memfs`
  in-memory output filesystem.
- devDependencies bumped (`mocha` 7 → 11, `webpack` 4 → 5); `memory-fs` dropped. CI,
  `.editorconfig`, and `.gitignore` updated.
- Complexity cleanup pass: simplified `shouldStripBlock`, replaced the `defaultIfUndefined` helper
  with `??`, and inlined a single-use helper (−27 lines in `index.js`).

[1.0.0]: https://github.com/arthe0/webpack-strip-block/releases/tag/v1.0.0
