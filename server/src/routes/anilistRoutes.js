import { Router } from "express";
import { search, trending, genres, discover, details } from "../controllers/anilistController.js";
import { requireAuth } from "../utils/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/search", search);
router.get("/trending", trending);
router.get("/details", details);
router.get("/discover", discover);
router.get("/genres", genres);

export default router;
