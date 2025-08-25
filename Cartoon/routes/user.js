const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const User = require("../models/users.js");
const Image = require("../models/image.js");
const { isLoggedIn } = require("../middleware.js");

// ---------------------------------------------- Dashboard ---------------------------

// Dashboard
router.get(
  "/dashboard",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { username } = req.params;

    if (req.user.username !== username) {
      return res.status(403).send("🚫 Unauthorized Access");
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(404).send("❌ User not found");

    const images = await Image.find({ uploadedBy: user._id });

    res.render("User/Dashboard.ejs", { user, images, activePage: "dashboard" });
  })
);

// ---------------------------------------------- Profile ---------------------------

// Profile
router.get(
  "/profile",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).send("❌ User not found");

    res.render("User/profile.ejs", { user, activePage: "profile" });
  })
);

// ---------------------------------------------- Pricing ---------------------------

// Pricing
router.get(
  "/pricing",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { username } = req.params;

    if (req.user.username !== username) {
      return res.status(403).send("🚫 Unauthorized Access");
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(404).send("❌ User not found");

    res.render("User/pricing.ejs", { user, activePage: "pricing" });
  })
);

// ---------------------------------------------- New Image ---------------------------

// Upload
router.get(
  "/upload",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { username } = req.params;

    if (req.user.username !== username) {
      return res.status(403).send("🚫 Unauthorized Access");
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(404).send("❌ User not found");

    res.render("User/NewImage.ejs", { user, activePage: "upload" });
  })
);

// upload image
// router.post("/upload", isLoggedIn, upload.single("image"), async (req, res) => {
//   try {
//     const { username } = req.params;

//     if (req.user.username !== username) {
//       return res.status(403).send("🚫 Unauthorized Access");
//     }

//     if (!req.file) return res.status(400).send("❌ No file uploaded");

//     // Save new image in DB
//     const newImage = new Image({
//       title: req.file.originalname,
//       originalImage: req.file.path,
//       cartoonImage: "", // later update with processed image
//       style: "cartoon",
//       uploadedBy: req.user._id,
//     });

//     await newImage.save();

//     res.redirect(`/${username}/toonifiedImages`);
//   } catch (err) {
//     console.error("Error uploading image:", err);
//     res.status(500).send("⚠️ Error uploading image");
//   }
// });

// GET single image detail
// URL: /:username/image/:id
router.get("/image/:id", isLoggedIn, async (req, res) => {
  try {
    const { username, id } = req.params;

    if (req.user.username !== username) {
      return res.status(403).send("🚫 Unauthorized Access");
    }

    const image = await Image.findById(id).populate("uploadedBy");
    if (!image) return res.status(404).send("❌ Image not found");

    res.render("User/imageDetail.ejs", {
      user: req.user,
      image,
    });
  } catch (err) {
    console.error("Error fetching image detail:", err);
    res.status(500).send("⚠️ Error fetching image");
  }
});

// DELETE an image
// URL:/:username/image/:id/delete

router.post("/image/:id/delete", isLoggedIn, async (req, res) => {
  try {
    const { username, id } = req.params;

    if (req.user.username !== username) {
      return res.status(403).send("🚫 Unauthorized Access");
    }

    await Image.findOneAndDelete({ _id: id, uploadedBy: req.user._id });

    res.redirect(`/${username}/toonifiedImages`);
  } catch (err) {
    console.error("Error deleting image:", err);
    res.status(500).send("⚠️ Error deleting image");
  }
});

// ---------------------------------------------- Toonified Images ---------------------------

// Toonified Images
router.get(
  "/toonifiedImages",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { username } = req.params;

    if (req.user.username !== username) {
      return res.status(403).send("🚫 Unauthorized Access");
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(404).send("❌ User not found");

    const images = await Image.find({ uploadedBy: user._id });

    res.render("User/toonifiedImages.ejs", {
      user,
      images,
      activePage: "toonifiedImages",
    });
  })
);

// ---------------------------------------------- Settings ---------------------------

// Settings (GET)
router.get(
  "/settings",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { username } = req.params;

    if (req.user.username !== username) {
      return res.status(403).send("🚫 Unauthorized Access");
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(404).send("❌ User not found");

    res.render("User/settings.ejs", { user, activePage: "settings" });
  })
);

// Settings (POST)
router.post(
  "/settings",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { username } = req.params;

    if (req.user.username !== username) {
      return res.status(403).send("🚫 Unauthorized Access");
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(404).send("❌ User not found");

    const { fullname, email, password, emailNotifications } = req.body;

    user.fullname = fullname || user.fullname;
    user.email = email || user.email;
    user.emailNotifications = emailNotifications === "on";

    if (password && password.trim().length > 0) {
      await user.setPassword(password);
    }

    await user.save();
    res.redirect(`/${username}/settings`);
  })
);

// ---------------------------------------------- Delete Account ---------------------------

//DELETE User Account
// URL: /:username/delete
router.post("/delete", isLoggedIn, async (req, res) => {
  try {
    const { username } = req.params;

    // Only allow logged-in user to delete their own account
    if (req.user.username !== username) {
      return res.status(403).send("🚫 Unauthorized Access");
    }

    // Find the user
    const user = await User.findOne({ username });
    if (!user) return res.status(404).send("❌ User not found");

    // Delete all images uploaded by this user
    await Image.deleteMany({ uploadedBy: user._id });

    // Delete the user account
    await User.findByIdAndDelete(user._id);

    // Logout the user after deletion
    req.logout(function (err) {
      if (err) return next(err);
      res.redirect("/"); // Redirect to home after account deletion
    });
  } catch (err) {
    console.error("Error deleting account:", err);
    res.status(500).send("⚠️ Error deleting account");
  }
});

module.exports = router;
