function runForEnv() {
    const base = 'base';
    // debug:start
    console.log('debug only');
    // debug:end
    // prod:start
    console.log('production only');
    // prod:end
    return base;
}

module.exports = runForEnv;
