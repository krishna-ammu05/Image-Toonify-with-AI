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
const userRouter = require("./routes/user.js");
const adminRouter = require("./routes/admin.js");

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views/"));
app.use(express.static(path.join(__dirname, "public/js")));
app.use(express.static(path.join(__dirname, "public/css")));
app.use(express.static(path.join(__dirname, "public/images")));
app.use(express.static(path.join(__dirname, "public/uploads")));
app.use(express.static(path.join(__dirname, "public/processed")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));
// Serve public folder
// app.use(express.static('public'));
// Parse form data
app.use(express.urlencoded({ extended: true }));
main()
  .then((res) => {
    console.log("DB Connected Sucessfully");
  })
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/cartoon");
}

const sessionOptions = {
  secret: "mysupersecretcode",
  resave: false,
  saveUninitialized: false,
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

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.isAdmin = req.session.isAdmin || false; // make user available globally
  next();
});

app.get("/", (req, res) => {
  res.render("Home/Home.ejs");
});

//Auth Route Handlier
app.use("/", authRouter);
//admin handler
app.use("/admin", adminRouter);

//user handler
app.use("/:username", userRouter);


app.listen(3000, () => {
  console.log("Server is running at port 3000");
});
