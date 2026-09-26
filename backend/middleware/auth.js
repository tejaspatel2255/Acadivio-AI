const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer token

    if (!token) {
      console.log('[AuthMiddleware] No token provided in header:', req.headers.authorization);
      return res.status(401).json({ error: 'No token provided' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('[AuthMiddleware] FATAL: JWT_SECRET environment variable is missing.');
      return res.status(500).json({ error: 'Server authentication misconfiguration' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      console.log('[AuthMiddleware] User not found for ID:', decoded.userId);
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log('[AuthMiddleware] Token verification failed:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      console.log(`[Auth] Access denied for user ${req.user._id} (${req.user.email}). Role: ${req.user.role}, Required: ${roles.join(',')}`);
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

const subjectAccessMiddleware = async (req, res, next) => {
  if (req.user.role === 'admin') return next(); // Admins have full access

  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Teachers only.' });
  }

  const subject = req.body.subject_name || req.query.subject_name;

  if (!subject) {
    // If no subject is specified in the request, we might need to handle it based on context
    // For now, if the endpoint requires subject validation, it should be present.
    // However, some endpoints might be generic.
    // Let's assume this middleware is used on routes where subject is critical.
    // But to be safe, if we can't determine subject, we pass, but the controller should handle it?
    // Better: If this middleware is used, subject MUST be present.
    return res.status(400).json({ error: 'Subject is required for authorization' });
  }

  // Normalize subject comparison (case-insensitive)
  const assigned = req.user.assigned_subjects.map(s => s.toLowerCase());
  if (!assigned.includes(subject.toLowerCase())) {
    return res.status(403).json({ error: `You are not authorized to manage ${subject}.` });
  }

  next();
};

module.exports = { authMiddleware, roleMiddleware, subjectAccessMiddleware };

