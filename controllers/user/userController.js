
const User = require("../../models/userSchema")
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema")
const Category = require("../../models/categorySchema")
const Brand = require("../../models/brandSchema")
const StatusCodes = require("../../routes/utils/statusCodes")


const env = require("dotenv").config()

const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt");
const { removeFromWishlist } = require("./wishlistController");

const loadHomepage = async (req, res) => {
  try {
    const userData = res.locals.user;


    if (userData && userData.isBlocked) {
      req.session.user = null;
      return res.redirect('/login?isBlocked=true')
    }


    console.log(req.session.user)


    const activeCategories = await Category.find({ isListed: true, isDeleted: false }).distinct("_id");
    const activeBrands = await Brand.find({ isListed: true, isDeleted: false }).distinct("_id");

    const featuredProductsRaw = await Product.find({
      isDeleted: false,
      isListed: true,
      category: { $in: activeCategories },
      brand: { $in: activeBrands }
    })
      .populate("category")
      .populate("brand")
      .populate("productOffer")
      .populate({ path: "category", populate: { path: "categoryOffer" } })
      .sort({ createdAt: -1 })
      .limit(6);

    const today = new Date();
    const featuredProducts = featuredProductsRaw.map(p => {
      const productObj = p.toObject();
      const v = productObj.variants && productObj.variants.length > 0 ? productObj.variants[0] : null;

      if (v) {
        let appliedDiscount = 0;


        if (productObj.productOffer &&
          productObj.productOffer.isActive &&
          productObj.productOffer.startDate <= today &&
          productObj.productOffer.endDate >= today) {
          appliedDiscount = Math.max(appliedDiscount, Number(productObj.productOffer.discountValue) || 0);
        }


        if (productObj.category &&
          productObj.category.categoryOffer &&
          productObj.category.categoryOffer.isActive &&
          productObj.category.categoryOffer.startDate <= today &&
          productObj.category.categoryOffer.endDate >= today) {
          appliedDiscount = Math.max(appliedDiscount, Number(productObj.category.categoryOffer.discountValue) || 0);
        }

        productObj.appliedDiscount = appliedDiscount;

        productObj.price = v.price;
        if (appliedDiscount > 0) {
          const base = Number(v.salePrice || v.price);
          productObj.offerPrice = Math.floor(base * (1 - appliedDiscount / 100));
        } else {
          productObj.offerPrice = v.salePrice || 0;
        }
      } else {
        productObj.price = 0;
        productObj.offerPrice = 0;
      }
      return productObj;
    });

    return res.render("home", {
      user: userData,
      featuredProducts
    });

  } catch (error) {
    console.log("Home page error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Server error");
  }
};



const landingpage = async (req, res) => {
  try {
    res.render("landingpage");
  } catch (error) {
    console.log("Landing page error", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Server side error");
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
    return res.render("signup", {
      formData: {}
    })

  } catch (error) {
    console.log("signup not found")
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("server error")

  }

}


const googleCallback = async (req, res) => {
  try {

    req.session.user = req.user._id.toString();

    if (req.user._isNewUser) {
      return res.redirect("/complete-profile");
    }

    res.redirect("/");

  } catch (error) {
    console.log("Google callback Error", error);
    res.redirect("/login");
  }
};




const loadCompleteProfile = async (req, res) => {
  try {
    res.render("complete-profile");
  } catch (error) {
    console.log("Complete profile error:", error);
    res.redirect("/");
  }
};



const applyGoogleReferral = async (req, res) => {
  try {

    const { referralCode } = req.body;

    if (!referralCode) {
      return res.redirect("/");
    }

    const refUser = await User.findOne({ referalCode: referralCode });

    if (!refUser) {
      return res.send("Invalid referral code");
    }

    const currentUser = await User.findById(req.session.user);

    if (!currentUser) {
      return res.redirect("/login");
    }

    if (currentUser.referredBy) {
      return res.redirect("/");
    }

    if (refUser._id.toString() === currentUser._id.toString()) {
      return res.send("Cannot refer yourself");
    }

  
    currentUser.referredBy = refUser._id;
    await currentUser.save();

    
    const couponCode = "REF" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const newCoupon = new Coupon({
      code: couponCode,
      discountType: "fixed",
      discountValue: 200,
      minPurchase: 500,
      startDate: new Date(),
      expiryDate: expiry,
      usageLimit: 1,
      isReferralCoupon: true,
      couponType: "New user Join",
      userId: refUser._id
    });

    await newCoupon.save();

    await User.updateOne(
      { _id: refUser._id },
      { $push: { redeemedUsers: currentUser._id } }
    );

  
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.NODEMAILER_EMAIL,
          pass: (process.env.NODEMAILER_PASSWORD || "").trim()
        }
      });

      transporter.sendMail({
        from: `"Shoezo 👟" <${process.env.NODEMAILER_EMAIL}>`,
        to: refUser.email,
        subject: "You've earned a Referral Reward! 🎁",
        html: `<h2>Hello ${refUser.name}!</h2>
               <p>Your friend joined Shoezo using your referral code.</p>
               <p>Your coupon code is:</p>
               <h3>${couponCode}</h3>`
      }).catch(emailErr => {
        console.log(`WARNING: Referral email failed background send: ${emailErr.message}`);
      });
    } catch (emailErr) {
      console.log(`WARNING: Referral email setup failed: ${emailErr.message}`);
    }

    res.redirect("/");

  } catch (error) {
    console.log("Apply referral error:", error);
    res.redirect("/");
  }
};



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

    req.session.otpExpiry = Date.now() + (101 * 1000);

    const email = req.session.userData.email;

    const sent = await sendVerificationEmail(email, newOtp);



    if (!sent) {
      return res.status(500).json({ success: false, message: "Email failed" });
    }

    console.log("Resent OTP:", newOtp);

    res.json({ success: true });

  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};





const signup = async (req, res) => {
  try {
    const { name, phone, email, password, confirmPassword, referalCode } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.render("signup", { message: "All required fields must be filled", formData: req.body });
    }

    if (password !== confirmPassword) {
      return res.render("signup", { message: "Password does not match", formData: req.body });
    }

    const findUser = await User.findOne({ email });

    if (findUser) {
      return res.render("signup", { message: "User already exists", formData: req.body });

    }

    if (referalCode) {
      const referrer = await User.findOne({ referalCode });
      if (!referrer) {
        return res.render("signup", { message: "Invalid referral code", formData: req.body });
      }
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      return res.render("signup", { message: "Email sending failed", formData: req.body });
    }

    req.session.userOtp = otp;
    req.session.otpExpiry = Date.now() + 102 * 1000;

    req.session.userData = { name, phone, email, password, referalCode };

    res.render("otp", { email });
    console.log("OTP Sent to", email, ":", otp);

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
  const fs = require('fs');
  const logFile = 'debug_otp.log';

  const log = (msg) => {
    const time = new Date().toISOString();
    fs.appendFileSync(logFile, `[${time}] ${msg}\n`);
    console.log(msg);
  };

  try {
    const { otp: enteredOtp } = req.body;
    log(`Verification started for OTP: ${enteredOtp}`);

    if (!req.session) {
      log("ERROR: Session object missing entirely");
      return res.status(500).json({ success: false, message: "Server error: Session missing" });
    }

    if (!req.session.userOtp || !req.session.otpExpiry) {
      log(`ERROR: Session OTP data missing. userOtp=${req.session.userOtp}, expiry=${req.session.otpExpiry}`);
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP."
      });
    }

    if (Date.now() > req.session.otpExpiry) {
      log("ERROR: OTP expired by time");
      req.session.userOtp = null;
      req.session.otpExpiry = null;
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP."
      });
    }

    if (enteredOtp !== req.session.userOtp) {
      log(`ERROR: Invalid OTP. Got=${enteredOtp}, Expected=${req.session.userOtp}`);
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }


    req.session.userOtp = null;
    req.session.otpExpiry = null;

    const userData = req.session.userData;
    if (!userData) {
      log("ERROR: userData missing in session");
      return res.status(400).json({
        success: false,
        message: "Session expired. Please sign up again."
      });
    }

    log(`Checking for existing user: ${userData.email}`);
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      log(`ERROR: User already exists: ${userData.email}`);
      return res.status(400).json({
        success: false,
        message: "User already exists with this email."
      });
    }

    log("Hashing password...");
    if (!userData.password) {
      log("ERROR: Password missing in userData");
      throw new Error("Password missing in session data");
    }
    const passwordHash = await securePassword(userData.password);
    if (!passwordHash) {
      log("ERROR: securePassword returned undefined");
      throw new Error("Password hashing failed");
    }

    const newReferralCode = "SH" + Math.random().toString(36).substring(2, 8).toUpperCase();

    log("Creating User instance with explicit empty addresses array...");
    const saveUserData = new User({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      password: passwordHash,
      referalCode: newReferralCode,
      addresses: []
    });

    log(`User object BEFORE save: ${JSON.stringify({
      ...saveUserData.toObject(),
      password: '[HASHED]'
    })}`);




    try {
      if (userData.referalCode) {
        log(`Processing referral: ${userData.referalCode}`);
        const referrer = await User.findOne({ referalCode: userData.referalCode });

        if (referrer) {
          if (referrer.email === userData.email) {
            log("User tried self referral");
          } else {
            log(`Referrer found: ${referrer.email}`);
            saveUserData.referredBy = referrer._id;

            const couponCode = "REF" + Math.random().toString(36).substring(2, 8).toUpperCase();
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);

            const newCoupon = new Coupon({
              code: couponCode,
              discountType: "fixed",
              discountValue: 200,
              minPurchase: 500,
              startDate: new Date(),
              expiryDate: expiry,
              usageLimit: 1,
              isReferralCoupon: true,
              couponType: "New user Join",
              userId: referrer._id
            });

            await newCoupon.save();

            await User.updateOne(
              { _id: referrer._id },
              { $push: { redeemedUsers: saveUserData._id } }
            );

            log("Referral reward generated and referrer updated");




            try {
              const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                  user: process.env.NODEMAILER_EMAIL,
                  pass: (process.env.NODEMAILER_PASSWORD || "").trim()
                }
              });


              transporter.sendMail({
                from: `"Shoezo 👟" <${process.env.NODEMAILER_EMAIL}>`,
                to: referrer.email,
                subject: "You've earned a Referral Reward! 🎁",
                html: `<h2>Hello ${referrer.name}!</h2>
                       <p>Your friend joined Shoezo.</p>
                       <p>Your coupon code is:</p>
                       <h3>${couponCode}</h3>`
              }).catch(emailErr => {
                log(`WARNING: Referral email failed background send: ${emailErr.message}`);
              });
              log("Referral email initiated (non-blocking)");
            } catch (emailErr) {
              log(`WARNING: Referral email failed: ${emailErr.message}`);
            }
          }
        } else {
          log(`Referrer not found for code: ${userData.referalCode}`);
        }
      }
    } catch (referralErr) {
      log(`CRITICAL WARNING: Referral logic failed, but continuing signup: ${referralErr.message}`);
    }

    log("Attempting to save new user...");
    await saveUserData.save();
    log("User saved successfully");

    req.session.userData = null;
    req.session.user = saveUserData._id


    log("Verification success. Redirecting...");
    res.json({ success: true, redirectUrl: "/" });

  } catch (error) {
    log(`CRITICAL ERROR: ${error.message}`);
    if (error.errors) {
      log(`Validation details: ${JSON.stringify(error.errors)}`);
    }
    log(`Stack: ${error.stack}`);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server Error: " + error.message
    });
  }
};



const loadlogin = async (req, res) => {
  try {
    let message = "";

     console.log(req.session)

    if (req.query.isBlocked === "true") {
      message = "Your account has been blocked by admin"
    }
    if (req.session.user) {
      return res.redirect("/")
    } else {
      res.render("login", { message })
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


    req.session.user = findUser._id.toString();

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

const productlist = async (req, res) => {


  try {

    const activeCategories = await Category.find({ isListed: true, isDeleted: false }).distinct("_id");
    const activeBrands = await Brand.find({ isListed: true, isDeleted: false }).distinct("_id");

    const products = await Product.find({
      isListed: true,
      isDeleted: false,
      category: { $in: activeCategories },
      brand: { $in: activeBrands }
    })
      .populate("category")
      .populate("brand")
      .populate("productOffer")

    const filteredProducts = products.filter(p => p.category && p.brand);

    const today = new Date();

    const updatedProducts = filteredProducts.map(product => {
      const variant = product.variants?.[0];

      if (!variant) return product

      const basePrice = variant.price;

      let productDiscount = 0;
      let categoryDiscount = 0;

      if (
        product.productOffer &&
        product.productOffer.isActive &&
        product.productOffer.startDate <= today &&
        product.productOffer.endDate >= today
      ) {
        productDiscount = product.productOffer.discountValue
      }

      if (
        product.category &&
        product.category.categoryOffer &&
        product.category.categoryOffer.isActive &&
        product.category.categoryOffer.startDate <= today &&
        product.category.categoryOffer.endDate >= today
      ) {
        categoryDiscount = product.category.categoryOffer.discountValue;
      }

      const finalDiscount = Math.max(productDiscount, categoryDiscount);

      const baseSalePrice = variant.salePrice || variant.price;
      const finalPrice = finalDiscount > 0
        ? Math.round(baseSalePrice * (1 - finalDiscount / 100))
        : baseSalePrice;

      return {
        ...product.toObject(),
        finalPrice,
        appliedDiscount: finalDiscount
      }
    })
    res.render("productlist", {
      products: updatedProducts
    })


  } catch (error) {
    console.log("Product List page error", error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).redirect("/pageNotFound")

  }
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

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("Your OTP is:", otp)


    req.session.resetEmail = email;
    req.session.resetOtp = otp;


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
    return res.redirect("/forgot-password");
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


    delete req.session.resetEmail;
    delete req.session.resetOtp;

    return res.redirect("/login");

  } catch (error) {
    console.log("Reset Password Error:", error);
    res.send("Server Error");
  }
};

const orderFailure = async (req, res) => {
  try {

    const orderId = req.query.orderId;

    if (!orderId) {
      return res.render("order-failure", { order: null });
    }

    const order = await Order.findById(orderId).populate("items.productId");

    if (!order) {
      return res.render("order-failure", { order: null });
    }

    res.render("order-failure", { order });

  } catch (error) {
    console.log("Order Failure Page Error:", error);
    res.render("order-failure", { order: null });
  }
};


const getAvailableCoupons = async (req, res) => {
  try {
    const today = new Date();
    const { subtotal } = req.query;
    const subtotalValue = subtotal ? Number(subtotal) : 0;
    const userId = req.user._id;

    const query = {
      isActive: true,
      startDate: { $lte: today },
      expiryDate: { $gt: today },
      $expr: { $lt: ["$usedCount", "$usageLimit"] },
      minPurchase: { $lte: subtotalValue },
      $or: [
        { userId: null },
        { userId: userId }
      ]
    };

    const coupons = await Coupon.find(query)
      .select("code discountValue discountType minPurchase expiryDate");

    res.json({ success: true, coupons });

  } catch (error) {
    console.log("Available Coupon error", error);
    res.json({ success: false });
  }
}
const applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.json({ success: false, message: "Coupon code required" });
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expiryDate: { $gt: new Date() }
    });

    if (!coupon) {
      return res.json({ success: false, message: "Invalid or Expired coupon" });
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return res.json({ success: false, message: "Coupon usage limit reached" });
    }

    const subtotal = req.session.subtotal || 0;

    if (subtotal < coupon.minPurchase) {
      return res.json({
        success: false,
        message: `Minimum purchase ₹${coupon.minPurchase} required`
      });
    }

    
    let discount = 0;

    if(coupon.discountType === "percentage"){
      discount = Math.round((subtotal * coupon.discountValue)/100);

       if(coupon.maxDiscount && discount > coupon.maxDiscount){
        discount = coupon.maxDiscount
       }
    }else{
        discount = coupon.discountValue
    }



    const finalTotal = subtotal - discount;

    req.session.discountAmount = discount;
    req.session.appliedCoupon = coupon.code;
    req.session.totalPrice = finalTotal;

    res.json({
      success: true,
      discount,
      finalTotal
    });

  } catch (error) {
    console.log("Apply coupon error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};


const removeCoupon = (req, res) => {
  req.session.discountAmount = 0;
  req.session.appliedCoupon = null;

  const subtotal = req.session.subtotal || 0;
  req.session.totalPrice = subtotal;

  res.json({ success: true, totalPrice: subtotal });
};




const loadReferralPage = async (req, res) => {
  try {
    const userId = req.session.user

    const user = await User.findById(userId)
    res.render("referal", {
      user: user
    })

  } catch (error) {
    console.log(error, "Referal page error");
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).res.redirect("/profile");
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
  resetPassword,
  orderFailure,
  getAvailableCoupons,
  applyCoupon,
  removeCoupon,
  loadReferralPage,
  googleCallback,
  loadCompleteProfile,
  applyGoogleReferral
}