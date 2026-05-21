import { Router } from "express";
import multer from "multer";
import { importCsv } from "../controllers/importController.js";
import { requireAuth } from "../utils/auth.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/", requireAuth, upload.single("file"), importCsv);

export default router;
