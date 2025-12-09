const User = require("../../models/userSchema");

const customerinfo = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }

    const limit = 3;

  
    const userData = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } }
      ]
    })
        
     .sort({ 
  lastLogin: -1,  
  _id: -1          
})     

      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    
    const count = await User.countDocuments({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } }
      ]
    });

  
    return res.render("customers", {
      customers: userData,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      search: search
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


module.exports = {
  customerinfo,
  blockUser,
  unblockUser,
};



