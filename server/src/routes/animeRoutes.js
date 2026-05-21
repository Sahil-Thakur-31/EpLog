import { Router } from "express";
import {
  listAnime,
  getAnime,
  createAnime,
  createFromAniList,
  updateAnime,
  deleteAnime,
} from "../controllers/animeController.js";
import { requireAuth } from "../utils/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", listAnime);
router.post("/", createAnime);
router.post("/from-anilist", createFromAniList);
router.get("/:id", getAnime);
router.put("/:id", updateAnime);
router.delete("/:id", deleteAnime);

export default router;
