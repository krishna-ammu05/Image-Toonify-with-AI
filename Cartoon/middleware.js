module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    return res.redirect("/login");
  }
  next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

module.exports.isAdmin = (req, res, next) => {
  if (!req.isAuthenticated() || !req.session.isAdmin) {
    return res.status(403).send("🚫 Unauthorized");
  }
  next();
};
