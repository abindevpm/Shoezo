
const User = require("../models/userSchema");

const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = typeof req.session.user === 'object' ? req.session.user._id : req.session.user;
    const user = await User.findById(userId);

    if (!user || user.isBlocked) {
      delete req.session.user;
      return res.redirect("/login");
    }


    req.user = user;
    next();

  } catch (error) {
    console.log("userAuth error:", error);
    return res.redirect("/login");
  }
};




const adminAuth = (req, res, next) => {
  if (req.session.admin) {
    return next();
  }
  console.log("Admin authentication failed. Session:", req.session);
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(401).json({ success: false, message: "Unauthorized. Please login again." });
  }
  return res.redirect("/admin/login");
};

module.exports = {
  userAuth,
  adminAuth
};

