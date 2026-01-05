const User = require("../../models/userSchema");


const customerinfo = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const searchQuery = {
      isAdmin: false,
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ]
    };

  const userData = await User.find(searchQuery)
      .sort({ lastLogin: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const count = await User.countDocuments(searchQuery);

    res.render("customers", {
      customers: userData,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      search
    });

  } catch (error) {
    console.log("Customer info error:", error);
    res.status(500).send("Server Error");
  }
};



 const blockUser = async(req,res)=>{
  
   try {

     let id = req.query.id;
     await User.updateOne({_id:id},{ $set:{ isBlocked:true}})

     res.redirect("/admin/customers")
    
   } catch (error) {

    res.redirect("/pageerror")
    
   }

 }

   const unblockUser = async(req,res)=>{
  let id = req.query.id

   await User.updateOne({_id:id},{$set:{isBlocked:false}})
    res.redirect("/admin/customers")
   }




module.exports = {
  customerinfo,
  blockUser,
  unblockUser,
};





