const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/shoezo", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Local MongoDB Connected Successfully");
  } catch (error) {
    console.log("❌ Local MongoDB Connection Failed:", error.message);
  }
};

module.exports = connectDB;

