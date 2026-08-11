const express = require("express");
const router = express.Router();
const ingestController = require("../controllers/ingestController");

// Every ingest route shells out to ffmpeg and writes to the local media
// directory, neither of which exists in Lambda. Fail loudly there instead of
// surfacing a confusing spawn error.
const requireLocalPipeline = (_req, res, next) => {
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return res.status(503).json({
      error: "The ingest pipeline runs on the local admin machine, not in Lambda",
    });
  }
  next();
};

router.use(requireLocalPipeline);

router.put("/ingest/:id/source", ingestController.uploadSource);
router.put("/ingest/:id/subtitle", ingestController.uploadSubtitle);
router.post("/ingest/:id/estimate", ingestController.estimateIngest);
router.post("/ingest/:id/start", ingestController.startIngest);
router.get("/ingest/:id", ingestController.getIngestStatus);
router.post("/ingest/:id/publish", ingestController.publishIngest);

module.exports = router;
