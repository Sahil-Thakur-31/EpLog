import { parse } from "csv-parse/sync";
import Anime from "../models/Anime.js";
import { fetchAniListByTitle } from "../utils/anilist.js";

const mapStatus = (value) => {
  if (!value) return "";
  const normalized = value.toString().toLowerCase().trim();
  if (normalized.includes("complete")) return "Completed";
  if (normalized.includes("plan")) return "Planned";
  if (normalized.includes("drop")) return "Dropped";
  if (normalized.includes("watch")) return "Watching";
  return "";
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

const applyAutoStatus = (payload) => {
  if (payload.status) return payload;
  const episodesWatched = Number(payload.episodesWatched ?? 0);
  const totalEpisodes = Number(payload.totalEpisodes ?? 0);

  if (episodesWatched <= 0) return { ...payload, status: "Planned" };
  if (totalEpisodes > 0 && episodesWatched >= totalEpisodes) {
    return { ...payload, status: "Completed" };
  }
  return { ...payload, status: "Watching" };
};

export const importCsv = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: "CSV file is required." });
    }

    const content = req.file.buffer.toString("utf8");
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const existing = await Anime.find({ owner: req.user.id }).select("title").lean();
    const existingTitles = new Set(existing.map((item) => item.title.toLowerCase()));
    const cache = new Map();
    const payloads = [];
    const enrich = req.query.enrich !== "false";

    for (const row of records) {
      const type = row.Type || row.type || "";
      if (type && type.toString().toLowerCase() !== "anime") continue;

      const title = (row.Title || row.title || "").trim();
      if (!title) continue;
      if (existingTitles.has(title.toLowerCase())) continue;

      const episodesWatched = parseNumber(row.LastEpWatched || row.lastEpWatched) ?? 0;
      const scoreValue = parseNumber(row.Rating || row.rating);
      const notes = row.Memo || row.memo || "";
      const status = mapStatus(row.Watchlist || row.watchlist);

      let payload = {
        owner: req.user.id,
        title,
        episodesWatched,
        status,
        score:
          scoreValue && scoreValue > 0
            ? Math.min(10, Math.max(1, scoreValue))
            : undefined,
        notes,
        finishDate: parseDate(row.WatchedDate || row.watchedDate),
      };

      if (enrich) {
        let enriched = cache.get(title);
        if (!enriched) {
          enriched = await fetchAniListByTitle(title);
          cache.set(title, enriched);
        }
        if (enriched) {
          payload.anilistId = enriched.anilistId;
          payload.anilistTitle = enriched.anilistTitle || "";
          payload.posterUrl = enriched.posterUrl || "";
          if (enriched.totalEpisodes) payload.totalEpisodes = enriched.totalEpisodes;
        }
      }

      payload = applyAutoStatus(payload);
      payloads.push(payload);
      existingTitles.add(title.toLowerCase());
    }

    if (!payloads.length) {
      return res.json({ inserted: 0 });
    }

    await Anime.insertMany(payloads, { ordered: false });

    return res.json({ inserted: payloads.length });
  } catch (error) {
    return res.status(500).json({ message: "Import failed." });
  }
};
