 const User = require("../../models/userSchema")
 const mongoose = require("mongoose")
 const bcrypt = require('bcrypt')

const loadlogin = (req, res) => {
  if (req.session.admin) {

    return res.redirect("/admin/dashboard");
  }
  res.render("adminlogin");
};

 const login = async(req,res)=>{

  try{
    const {email,password} =  req.body
    console.log('password',password)
    const admin =  await User.findOne({email,isAdmin:true})
    console.log(admin)
      if(admin){
        console.log('admindfdfs')
        const passwordMatch =  await bcrypt.compare(password,admin.password)
        console.log(passwordMatch)
          if(passwordMatch){
             req.session.admin = true
           return res.redirect("/admin/dashboard")

          }else{
            return res.redirect("/admin/login")
          }
      }



   }catch(error){
      console.log(error)
   }

 }



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