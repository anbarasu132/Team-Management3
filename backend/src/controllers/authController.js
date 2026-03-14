const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/db');
const { getPermissionsForRole } = require('../config/permissions');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
  body('role').isIn(['leader', 'participant']).withMessage('Role must be leader or participant')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (name, email, password, role, team_id) VALUES (?, ?, ?, ?, NULL)',
      [name, email, hashed, role]
    );

    return res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query('SELECT id, name, email, password, role, team_id FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    return next(error);
  }
}

async function googleLogin(req, res, next) {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: 'Google auth is not configured' });
    }

    const { credential, role, mode } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(400).json({ message: 'Google account email not available' });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || payload.given_name || 'Google User';
    const googleId = payload.sub;

    const [rows] = await db.query(
      'SELECT id, name, email, role, team_id, google_id FROM users WHERE email = ?',
      [email]
    );

    let user = rows[0];
    if (user && mode === 'register') {
      return res.status(409).json({ message: 'Email already in use' });
    }

    if (!user) {
      const requestedRole = role === 'leader' ? 'leader' : 'participant';
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashed = await bcrypt.hash(randomPassword, 10);
      await db.query(
        'INSERT INTO users (name, email, password, role, team_id, google_id) VALUES (?, ?, ?, ?, NULL, ?)',
        [name, email, hashed, requestedRole, googleId]
      );

      const [createdRows] = await db.query(
        'SELECT id, name, email, role, team_id, google_id FROM users WHERE email = ?',
        [email]
      );
      user = createdRows[0];
    } else if (!user.google_id && googleId) {
      await db.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, user.id]);
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    return next(error);
  }
}

function buildAuthResponse(user) {
  const token = jwt.sign(
    { id: user.id, role: user.role, team_id: user.team_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      team_id: user.team_id,
      permissions: getPermissionsForRole(user.role)
    },
    permissions: getPermissionsForRole(user.role)
  };
}

module.exports = {
  register,
  login,
  googleLogin,
  registerValidation,
  loginValidation
};
