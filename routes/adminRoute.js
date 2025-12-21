const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const {userAuth,adminAuth} = require("../middlewares/auth")
const customerController = require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const brandController  = require("../controllers/admin/brandController")
const productController = require("../controllers/admin/productController")
const upload = require("../middlewares/multer");





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
 router.patch("/toggle-category/:id",adminAuth,categoryController.toggleCategory)

 // brand management

  router.get("/brand",adminAuth,brandController.loadBrands)
  router.post("/add-brand", adminAuth, brandController.addBrand);
  router.post("/edit-brand/:id",adminAuth,brandController.editBrand)
  router.patch("/toggle-brand/:id",adminAuth,brandController.toggleBrand);




  //  product managemant
 router.get("/products", adminAuth, productController.loadProducts);
 router.get("/add-products",adminAuth,productController.loadAddProducts)
router.post("/add-product",upload.array("images", 3), productController.AddProducts);
router.get("/edit-product/:id",productController.loadEditProduct)
router.post("/edit-product/:id",upload.array("images",4),productController.updateProduct);
 router.get("/delete-product/:id",productController.deleteProduct)
 router.patch("/delete-product/:id",productController.deleteProduct)
 router.delete("/delete-product-image/:productId/:imgName", productController.deleteProductImage);







module.exports = router;
