const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const productlistController = require("../controllers/user/productlistController")
const productDetailsController = require("../controllers/user/productDetailsController")
const profileController = require("../controllers/user/profileController")
const addressController = require("../controllers/user/addressController");
const cartController = require("../controllers/user/cartController")
const checkoutController = require("../controllers/user/checkoutController")
const orderController = require("../controllers/user/orderController")
const { uploadProfile } = require("../middlewares/multer")
const paymentController = require("../controllers/user/paymentController")
const WishlistController = require("../controllers/user/wishlistController")
const WalletController = require("../controllers/user/walletController")



const passport = require("passport");
const { userAuth } = require("../middlewares/auth");

// page Not found
router.get("/pageNotFound", userController.pageNotFound)

// user 
router.get("/", userController.loadHomepage)
router.get("/landingpage", userController.landingpage)
router.get("/pageNotFound", userAuth, userController.pageNotFound)
router.get("/signup", userController.loadSignup)
router.post("/signup", userController.signup)

router.post("/otp", userController.otp)
router.post("/resend-otp", userController.resendOtp)

router.get('/login', userController.loadlogin)
router.post("/login", userController.login)

// user logout
router.get("/logout", userController.logout)


// google auth
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  userController.googleCallback
);

// google referal

router.get("/complete-profile", userController.loadCompleteProfile);
router.post("/apply-referral-google", userAuth, userController.applyGoogleReferral);




//   product list  

router.get("/productlist", productlistController.loadShopPage)



// productdetails

router.get("/productdetails/:id", productDetailsController.loadProductDetails)


//  forgot pass
router.get("/forgot-password", userController.loadForgotPage);
router.post("/forgot-password", userController.sendResetOTP);

router.get("/verify-otp", userController.loadOtpPage);
router.post("/verify-otp", userController.verifyOtp);


router.get("/reset-password", userController.loadResetPage);
router.post("/reset-password", userController.resetPassword);




//  user profile
router.get("/profile", userAuth, profileController.loadProfile)
router.get("/edit-profile", userAuth, profileController.loadEditProfile)
router.put("/edit-profile", userAuth, profileController.editProfile)
router.post("/upload-profile-image", userAuth, uploadProfile.single("profileImage"), profileController.uploadProfileImage)
router.patch("/change-password", userAuth, profileController.changePassword)

router.post("/send-email-otp", userAuth, profileController.sendEmailOtp);
router.get("/verify-email-otp", profileController.loadVerifyEmailOtp);
router.post("/verify-email-otp", userAuth, profileController.verifyEmailOtp);
router.post("/resend-email-otp", userAuth, profileController.resendEmailOtp)
router.delete("/remove-profile-image", userAuth, profileController.removeProfileImage);



//  address management
router.get("/address", userAuth, addressController.loadAddresses)
router.get("/addAdress", userAuth, addressController.loadaddAdresses)
router.post("/addAdress", userAuth, addressController.addAdress)
router.delete("/address/delete/:addressId", userAuth, addressController.deleteAddress)
router.get("/editAddress/:id", userAuth, addressController.loadEditAddress)
router.put("/updateAddress/:id", userAuth, addressController.updateAddress)
router.patch("/address/set-default/:id", userAuth, addressController.setDefaultAddress)


//  cart management
router.get("/cart", userAuth, cartController.loadCart)
router.post("/cart/:id", userAuth, cartController.addToCart);
router.patch("/cart/update-qty", userAuth, cartController.updateCartQty)
router.delete("/cart/remove-item", userAuth, cartController.removeCartItem);


//   checkout management
router.get("/checkout", userAuth, checkoutController.loadCheckout);
router.post("/checkout/add-address", userAuth, checkoutController.addAddressCheckout);
router.post("/place-order", userAuth, checkoutController.placeOrder);
router.get("/order-success", userAuth, checkoutController.loadOrderSuccess);




//  order managemant

router.get("/orders", userAuth, orderController.loadorders)
router.get("/orders/:id", userAuth, orderController.getOrderDetails)
router.get("/orders/track/:id", userAuth, orderController.loadTrackOrder)
router.get("/orders/track/:id/:itemId", userAuth, orderController.loadTrackOrder)
router.patch("/orders/cancel/:orderId", userAuth, orderController.cancelOrder)
router.patch("/orders/cancel-item/:orderId/:itemId", userAuth, orderController.cancelOrderItem)
router.patch("/orders/return/:orderId", userAuth, orderController.returnOrder)
router.patch("/orders/return-item/:orderId/:itemId", userAuth, orderController.returnOrderItem)
router.get("/orders/invoice/:orderId", userAuth, orderController.downloadInvoice)

// order-failure
router.get("/order-failure", userController.orderFailure);



//  payment
router.post("/create-order", userAuth, paymentController.createOrder)
router.post("/verify-payment", userAuth, paymentController.verifyPayment)
router.post("/mark-order-failed", userAuth, paymentController.markOrderFailed)
router.post("/orders/retry-payment/:orderId", userAuth, paymentController.retryPayment);


// Wishlist
router.get("/wishlist", userAuth, WishlistController.getWishlist)
router.post("/wishlist/add", userAuth, WishlistController.addToWishlist)
router.delete("/wishlist/remove", userAuth, WishlistController.removeFromWishlist)
router.post("/wishlist/move-to-cart", userAuth, WishlistController.moveToCart);

// referal page
router.get("/referal", userAuth, userController.loadReferralPage)

// wallet 

router.get("/wallet", userAuth, WalletController.loadWallet)

// coupon
router.get("/available-coupons", userAuth, userController.getAvailableCoupons);
router.post("/apply-coupon", userAuth, userController.applyCoupon);
router.delete("/remove-coupon", userAuth, userController.removeCoupon);



module.exports = router;
