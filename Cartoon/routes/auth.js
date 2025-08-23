const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");
const User = require("../models/users");

router
  .route("/register")
  .get((req, res) => {
    res.render("auth/register.ejs");
  })
  .post(
    wrapAsync(async (req, res) => {
      try {
        let { email, username, password } = req.body.user;
        let newUser = new User({
          email: email,
          username: username,
        });
        let registereduser = await User.register(newUser, password);
        req.login(registereduser, (err) => {
          if (err) {
            return next(err);
          }
          res.redirect("/userdashboard");
        });
      } catch (err) {
        res.redirect("/register");
      }
    })
  );

// login
router
  .route("/login")
  .get((req, res) => {
    res.render("auth/login.ejs");
  })
  .post(
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    async (req, res) => {
      let redirectUrl = res.locals.redirectUrl || "/explore";
      res.redirect(redirectUrl);
    }
  );

// logout
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

module.exports = router;
