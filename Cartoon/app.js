const express = require("express");
const app = express();
const ejsMate = require("ejs-mate");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/users.js");

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

passport.serializeUser(User.serializeUser()); //serialize users into session
passport.deserializeUser(User.deserializeUser()); //deserialize users into session

demo user
app.get("/demouser", async (req, res) => {
  let fakeUser = new User({
    email: "umesh@gmail.com",
    username: "umesh-web",
  });
  let registereduser = await User.register(fakeUser, "helloworld");
  res.send(registereduser);
});

app.get("/", (req, res) => {
  res.render("Home/Home.ejs");
});

app.get("/login", (req, res) => {
  res.render("auth/Login.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    // failureFlash: true,
  }),
  async (req, res) => {
    res.redirect("/");
  }
);

app.get("/register", (req, res) => {
  res.render("auth/Register.ejs");
});

app.post("/register", async (req, res) => {
  try {
    let { email, username, password } = req.body.user;
    let newUser = new User({
      email: email,
      username: username,
    });
    let registereduser = await User.register(newUser, password);
    console.log(registereduser);
    res.redirect("/");
  } catch (err) {
    res.redirect("/signup");
  }
});

app.get("/pricing", (req, res) => {
  res.render("Home/pricing.ejs");
});

app.listen(3000, () => {
  console.log("Server is running at port 3000");
});