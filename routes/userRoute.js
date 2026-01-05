const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const productlistController = require("../controllers/user/productlistController")
const productDetailsController = require("../controllers/user/productDetailsController")
const profileController = require("../controllers/user/profileController")
const {uploadProfile} = require("../middlewares/multer")



const passport = require("passport");
const { userAuth } = require("../middlewares/auth");

 // page Not found
router.get("/pageNotFound",userController.pageNotFound)

 // user 
 router.get("/",userController.loadHomepage)
 router.get("/landingpage",userController.landingpage)
 router.get("/pageNotFound",userAuth,userController.pageNotFound)
 router.get("/signup",userController.loadSignup)
 router.post("/signup",userController.signup)

 router.post("/otp",userController.otp)
 router.post("/resend-otp",userController.resendOtp)
 
  router.get('/login',userController.loadlogin)
  router.post("/login",userController.login)
  
  // user logout
  router.get("/logout",userController.logout)


  // google auth
  router.get("/auth/google",passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/signup" }),(req, res) => {

    
    req.session.user = req.user._id;

    res.redirect("/");
  }
);


   //   product list  

   router.get("/productlist",productlistController.loadShopPage)


   // productdetails

router.get("/productdetails/:id",productDetailsController.loadProductDetails)


//  forgot pass
router.get("/forgot-password",userController.loadForgotPage);
router.post("/forgot-password", userController.sendResetOTP);

router.get("/verify-otp", userController.loadOtpPage);
router.post("/verify-otp", userController.verifyOtp);


router.get("/reset-password", userController.loadResetPage);
router.post("/reset-password", userController.resetPassword);




//  user profile
 router.get("/profile", profileController.loadProfile)
router.get("/edit-profile", profileController.loadEditProfile)
router.post("/edit-profile", profileController.editProfile)
router.post("/upload-profile-image",userAuth,uploadProfile.single("profileImage"),profileController.uploadProfileImage)
router.post("/change-password",userAuth,profileController.changePassword)

router.post("/send-email-otp", userAuth,profileController.sendEmailOtp);
router.get("/verify-email-otp",profileController.loadVerifyEmailOtp);
router.post("/verify-email-otp", userAuth,profileController.verifyEmailOtp);
router.post("/resend-email-otp",userAuth,profileController.resendEmailOtp)
router.get("/remove-profile-image",userAuth,profileController.removeProfileImage);



   module.exports =  router;
