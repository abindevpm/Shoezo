const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const { userAuth, adminAuth } = require("../middlewares/auth")
const customerController = require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const brandController = require("../controllers/admin/brandController")
const productController = require("../controllers/admin/productController")
const { uploadProduct } = require("../middlewares/multer")





// admin login
router.get("/login", adminController.loadlogin)
router.post("/login", adminController.login)

// admin dashboard
router.get("/dashboard", adminController.dashboard)

//  admin logout
router.get("/logout", adminController.logout)


// customer management
router.get("/customers", adminAuth, customerController.customerinfo)
router.get("/blockcustomer", adminAuth, customerController.blockUser)
router.get("/unblockcustomer", adminAuth, customerController.unblockUser)

//  category management
router.get("/category", adminAuth, categoryController.categoryInfo)
router.post("/addCategory", adminAuth, categoryController.addCategory)
router.post("/edit-category/:id", adminAuth, categoryController.editCategory)
router.patch("/toggle-category/:id", adminAuth, categoryController.toggleCategory)

// brand management

router.get("/brand", adminAuth, brandController.loadBrands)
router.post("/add-brand", adminAuth, brandController.addBrand);
router.post("/edit-brand/:id", adminAuth, brandController.editBrand)
router.patch("/toggle-brand/:id", adminAuth, brandController.toggleBrand);




const adminOrderController = require("../controllers/admin/adminOrderController")

// product managemant
router.get("/products", productController.loadProducts);
router.get("/add-products", adminAuth, productController.loadAddProducts)
router.post("/add-product", adminAuth, uploadProduct.array("images", 3), productController.AddProducts);
router.get("/edit-product/:id", adminAuth, productController.loadEditProduct)
router.post("/edit-product/:id", adminAuth, uploadProduct.array("images", 3), productController.updateProduct);
router.patch("/delete-product/:id", adminAuth, productController.deleteProduct)
router.delete("/delete-product-image/:productId/:imgName", adminAuth, productController.deleteProductImage);
router.patch("/toggle-product/:id", adminAuth, productController.toggleProduct);

// order management
router.get("/orders", adminAuth, adminOrderController.loadOrders);
router.get("/orders/details/:id", adminAuth, adminOrderController.getOrderDetailsAdmin);
router.get("/orders/edit/:id", adminAuth, adminOrderController.getEditOrderAdmin);
router.post("/orders/update-status", adminAuth, adminOrderController.updateOrderStatus);
router.post("/orders/update-payment", adminAuth, adminOrderController.updatePaymentStatus);

// return requests
router.get("/return-requests", adminAuth, adminOrderController.loadReturnRequests);
router.post("/orders/approve-item-return/:orderId/:itemId", adminAuth, adminOrderController.approveItemReturn);
router.post("/orders/reject-item-return/:orderId/:itemId", adminAuth, adminOrderController.rejectItemReturn);

// individual item management
router.post("/orders/cancel-item/:orderId/:itemId", adminAuth, adminOrderController.cancelItemAdmin);
router.post("/orders/update-item-status", adminAuth, adminOrderController.updateItemStatusAdmin);
router.post("/orders/restock-item/:orderId/:itemId", adminAuth, adminOrderController.restockItem);




module.exports = router;
