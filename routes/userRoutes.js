const express = require("express");

const userController = require("../controllers/userController.js");

const { verify, verifyAdmin, createAccessToken } = require("../auth.js");

const router = express.Router();

const passport = require("passport"); // oauth

router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);
router.get("/details", verify, userController.getProfile);
router.get("/", verify, verifyAdmin, userController.getAllUsers);
router.patch("/:id/role", verify, verifyAdmin, userController.updateRole);
router.patch("/:id/deactivate", verify, verifyAdmin, userController.deactivateUser);

// [SECTION] OAuth Start
router.get("/google", 
  passport.authenticate("google", {
    scope: ["email", "profile"],
    prompt: "select_account"

  })
);

router.get("/google/callback", 
  passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=google`,
  }),
  function (req, res, next) {
    req.session.save((error) => {
      if (error) return next(error);
      res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/auth/callback`);
    });
  }
);

router.get("/google/session", (req, res) => {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ message: "Google sign-in session is missing or expired." });
  }

  const user = req.user.toObject ? req.user.toObject() : { ...req.user };
  delete user.password;
  return res.status(200).json({ access: createAccessToken(req.user), user });
});


router.get("/failed", (req, res) => {
  console.log("User is not authenticated");
  res.send("Failed");
});

router.get("/success", (req, res) => {
  console.log("You are now logged in");
  // Avoid logging personal Google profile data.
  res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/auth/callback`);
});

const logoutGoogleUser = (req, res, next, redirect = false) => {
  req.logout((logoutError) => {
    if (logoutError) return next(logoutError);
    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);
      res.clearCookie("connect.sid");
      if (redirect) return res.redirect(process.env.CLIENT_URL || "http://localhost:5173");
      return res.status(204).end();
    });
  });
};

router.post("/logout", (req, res, next) => logoutGoogleUser(req, res, next));
router.get("/logout", (req, res, next) => logoutGoogleUser(req, res, next, true));

// oauth end


module.exports = router;