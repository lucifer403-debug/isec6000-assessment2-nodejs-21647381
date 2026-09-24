// Express application definition.
// The app is exported (not started here) so unit tests can load it
// without opening a network port. server.js starts the real server.
const express = require('express');

const app = express();

// Hide the "X-Powered-By: Express" header so the framework is not advertised.
app.disable('x-powered-by');

app.get('/', (req, res) => res.send('Hello World!'));

// Simple health endpoint used by tests and container health checks.
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

module.exports = app;
