const path = require('path');
const webpack = require('webpack');
const { createFsFromVolume, Volume } = require('memfs');

// Webpack's output filesystem needs a `join` method that memfs does not provide.
// Joining with Node's `path` module is sufficient for these in-memory test builds.
function joinPath(rootPath, ...paths) {
    return path.join(rootPath, ...paths);
}

function ensureWebpackMemoryFs(fs) {
    // Return it as-is when it already exposes Webpack's `join` method.
    if (fs.join) {
        return fs;
    }

    // Create an FS proxy that adds `join` to memfs without mutating the original.
    const nextFs = Object.create(fs);
    nextFs.join = joinPath;

    return nextFs;
}

function createStatsError(stats) {
    const errors = stats.toJson({ all: false, errors: true }).errors;
    const message = errors.map((error) => error.message || String(error)).join('\n');

    return new Error(message);
}

module.exports = function testCompiler(fixture, useParams = {}) {
    const compiler = webpack({
        mode: 'none',
        context: __dirname,
        entry: `./${fixture}`,
        output: {
            path: path.resolve(__dirname),
            filename: 'bundle.js',
        },
        module: {
            rules: [{
                test: /\.js$/,
                use: {
                    loader: path.resolve(__dirname, '../index.js'),
                    ...useParams
                }
            }]
        }
    });

    // create in-memory fs for testing
    let webpackFs = createFsFromVolume(new Volume());
    webpackFs = ensureWebpackMemoryFs(webpackFs);
    compiler.outputFileSystem = webpackFs;

    return new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
            compiler.close((closeErr) => {
                if (err) {
                    return reject(err);
                }

                if (closeErr) {
                    return reject(closeErr);
                }

                if (stats.hasErrors()) {
                    return reject(createStatsError(stats));
                }

                return resolve(stats);
            });
        });
    });
};
