const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");

const authController = require("../controllers/auth.js");

router
  .route("/signup")
  .get(authController.renderRegisterForm)
  .post(wrapAsync(authController.register));

// login
router
  .route("/login")
  .get(authController.renderLoginForm)
  .post(
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    authController.login
  );

// logout
router.get("/logout", authController.logout);

module.exports = router;
