
const User = require("../models/userSchema");

/* -------------------- USER AUTH -------------------- */
const userAuth = (req, res, next) => {
  if (req.session.user) {
    User.findById(req.session.user)
      .then(user => {
        if (user && !user.isBlocked) {
          return next();                 // allow user
        } 

        req.session.destroy(err=>{
          if(err) console.log("Session destroy ",err);
          return res.redirect("/login")

        })

      })
      .catch(error => {
        console.log("userAuth error:", error);
        return res.status(500).send("Internal Server Error");
      });
  } else {
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


