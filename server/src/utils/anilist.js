const ANILIST_URL = "https://graphql.anilist.co";
const DEFAULT_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 30000;
const cache = new Map();

const pickTitle = (title) => {
  if (!title) return "";
  return title.english || "";
};

const pickTitleLoose = (title) => {
  if (!title) return "";
  return title.english || title.romaji || title.userPreferred || "";
};

const buildCacheKey = (query, variables) => `${query}::${JSON.stringify(variables || {})}`;

const requestAniList = async (query, variables) => {
  const cacheKey = buildCacheKey(query, variables);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const makeRequest = async () => {
      const response = await fetch(ANILIST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "AniLog/1.0",
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      const raw = await response.text();
      let parsed = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch (err) {
        parsed = null;
      }

      if (!response.ok) {
        console.error("AniList response error", response.status, raw?.slice(0, 400));
        return null;
      }

      if (parsed?.errors?.length) {
        console.error("AniList GraphQL errors", parsed.errors);
        return null;
      }

      return parsed?.data || null;
    };

    let data = await makeRequest();
    if (!data) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      data = await makeRequest();
    }

    if (data) {
      cache.set(cacheKey, { timestamp: Date.now(), data });
      return data;
    }

    if (cached?.data) {
      return cached.data;
    }

    return null;
  } catch (error) {
    console.error("AniList request failed", error.message || error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const mediaQuery = `query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    episodes
    season
    seasonYear
    status
    title { userPreferred english romaji native }
    coverImage { extraLarge large }
  }
}`;

const mediaByIdQuery = `query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    episodes
    season
    seasonYear
    status
    title { userPreferred english romaji native }
    coverImage { extraLarge large }
  }
}`;

const searchQuery = `query ($search: String, $perPage: Int, $page: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      episodes
      format
      averageScore
      popularity
      genres
      season
      seasonYear
      status
      title { userPreferred english romaji native }
      coverImage { large }
    }
  }
}`;

const trendingQuery = `query ($perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
      id
      episodes
      format
      averageScore
      popularity
      trending
      genres
      season
      seasonYear
      title { userPreferred english romaji native }
      coverImage { large }
    }
  }
}`;

const detailsQuery = `query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { english romaji native }
    description
    episodes
    duration
    format
    status
    season
    seasonYear
    startDate { year month day }
    endDate { year month day }
    nextAiringEpisode { episode timeUntilAiring }
    genres
    averageScore
    meanScore
    popularity
    favourites
    source
    countryOfOrigin
    hashtag
    synonyms
    siteUrl
    bannerImage
    coverImage { extraLarge large color }
    trailer { id site thumbnail }
    studios { nodes { name isAnimationStudio } }
    tags { name rank }
    relations {
      edges {
        relationType
        node {
          id
          title { english romaji native }
          format
          status
          episodes
          coverImage { large }
        }
      }
    }
    stats {
      statusDistribution { status amount }
      scoreDistribution { score amount }
    }
    characters(page: 1, perPage: 18) {
      edges {
        role
        node { name { full } image { medium } }
      }
    }
    staff(page: 1, perPage: 18) {
      edges {
        role
        node { name { full } image { medium } primaryOccupations }
      }
    }
    externalLinks { site url type language color }
    rankings { rank type season year allTime context }
  }
}`;

const genresQuery = `query {
  GenreCollection
}`;

const discoverBaseQuery = `query ($page: Int, $perPage: Int, $sort: [MediaSort]) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(type: ANIME, sort: $sort, isAdult: false) {
      id
      episodes
      format
      averageScore
      popularity
      trending
      genres
      season
      seasonYear
      status
      title { userPreferred english romaji }
      coverImage { large }
    }
  }
}`;

const discoverQuery = `query ($page: Int, $perPage: Int, $sort: [MediaSort], $search: String, $genres: [String], $season: MediaSeason, $seasonYear: Int, $formats: [MediaFormat], $minScore: Int, $statusIn: [MediaStatus]) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(type: ANIME, sort: $sort, isAdult: false, search: $search, genre_in: $genres, season: $season, seasonYear: $seasonYear, format_in: $formats, averageScore_greater: $minScore, status_in: $statusIn) {
      id
      episodes
      format
      averageScore
      popularity
      trending
      genres
      season
      seasonYear
      status
      title { userPreferred english romaji }
      coverImage { large }
    }
  }
}`;

const mapMedia = (media) => {
  if (!media) return null;
  return {
    anilistId: media.id,
    anilistTitle: pickTitle(media.title),
    posterUrl: media.coverImage?.extraLarge || media.coverImage?.large || "",
    totalEpisodes: media.episodes || undefined,
    season: media.season || "",
    seasonYear: media.seasonYear || undefined,
    anilistStatus: media.status || "",
  };
};

export const fetchAniListByTitle = async (search) => {
  if (!search) return null;
  const data = await requestAniList(mediaQuery, { search });
  const media = data?.Media;
  return mapMedia(media);
};

export const fetchAniListById = async (id) => {
  if (!id) return null;
  const data = await requestAniList(mediaByIdQuery, { id });
  const media = data?.Media;
  return mapMedia(media);
};

export const searchAniList = async (search, perPage = 30, page = 1) => {
  if (!search) {
    return {
      items: [],
      pageInfo: {
        total: 0,
        perPage,
        currentPage: page,
        lastPage: page,
        hasNextPage: false,
      },
      unavailable: false,
    };
  }
  const data = await requestAniList(searchQuery, { search, perPage, page });
  const pageData = data?.Page;
  if (!pageData) {
    return {
      items: [],
      pageInfo: {
        total: 0,
        perPage,
        currentPage: page,
        lastPage: page,
        hasNextPage: false,
      },
      unavailable: true,
    };
  }
  const results = pageData?.media || [];
  const items = results
    .map((media) => ({
      id: media.id,
      title: pickTitleLoose(media.title),
      posterUrl: media.coverImage?.large || "",
      episodes: media.episodes || null,
      format: media.format || null,
      averageScore: media.averageScore || null,
      popularity: media.popularity || 0,
      genres: media.genres || [],
      season: media.season || "",
      seasonYear: media.seasonYear || null,
      status: media.status || "",
    }))
    .filter((item) => item.title);

  return {
    items,
    pageInfo: pageData?.pageInfo || {
      total: items.length,
      perPage,
      currentPage: page,
      lastPage: page,
      hasNextPage: false,
    },
    unavailable: false,
  };
};

export const fetchTrendingAnime = async (perPage = 12) => {
  const data = await requestAniList(trendingQuery, { perPage });
  const results = data?.Page?.media || [];
  return results
    .map((media) => ({
      id: media.id,
      title: pickTitleLoose(media.title),
      posterUrl: media.coverImage?.large || "",
      episodes: media.episodes || null,
      format: media.format || null,
      genres: media.genres || [],
      season: media.season || "",
      seasonYear: media.seasonYear || null,
      averageScore: media.averageScore || null,
      popularity: media.popularity || 0,
      trending: media.trending || 0,
    }))
    .filter((item) => item.title);
};

export const fetchGenreCollection = async () => {
  const data = await requestAniList(genresQuery, {});
  const results = data?.GenreCollection || [];
  return results.filter(Boolean);
};

export const fetchDiscoverAnime = async ({
  page = 1,
  perPage = 30,
  sort = "TRENDING_DESC",
  search,
  genres,
  season,
  seasonYear,
  formats,
  minScore,
  statusIn,
} = {}) => {
  const hasFilters = Boolean(
    search ||
      (genres && genres.length) ||
      season ||
      Number.isFinite(seasonYear) ||
      (formats && formats.length) ||
      Number.isFinite(minScore) ||
      (statusIn && statusIn.length)
  );

  const data = await requestAniList(hasFilters ? discoverQuery : discoverBaseQuery, {
    page,
    perPage,
    sort,
    search: hasFilters ? (search || null) : undefined,
    genres: hasFilters && genres && genres.length ? genres : undefined,
    season: hasFilters ? (season || null) : undefined,
    seasonYear: hasFilters && Number.isFinite(seasonYear) ? seasonYear : undefined,
    formats: hasFilters && formats && formats.length ? formats : undefined,
    minScore: hasFilters && Number.isFinite(minScore) ? minScore : undefined,
    statusIn: hasFilters && statusIn && statusIn.length ? statusIn : undefined,
  });
  const pageData = data?.Page;
  if (!pageData) {
    return {
      items: [],
      pageInfo: {
        total: 0,
        perPage,
        currentPage: page,
        lastPage: page,
        hasNextPage: false,
      },
      unavailable: true,
    };
  }
  const results = pageData?.media || [];
  const items = results
    .map((media) => ({
      id: media.id,
      title: pickTitleLoose(media.title),
      posterUrl: media.coverImage?.large || "",
      episodes: media.episodes || null,
      format: media.format || null,
      genres: media.genres || [],
      season: media.season || "",
      seasonYear: media.seasonYear || null,
      status: media.status || "",
      averageScore: media.averageScore || null,
      popularity: media.popularity || 0,
      trending: media.trending || 0,
    }))
    .filter((item) => item.title);

  return {
    items,
    pageInfo: pageData?.pageInfo || {
      total: items.length,
      perPage,
      currentPage: page,
      lastPage: page,
      hasNextPage: false,
    },
    unavailable: false,
  };
};

export const fetchAniListDetails = async (id) => {
  if (!id) return null;
  const data = await requestAniList(detailsQuery, { id });
  const media = data?.Media;
  if (!media) return null;
  return {
    id: media.id,
    title: pickTitle(media.title),
    titleRomaji: media.title?.romaji || "",
    titleNative: media.title?.native || "",
    titleEnglish: media.title?.english || "",
    description: media.description || "",
    episodes: media.episodes || null,
    duration: media.duration || null,
    format: media.format || null,
    status: media.status || null,
    season: media.season || null,
    seasonYear: media.seasonYear || null,
    startDate: media.startDate || null,
    endDate: media.endDate || null,
    nextAiringEpisode: media.nextAiringEpisode
      ? {
          episode: media.nextAiringEpisode.episode,
          timeUntilAiring: media.nextAiringEpisode.timeUntilAiring,
        }
      : null,
    genres: media.genres || [],
    averageScore: media.averageScore || null,
    meanScore: media.meanScore || null,
    popularity: media.popularity || 0,
    favourites: media.favourites || 0,
    source: media.source || null,
    countryOfOrigin: media.countryOfOrigin || null,
    hashtag: media.hashtag || "",
    synonyms: media.synonyms || [],
    siteUrl: media.siteUrl || "",
    bannerImage: media.bannerImage || "",
    posterUrl: media.coverImage?.extraLarge || media.coverImage?.large || "",
    coverColor: media.coverImage?.color || "",
    trailer: media.trailer || null,
    studios: (media.studios?.nodes || [])
      .filter((node) => node.isAnimationStudio)
      .map((node) => ({
        name: node.name,
        isAnimationStudio: node.isAnimationStudio,
      })),
    producers: (media.studios?.nodes || [])
      .filter((node) => !node.isAnimationStudio)
      .map((node) => ({
        name: node.name,
        isAnimationStudio: node.isAnimationStudio,
      })),
    tags: (media.tags || []).map((tag) => ({
      name: tag.name || "",
      rank: tag.rank || 0,
    })),
    relations: (media.relations?.edges || []).map((edge) => ({
      relationType: edge.relationType || "",
      id: edge.node?.id || null,
      title: pickTitle(edge.node?.title) || edge.node?.title?.romaji || "",
      format: edge.node?.format || "",
      status: edge.node?.status || "",
      episodes: edge.node?.episodes || null,
      posterUrl: edge.node?.coverImage?.large || "",
    })),
    stats: {
      statusDistribution: media.stats?.statusDistribution || [],
      scoreDistribution: media.stats?.scoreDistribution || [],
    },
    characters: (media.characters?.edges || []).map((edge) => ({
      role: edge.role || "",
      name: edge.node?.name?.full || "",
      image: edge.node?.image?.medium || "",
    })),
    staff: (media.staff?.edges || []).map((edge) => ({
      role: edge.role || "",
      name: edge.node?.name?.full || "",
      image: edge.node?.image?.medium || "",
      occupations: edge.node?.primaryOccupations || [],
    })),
    externalLinks: (media.externalLinks || []).map((link) => ({
      site: link.site || "",
      url: link.url || "",
      type: link.type || "",
      language: link.language || "",
      color: link.color || "",
    })),
    rankings: media.rankings || [],
  };
};

