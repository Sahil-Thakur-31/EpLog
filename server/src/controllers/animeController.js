import Anime from "../models/Anime.js";
import { fetchAniListById, fetchAniListByTitle } from "../utils/anilist.js";

const allowedStatuses = new Set(["Watching", "Completed", "Planned", "Dropped"]);
const allowedPriorities = new Set(["High", "Medium", "Low"]);

const normalizeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const parseDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const pickPayload = (body = {}) => {
  const payload = {};
  const fields = [
    "title",
    "status",
    "episodesWatched",
    "totalEpisodes",
    "score",
    "priority",
    "genre",
    "notes",
    "startDate",
    "finishDate",
    "rewatches",
    "episodeLength",
    "season",
    "seasonYear",
    "customLists",
  ];

  fields.forEach((field) => {
    if (body[field] !== undefined && body[field] !== null && body[field] !== "") {
      payload[field] = body[field];
    }
  });

  if (payload.title) payload.title = payload.title.toString().trim();
  if (payload.genre) payload.genre = payload.genre.toString().trim();
  if (payload.notes) payload.notes = payload.notes.toString().trim();
  if (payload.season) payload.season = payload.season.toString().trim();
  if (payload.customLists !== undefined) {
    const listValue = Array.isArray(payload.customLists)
      ? payload.customLists
      : payload.customLists
      ? payload.customLists.toString().split(",")
      : [];
    payload.customLists = listValue
      .map((value) => value.toString().trim())
      .filter(Boolean);
  }

  if (payload.episodesWatched !== undefined) {
    payload.episodesWatched = parseNumber(payload.episodesWatched);
  }
  if (payload.totalEpisodes !== undefined) {
    payload.totalEpisodes = parseNumber(payload.totalEpisodes);
  }
  if (payload.score !== undefined) {
    payload.score = parseNumber(payload.score);
  }
  if (payload.rewatches !== undefined) {
    payload.rewatches = parseNumber(payload.rewatches);
  }
  if (payload.episodeLength !== undefined) {
    payload.episodeLength = parseNumber(payload.episodeLength);
  }
  if (payload.seasonYear !== undefined) {
    payload.seasonYear = parseNumber(payload.seasonYear);
  }
  if (payload.startDate !== undefined) {
    payload.startDate = parseDate(payload.startDate);
  }
  if (payload.finishDate !== undefined) {
    payload.finishDate = parseDate(payload.finishDate);
  }

  return payload;
};

const validatePayload = (payload, { requireTitle } = { requireTitle: false }) => {
  if (requireTitle && !payload.title) return "Title is required.";
  if (payload.status && !allowedStatuses.has(payload.status)) {
    return "Invalid status.";
  }
  if (payload.priority && !allowedPriorities.has(payload.priority)) {
    return "Invalid priority.";
  }
  if (payload.episodesWatched !== undefined && payload.episodesWatched < 0) {
    return "Episodes watched must be 0 or more.";
  }
  if (payload.totalEpisodes !== undefined && payload.totalEpisodes < 0) {
    return "Total episodes must be 0 or more.";
  }
  if (payload.score !== undefined && (payload.score < 0 || payload.score > 10)) {
    return "Score must be between 0 and 10.";
  }
  if (payload.episodeLength !== undefined && payload.episodeLength < 1) {
    return "Episode length must be at least 1 minute.";
  }
  if (payload.rewatches !== undefined && payload.rewatches < 0) {
    return "Rewatches must be 0 or more.";
  }
  return null;
};

const applyAutoStatus = (payload, current) => {
  if (payload.status) return payload;
  const episodesWatched = normalizeNumber(
    payload.episodesWatched ?? current?.episodesWatched ?? 0
  );
  const totalEpisodes = normalizeNumber(
    payload.totalEpisodes ?? current?.totalEpisodes ?? 0
  );

  if (episodesWatched <= 0) {
    return { ...payload, status: "Planned" };
  }

  if (totalEpisodes > 0 && episodesWatched >= totalEpisodes) {
    return { ...payload, status: "Completed" };
  }

  return { ...payload, status: "Watching" };
};

const enrichWithAniList = async (payload, current) => {
  if (!payload.title) return payload;

  const needsEpisodes =
    (payload.totalEpisodes ?? 0) <= 0 && (current?.totalEpisodes ?? 0) <= 0;
  const needsPoster = !payload.posterUrl && !current?.posterUrl;
  const needsTitle = !current?.anilistTitle || payload.title !== current?.title;
  const needsStatus = !current?.anilistStatus;

  if (!needsEpisodes && !needsPoster && !needsTitle && !needsStatus) {
    return payload;
  }

  const enriched = await fetchAniListByTitle(payload.title);
  if (!enriched) return payload;

  const next = { ...payload };
  if (enriched.anilistId) next.anilistId = enriched.anilistId;
  if (enriched.anilistTitle) next.anilistTitle = enriched.anilistTitle;
  if (needsPoster && enriched.posterUrl) next.posterUrl = enriched.posterUrl;
  if (needsEpisodes && enriched.totalEpisodes) {
    next.totalEpisodes = enriched.totalEpisodes;
  }
  if (needsStatus && enriched.anilistStatus) {
    next.anilistStatus = enriched.anilistStatus;
  }

  return next;
};

export const listAnime = async (req, res) => {
  try {
    const items = await Anime.find({ owner: req.user.id }).sort({ updatedAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to load anime." });
  }
};

export const getAnime = async (req, res) => {
  try {
    const item = await Anime.findOne({ _id: req.params.id, owner: req.user.id });
    if (!item) return res.status(404).json({ message: "Not found." });
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: "Invalid id." });
  }
};

export const createAnime = async (req, res) => {
  try {
    let payload = pickPayload(req.body);
    const validationError = validatePayload(payload, { requireTitle: true });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }
    if (
      payload.episodesWatched !== undefined &&
      payload.totalEpisodes !== undefined &&
      payload.totalEpisodes > 0 &&
      payload.episodesWatched > payload.totalEpisodes
    ) {
      return res.status(400).json({ message: "Episodes watched cannot exceed total episodes." });
    }

    payload = await enrichWithAniList(payload, null);
    payload = applyAutoStatus(payload, null);

    const created = await Anime.create({ ...payload, owner: req.user.id });
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to create." });
  }
};

export const createFromAniList = async (req, res) => {
  try {
    const anilistId = parseNumber(req.body.anilistId);
    if (!anilistId) {
      return res.status(400).json({ message: "AniList id is required." });
    }

    const existing = await Anime.findOne({ owner: req.user.id, anilistId });
    if (existing) {
      return res.status(409).json({ message: "Already in your list." });
    }

    const enriched = await fetchAniListById(anilistId);
    if (!enriched) {
      return res.status(404).json({ message: "Anime not found." });
    }

    const status = allowedStatuses.has(req.body.status) ? req.body.status : "Planned";
    const totalEpisodes = enriched.totalEpisodes || 0;
    let episodesWatched = 0;
    if (status === "Watching") {
      const watched = parseNumber(req.body.episodesWatched) || 0;
      episodesWatched = totalEpisodes > 0 ? Math.min(totalEpisodes, watched) : Math.max(0, watched);
    } else if (status === "Completed") {
      episodesWatched = totalEpisodes > 0 ? totalEpisodes : 0;
    }

    const created = await Anime.create({
      owner: req.user.id,
      title: enriched.anilistTitle || `AniList #${anilistId}`,
      status,
      episodesWatched,
      totalEpisodes,
      anilistId: enriched.anilistId,
      anilistTitle: enriched.anilistTitle,
      anilistStatus: enriched.anilistStatus || "",
      season: enriched.season || "",
      seasonYear: enriched.seasonYear || undefined,
      posterUrl: enriched.posterUrl,
    });

    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to add." });
  }
};

export const updateAnime = async (req, res) => {
  try {
    const current = await Anime.findOne({ _id: req.params.id, owner: req.user.id });
    if (!current) return res.status(404).json({ message: "Not found." });

    let payload = pickPayload(req.body);
    if (!Object.keys(payload).length) {
      return res.status(400).json({ message: "No valid fields to update." });
    }
    const validationError = validatePayload(payload, { requireTitle: false });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }
    const totalEpisodes = payload.totalEpisodes ?? current.totalEpisodes ?? 0;
    if (
      payload.episodesWatched !== undefined &&
      totalEpisodes > 0 &&
      payload.episodesWatched > totalEpisodes
    ) {
      return res.status(400).json({ message: "Episodes watched cannot exceed total episodes." });
    }

    payload = await enrichWithAniList(payload, current);
    payload = applyAutoStatus(payload, current);

    const updated = await Anime.findByIdAndUpdate(current._id, payload, {
      new: true,
      runValidators: true,
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to update." });
  }
};

export const deleteAnime = async (req, res) => {
  try {
    const deleted = await Anime.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!deleted) return res.status(404).json({ message: "Not found." });
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: "Invalid id." });
  }
};
