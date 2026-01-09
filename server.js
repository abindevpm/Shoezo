const express = require("express");
const connectDB = require("./config/db");
const app = express();
const path = require("path");
require("dotenv").config();
const userRoute = require("./routes/userRoute")
const adminRoute = require("./routes/adminRoute");

const session = require("express-session")
const passport = require("./config/passport")
const { userAuth, adminAuth } = require("./middlewares/auth");




connectDB();


app.set("views", [
  path.join(__dirname, "views/user"),
  path.join(__dirname, "views/admin")
]);
app.set("view engine", "ejs");


app.use(express.static("public"));






app.use("/uploads", express.static("public/uploads"));



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// session handling 
app.use(session({
  secret:process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:true,
  cookie:{
    secure:false,
    httpOnly:true,
    maxAge: 72 * 60 * 60 * 1000   

  }


}))



app.use(passport.initialize())
app.use(passport.session())

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});




// Routes

app.use("/",userRoute)
app.use("/user",userAuth,userRoute)
app.use("/admin",adminRoute)



// Server
app.listen(process.env.PORT, () => {
  console.log("Server running on port " + process.env.PORT);
});
