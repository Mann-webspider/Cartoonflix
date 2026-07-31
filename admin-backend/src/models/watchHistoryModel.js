const mongoose = require("mongoose");

// One row per user+content, tracking resume position for "continue watching".
const watchHistorySchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content_id: { type: mongoose.Schema.Types.ObjectId, ref: "Contents", required: true },
    position_seconds: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

watchHistorySchema.index({ user_id: 1, content_id: 1 }, { unique: true });
watchHistorySchema.index({ user_id: 1, updatedAt: -1 });

module.exports = mongoose.model("WatchHistory", watchHistorySchema);
