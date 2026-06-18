Modern Webpack Strip Block
==========================

Webpack 5 loader to strip blocks of code marked by comment tags. It is useful for removing development-only checks, logging, diagnostics, or environment-specific code from bundled output.

This package is a modernized fork of the original [`jballant/webpack-strip-block`](https://github.com/jballant/webpack-strip-block) project. It keeps the same basic marker-based behavior while updating the package identity, webpack 5 option API, tests, validation, and documented edge cases.

## Installation

```bash
npm install --save-dev modern-webpack-strip-block
```

## Basic usage

In your source:

```javascript
function makeFoo(bar, baz) {
    /* develblock:start */
    if (bar instanceof Bar !== true) {
        throw new Error('makeFoo: bar param must be an instance of Bar');
    }
    /* develblock:end */

    return new Foo(bar, baz);
}
```

In your webpack config:

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        exclude: /(node_modules|bower_components|\.spec\.js)/,
        use: [
          {
            loader: 'modern-webpack-strip-block'
          }
        ]
      }
    ]
  }
};
```

The default replacement is:

```javascript
/* modern-webpack-strip-block:removed */
```

## Custom tags

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: [
          {
            loader: 'modern-webpack-strip-block',
            options: {
              start: 'DEV-START',
              end: 'DEV-END'
            }
          }
        ]
      }
    ]
  }
};
```

Then mark blocks like this:

```javascript
/* DEV-START */
console.log('removed by modern-webpack-strip-block');
/* DEV-END */
```

## Line-comment markers

Set `prefix` to `'//'` and `postfix` to `''`:

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: [
          {
            loader: 'modern-webpack-strip-block',
            options: {
              prefix: '//',
              postfix: '',
              start: 'DEV-START',
              end: 'DEV-END'
            }
          }
        ]
      }
    ]
  }
};
```

```javascript
// DEV-START
console.log('removed by modern-webpack-strip-block');
// DEV-END
```

## Multiple and environment-specific blocks

Use `blocks` to configure several marker pairs. Top-level options are inherited by each block unless the block overrides them.

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: [
          {
            loader: 'modern-webpack-strip-block',
            options: {
              env: process.env.NODE_ENV,
              prefix: '//',
              postfix: '',
              blocks: [
                {
                  start: 'debug:start',
                  end: 'debug:end',
                  strip: 'production'
                },
                {
                  start: 'prod:start',
                  end: 'prod:end',
                  strip: ['development', 'test']
                }
              ]
            }
          }
        ]
      }
    ]
  }
};
```

`strip` can be a string, an array of strings, `true`, or `false`. If `strip` is omitted, the block is always stripped.

When `blocks` is omitted, the default `develblock:start` / `develblock:end` rule is used. When `blocks: []` is provided, no blocks are stripped.

## Replacement output

Use `replacementText` to change the marker text:

```javascript
{
  loader: 'modern-webpack-strip-block',
  options: {
    replacementText: 'removed in production'
  }
}
```

Use `omitReplacementMarker: true`, or set `replacementText: ''`, to remove the marker completely.

`removeOuterWhitespace: true` removes indentation and trailing whitespace around stripped standalone marker blocks. This is most useful with `omitReplacementMarker` when you want removed blocks to leave no blank marker line.

## Options

All options are optional.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `start` | `string` | `'develblock:start'` | Start tag for a block when `blocks` is not used, or the default start tag inherited by each block. |
| `end` | `string` | `'develblock:end'` | End tag for a block when `blocks` is not used, or the default end tag inherited by each block. |
| `prefix` | `string` | `'/*'` | Comment prefix used before the start and end tags. Use `'//'` for line-comment tags. |
| `postfix` | `string` | `'*/'` | Comment postfix used after the start and end tags. Use `''` for line-comment tags. |
| `env` | `string` | `undefined` | Current environment value used to match `strip` rules. |
| `strip` | `string`, `string[]`, `boolean` | `undefined` | Environments where the block should be stripped. If omitted, the block is always stripped. |
| `blocks` | `object[]` | `undefined` | Multiple block rules. An explicit empty array strips nothing. |
| `removeOuterWhitespace` | `boolean` | `false` | Removes whitespace around stripped marker blocks. |
| `omitReplacementMarker` | `boolean` | `false` | Omits the replacement comment marker. |
| `replacementText` | `string` | `'modern-webpack-strip-block:removed'` | Text used inside the replacement comment. Use an empty string to remove the marker entirely. |

## Limitations

This loader is marker-based. It does not parse JavaScript syntax, so marker-looking text inside strings or template literals can also match.

Nested blocks that use the same start and end markers are rejected because the intended removal boundary is ambiguous. Use distinct marker pairs with `blocks` if you need layered removal rules.

This loader does not emit or rewrite source maps. Because it removes and adds lines, source maps produced by later steps in the build may not line up with the original source.

The replacement marker is always written as a `/* ... */` block comment, regardless of the configured `prefix`/`postfix`. This is intentional: a line comment (`//`) would comment out the rest of the line for inline blocks and could break the surrounding code.

## Compatibility

`modern-webpack-strip-block` supports webpack 5.
