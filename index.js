/*jslint node:true */
"use strict";

const projectName = require("./package.json").name;
const REGEX_SPECIAL_CHARS = /[-[\]{}()*+?.,\\^$\/|#]/g;

function escapeRegExp(value) {
    return String(value).replace(REGEX_SPECIAL_CHARS, "\\$&");
}

function optionError(message) {
    return new Error(projectName + ": " + message);
}

function assertStringOption(value, name) {
    if (typeof value !== "undefined" && typeof value !== "string") {
        throw optionError("option `" + name + "` must be a string");
    }
}

function assertBooleanOption(value, name) {
    if (typeof value !== "undefined" && typeof value !== "boolean") {
        throw optionError("option `" + name + "` must be a boolean");
    }
}

function assertStripOption(value, name) {
    if (typeof value === "undefined" || typeof value === "string" || typeof value === "boolean") {
        return;
    }

    if (Array.isArray(value) && value.every(function (item) {
        return typeof item === "string";
    })) {
        return;
    }

    throw optionError("option `" + name + "` must be a string, string array, boolean, or undefined");
}

function validateTopLevelOptions(options) {
    if (typeof options.blocks !== "undefined" && !Array.isArray(options.blocks)) {
        throw optionError("option `blocks` must be an array");
    }

    ["start", "end", "prefix", "postfix", "replacementText", "env"].forEach(function (name) {
        assertStringOption(options[name], name);
    });
    assertStripOption(options.strip, "strip");
    ["removeOuterWhitespace", "omitReplacementMarker"].forEach(function (name) {
        assertBooleanOption(options[name], name);
    });
}

function validateBlockOptions(block, index) {
    const prefix = "blocks[" + index + "]";

    if (!block || typeof block !== "object" || Array.isArray(block)) {
        throw optionError("option `" + prefix + "` must be an object");
    }

    ["start", "end", "prefix", "postfix", "replacementText"].forEach(function (name) {
        assertStringOption(block[name], prefix + "." + name);
    });
    assertStripOption(block.strip, prefix + ".strip");
    ["removeOuterWhitespace", "omitReplacementMarker"].forEach(function (name) {
        assertBooleanOption(block[name], prefix + "." + name);
    });
}

function normalizeBlocks(options) {
    validateTopLevelOptions(options);

    if (Array.isArray(options.blocks)) {
        return options.blocks.map(function (block, index) {
            validateBlockOptions(block, index);

            return normalizeBlock(block, options);
        });
    }

    return [normalizeBlock({}, options)];
}

function normalizeBlock(block, options) {
    const normalized = {
        start: block.start ?? options.start ?? "develblock:start",
        end: block.end ?? options.end ?? "develblock:end",
        prefix: block.prefix ?? options.prefix ?? "/*",
        postfix: block.postfix ?? options.postfix ?? "*/",
        strip: block.strip ?? options.strip,
        removeOuterWhitespace: (block.removeOuterWhitespace ?? options.removeOuterWhitespace) === true,
        omitReplacementMarker: (block.omitReplacementMarker ?? options.omitReplacementMarker) === true,
        replacementText: block.replacementText ?? options.replacementText
    };

    if (normalized.start === normalized.end) {
        throw optionError("block `start` and `end` markers must be different");
    }

    return normalized;
}

function shouldStripBlock(block, env) {
    const strip = block.strip;

    if (typeof strip === "boolean") {
        return strip;
    }

    if (Array.isArray(strip)) {
        return strip.includes(env);
    }

    if (typeof strip === "string") {
        return strip === env;
    }

    return true;
}

function createMarkerPattern(block, markerPattern) {
    const tailPattern = (block.postfix === "")
        ? "[\\t ]*(?=\\s|$)"
        : " ?" + escapeRegExp(block.postfix);

    return escapeRegExp(block.prefix) + " ?" + markerPattern + tailPattern;
}

function createStripPattern(block) {
    let startWhitespaceMatcher = "";
    let endWhitespaceMatcher = "";
    const whitespaceMatcher = "[\\t ]*";

    if (block.removeOuterWhitespace) {
        startWhitespaceMatcher = "(^" + whitespaceMatcher + ")?";
        endWhitespaceMatcher = "(" + whitespaceMatcher + "\\r?\\n?)?";
    }

    return new RegExp(startWhitespaceMatcher +
        createMarkerPattern(block, escapeRegExp(block.start)) +
        "[\\s\\S]*?" +
        createMarkerPattern(block, escapeRegExp(block.end)) +
        endWhitespaceMatcher, "gm");
}

function replaceBlock(content, block) {
    return content.replace(createStripPattern(block), function (match, leadingWhitespace, trailingWhitespace) {
        const replacement = createReplacement(block);

        if (!block.removeOuterWhitespace) {
            return replacement;
        }

        if (!replacement) {
            return "";
        }

        if (leadingWhitespace) {
            const trailingNewline = (trailingWhitespace || "").match(/\r?\n$/);

            return leadingWhitespace + replacement + (trailingNewline ? trailingNewline[0] : "");
        }

        return replacement + (trailingWhitespace || "");
    });
}

function createCombinedMarkerPattern(block) {
    const markerPatterns = [block.start, block.end].sort(function (left, right) {
        return right.length - left.length;
    }).map(escapeRegExp).join("|");

    return new RegExp(createMarkerPattern(block, "(" + markerPatterns + ")"), "g");
}

function assertNoNestedBlocks(content, block) {
    const markerRegex = createCombinedMarkerPattern(block);
    let openStartIndex = -1;
    let match;

    while ((match = markerRegex.exec(content))) {
        if (match[1] === block.start) {
            if (openStartIndex !== -1) {
                throw optionError("nested blocks using the same `start` and `end` markers are not supported");
            }

            openStartIndex = match.index;
        } else if (openStartIndex !== -1) {
            openStartIndex = -1;
        }
        // A lone `end` marker (no open `start`) is intentionally tolerated.
    }
}

function createReplacement(block) {
    const replacement = (typeof block.replacementText === "string")
        ? block.replacementText
        : (block.omitReplacementMarker ? "" : (projectName + ":removed"));

    return replacement
        ? ("/* " + replacement + " */")
        : "";
}

function stripBlockLoader(content) {
    const options = this.getOptions() || {};
    const blocks = normalizeBlocks(options);

    blocks.forEach(function (block) {
        if (shouldStripBlock(block, options.env)) {
            assertNoNestedBlocks(content, block);
            content = replaceBlock(content, block);
        }
    });

    return content;
}

module.exports = stripBlockLoader;
