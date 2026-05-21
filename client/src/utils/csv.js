export const toIsoDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export const toCsvValue = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, "\"\"")}"`;
  }
  return str;
};

export const buildCsv = (items) => {
  const headers = [
    "Title",
    "Status",
    "Episodes Watched",
    "Total Episodes",
    "Score",
    "Priority",
    "Genre",
    "Notes",
    "Start Date",
    "Finish Date",
    "Episode Length",
    "AniList Title",
  ];

  const rows = items.map((item) => [
    item.title || "",
    item.status || "",
    item.episodesWatched ?? "",
    item.totalEpisodes ?? "",
    item.score ?? "",
    item.priority || "",
    item.genre || "",
    item.notes || "",
    toIsoDate(item.startDate),
    toIsoDate(item.finishDate),
    item.episodeLength ?? "",
    item.anilistTitle || "",
  ]);

  return [headers, ...rows]
    .map((row) => row.map(toCsvValue).join(","))
    .join("\n");
};
