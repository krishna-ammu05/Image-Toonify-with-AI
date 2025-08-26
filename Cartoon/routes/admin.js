const express = require("express");
const router = express.Router();
const User = require("../models/users.js");
const Image = require("../models/image.js");
const { isAdmin } = require("../middleware.js");

// Admin Dashboard Route
router.get("/dashboard", isAdmin, async (req, res) => {
  try {
    // Fetch all data
    const users = await User.find({});
    const images = await Image.find({});

    // Example stats (you can expand these)
    const totalUsers = users.length;
    const totalConversions = images.length;
    // const revenue = payments.reduce((sum, p) => sum + p.amount, 0);
    // const activeSubscriptions = subscriptions.filter(
    //   (s) => s.status === "active"
    // ).length;

    // Recent activity mock (you can fetch from logs)
    const recentActivity = images.slice(-5).map((img) => ({
      user: img.owner?.username || "Unknown",
      action: "Uploaded an image",
      time: img.createdAt.toLocaleString(),
    }));

    res.render("admin/dashboard", {
      users,
      images,
      //   payments,
      //   subscriptions,
      dashboardData: {
        totalUsers,
        totalConversions,
        // revenue,
        // activeSubscriptions,
        recentActivity,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
