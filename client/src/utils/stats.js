export const buildStats = (items) => {
  const total = items.length;
  const completed = items.filter((item) => item.status === "Completed").length;
  const scored = items.filter((item) => item.score !== undefined && item.score !== null);
  const avgScore = scored.length
    ? scored.reduce((sum, item) => sum + item.score, 0) / scored.length
    : 0;
  const timeSpent = items.reduce((sum, item) => sum + (item.totalTimeSpent || 0), 0);
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    avgScore: avgScore ? avgScore.toFixed(1) : "-",
    completionRate,
    timeSpent: timeSpent ? `${timeSpent} min` : "-",
  };
};
