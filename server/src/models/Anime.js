import mongoose from "mongoose";

const animeSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: ["Watching", "Completed", "Planned", "Dropped"],
      default: "Planned",
    },
    episodesWatched: { type: Number, default: 0, min: 0 },
    totalEpisodes: { type: Number, default: 0, min: 0 },
    score: { type: Number, min: 0, max: 10 },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    genre: { type: String, default: "", maxlength: 120 },
    notes: { type: String, default: "", maxlength: 2000 },
    startDate: { type: Date },
    finishDate: { type: Date },
    rewatches: { type: Number, default: 0, min: 0 },
    episodeLength: { type: Number, min: 1 },
    customLists: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    anilistId: { type: Number },
    anilistTitle: { type: String, default: "", maxlength: 200 },
    anilistStatus: { type: String, default: "" },
    season: { type: String, default: "" },
    seasonYear: { type: Number },
    posterUrl: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

animeSchema.virtual("progressPercent").get(function getProgressPercent() {
  if (!this.totalEpisodes || this.totalEpisodes <= 0) return 0;
  const percent = (this.episodesWatched / this.totalEpisodes) * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
});

animeSchema.virtual("totalTimeSpent").get(function getTotalTimeSpent() {
  if (!this.episodeLength || !this.episodesWatched) return 0;
  return this.episodeLength * this.episodesWatched;
});

animeSchema.index({ owner: 1, anilistId: 1 });
animeSchema.index({ owner: 1, updatedAt: -1 });

const Anime = mongoose.model("Anime", animeSchema);

export default Anime;
