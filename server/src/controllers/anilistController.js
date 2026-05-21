import {
  fetchGenreCollection,
  fetchTrendingAnime,
  searchAniList,
  fetchDiscoverAnime,
  fetchAniListDetails,
} from "../utils/anilist.js";

export const search = async (req, res) => {
  try {
    const query = req.query.query?.toString().trim();
    if (!query || query.length < 2) {
      return res.status(400).json({ message: "Query must be at least 2 characters." });
    }
    const requestedPerPage = Number(req.query.perPage) || 30;
    const perPage = Math.min(50, Math.max(1, requestedPerPage));
    const requestedPage = Number(req.query.page) || 1;
    const page = Math.max(1, requestedPage);
    const results = await searchAniList(query, perPage, page);
    return res.json(results);
  } catch (error) {
    return res.status(500).json({ message: "Search failed." });
  }
};

export const trending = async (req, res) => {
  try {
    const requested = Number(req.query.perPage) || 12;
    const perPage = Math.min(50, Math.max(1, requested));
    const results = await fetchTrendingAnime(perPage);
    return res.json(results);
  } catch (error) {
    return res.status(500).json({ message: "Trending fetch failed." });
  }
};

export const genres = async (req, res) => {
  try {
    const results = await fetchGenreCollection();
    return res.json(results);
  } catch (error) {
    return res.status(500).json({ message: "Genres fetch failed." });
  }
};

export const discover = async (req, res) => {
  try {
    const sort = req.query.sort?.toString().trim() || "TRENDING_DESC";
    const search = req.query.search?.toString().trim() || "";
    const genres = req.query.genres
      ? req.query.genres
          .toString()
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
    const seasons = req.query.seasons
      ? req.query.seasons
          .toString()
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
    const years = req.query.years
      ? req.query.years
          .toString()
          .split(",")
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
      : [];
    const season = seasons[0] || undefined;
    const seasonYear = years[0] || undefined;
    const statusIn = req.query.statuses
      ? req.query.statuses
          .toString()
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
    const formats = req.query.formats
      ? req.query.formats
          .toString()
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
    const minScore = req.query.minScore ? Number(req.query.minScore) : undefined;
    const requestedPerPage = Number(req.query.perPage) || 30;
    const perPage = Math.min(50, Math.max(1, requestedPerPage));
    const requestedPage = Number(req.query.page) || 1;
    const page = Math.max(1, requestedPage);
    const results = await fetchDiscoverAnime({
      page,
      perPage,
      sort,
      search,
      genres,
      season,
      seasonYear,
      formats,
      minScore: Number.isFinite(minScore) ? minScore : undefined,
      statusIn,
    });
    return res.json(results);
  } catch (error) {
    console.error("Discover fetch failed", error?.message || error);
    return res.status(500).json({ message: "Discover fetch failed." });
  }
};


export const details = async (req, res) => {
  try {
    const id = Number(req.query.id);
    if (!id) {
      return res.status(400).json({ message: "Missing AniList id." });
    }
    const result = await fetchAniListDetails(id);
    if (!result) {
      return res.status(404).json({ message: "Anime not found." });
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: "Details fetch failed." });
  }
};
