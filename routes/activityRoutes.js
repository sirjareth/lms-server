const express = require("express");
const activityController = require("../controllers/activityController");
const { verify, verifyAdmin } = require("../auth");

const router = express.Router();

router.post("/", verify, verifyAdmin, activityController.createActivity);
router.get("/session/:sessionId", verify, activityController.getSessionActivity);
router.get("/:id", verify, activityController.getActivity);
router.patch("/:id", verify, verifyAdmin, activityController.updateActivity);

module.exports = router;
