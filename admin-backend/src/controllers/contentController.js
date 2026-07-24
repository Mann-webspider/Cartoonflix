const Content = require("../models/contentModel");
const produceMessage = require("../config/producer");
const { checkVideoCode } = require("../utils/checkVideoCode");
// Add new content (Movie or Series)
exports.addContent = async (req, res) => {
  try {
    let { keyUrl, keyType, video_id, type } = req.body;

    const isVideoIdExists = await checkVideoCode(video_id);
    
    let result;
    if (isVideoIdExists) {
    result = await Content.updateOne(
      { _id: req.body._id }, // Match the document by _id
      { $set: req.body }, // Update fields in the document
      { upsert: true } // Create the document if it doesn't exist
    );
    
    
      // Video ID exists in the database
      
    } else {
      // Video ID does not exist in the database
      return res.status(501).json({ error: "Video id Already Exists" });
    }

    let job = {
      bucket: process.env.AWS_S3_BUCKET_ORIGINAL,
      keys: {
        Key: decodeURIComponent(keyUrl.split("/").slice(3).join("/")),
        keyType
        
      },
      video_id,
      type,
      contentId: req.body._id,
    };

    produceMessage("video_transcoding", JSON.stringify(job));
    res.status(201).json({ message: "Content added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add content" });
  }
};

// get Content all
exports.getContent = async (req, res) => {
  try {
    let archive = req.query.archive == "false" ? false : true;
    let content = await Content.find({ deleted: archive });
    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }

    res.json({ content });
  } catch (error) {
    console.error(err);
    res.status(500).json({ error: "Failed to get content" });
  }
};

// get all archive Content
exports.getArchiveContent = async (req, res) => {
  try {
    let content = await Content.find({ deleted: true });
    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }

    res.json({ content });
  } catch (error) {
    console.error(err);
    res.status(500).json({ error: "Failed to get content" });
  }
};

// get all archive Content
exports.getSingleContent = async (req, res) => {
  try {
    let id = req.params.id;
    let content = await Content.findById({ _id: id });
    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }

    res.json({ content });
  } catch (error) {
    console.error(err);
    res.status(500).json({ error: "Failed to get content" });
  }
};

// get Content (Movie or series)
exports.getContentbyType = async (req, res) => {
  try {
    const content = await Content.find({ type: req.params.type });
    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }
    res.json({ content });
  } catch (error) {
    console.error(err);
    res.status(500).json({ error: "Failed to get content" });
  }
};
// Update content details (movie/series)
exports.updateContent = async (req, res) => {
  try {
    const content = await Content.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }
    res.json({ message: "Content updated successfully", content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update content" });
  }
};

// Soft delete content
exports.deleteContent = async (req, res) => {
  try {
    const content = await Content.findByIdAndUpdate(
      req.params.id,
      { deleted: true, isPublish: false },
      { new: true }
    );
    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }
    res.json({ message: "Content deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete content" });
  }
};
