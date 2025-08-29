const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const User = require("../models/users.js");
const Image = require("../models/image.js");
const { isLoggedIn } = require("../middleware.js");

const pythonPath = "C:/Program Files/Python311/python.exe";
const multer = require("multer");
const { execFile } = require('child_process');
const path = require("path");
const fs = require("fs");
const { spawn } = require('child_process');


// Static files (important!)
// app.use(express.static(path.join(__dirname, "public")));
// Setup multer for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
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

// routes/user.js
router.post("/:username/upload", isLoggedIn, upload.single("image"), wrapAsync(async (req, res) => {
  const { title, style } = req.body;
  const inputPath = req.file.path;
  const outputPath = `public/processed/processed_${Date.now()}.png`;

  const { exec } = require("child_process");

  // Run Python script
  exec(`python ./python/process_image.py "${inputPath}" "${style}" "${outputPath}"`, async (err, stdout, stderr) => {
    if (err) {
      console.error(stderr);
      return res.status(500).send("⚠️ Error processing image");
    }

    // Save image info to DB
    await Image.create({
      title,
      originalImage: inputPath.replace("public/", ""),   // e.g., uploads/xxx.jpg
      cartoonImage: outputPath.replace("public/", ""),   // e.g., processed/xxx.png
      style,
      uploadedBy: req.user._id
    });

    // Redirect to dashboard to show gallery
    res.redirect(`/users/${req.user.username}/dashboard`);
  });
}));


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
      outputImage: null  
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
    const { style } = req.body;

    if (req.user.username !== username) {
      return res.status(403).send("🚫 Unauthorized Access");
    }

    if (!req.file) return res.status(400).send("❌ No file uploaded");

    // Filenames and paths
    const inputFileName = req.file.filename;
    const inputPath = `/uploads/${inputFileName}`; // frontend path
    const inputPathFS = req.file.path; // filesystem path

    const outputFileName = `processed_${Date.now()}.png`;
    const outputDir = path.join(__dirname, "../public/processed");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputPathFS = path.join(outputDir, outputFileName); // filesystem path
    const outputPath = `/processed/${outputFileName}`; // frontend path

    // Call Python script
    execFile(
      "C:/Program Files/Python311/python.exe",
      [path.join(__dirname, "../python/processImage.py"), inputPathFS, style, outputPathFS],
      async (err, stdout, stderr) => {
        if (err) {
          console.error("Python Error:", err);
          console.error("Python Stderr:", stderr);
          return res.status(500).send("⚠️ Error processing image");
        }

        console.log("Python Stdout:", stdout);

        // Save image to DB
        const newImage = new Image({
          title: req.file.originalname,
          originalImage: `uploads/${inputFileName}`,  // save relative path
          cartoonImage: `processed/${outputFileName}`,
          style,
          uploadedBy: req.user._id,
        });
        await newImage.save();

        // Render frontend template
        res.render("User/NewImage.ejs", {
          user: req.user,
          originalImage: `uploads/${inputFileName}`,
          outputImage: `processed/${outputFileName}`,
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

//-----------------------------delete image----------------------------------
router.post("/images/delete/:id", isLoggedIn, wrapAsync(async (req, res) => {
  const image = await Image.findByIdAndDelete(req.params.id);
  if (image) {
    // optionally delete files from disk
    fs.unlinkSync(`public/${image.originalImage}`);
    fs.unlinkSync(`public/${image.cartoonImage}`);
  }
  res.redirect(`/users/${req.user.username}/toonifiedImages`);
}));

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
