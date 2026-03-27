// middleware/auth_middleware.js
import jwt from "jsonwebtoken";

// ✅ Verify JWT token and attach decoded user to req.user
const authMiddleware = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  const token = authHeader.split(" ")[1].trim();
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    return next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    return res.status(401).json({ message: "Token is not valid" });
  }
};

// 🔐 Role-based access control middleware
// Usage: requireRole('seeker') or requireRole('provider')
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied. Required role: ${roles.join(" or ")}`,
    });
  }
  next();
};

export default authMiddleware;