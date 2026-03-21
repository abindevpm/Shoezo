const express = require("express");
const connectDB = require("./config/db");
const app = express();
const path = require("path");
require("dotenv").config();
const userRoute = require("./routes/userRoute")
const adminRoute = require("./routes/adminRoute");
const session = require("express-session")
const MongoStore = require("connect-mongo").default
const passport = require("./config/passport")
const { userAuth, adminAuth } = require("./middlewares/auth");
const cartCountMiddleware = require("./middlewares/cartCount");
const errorHandler = require("./middlewares/errorHandler")
const User = require("./models/userSchema");
const methodOverride = require('method-override');


const AppError = require('./routes/utils/AppError');



connectDB();


app.set("views", [
  path.join(__dirname, "views/user"),
  path.join(__dirname, "views/admin"),
  path.join(__dirname, "views/errors")
]);

app.set("view engine", "ejs");


app.use(express.static("public"));


app.use("/uploads", express.static("public/uploads"));



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));



app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,

  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI
  }),

  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 72 * 60 * 60 * 1000
  }

}))




app.use(passport.initialize())
app.use(passport.session())

app.use(async (req, res, next) => {
  try {
    
    let user = req.user;

    if (!user && req.session.user) {
      const userId = typeof req.session.user === 'object' ? req.session.user._id : req.session.user;
      user = await User.findById(userId);
    }
 
    if (user && user.isBlocked) {
      req.session.user = null;
      req.logout && req.logout(() => {}); 
      res.locals.user = null;
    } else {
      res.locals.user = user || null;
    }

    next();
  } catch (error) {
    console.error("Error in user middleware:", error);
    res.locals.user = null;
    next();
  }
});


app.use(cartCountMiddleware);




// Routes

app.use("/", userRoute)
app.use("/user", userAuth, userRoute)
app.use("/admin", adminRoute)



app.use((req, res, next) => {
  next(new AppError('Page Not Found', 404));
});

app.use(errorHandler)


// Server
app.listen(process.env.PORT, () => {
  console.log("Server running on port " + process.env.PORT);
});
