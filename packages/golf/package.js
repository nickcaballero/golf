Package.describe({
    summary: 'Golf Application'
});

Package.onUse(function(api) {
    api.use('urigo:angular', 'client');
    api.use('editor', 'client');
    api.use('mongo');
    api.addFiles('collections.js');
    api.addFiles('main.js', 'client');
});