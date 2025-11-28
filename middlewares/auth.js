// const User =  require("../models/userSchema")

// const userAuth = (req,res,next)=>{
  
    
//        if(req.session.user){
//          User.findById(req.session.user)

//         .then(data=>{
//             if(data && !data.isBlocked){
//             return      next()
//             }else{
//                return  res.redirect("/login")
//             }
//         })
//         .catch(error=>{
//             console.log(error,"Error in userAuth middleware")
//             res.status(500).send("Internal Server Error")
//         })

//        }else{
//         return  res.redirect("/login")
//        }
            

//     }




// const adminAuth = (req, res, next) => {
//     if (req.session.admin) {
//         next(); 
//     } else {
//         return res.redirect("/admin/login");
//     }
// };



//   module.exports = {
//     userAuth,
//     adminAuth
//   }




const User = require("../models/userSchema");

/* -------------------- USER AUTH -------------------- */
const userAuth = (req, res, next) => {
  if (req.session.user) {
    User.findById(req.session.user)
      .then(user => {
        if (user && !user.isBlocked) {
          return next();                 // allow user
        } else {
          return res.redirect("/login"); // blocked or not found
        }
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
