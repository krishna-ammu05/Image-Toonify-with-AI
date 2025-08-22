const User = require("../models/users");

module.exports.renderRegisterForm = (req, res) => {
  res.render("auth/signUp.ejs");
};

module.exports.register = async (req, res) => {
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
};

module.exports.renderLoginForm = (req, res) => {
  res.render("auth/login.ejs");
};

module.exports.login = async (req, res) => {
  let redirectUrl = res.locals.redirectUrl || "/explore";
  res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
};
