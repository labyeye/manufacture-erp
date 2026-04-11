const jwt = require('jsonwebtoken');
const User = require('../models/User');


const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.userId, isActive: true });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token or user not found' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};


const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin only.' });
  }
};


const canEdit = (tabId) => {
  return (req, res, next) => {
    if (req.user.role === 'Admin') {
      return next();
    }

    if (req.user.editableTabs === null || (Array.isArray(req.user.editableTabs) && req.user.editableTabs.includes(tabId))) {
      next();
    } else {
      res.status(403).json({ error: `You don't have permission to edit ${tabId}` });
    }
  };
};

module.exports = { auth, isAdmin, canEdit };
