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
        let { email, username, fullname, password } = req.body.user;
        let newUser = new User({
          email: email,
          username: username,
          fullname: fullname,
        });
        let registereduser = await User.register(newUser, password);
        req.login(registereduser, (err) => {
          if (err) {
            console.error("Login after register failed:", err);
            return res.redirect("/login");
          }
          req.flash("success", "Account created successfully. Welcome!");
          res.redirect(`/${registereduser.username}/dashboard`);
        });
      } catch (err) {
        req.flash("error", "Registration failed. Try again.");
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
      failureFlash: "Wrong username or password. Try again!",
    }),
    async (req, res) => {
      req.session.isAdmin = req.user.isAdmin; // true if user has admin flag in DB
      if (req.session.isAdmin) {
        return res.redirect("/admin/dashboard");
      } else {
        let redirectUrl =
          res.locals.redirectUrl || `/${req.user.username}/dashboard`;
        return res.redirect(redirectUrl);
      }
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
