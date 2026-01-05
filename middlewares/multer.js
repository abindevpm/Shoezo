const multer = require("multer");
const path = require("path");

/* ========= PRODUCT IMAGE STORAGE ========= */
const productStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/product-images"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

/* ========= PROFILE IMAGE STORAGE ========= */
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/profile-images"));
  },
  filename: function (req, file, cb) {
    cb(
      null,
      req.session.user._id +
        "-" +
        Date.now() +
        path.extname(file.originalname)
    );
  }
});

/* ========= FILE FILTER ========= */
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files allowed"), false);
  }
};

/* ========= MULTER INSTANCES ========= */
const uploadProduct = multer({
  storage: productStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadProfile = multer({
  storage: profileStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
});

module.exports = {
  uploadProduct,
  uploadProfile
};
