Package.describe({
    summary: 'Golf Application',
    documentation: null
});

Package.onUse(function(api) {
    api.use('urigo:angular', 'client');
    api.use('mongo');
    api.use(['accounts-base', 'accounts-google', 'service-configuration']);
    api.use('ian:accounts-ui-bootstrap-3@1.2.76', 'client');
    api.use('ext-libs', 'client');
    api.addFiles('collections.js');
    api.addFiles('server.js', 'server');
    api.addFiles('main.js', 'client');
});