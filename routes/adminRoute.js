const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const { userAuth, adminAuth } = require("../middlewares/auth")
const customerController = require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const brandController = require("../controllers/admin/brandController")
const productController = require("../controllers/admin/productController")
const { uploadProduct } = require("../middlewares/multer")
const couponController = require("../controllers/admin/couponController")
const SalesReportController = require("../controllers/admin/salesReportController")
const adminOrderController = require("../controllers/admin/adminOrderController")





// admin login
router.get("/login", adminController.loadlogin)
router.post("/login", adminController.login)

// admin dashboard
router.get("/dashboard", adminAuth, adminController.dashboard)

//  admin logout
router.get("/logout", adminController.logout)
    
// customer management
router.get("/customers", adminAuth, customerController.customerinfo)
router.patch("/blockcustomer", adminAuth, customerController.blockUser)
router.patch("/unblockcustomer", adminAuth, customerController.unblockUser)

//  category management
router.get("/category", adminAuth, categoryController.categoryInfo)
router.post("/addCategory", adminAuth, categoryController.addCategory)
router.put("/edit-category/:id", adminAuth, categoryController.editCategory)
router.patch("/toggle-category/:id", adminAuth, categoryController.toggleCategory)
router.post("/manage-category-offer", adminAuth, categoryController.manageCategoryOffer)
router.delete("/remove-category-offer", adminAuth, categoryController.removeCategoryOffer);

// brand management

router.get("/brand", adminAuth, brandController.loadBrands)
router.post("/add-brand", adminAuth, brandController.addBrand);
router.put("/edit-brand/:id", adminAuth, brandController.editBrand)
router.patch("/toggle-brand/:id", adminAuth, brandController.toggleBrand);





// product managemant
router.get("/products", adminAuth, productController.loadProducts);
router.get("/add-products", adminAuth, productController.loadAddProducts)
router.post("/add-product", adminAuth, uploadProduct.array("images", 10), productController.AddProducts);
router.get("/edit-product/:id", adminAuth, productController.loadEditProduct)
router.put("/edit-product/:id", adminAuth, uploadProduct.array("images", 10), productController.updateProduct);
router.patch("/delete-product/:id", adminAuth, productController.deleteProduct)
router.delete("/delete-product-image/:productId/:imgName", adminAuth, productController.deleteProductImage);
router.patch("/toggle-product/:id", adminAuth, productController.toggleProduct);
router.post("/manage-product-offer", adminAuth, productController.manageProductOffer);
router.delete("/remove-product-offer", adminAuth, productController.removeProductOffer);


// order management
router.get("/orders", adminAuth, adminOrderController.loadOrders);
router.get("/orders/details/:id", adminAuth, adminOrderController.getOrderDetailsAdmin);
router.get("/orders/edit/:id", adminAuth, adminOrderController.getEditOrderAdmin);
router.patch("/orders/update-status", adminAuth, adminOrderController.updateOrderStatus);


// return requests
router.get("/return-requests", adminAuth, adminOrderController.loadReturnRequests);
router.patch("/orders/approve-item-return/:orderId/:itemId", adminAuth, adminOrderController.approveItemReturn);
router.patch("/orders/reject-item-return/:orderId/:itemId", adminAuth, adminOrderController.rejectItemReturn);


// individual item management
router.patch("/orders/cancel-item/:orderId/:itemId", adminAuth, adminOrderController.cancelItemAdmin);
router.patch("/orders/update-item-status", adminAuth, adminOrderController.updateItemStatusAdmin);
router.patch("/orders/restock-item/:orderId/:itemId", adminAuth, adminOrderController.restockItem);


// coupon management
router.get("/coupons", adminAuth, couponController.loadCouponPage)
router.post("/createCoupon", adminAuth, couponController.createCoupon)
router.patch("/toggleCoupon/:id", adminAuth, couponController.toggleCouponStatus)
router.patch("/updateCoupon/:id", adminAuth, couponController.updateCoupon)
router.delete("/delete-coupon/:id",adminAuth,couponController.deleteCoupon)

// sales Report
router.get("/sales-report", adminAuth, SalesReportController.loadSalesReport)
router.get("/sales-report/download/pdf", adminAuth, SalesReportController.SalesReportPDF);
router.get("/sales-report/download/excel", adminAuth, SalesReportController.downloadSalesReportExcel);





module.exports = router;
