const mongoose = require('mongoose');

// Episodes are only written once their transcode has been published, so a
// video_url is always present by the time one reaches the database.
const episodeSchema = new mongoose.Schema({
  episode_number: { type: Number, required: true },
  title: { type: String },
  description: { type: String },
  video_url: { type: String, required: true },
  thumbnail_url: { type: String },
  duration_seconds: { type: Number },
});

const seasonSchema = new mongoose.Schema({
  season_number: { type: Number, required: true },
  episodes: [episodeSchema]
});

const contentSchema = new mongoose.Schema({
  _id:{type:mongoose.Types.ObjectId,required:true},
  title: { type: String, required: true },
  description: { type: String, required: true },
  genres: { type: [String], required: true },
  tags:{type:[String],required:true},
  type: { type: String, enum: ['movie', 'series'], required: true },
  releaseDate:{type:String},
  video_id:{type:Number},
  video_url: { type: String },
  duration_seconds: { type: Number },
  thumbnail_url: { type: String },
  poster_url:{type:String},
  subtitle_url:{type:String},
  deleted: { type: Boolean, default: false },
  isReady:{type:Boolean,default:false},
  isPublish:{type:Boolean,default:false},
  status: { type: String, enum: ['pending', 'processing', 'ready'], default: 'pending' },
  seasons: [seasonSchema]  // Only for series type
});

module.exports = mongoose.model('Contents', contentSchema);
