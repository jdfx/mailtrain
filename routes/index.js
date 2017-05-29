'use strict';

let express = require('express');
let router = new express.Router();
let _ = require('../lib/translate')._;
let path = require('path');


/* GET home page. */
router.get('/', (req, res) => {
    res.render('index', {
        indexPage: true,
        title: _('Self Hosted Newsletter App')
    });
});

module.exports = router;
