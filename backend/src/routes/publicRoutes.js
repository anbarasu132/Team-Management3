const express = require('express');
const { getPublicHome } = require('../controllers/publicController');

const router = express.Router();

router.get('/home', getPublicHome);

module.exports = router;
