const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const {userAuth,adminAuth} = require("../middlewares/auth")
const customerController = require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")




  // admin login
 router.get("/login",adminController.loadlogin)
 router.post("/login",adminController.login)

  // admin dashboard
router.get("/dashboard", adminController.dashboard)

//  admin logout
  router.get("/logout",adminController.logout)

  
  // customer management
  router.get("/customers",adminAuth,customerController.customerinfo)
  router.get("/blockcustomer",adminAuth,customerController.blockUser)
  router.get("/unblockcustomer",adminAuth,customerController.unblockUser)

//  category management
 router.get("/category",adminAuth,categoryController.categoryInfo)
 router.post("/addCategory",adminAuth,categoryController.addCategory)
 router.post("/edit-category/:id",adminAuth,categoryController.editCategory)
 router.post("/delete-category/:id",adminAuth,categoryController.deleteCategory)


module.exports = router;
