
const User = require("../models/userSchema");

const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user._id);

    if (!user || user.isBlocked) {
      req.session.destroy(() => {
        return res.redirect("/login");
      });
      return;
    }

    req.session.user = user;
    req.user = req.session.user;
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


