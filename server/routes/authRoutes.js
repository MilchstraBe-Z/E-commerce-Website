const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');  
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Serve the registration page
router.get('/register',csrfProtection, authController.showRegister);  
router.post('/register', authController.handleRegister);

// Serve the login page
router.get('/login', csrfProtection, authController.showLogin);  
router.post('/login', authController.handleLogin);

// Logout route
router.get('/logout', authController.logout);

// Change PWD
router.post('/change-password', authController.changePassword);

module.exports = router;
