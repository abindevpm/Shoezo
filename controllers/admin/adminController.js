 const User = require("../../models/userSchema")
 const mongoose = require("mongoose")
 const bcrypt = require('bcrypt')

const loadlogin = (req, res) => {
  if (req.session.admin) {

    return res.redirect("/admin/dashboard");
  }
  res.render("adminlogin");
};



const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
      return res.render("adminlogin", {
        backendError: "Invalid email or password"
      });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return res.render("adminlogin", {
        backendError: "Password is incorrect"
      });
    }

    req.session.admin = admin._id;
    return res.redirect("/admin/dashboard");

  } catch (err) {
    console.log(err);
    return res.render("adminlogin", {
      backendError: "Something went wrong"
    });
  }
};




  const dashboard = (req,res)=>{

      return res.render("dashboard")
  }


const logout = (req,res)=>{

  req.session.destroy(err=>{
    if(err){
      console.log(err,"Error in server")
      return res.redirect("/pageNotFound")
    }
    res.redirect("/admin/login")
  })

}




 module.exports = {

  loadlogin,
  login,
  dashboard,
  logout,
  
    
 }