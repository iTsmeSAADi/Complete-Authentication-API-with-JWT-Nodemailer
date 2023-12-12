import jwt from 'jsonwebtoken';
import user_model from '../models/user_model.js';

const check_auth = async (req, res, next) => {
  const { authorization } = req.headers;

  try {
    if (!authorization || !authorization.startsWith('Bearer')) {
      return res.status(401).json({
        STATUS: "ERROR",
        MESSAGE: "Unauthorized - Missing or invalid Authorization header",
      });
    }

    const token = authorization.replace("Bearer ", "");
    const secret_key = process.env.JWT_SECRET_KEY;

    const decoded = jwt.verify(token, secret_key);

    const user = await user_model.findOne({ _id: decoded.user_id }).select('-password');

    if (!user) {
      return res.status(401).json({
        STATUS: "ERROR",
        MESSAGE: "Unauthorized - User not found",
      });
    }

    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error("Error verifying token:", error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        STATUS: "ERROR",
        MESSAGE: "Unauthorized - Token has expired",
      });
    }

    return res.status(401).json({
      STATUS: "ERROR",
      MESSAGE: "Unauthorized - Invalid token",
      ERROR_DESCRIPTION: error.message,
    });
  }
};

export default check_auth;
