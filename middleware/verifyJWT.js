// server/middleware/verifyJWT.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export default function verifyJWT(req, res, next) {
  try {
    // Header name can be lowercase or capitalized depending on client
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: no token provided" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error("JWT verify error:", err.message);
        return res.status(401).json({ message: "Unauthorized: invalid token" });
      }

      // Attach decoded data to req.user for later use
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        status: decoded.status,
      };

      next();
    });
  } catch (error) {
    console.error("verifyJWT middleware error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
}
