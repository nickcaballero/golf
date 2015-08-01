Package.describe({
    summary: 'External Libraries'
});

Npm.depends({
    'angular-ui-ace': '0.2.3',
    'brace': '0.5.1',
    'uglify-js': '2.4.24',
    'js-beautify': '1.5.10',
    'lodash': '3.10.0',
    'mocha': '2.2.5',
    'chai': '3.2.0'
});

Package.onUse(function(api) {
    api.use('cosmos:browserify@0.4.0', 'client');
    api.addFiles([
        'client.browserify.js',
        '.npm/package/node_modules/mocha/mocha.js',
        'expose.js'
    ], 'client');
});