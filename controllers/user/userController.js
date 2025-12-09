
const User = require("../../models/userSchema")
const env = require("dotenv").config()

const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt")

const loadHomepage = async (req, res) => {
  try {

    const userId = req.session.user
    if (!userId) {
      return res.render("home");
    }

    
    const userData = await User.findById(userId);

    const products = [
      { name: "Nike Air", price: 2999 },
      { name: "Adidas Ultra", price: 3999 },
      { name: "Puma Runner", price: 1999 }
    ];

    return res.render("home", { user: userData, products });

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
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP :${otp}</b>`,


    })
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

    const { otp } = req.body

    console.log(otp)

    if (otp == req.session.userOtp) {

      const user = req.session.userData
      const passwordHash = await securePassword(user.password)

      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
      })

      await saveUserData.save();
      req.session.user = saveUserData._id;
      res.json({ success: true, redirectUrl: "/" })
    } else {
      res.status(400).send({ success: false, message: "Invalid OTP please try Again" })
    }

  } catch (error) {
    console.error("Error Verifying OTP", error)
    res.status(500).json({ success: false, message: "An error Occured" })

  }

}



const loadlogin = async (req, res) => {
  try {

    if (req.session.user) {
      return res.redirect("login")
    } else {
      res.render("login")
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
    req.session.user = findUser._id

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










module.exports = {
  loadHomepage,
  landingpage,
  pageNotFound,
  loadSignup,
  signup,
  otp,
  loadlogin,
  login,
  logout, resendOtp


}