import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import animeRoutes from "./routes/animeRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import importRoutes from "./routes/importRoutes.js";
import anilistRoutes from "./routes/anilistRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const ALLOWED_ORIGINS = CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "1mb" }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/health", (req, res) => {
  res.json({ ok: true, name: "AniLog API" });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/import", importRoutes);
app.use("/api/anilist", anilistRoutes);
app.use("/api/anime", animeRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Something went wrong." });
});

const start = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("Missing MONGODB_URI in .env");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("Missing JWT_SECRET in .env");
    }
    await mongoose.connect(mongoUri, { dbName: process.env.DB_NAME || "eplog" });
    app.listen(PORT, () => {
      console.log(`AniLog API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

start();
