const Content = require("../models/contentModel");

// Create content metadata. The video itself is uploaded separately via a
// presigned URL; the S3 upload event then drives transcoding. Returns the new
// id so the client can presign the upload under `<id>/<filename>`.
exports.addContent = async (req, res) => {
  try {
    const content = await Content.create({
      ...req.body,
      status: "pending",
      isReady: false,
    });
    res.status(201).json({ id: content._id, content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create content" });
  }
};

// List content (active by default, ?archive=true for soft-deleted).
exports.getContent = async (req, res) => {
  try {
    const deleted = req.query.archive === "true";
    const content = await Content.find({ deleted });
    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get content" });
  }
};

exports.getSingleContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ error: "Content not found" });
    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get content" });
  }
};

exports.getContentbyType = async (req, res) => {
  try {
    const content = await Content.find({ type: req.params.type });
    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get content" });
  }
};

// Update content (also used by the transcode completion path to set video_url + ready).
exports.updateContent = async (req, res) => {
  try {
    const content = await Content.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!content) return res.status(404).json({ error: "Content not found" });
    res.json({ message: "Content updated", content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update content" });
  }
};

// Soft delete.
exports.deleteContent = async (req, res) => {
  try {
    const content = await Content.findByIdAndUpdate(
      req.params.id,
      { deleted: true, isPublish: false },
      { new: true }
    );
    if (!content) return res.status(404).json({ error: "Content not found" });
    res.json({ message: "Content deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete content" });
  }
};
