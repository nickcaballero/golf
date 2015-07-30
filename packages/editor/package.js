Package.describe({
    summary: 'Golf Application Code Editor'
});

Npm.depends({
    'angular-ui-ace': '0.2.3',
    'brace': '0.5.1',
    'uglify-js': '2.4.24'
});

Package.onUse(function(api) {
  api.use(['cosmos:browserify@0.4.0'], 'client');
  api.addFiles(['client.browserify.js', 'editor.js'], 'client');
});