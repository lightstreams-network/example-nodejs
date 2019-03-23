const express = require('express');
const router = express.Router();
const fs = require('fs');

router.get('/', function(req, res, next) {
    res.render('index', { title: 'Lightstreams demo' });
});

router.use('/auth', require('./auth'));
router.use('/wallet', require('./wallet'));
router.use('/artist', require('./artist'));

module.exports = router;