const mongoose = require('mongoose');

// A published subtitle track. `language` is a BCP-47 code the player uses for
// its menu; `label` is what a viewer reads.
const subtitleSchema = new mongoose.Schema(
  {
    language: { type: String, required: true },
    label: { type: String, required: true },
    url: { type: String, required: true },
    source: { type: String, enum: ['embedded', 'uploaded'], default: 'embedded' },
  },
  { _id: false }
);

const castSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    character: { type: String },
    profile_url: { type: String },
    order: { type: Number },
  },
  { _id: false }
);

/**
 * An episode exists from the moment its metadata is known, which is usually
 * before anything has been transcoded — pulling a series from TMDB creates the
 * whole run at once. `video_url` is therefore optional, and `status` is what
 * says whether an episode is actually playable.
 */
const episodeSchema = new mongoose.Schema({
  episode_number: { type: Number, required: true },
  title: { type: String },
  description: { type: String },
  air_date: { type: String },
  video_url: { type: String },
  thumbnail_url: { type: String },
  duration_seconds: { type: Number },
  subtitles: [subtitleSchema],
  status: { type: String, enum: ['pending', 'processing', 'ready'], default: 'pending' },
});

const seasonSchema = new mongoose.Schema({
  season_number: { type: Number, required: true },
  title: { type: String },
  description: { type: String },
  poster_url: { type: String },
  air_date: { type: String },
  episodes: [episodeSchema],
});

const contentSchema = new mongoose.Schema({
  _id: { type: mongoose.Types.ObjectId, required: true },

  // --- Core, entered by the operator ---
  title: { type: String, required: true },
  original_title: { type: String },
  tagline: { type: String },
  description: { type: String, required: true },
  genres: { type: [String], required: true },
  tags: { type: [String], required: true },
  type: { type: String, enum: ['movie', 'series'], required: true },
  releaseDate: { type: String },

  // --- Enriched from TMDB ---
  cast: [castSchema],
  directors: { type: [String], default: [] },
  writers: { type: [String], default: [] },
  studios: { type: [String], default: [] },
  // Spoken languages as { code, name }, e.g. { code: "ja", name: "Japanese" }.
  languages: [
    new mongoose.Schema(
      { code: { type: String, required: true }, name: { type: String, required: true } },
      { _id: false }
    ),
  ],
  certification: { type: String },
  // TMDB's own score and vote count. Kept separate from anything the viewers
  // of this instance rate, so the two can never be confused for each other.
  tmdb_score: { type: Number },
  tmdb_votes: { type: Number },
  tmdb_id: { type: Number },
  imdb_id: { type: String },
  // TMDB's stated runtime in minutes. duration_seconds, measured by ffprobe
  // during ingest, is the authority once a title has actually been transcoded.
  runtime_minutes: { type: Number },

  // --- Produced by the ingest pipeline ---
  video_id: { type: Number },
  video_url: { type: String },
  duration_seconds: { type: Number },
  thumbnail_url: { type: String },
  poster_url: { type: String },
  backdrop_url: { type: String },
  subtitles: [subtitleSchema],

  // --- Lifecycle ---
  deleted: { type: Boolean, default: false },
  isReady: { type: Boolean, default: false },
  isPublish: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'processing', 'ready'], default: 'pending' },

  seasons: [seasonSchema], // series only
});

module.exports = mongoose.model('Contents', contentSchema);
