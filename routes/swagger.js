'use strict';

let express = require('express');
let router = new express.Router();
let _ = require('../lib/translate')._;
let path = require('path');

/* GET swagger docs */
router.get('/', (req, res) => {
    res.sendFile(path.resolve('api-docs/index.html'));
});

router.get('/swagger-ui-bundle.js', (req, res) => {
    res.sendFile(path.resolve('api-docs/swagger-ui-bundle.js'));
});

router.get('/swagger-ui-standalone-preset.js', (req, res) => {
    res.sendFile(path.resolve('api-docs/swagger-ui-standalone-preset.js'));
});

router.get('/swagger-ui.css ', (req, res) => {
    res.sendFile(path.resolve('api-docs/swagger-ui.css'));
});

router.get('/api-docs.json', (req, res) => {
    res.sendFile(path.resolve('api-docs/api-docs.json'));
});

module.exports = router;
