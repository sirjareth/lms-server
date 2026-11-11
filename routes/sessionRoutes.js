const express = require("express");
const sessionController = require("../controllers/sessionController");
const { verify, verifyAdmin } = require("../auth");

const router = express.Router();

router.post("/", verify, verifyAdmin, sessionController.createSession);
router.get("/batch/:batchId", verify, sessionController.getBatchSessions);
router.get("/:id", verify, sessionController.getSession);
router.patch("/:id", verify, verifyAdmin, sessionController.updateSession);

module.exports = router;
