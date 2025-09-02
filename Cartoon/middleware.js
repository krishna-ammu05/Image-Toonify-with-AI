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

// ------------------------------------
// New Middleware for your payment logic
// ------------------------------------

// Check if user has reached free conversion limit
module.exports.checkConversionLimit = async (req, res, next) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const user = req.user;
  if (user.convertedCount >= 5) {
    return res.redirect(`/${user.username}/pricing`); // redirect to pricing/payment page
  }

  next();
};

module.exports.checkDownloadPayment = (req, res, next) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  // Redirect to pricing page before download
  return res.redirect(`/${req.user.username}/pricing`);
};
