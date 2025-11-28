const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const {userAuth,adminAuth} = require("../middlewares/auth")
const customerController = require("../controllers/admin/customerController")



 router.get("/login",adminController.loadlogin)
 router.post("/login",adminController.login)

router.get("/dashboard", adminController.dashboard)

  router.get("/logout",adminController.logout)

  
  // customer management
  router.get("/customers",adminAuth,customerController.customerinfo)
  router.get("/blockcustomer",adminAuth,customerController.blockUser)
  router.get("/unblockcustomer",adminAuth,customerController.unblockUser)

 // category management
//  router.get("/category",adminAuth,categoryController.categoryinfo)






module.exports = router;
