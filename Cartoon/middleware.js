const User = require("./models/users.js");

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

//To check Subscription

module.exports.checkSubscription = async (req, res, next) => {
  const user = await User.findById(req.user._id);

  // Free Plan → allow only 5 conversions
  if (user.plan === "Free Plan") {
    if (user.conversions >= 5) {
      return res.redirect(`/${user.username}/pricing`);
    }
    return next();
  }

  // Paid Plans → check expiry
  if (user.subscriptionEnd && user.subscriptionEnd < new Date()) {
    // expired → reset back to Free Plan
    user.plan = "Free Plan";
    user.subscriptionStart = null;
    user.subscriptionEnd = null;
    await user.save();
    return res.redirect(`/${user.username}/pricing`);
  }

  next();
};
