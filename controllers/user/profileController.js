const User = require("../../models/userSchema")
const bcrypt = require("bcrypt");
const transporter = require("../../config/nodemailer");


const loadProfile = async(req,res)=>{
    try {
        if(!req.session.user){
            return res.redirect("login")
        }
        const user = await User.findById(req.session.user._id);
        if(!user)return res.redirect("login");

         res.render("profile",{user})

    } catch (error) {
        console.log(error,"load Profile error")
        res.status(500).send("server error")
        
    }
}

const loadEditProfile = async(req,res)=>{
    try {
        const user = await User.findById(req.session.user._id)
        if(!user)return res.redirect("login")
            res.render("edit-profile",{user})
        
    } catch (error) {
        
    }
}


const editProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userId = req.session.user._id;

    if (!name || name.trim().length < 3) {
      return res.redirect("/user/edit-profile");
    }


    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return res.redirect("/user/edit-profile");
    }

    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name: name.trim(),
        phone: phone || ""
      },
      { new: true }
    );


    req.session.user = updatedUser;

    return res.redirect("/user/profile");

  } catch (error) {
    console.log("Edit profile error:", error);
    return res.redirect("/user/edit-profile");
  }
};

const uploadProfileImage = async(req,res)=>{

try{

    if(!req.file){
        return res.redirect("login")

    }
    const imagePath = "/uploads/profile-images/" + req.file.filename;
    const updatedUser = await User.findByIdAndUpdate(
        req.session.user._id,
        {profileImage:imagePath},
        {new: true}
    
    )

    req.session.user = updatedUser;
     req.session.user.profileImage = imagePath;

    res.redirect("profile")

}catch(error){
    console.log(error,"Profile picture error")
    res.redirect("profile")

}


}



const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user._id;

    
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.redirect("edit-profile");
    }

    
    if (newPassword.length < 6) {
      return res.redirect("edit-profile");
    }

    
    if (newPassword !== confirmPassword) {
      return res.redirect("edit-profile");
    }

    const user = await User.findById(userId);

    
    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.redirect("edit-profile?error=currentPassword");
    }


    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    
    return res.redirect("profile");

  } catch (error) {
    console.log("Change password error:", error);
    return res.redirect("edit-profile");
  }
};


const sendEmailOtp = async(req,res)=>{
  try{

    const {email} = req.body
   const otp = Math.floor(1000 + Math.random() * 9000);


    req.session.emailOtp = otp;
    req.session.newEmail = email;
    req.session.emailOtpExpiry = Date.now()+5*60*1000;

      console.log(otp)

  await transporter.sendMail({
    from:process.env.NODEMAILER_EMAIL,
    to:email,
    subject:"SHOEZO Email Verification",
    html:`<h3>Your OTP: ${otp}</h3><p>Valid for 5 minutes</p>`
   
  })

    res.json({ success: true });

  }catch(error){
        console.log(err);
    res.json({ success: false, message: "OTP sending failed" });
  }

  }


  const loadVerifyEmailOtp = async (req, res) => {
  try {

  
    if (!req.session.emailOtp || !req.session.newEmail) {
      return res.redirect("profile");
    }

    res.render("verify-email-otp", {
      error: null,
         email: req.session.newEmail 
    });

  } catch (error) {
    console.log("Load verify email otp error:", error);
    res.redirect("profile");
  }
};

const verifyEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.newEmail) {
      return res.json({ success: false, message: "Session expired" });
    }

    if (
      !req.session.emailOtp ||
      Date.now() > req.session.emailOtpExpiry
    ) {
      return res.json({ success: false, message: "OTP expired" });
    }

    if (parseInt(otp) !== req.session.emailOtp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    await User.findByIdAndUpdate(req.user._id, {
      email: req.session.newEmail
    });

    
    req.session.emailOtp = null;
    req.session.emailOtpExpiry = null;
    req.session.newEmail = null;

    return res.json({ success: true });

  } catch (err) {
    console.log(err);
    return res.json({ success: false, message: "Something went wrong" });
  }
};



const resendEmailOtp = async(req,res)=>{
  try {
       if (!req.session.newEmail) {
      return res.json({
        success: false,
        message: "Session expired. Please try again."
      });
    }

        const otp = Math.floor(1000 + Math.random() * 9000);

          req.session.emailOtp = otp;
        req.session.emailOtpExpiry = Date.now() + 2 * 60 * 1000; 

            await transporter.sendMail({
      to: req.session.newEmail,
      subject: "Your Email Verification OTP",
      html: `<h2>Your OTP is ${otp}</h2>`
    });
    console.log(otp)

     return res.json({
      success: true,
      message: "OTP resent successfully"
    });

    
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: "Failed to resend OTP"
    });
  }
    
  }












const removeProfileImage = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    profileImage: ""
  });
  res.redirect("profile");
};







module.exports = {
    loadProfile,
    loadEditProfile,
    editProfile,
    uploadProfileImage,
    changePassword,
    sendEmailOtp,
    verifyEmailOtp,
    loadVerifyEmailOtp,
    removeProfileImage,
    resendEmailOtp
}