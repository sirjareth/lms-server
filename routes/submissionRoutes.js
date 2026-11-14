const express = require("express");
const submissionController = require("../controllers/submissionController");
const { verify, verifyAdmin } = require("../auth");

const router = express.Router();

router.post("/", verify, submissionController.createSubmission);
router.get("/my-submissions", verify, submissionController.getMySubmissions);
router.get("/my/activity/:activityId", verify, submissionController.getMySubmissions);
router.get("/:id/result", verify, submissionController.getSubmissionResult);
router.patch("/:id/grade", verify, verifyAdmin, submissionController.gradeSubmission);
router.post("/:id/recheck", verify, submissionController.recheckSubmission);

module.exports = router;
