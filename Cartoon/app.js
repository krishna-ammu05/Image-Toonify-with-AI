const express = require("express");
const app = express();
const ejsMate = require("ejs-mate");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session"); //cookies
const passport = require("passport"); //using inbuilt hashing password
const LocalStrategy = require("passport-local");
const User = require("./models/users.js");

const authRouter = require("./routes/auth.js");

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views/"));
app.use(express.static(path.join(__dirname, "public/js")));
app.use(express.static(path.join(__dirname, "public/css")));
app.use(express.static(path.join(__dirname, "public/images")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

main()
  .then((res) => {
    console.log("DB Connected Sucessfully");
  })
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/toonify");
}

const sessionOptions = {
  secret: "mysupersecretcode",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
  httpOnly: true,
};

app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser()); //serialize users into session(login)
passport.deserializeUser(User.deserializeUser()); //deserialize users into session(logout)

app.get("/", (req, res) => {
  res.render("Home/Home.ejs");
});

//Auth Route Handlier
app.use("/", authRouter);

app.get("/pricing", (req, res) => {
  res.render("User/pricing.ejs");
});

app.get("/userdashboard", (req, res) => {
  res.render("User/Explore.ejs", {
    title: "Dashboard",
    user: {
      name: "John Doe",
      email: "johndoe@email.com",
      plan: "Free Plan",
      uploads: 12,
      conversions: 47,
      status: "Active",
    },
    images: [
      { url: "/images/sample1.png" },
      { url: "/images/sample2.png" },
      { url: "/images/sample3.png" },
    ],
  });
});

app.get("/profile", (req, res) => {
  res.render("User/Profile.ejs", {
    title: "My Profile",
    user: {
      name: "John Doe",
      email: "johndoe@email.com",
      plan: "Free Plan",
      uploads: 12,
      conversions: 47,
      status: "Active",
      avatar: "/images/user.png",
    },
  });
});

app.get('/dashboard', (req, res) => {
    const dashboardData = {
        stats: {
            totalUsers: 1200,
            activeUsers: 876,
            totalImages: 3400,
            conversions: 2890,
            revenue: "$12,450",
            growth: "18%"
        },
        recentUsers: [
            { name: "Alice Johnson", email: "alice@example.com", joined: "2025-08-01" },
            { name: "Bob Smith", email: "bob@example.com", joined: "2025-08-05" },
            { name: "Charlie Davis", email: "charlie@example.com", joined: "2025-08-08" }
        ],
        recentActivities: [
            { action: "Uploaded image", user: "Alice Johnson", time: "2 mins ago" },
            { action: "Cartoonified image", user: "Bob Smith", time: "10 mins ago" },
            { action: "Upgraded plan", user: "Charlie Davis", time: "30 mins ago" }
        ],
        systemHealth: {
            uptime: "99.98%",
            serverLoad: "45%",
            responseTime: "120ms"
        }
    };

    res.render('Admin/dashboard.ejs', { dashboardData });
});



app.get('/toonifiedImages', (req, res) => {
  // Dummy data
  const images = [
    {
      id: 1,
      url: "/uploads/dog-cartoon.png",
      name: "Dog Cartoon",
      convertedAt: new Date("2025-08-01"),
    },
    {
      id: 2,
      url: "/uploads/cat-anime.png",
      name: "Cat Anime",
      convertedAt: new Date("2025-08-10"),
    },
    {
      id: 3,
      url: "/uploads/selfie-sketch.png",
      name: "Selfie Sketch",
      convertedAt: new Date("2025-08-15"),
    },
  ];

  res.render("User/ToonifiedImages.ejs", {
    title: "My Toonified Images", //  add this
    images,
  });
});


app.get('/settings', (req, res) => {
  res.render('User/settings'); // No title needed, layout will handle sidebar
});

app.listen(3000, () => {
  console.log("Server is running at port 3000");
});