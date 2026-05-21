const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const db = require('../database');

// Show registration form
exports.showRegister = (req, res) => {
  res.render('register', { csrfToken: req.csrfToken() });
};

// Handle registration
exports.handleRegister = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('register', {
      csrfToken: req.csrfToken(),
      errors: errors.array(),
      data: req.body
    });
  }

  const { email, password } = req.body;
  bcrypt.hash(password, 10, (err, hashed) => {
    if (err) return res.status(500).send('Error hashing password');

    db.query(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashed],
      (err) => {
        if (err) return res.status(500).send('Error inserting user into DB');
        res.redirect('/login');
      }
    );
  });
};

// Show login form
exports.showLogin = (req, res) => {
  res.render('login', { csrfToken: req.csrfToken() });
};

// Handle login
exports.handleLogin = (req, res) => {
  const { email, password } = req.body;
  db.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(400).render('login', {
          csrfToken: req.csrfToken(),
          error: 'Invalid email or password'
        });
      }
      const user = results[0];
      bcrypt.compare(password, user.password, (err, match) => {
        if (err || !match) {
          return res.status(400).render('login', {
            csrfToken: req.csrfToken(),
            error: 'Invalid email or password'
          });
        }

        req.session.user = user;
        if (user.admin) {
          return res.redirect('/admin');
        }
        res.redirect('/');
      });
    }
  );
};

// Logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
};

// Change PWD
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.session.user;

  if (!user) return res.status(403).send('Not authenticated');

  try {
      const [rows] = await db.query('SELECT password FROM users WHERE email = ?', [user.email]);
      const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
      if (!isMatch) return res.status(400).send('Current password is incorrect');

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedNewPassword, user.email]);

      req.session.destroy();
      res.redirect('/login');
  } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
  }
};
