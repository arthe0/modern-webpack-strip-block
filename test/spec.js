const fs = require('fs');
const path = require('path');
const testCompiler = require('./test-compiler.js');
const assert = require('assert');

const DEFAULT_MARKER = 'modern-webpack-strip-block:removed';

const EXPECTED_OUTPUT_BASIC_CASE = `
/* this comment should not be removed */
module.exports = function addOne(num) {
    const one = 1;
    /* ${DEFAULT_MARKER} */
    return num + one;
}`;

const EXPECTED_OUTPUT_CUSTOM_TAGS = `
const ONE_STR = 1;
/**
 * @returns {number} The number plus two
 */
const addTwo = (num = 0) => {
    // this comment should not be removed
    const one = parseInt(TWO_STR, 10);
    /* ${DEFAULT_MARKER} */
    const numPlusOne = num + one;
    /* ${DEFAULT_MARKER} */
    const numPlusTwo = numPlusOne + one;
    return numPlusTwo;
};

module.exports = addTwo;`;

const EXPECTED_OUTPUT_INLINE = `function addThree(num) {
    const arr = '1 1 1'.split(' ');
    const three = arr.reduce((acc, el) => {
        return acc + /* ${DEFAULT_MARKER} */ parseInt(el, 10);
    }, 0);
    return num + three;
}

module.exports = addThree;
`;

const EXPECTED_OUTPUT_INLINE_REGEX_CHARS_DOT = `class TestRegexChars {
    usingDot() {
        /* ${DEFAULT_MARKER} */
        return 1 + /* ${DEFAULT_MARKER} */ 1;
    }
    usingPlus() {
        /* DEV+START */ console.log('should vanish'); /* DEV+END */
        return 1 + /* DEV+START */ 0 + /* DEV+END */ 1;
    }
    usingBackslash() {
        /* DEV\\START */ console.log('should vanish'); /* DEV\\END */
        return 1 + /* DEV\\START */ 0 + /* DEV\\END */ 1;
    }
    usingDollarSign() {
        /* DEV$START */ console.log('should vanish'); /* DEV$END */
        return 1 + /* DEV$START */ 0 + /* DEV$END */ 1;
    }
}`;

const EXPECTED_OUTPUT_INLINE_REGEX_CHARS_PLUS = `class TestRegexChars {
    usingDot() {
        /* DEV.START */ console.log('should vanish'); /* DEV.END */
        return 1 + /* DEV.START */ 0 + /* DEV.END */ 1;
    }
    usingPlus() {
        /* ${DEFAULT_MARKER} */
        return 1 + /* ${DEFAULT_MARKER} */ 1;
    }
    usingBackslash() {
        /* DEV\\START */ console.log('should vanish'); /* DEV\\END */
        return 1 + /* DEV\\START */ 0 + /* DEV\\END */ 1;
    }
    usingDollarSign() {
        /* DEV$START */ console.log('should vanish'); /* DEV$END */
        return 1 + /* DEV$START */ 0 + /* DEV$END */ 1;
    }
}`;

const EXPECTED_OUTPUT_INLINE_REGEX_CHARS_BACKSLASH = `class TestRegexChars {
    usingDot() {
        /* DEV.START */ console.log('should vanish'); /* DEV.END */
        return 1 + /* DEV.START */ 0 + /* DEV.END */ 1;
    }
    usingPlus() {
        /* DEV+START */ console.log('should vanish'); /* DEV+END */
        return 1 + /* DEV+START */ 0 + /* DEV+END */ 1;
    }
    usingBackslash() {
        /* ${DEFAULT_MARKER} */
        return 1 + /* ${DEFAULT_MARKER} */ 1;
    }
    usingDollarSign() {
        /* DEV$START */ console.log('should vanish'); /* DEV$END */
        return 1 + /* DEV$START */ 0 + /* DEV$END */ 1;
    }
}`;

const EXPECTED_OUTPUT_INLINE_REGEX_CHARS_DOLLAR = `class TestRegexChars {
    usingDot() {
        /* DEV.START */ console.log('should vanish'); /* DEV.END */
        return 1 + /* DEV.START */ 0 + /* DEV.END */ 1;
    }
    usingPlus() {
        /* DEV+START */ console.log('should vanish'); /* DEV+END */
        return 1 + /* DEV+START */ 0 + /* DEV+END */ 1;
    }
    usingBackslash() {
        /* DEV\\START */ console.log('should vanish'); /* DEV\\END */
        return 1 + /* DEV\\START */ 0 + /* DEV\\END */ 1;
    }
    usingDollarSign() {
        /* ${DEFAULT_MARKER} */
        return 1 + /* ${DEFAULT_MARKER} */ 1;
    }
}`;

const EXPECTED_OUTPUT_OUTER_WHITESPACE = `function addFour(num) {
    const one = 1;
    /* ${DEFAULT_MARKER} */
    return num + one + 3;
}

module.exports = addFour;
`;

const EXPECTED_OUTPUT_OUTER_WHITESPACE_OMIT_MARKER = `function addFour(num) {
    const one = 1;
    return num + one + 3;
}

module.exports = addFour;
`;

const EXPECTED_OUTPUT_CUSTOM_REPLACEMENT_TEXT = `function addThree(num) {
    const arr = '1 1 1'.split(' ');
    const three = arr.reduce((acc, el) => {
        return acc + /* A.B+$&\\slash */ parseInt(el, 10);
    }, 0);
    return num + three;
}

module.exports = addThree;
`;

const EXPECTED_OUTPUT_OMIT_REPLACEMENT_MARKER = `function addThree(num) {
    const arr = '1 1 1'.split(' ');
    const three = arr.reduce((acc, el) => {
        return acc +  parseInt(el, 10);
    }, 0);
    return num + three;
}

module.exports = addThree;
`;

const EXPECTED_OUTPUT_ENV_BLOCKS_PRODUCTION = `function runForEnv() {
    const base = 'base';
    /* ${DEFAULT_MARKER} */
    // prod:start
    console.log('production only');
    // prod:end
    return base;
}

module.exports = runForEnv;
`;

const EXPECTED_OUTPUT_ENV_BLOCKS_DEVELOPMENT = `function runForEnv() {
    const base = 'base';
    // debug:start
    console.log('debug only');
    // debug:end
    /* ${DEFAULT_MARKER} */
    return base;
}

module.exports = runForEnv;
`;

function fixtureSource(fixture) {
    return fs.readFileSync(path.join(__dirname, fixture + '.js'), 'utf8');
}

describe('modern-webpack-strip-block', () => {
    describe('basic case', () => {
        it('removes the appropriate block and leaves other code unchanged', async () => {
            const stats = await testCompiler('fixtures/example-basic-case');
            const output = stats.toJson({ source: true }).modules[0].source;
            assert.strictEqual(output, EXPECTED_OUTPUT_BASIC_CASE);
        });
    });

    describe('using custom tags', () => {
        it('removes the appropriate block and leaves other code unchanged', async () => {
            const stats = await testCompiler('fixtures/example-custom-tags', {
                options: {
                    start: 'webpack strip block - start',
                    end: 'webpack strip block - end'
                }
            });
            const output = stats.toJson({ source: true }).modules[0].source;
            assert.strictEqual(output, EXPECTED_OUTPUT_CUSTOM_TAGS);
        });
    });

    describe('using inline blocks', () => {
        it('removes the appropriate block and leaves other code unchanged', async () => {
            const stats = await testCompiler('fixtures/example-inline', {
                options: {
                    start: 'DEV:START',
                    end: 'DEV:END'
                }
            });
            const output = stats.toJson({ source: true }).modules[0].source;
            assert.strictEqual(output, EXPECTED_OUTPUT_INLINE);
        });

        it('keeps custom replacement text literal', async () => {
            const stats = await testCompiler('fixtures/example-inline', {
                options: {
                    start: 'DEV:START',
                    end: 'DEV:END',
                    replacementText: 'A.B+$&\\slash'
                }
            });
            const output = stats.toJson({ source: true }).modules[0].source;
            assert.strictEqual(output, EXPECTED_OUTPUT_CUSTOM_REPLACEMENT_TEXT);
        });

        it('can omit the replacement marker', async () => {
            const stats = await testCompiler('fixtures/example-inline', {
                options: {
                    start: 'DEV:START',
                    end: 'DEV:END',
                    omitReplacementMarker: true
                }
            });
            const output = stats.toJson({ source: true }).modules[0].source;
            assert.strictEqual(output, EXPECTED_OUTPUT_OMIT_REPLACEMENT_MARKER);
        });

        describe('using regex chars in tags', () => {
            const runUsingDevblockWith = async (char) => {
                const stats = await testCompiler('fixtures/example-regex-chars', {
                    options: {
                        start: `DEV${char}START`,
                        end: `DEV${char}END`
                    }
                });
                return stats.toJson({ source: true }).modules[0].source;
            };

            it('removes the appropriate dot-delimited block', async () => {
                const output = await runUsingDevblockWith('.');
                assert.strictEqual(output, EXPECTED_OUTPUT_INLINE_REGEX_CHARS_DOT);
            });

            it('removes the appropriate plus-delimited block', async () => {
                const output = await runUsingDevblockWith('+');
                assert.strictEqual(output, EXPECTED_OUTPUT_INLINE_REGEX_CHARS_PLUS);
            });

            it('removes the appropriate backslash-delimited block', async () => {
                const output = await runUsingDevblockWith('\\');
                assert.strictEqual(output, EXPECTED_OUTPUT_INLINE_REGEX_CHARS_BACKSLASH);
            });

            it('removes the appropriate dollar-delimited block', async () => {
                const output = await runUsingDevblockWith('$');
                assert.strictEqual(output, EXPECTED_OUTPUT_INLINE_REGEX_CHARS_DOLLAR);
            });
        });
    });

    describe('removing outer whitespace', () => {
        it('removes the appropriate block and keeps replacement on its own line', async () => {
            const stats = await testCompiler('fixtures/example-outer-whitespace', {
                options: {
                    start: 'DEV:START',
                    end: 'DEV:END',
                    removeOuterWhitespace: true
                }
            });
            const output = stats.toJson({ source: true }).modules[0].source;
            assert.strictEqual(output, EXPECTED_OUTPUT_OUTER_WHITESPACE);
        });

        it('removes outer whitespace when omitting the replacement marker', async () => {
            const stats = await testCompiler('fixtures/example-outer-whitespace', {
                options: {
                    start: 'DEV:START',
                    end: 'DEV:END',
                    removeOuterWhitespace: true,
                    omitReplacementMarker: true
                }
            });
            const output = stats.toJson({ source: true }).modules[0].source;
            assert.strictEqual(output, EXPECTED_OUTPUT_OUTER_WHITESPACE_OMIT_MARKER);
        });
    });

    describe('using env-specific blocks', () => {
        const runUsingEnv = async (env) => {
            const stats = await testCompiler('fixtures/example-env-blocks', {
                options: {
                    env,
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
            });
            return stats.toJson({ source: true }).modules[0].source;
        };

        it('strips debug blocks for production', async () => {
            const output = await runUsingEnv('production');
            assert.strictEqual(output, EXPECTED_OUTPUT_ENV_BLOCKS_PRODUCTION);
        });

        it('strips production blocks for development', async () => {
            const output = await runUsingEnv('development');
            assert.strictEqual(output, EXPECTED_OUTPUT_ENV_BLOCKS_DEVELOPMENT);
        });
    });

    describe('using explicit block lists', () => {
        it('does not strip anything when blocks is empty', async () => {
            const stats = await testCompiler('fixtures/example-basic-case', {
                options: {
                    blocks: []
                }
            });
            const output = stats.toJson({ source: true }).modules[0].source;
            assert.strictEqual(output, fixtureSource('fixtures/example-basic-case'));
        });
    });

    describe('invalid configuration', () => {
        it('rejects nested same-tag blocks', async () => {
            await assert.rejects(
                testCompiler('fixtures/example-nested'),
                /nested blocks using the same `start` and `end` markers are not supported/
            );
        });

        it('rejects non-array blocks', async () => {
            await assert.rejects(
                testCompiler('fixtures/example-basic-case', {
                    options: {
                        blocks: 'debug'
                    }
                }),
                /option `blocks` must be an array/
            );
        });

        it('rejects malformed block entries', async () => {
            await assert.rejects(
                testCompiler('fixtures/example-basic-case', {
                    options: {
                        blocks: [null]
                    }
                }),
                /option `blocks\[0\]` must be an object/
            );
        });

        it('rejects malformed strip options', async () => {
            await assert.rejects(
                testCompiler('fixtures/example-basic-case', {
                    options: {
                        strip: ['production', true]
                    }
                }),
                /option `strip` must be a string, string array, boolean, or undefined/
            );
        });

        it('rejects equal start and end markers', async () => {
            await assert.rejects(
                testCompiler('fixtures/example-basic-case', {
                    options: {
                        start: 'develblock:start',
                        end: 'develblock:start'
                    }
                }),
                /block `start` and `end` markers must be different/
            );
        });

        it('rejects a non-string env', async () => {
            await assert.rejects(
                testCompiler('fixtures/example-basic-case', {
                    options: {
                        env: 123
                    }
                }),
                /option `env` must be a string/
            );
        });

        it('rejects a non-boolean removeOuterWhitespace', async () => {
            await assert.rejects(
                testCompiler('fixtures/example-basic-case', {
                    options: {
                        removeOuterWhitespace: 'yes'
                    }
                }),
                /option `removeOuterWhitespace` must be a boolean/
            );
        });

        it('rejects a non-boolean omitReplacementMarker', async () => {
            await assert.rejects(
                testCompiler('fixtures/example-basic-case', {
                    options: {
                        omitReplacementMarker: 1
                    }
                }),
                /option `omitReplacementMarker` must be a boolean/
            );
        });
    });
});
