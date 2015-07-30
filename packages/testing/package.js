Package.describe({
    summary: 'Golf Application Testing'
});

Npm.depends({
    'chai': '3.2.0'
});

Package.onUse(function(api) {
    api.use(['cosmos:browserify@0.4.0'], 'client');
    api.use('underscore', 'client');
    api.use('jquery', 'client');
    api.addFiles(['client.browserify.js', 'mocha.js', 'testing.js'], 'client');
});