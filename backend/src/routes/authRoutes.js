const express = require('express');
const { register, login, googleLogin, registerValidation, loginValidation } = require('../controllers/authController');
const validate = require('../middleware/validate');

const router = express.Router();

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/google', googleLogin);

module.exports = router;
