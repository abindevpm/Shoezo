 const User = require("../models/userSchema")
 const mongoose = require("mongoose")
 const bcrypt = require('bcrypt')


 const loadlogin = (req,res)=>{
  if(req.session.admin){
    return res.redirect("/admin/dashboard")
  }
      res.render("adminlogin")
 }


  const login = async(req,res)=>{
    try {

    
      const {email,password} = req.body
      const admin = await User.findOne({email,isAdmin:true})

      if(admin){
        const passwordMatch = bcrypt.compare(password,admin.password);
           if(passwordMatch){
              req.session.admin=true;
              return res.redirect("/dashboard")
           }else{
            return res.redirect("/login")
           }
      }else{
        return res.redirect("/login")
      }

      
    } catch (error) {

       console.log("login errir",error)

       return res.redirect("/pageNotFound")
      
    }


  }




  const dash = (req,res)=>{

      return res.render("admindashboard")
  }



 module.exports = {

  loadlogin,
  login,
  dash
    
 }