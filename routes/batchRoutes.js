const express = require("express");
const batchController = require("../controllers/batchController");
const { verify, verifyAdmin } = require("../auth");

const router = express.Router();

router.post("/", verify, verifyAdmin, batchController.createBatch);
router.get("/", verify, batchController.getAllBatches);
router.get("/:id", verify, batchController.getBatch);
router.patch("/:id", verify, verifyAdmin, batchController.updateBatch);
router.patch("/:id/archive", verify, verifyAdmin, batchController.archiveBatch);

module.exports = router;
