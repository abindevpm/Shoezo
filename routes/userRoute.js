const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");



router.get("/pageNotFound",userController.pageNotFound)

 router.get("/",userController.loadHomepage)
 router.get("/landingpage",userController.landingpage)
 router.get("/pageNotFound",userController.pageNotFound)
 router.get("/signup",userController.loadSignup)
 router.post("/signup",userController.signup)
 router.post("/otp",userController.otp)
 router.post("/resend-otp",userController.resendOtp)
 
  router.get('/login',userController.loadlogin)
  router.post("/login",userController.login)

  router.get("/logout",userController.logout)



  router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);


router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {

    // ⭐ VERY IMPORTANT ⭐
    req.session.user = req.user._id;

    res.redirect("/");
  }
);







   module.exports =  router;