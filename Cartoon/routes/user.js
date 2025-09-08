const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const User = require("../models/users.js");
const Image = require("../models/image.js");
const {
  isLoggedIn,
  checkConversionLimit,
  checkDownloadPayment,
  checkSubscription,
} = require("../middleware");

const pythonPath = "C:/Program Files/Python311/python.exe";
// "C:/Program Files/Python311/python.exe";
const multer = require("multer");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// Static files (important!)
// app.use(express.static(path.join(__dirname, "public")));
// Setup multer for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

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
      return res.status(403).send("Unauthorized Access");
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(404).send("User not found");

    //  Added default value for outputImage
    res.render("User/NewImage.ejs", {
      user,
      activePage: "upload",
      outputImage: null,
    });
  })
);

// Upload & Convert (POST)
router.post(
  "/upload",
  isLoggedIn,
  upload.single("image"),
  wrapAsync(async (req, res) => {
    const { username } = req.params;
    const { style, method } = req.body; // method = manual / ai
    const user = await User.findById(req.user._id);

    if (req.user.username !== username) {
      return res.status(403).send("🚫 Unauthorized Access");
    }

    if (!req.file) return res.status(400).send("❌ No file uploaded");

    // File paths
    const inputFileName = req.file.filename; // e.g., imageName.png
    const inputPathFS = req.file.path;

    // Output folder
    const outputDir = path.join(__dirname, "../public/processed");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputPathFS = path.join(outputDir, inputFileName); // same as uploaded filename

    // Select Python script
    const pythonScript =
      method === "ai"
        ? path.join(__dirname, "../python/processAI.py")
        : path.join(__dirname, "../python/processImage.py");

    // Automatically decide AI model based on style
    let modelArg = "";
    if (method === "ai") {
      if (["ghibli", "dreamy", "custom"].includes(style)) {
        modelArg = "anime"; // Anime-related styles
      } else if (style === "cartoon") {
        modelArg = "cartoon-gan"; // Cartoon style
      }
    }

    // Build arguments for Python script
    const args =
      method === "manual"
        ? [pythonScript, inputPathFS, style, outputPathFS]
        : [pythonScript, inputPathFS, outputDir, modelArg || "anime", style];

    console.log("Running Python script with args:", args);

    // Execute Python script
    execFile(
      "C:/Users/BINGI UMESH/AppData/Local/Programs/Python/Python313/python.exe",
      args,
      async (err, stdout, stderr) => {
        console.log("Python Stdout:", stdout);
        console.log("Python Stderr:", stderr);

        if (err) {
          console.error("Python Execution Error object:", err);
          return res
            .status(500)
            .send("⚠️ Error processing image. Check server logs for details.");
        }

        // Save processed image info in DB
        const processedFileName =
          stdout
            .split("Output saved at")?.[1]
            ?.trim()
            ?.split(path.sep)
            ?.pop() || inputFileName;

        const newImage = new Image({
          title: req.file.originalname,
          originalImage: `uploads/${inputFileName}`,
          cartoonImage: `processed/${processedFileName}`,
          style,
          uploadedBy: req.user._id,
        });
        await newImage.save();

        await User.findByIdAndUpdate(req.user._id, {
          $inc: { uploads: 1, conversions: 1 },
        });

        const updatedUser = await User.findById(req.user._id);

        // Render result page
        res.render("User/NewImage.ejs", {
          user: updatedUser,
          originalImage: `uploads/${inputFileName}`,
          outputImage: `processed/${processedFileName}`,
          selectedStyle: style,
          activePage: "upload",
        });
      }
    );
  })
);

// URL: /:username/image/:id
router.get("/image/:id", isLoggedIn, async (req, res) => {
  try {
    const { username, id } = req.params;

    if (req.user.username !== username) {
      return res.status(403).send("Unauthorized Access");
    }

    const image = await Image.findById(id).populate("uploadedBy");
    if (!image) return res.status(404).send("Image not found");

    res.render("User/imageDetail.ejs", {
      user: req.user,
      image,
    });
  } catch (err) {
    console.error("Error fetching image detail:", err);
    res.status(500).send("⚠️ Error fetching image");
  }
});

//----------------------------------------- DELETE an image--------------------------------
// URL: /:username/image/:id
router.delete("/image/:id", isLoggedIn, async (req, res) => {
  try {
    const { username, id } = req.params;

    if (req.user.username !== username) {
      return res.status(403).send("🚫 Unauthorized Access");
    }

    const deletedImage = await Image.findOneAndDelete({
      _id: id,
      uploadedBy: req.user._id,
    });

    if (!deletedImage) {
      return res.status(404).send("⚠️ Image not found");
    }

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { uploads: -1, conversions: -1 },
    });

    const originalPath = path.join(
      __dirname,
      "..",
      "public",
      deletedImage.originalImage
    );
    const cartoonPath = path.join(
      __dirname,
      "..",
      "public",
      deletedImage.cartoonImage
    );

    console.log("Attempting to delete files:");
    console.log("Original:", originalPath);
    console.log("Cartoon:", cartoonPath);

    [originalPath, cartoonPath].forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("Deleted:", filePath);
      } else {
        console.warn("File not found:", filePath);
      }
    });

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

//-------------------------------Download Image----------------------------------------
router.get(
  "/image/:id/download",
  isLoggedIn,
  checkSubscription,
  async (req, res) => {
    try {
      const { username, id } = req.params;

      if (req.user.username !== username) {
        return res.status(403).send("Unauthorized Access");
      }

      const image = await Image.findById(id);
      if (!image) return res.status(404).send("Image not found");

      const user = await User.findById(req.user._id);
      if (user.plan === "Free Plan") {
        return res.redirect(`/${username}/pricing`);
      }

      // ✅ Build file path
      const filePath = path.join(__dirname, "..", "public", image.cartoonImage);

      // ✅ Force download
      res.download(filePath, image.title || "toonified.png");
    } catch (err) {
      console.error("Download error:", err);
      res.status(500).send("⚠️ Error downloading image");
    }
  }
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

// DELETE User Account
// URL: /:username
router.delete("/", isLoggedIn, async (req, res, next) => {
  try {
    const { username } = req.params;

    // Only allow logged-in user to delete their own account
    if (req.user.username !== username) {
      return res.status(403).send("🚫 Unauthorized Access");
    }

    // Find the user
    const user = await User.findOne({ username });
    if (!user) return res.status(404).send("❌ User not found");

    // Find all images uploaded by this user
    const images = await Image.find({ uploadedBy: user._id });

    // Delete image files from uploads and processed folders
    for (const img of images) {
      const originalPath = path.join(
        __dirname,
        "..",
        "public",
        img.originalImage
      );
      const cartoonPath = path.join(
        __dirname,
        "..",
        "public",
        img.cartoonImage
      );

      [originalPath, cartoonPath].forEach((filePath) => {
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log("Deleted file:", filePath);
          } catch (err) {
            console.warn("Error deleting file:", filePath, err);
          }
        }
      });
    }

    // Delete all images from DB
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
