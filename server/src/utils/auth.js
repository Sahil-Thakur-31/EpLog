import jwt from "jsonwebtoken";

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET in .env");
  }
  return secret;
};

export const signToken = (user) => {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, getSecret(), {
    expiresIn: "7d",
  });
};

export const requireAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Unauthorized." });
    const payload = jwt.verify(token, getSecret());
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized." });
  }
};
