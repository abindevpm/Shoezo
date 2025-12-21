
const User = require("../../models/userSchema")
const Product = require("../../models/productSchema");

const env = require("dotenv").config()

const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt")

const loadHomepage = async (req, res) => {
  try {
    const userId = req.session.user;
    let userData = null;

    if (userId) {
      userData = await User.findById(userId);
    }


    if(userData && userData.isBlocked){
      req.session.user=null;
      return res.redirect('/login?isBlocked=true')
    }


    // FEATURED PRODUCTS (optional)
    const featuredProducts = await Product.find({ isDeleted:true,isListed:true })
      .sort({ createdAt: -1 })
      .limit(3);

    return res.render("home", { 
      user: userData,
      featuredProducts  // <-- FIXED (NOW AVAILABLE IN EJS)
    });

  } catch (error) {
    console.log("Home page error:", error);
    return res.status(500).send("Server error");
  }
};



const landingpage = async (req, res) => {
  try {
    res.render("landingpage");
  } catch (error) {
    console.log("Landing page error", error);
    res.status(500).send("Server side error");
  }
};

const pageNotFound = async (req, res) => {

  try {
    res.render("404")
  } catch (error) {
    res.redirect("home")
  }

}

const loadSignup = async (req, res) => {
  try {
    return res.render("signup")

  } catch (error) {
    console.log("signup not found")
    res.status(500).send("server error")

  }

}



function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString()
}


async function sendVerificationEmail(email, otp) {

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
      }
    })

    const info = await transporter.sendMail({
  from: `"Shoezo 👟" <${process.env.NODEMAILER_EMAIL}>`,
  to: email,
  subject: "Verify your Shoezo account",
  html: `
  <div style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:20px;">
    <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:8px; overflow:hidden;">
      
      <!-- Header -->
      <div style="background:#000; padding:20px; text-align:center;">
        <h1 style="color:#ffffff; margin:0; letter-spacing:2px;">SHOEZO</h1>
        <p style="color:#cccccc; margin:5px 0 0;">Step into Style</p>
      </div>

      <!-- Body -->
      <div style="padding:30px; color:#333;">
        <h2 style="margin-top:0;">Verify Your Account</h2>
        <p>
          Thank you for signing up with <strong>Shoezo</strong> 👟  
          Please use the OTP below to verify your account.
        </p>

        <div style="margin:30px 0; text-align:center;">
          <span style="
            display:inline-block;
            background:#f0f0f0;
            padding:15px 30px;
            font-size:28px;
            letter-spacing:6px;
            font-weight:bold;
            border-radius:6px;
          ">
            ${otp}
          </span>
        </div>

        <p style="font-size:14px; color:#666;">
          ⏰ This OTP is valid for a limited time only.  
          Please do not share this code with anyone.
        </p>

        <p style="margin-top:20px;">
          If you didn’t request this, you can safely ignore this email.
        </p>

        <p style="margin-top:30px;">
          Happy shopping! 🛒 <br/>
          <strong>— Team Shoezo</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#f9f9f9; text-align:center; padding:15px; font-size:12px; color:#999;">
        © ${new Date().getFullYear()} Shoezo. All rights reserved.
      </div>

    </div>
  </div>
  `
});

    return info.accepted.length > 0

  } catch (error) {
    console.error("Error sendinf email", error)
    return false

  }

}

const resendOtp = async (req, res) => {
  try {
    if (!req.session.userData) {
      return res.status(400).json({ success: false, message: "Session expired" });
    }

    const newOtp = generateOtp();
    req.session.userOtp = newOtp;

     req.session.otpExpiry = Date.now() + (101* 1000); 

    const email = req.session.userData.email;

    const sent = await sendVerificationEmail(email, newOtp);

    if (!sent) {
      return res.status(500).json({ success: false, message: "Email failed" });
    }

    console.log("Resent OTP:", newOtp);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};





const signup = async (req, res) => {
  try {
    const { name, phone, email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.render("signup", { message: "All required fields must be filled" });
    }

    if (password !== confirmPassword) {
      return res.render("signup", { message: "Password does not match" });
    }

    const findUser = await User.findOne({ email });

    if (findUser) {
      return res.render("signup", { message: "User already exists" });
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      return res.render("signup", { message: "Email sending failed" });
    }

    req.session.userOtp = otp;
    req.session.otpExpiry = Date.now() + 10 * 1000;

    req.session.userData = { name, phone, email, password };

    res.render("otp");
    console.log("OTP Sent", otp);

  } catch (error) {
    console.error("Signup error", error);
    res.redirect("/pageNotFound");
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10)

    return passwordHash

  } catch (error) {

  }
}





const otp = async (req, res) => {
  try {
    const { otp } = req.body;

    
    if (!req.session.userOtp || !req.session.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP."
      });
    }

    
    if (Date.now() > req.session.otpExpiry) {
      req.session.userOtp = null;
      req.session.otpExpiry = null;

      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP."
      });
    }

    
    if (otp !== req.session.userOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    
    const user = req.session.userData;
    const passwordHash = await securePassword(user.password);

    const saveUserData = new User({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: passwordHash
    });

    await saveUserData.save();

    
    req.session.userOtp = null;
    req.session.otpExpiry = null;
    req.session.userData = null;

    req.session.user = saveUserData._id;

    res.json({ success: true, redirectUrl: "/" });

  } catch (error) {
    console.error("OTP Verify Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



const loadlogin = async (req, res) => {
  try {
    let message="";

    if(req.query.isBlocked==="true"){
      message="Your account has been blocked by admin"
    }
    if (req.session.user) {
      return res.redirect("login")
    } else {
      res.render("login",{message})
    }

  } catch (error) {
    res.redirect("/pageNotFound")

  }


}


const login = async (req, res) => {

  try {

    const { email, password } = req.body;

    const findUser = await User.findOne({ isAdmin: 0, email: email })

    if (!findUser) {
      return res.render("login", { message: "User not Found" })
    }

    if (findUser.isBlocked) {
      return res.render("login", { message: "User is Blocked by admin" })
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password)

    if (!passwordMatch) {
      return res.render("login", { message: "Incorrect Password" })
    }
    req.session.user = {
      _id:findUser._id,
      name:findUser.name,
      email:findUser.email
    }

     await User.findByIdAndUpdate(findUser._id, {
      lastLogin: new Date()
    });



    res.redirect("/")



  } catch (error) {
    console.error("login error", error)
    res.render("login", { message: "Login failed .please try Again" })

  }


}


const logout = async (req, res) => {

  req.session.destroy(err => {
    if (err) {
      console.log(err)
      return res.redirect("/pageNotFound")
    }
    res.redirect("/login")
  })

}



const productlist = async(req,res)=>{

  return res.render("productlist")
}


   const loadForgotPage = (req, res) => {
    res.render("forgot-password", { message: "" });
};

const sendResetOTP = async (req, res) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email });
    if (!user) {
      return res.render("forgot-password", { message: "Email does not exist" });
    }
    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("Your OTP is:",otp)

    // Save in session (SAFE)
    req.session.resetEmail = email;
    req.session.resetOtp = otp;

    // Send Email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is ${otp}`,
    });

    const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1****$2");

    return res.render("verify-otp", { message: "", maskedEmail });

  } catch (error) {
    console.log("OTP Error:", error);
    res.send("Server Error");
  }
};


const loadOtpPage = (req, res) => {
  const email = req.session.resetEmail || "";
  const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1****$2");

  res.render("verify-otp", { message: "", maskedEmail });
};


const verifyOtp = (req, res) => {
  const enteredOtp = req.body.otp;
  const storedOtp = req.session.resetOtp;
  const email = req.session.resetEmail;

  if (!email) {
    return res.redirect("/forgot-password"); // session expired
  }

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1****$2");

  if (enteredOtp !== storedOtp) {
    return res.render("verify-otp", { 
      message: "Invalid OTP",
      maskedEmail 
    });
  }

  return res.redirect("/reset-password");
};




const loadResetPage = (req, res) => {
  res.render("reset-password", { message: "" });
};

const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const email = req.session.resetEmail;

    if (!email) {
      return res.redirect("/forgot-password");
    }

    if (!password || !confirmPassword) {
      return res.render("reset-password", { message: "All fields required" });
    }

    if (password !== confirmPassword) {
      return res.render("reset-password", { message: "Passwords do not match" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );

    // Clear session data
    delete req.session.resetEmail;
    delete req.session.resetOtp;

    return res.redirect("/login");

  } catch (error) {
    console.log("Reset Password Error:", error);
    res.send("Server Error");
  }
};






module.exports = {
  loadHomepage,
  landingpage,
  pageNotFound,
  loadSignup,
  signup,
  otp,
  loadlogin,
  login,
  logout, resendOtp,
  productlist,
  loadForgotPage,
sendResetOTP,
loadOtpPage,
verifyOtp,
loadResetPage,
resetPassword

}