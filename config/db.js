const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(" Local MongoDB Connected Successfully");
  } catch (error) {
    console.log("❌ Local MongoDB Connection Failed:", error.message);
  }
};

module.exports = connectDB;

