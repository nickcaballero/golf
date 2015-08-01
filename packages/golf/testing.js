var global = this;

Mocha.process.stdout.write = function() {
    console.log('stdout', arguments);
};

Mocha.Runner.immediately = function(fn) {
    setTimeout(fn, 0);
};

global.makeMochaInstance = function() {
    var mochaInstance = new Mocha({
        reporter: 'html'
    });

    // The BDD UI is registered by default, but no UI will be functional in the
    // browser without an explicit call to the overridden `mocha.ui` (see below).
    // Ensure that this default UI does not expose its methods to the global scope.
    mochaInstance.suite.removeAllListeners('pre-require');

    /**
     * Function to allow assertion libraries to throw errors directly into mocha.
     * This is useful when running tests in a browser because window.onerror will
     * only receive the 'message' attribute of the Error.
     */
    mochaInstance.throwError = function(err) {
        Mocha.utils.forEach(uncaughtExceptionHandlers, function(fn) {
            fn(err);
        });
        throw err;
    };

    /**
     * Override ui to ensure that the ui functions are initialized.
     * Normally this would happen in Mocha.prototype.loadFiles.
     */
    mochaInstance.api = {};
    mochaInstance.ui = function(ui) {
        Mocha.prototype.ui.call(this, ui);
        this.suite.emit('pre-require', this.api, null, this);
        return this;
    };

    /**
     * Setup mocha with the given setting options.
     */
    mochaInstance.setup = function(opts) {
        if ('string' == typeof opts) opts = {
            ui: opts
        };
        for (var opt in opts) this[opt](opts[opt]);
        return this;
    };

    /**
     * Run mocha, returning the Runner.
     */
    mochaInstance.run = function(fn) {
        var options = mochaInstance.options;
        mochaInstance.globals('location');

        var query = Mocha.utils.parseQuery(global.location.search || '');
        if (query.grep) mochaInstance.grep(query.grep);
        if (query.invert) mochaInstance.invert();

        return Mocha.prototype.run.call(mochaInstance, function() {
            if (fn) fn();
        });
    };

    mochaInstance.jsRun = function(fn) {
        var write = Mocha.process.stdout.write;
        Mocha.process.stdout.write = function(json) {
            fn(JSON.parse(json));
            Mocha.process.stdout.write = write;
        };
        var runner = mochaInstance.run();
        return runner;
    };

    return mochaInstance;
};