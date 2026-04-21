const User = require("../../models/userSchema")
const mongoose = require("mongoose")
const bcrypt = require('bcrypt')


const loadlogin = (req, res) => {
  if (req.session.admin) {

    return res.redirect("/admin/dashboard");
  }
  res.render("adminlogin", { backendError: null });
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
    console.log(err, "Admin login Error");
    return res.render("adminlogin", {
      backendError: "Something went wrong"
    });
  }
};





const dashboard = (req, res) => {

  return res.render("dashboard")
}



const logout = (req, res) => {
  const userId = req.session.user;
  const passportData = req.session.passport;
  
  req.session.regenerate((err) => {
    if (err) {
      console.log("Admin logout regeneration error:", err);
    }
    if (userId) req.session.user = userId;
    if (passportData) req.session.passport = passportData;
    res.redirect("/admin/login");
  });
};





module.exports = {

  loadlogin,
  login,
  dashboard,
  logout,

}