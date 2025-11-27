const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");



 router.get("/login",adminController.loadlogin)
 router.post("/login",adminController.login)

  router.get("/dashboard",adminController.dash)



module.exports = router;
