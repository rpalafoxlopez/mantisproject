import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      socket.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (user) {
      socket.user = user;
    }

    next();
  } catch (error) {
    socket.user = null;
    next();
  }
};
