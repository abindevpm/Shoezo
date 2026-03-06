
const User = require("../models/userSchema");

const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = typeof req.session.user === 'object' ? req.session.user._id : req.session.user;
    const user = await User.findById(userId);

    if (!user || user.isBlocked) {
      req.session.destroy((err) => {
        if (err) console.log("Session destroy error:", err);
        return res.redirect("/login");
      });
      return;
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
  return res.redirect("/admin/login");
};

module.exports = {
  userAuth,
  adminAuth
};


