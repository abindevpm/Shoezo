const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema")
const Product = require("../../models/productSchema")
const mongoose = require("mongoose")
const bcrypt = require('bcrypt');
const { orderFailure } = require("../user/userController");


const loadlogin = (req, res) => {
  if (req.session.admin) {

    return res.redirect("/admin/dashboard");
  }
  res.render("adminlogin", { backendError: null });
};




const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
      return res.render("adminlogin", {
        backendError: "Invalid email or password"
      });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return res.render("adminlogin", {
        backendError: "Password is incorrect"
      });
    }

    req.session.admin = admin._id;
    return res.redirect("/admin/dashboard");

  } catch (err) {
    console.log(err, "Admin login Error");
    return res.render("adminlogin", {
      backendError: "Something went wrong"
    });
  }
};





const dashboard =   async (req, res) => {
  
  try {

    const filter = req.query.type || "weekly";




    const totalOrders = await Order.countDocuments({status:"Placed"})
    const totalUsers = await User.countDocuments();
    const totalProduct = await Product.countDocuments()

    const revenueData = await Order.aggregate([{$match:{status:"Placed"}},{$group:{_id:null,total:{$sum:"$totalAmount"}}}])

    const totalRevenue = revenueData[0]?.total || 0;

    const overallStats = {
      revenue:totalRevenue,
      orders:totalOrders,
      products:totalProduct,
      customers:totalUsers
    }

    const recentOrders = await Order.find()
    .sort({createdAt:-1})
    .limit(5)
    .populate("userId");


 const topProducts = await Order.aggregate([
  {$match:{status:{$ne:"Cancelled"}}},
  {$unwind: "$items"},

  {$group:{
    _id:"$items.productId",
    totalSales:{$sum:"$items.quantity"},
    totalRevenue:{$sum:"$items.finalPrice"}

  }

},
{$sort:{totalSales:-1}},
{$limit:10},

{$lookup:{
  from:"products",
  localField:"_id",
  foreignField:"_id",
  as:"productInfo"
}},

{$unwind:"$productInfo"}

 ])


const topCategories = await Order.aggregate([
  {$match:{status:{$ne:"Cancelled"}}},

  {$unwind:"$items"},

  {
    $lookup:{
      from:"products",
      localField:"items.productId",
      foreignField:"_id",
      as:"product"
    }
  },
  {$unwind:"$product"},

  {$group:{
    _id:"$product.category",
    totalSales:{$sum:"$items.quantity"}
  }},
 
  {$sort:{totalSales:-1}},

  {$limit:10},

{
    $lookup: {
      from: "categories", 
      localField: "_id",
      foreignField: "_id",
      as: "categoryInfo"
    }
  },

  { $unwind: "$categoryInfo" }


])

const topBrands = await Order.aggregate([
  {$match:{status:{$ne:"Cancelled"}}},

   {$unwind:"$items"},

   {
    $lookup:{
      from:"products",
      localField:"items.productId",
      foreignField:"_id",
      as:"product"
    }
   },
   {$unwind:"$product"},

   {
    $group:{
      _id:"$product.brand",
      totalSales:{$sum:"$items.quantity"},
      totalRevenue:{$sum:"$items.finalPrice"}
    }
   },

   {$sort:{totalSales:-1}},
   {$limit:10},

   {
    $lookup:{
      from:"brands",
      localField:"_id",
      foreignField:"_id",
      as:"brandInfo"
    }
  },

  {$unwind:"$brandInfo"}




])

    const itemStatusStats = await Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.itemStatus", count: { $sum: 1 } } }
    ]);

    const orderStatusData = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const paymentData = await Order.aggregate([
      { $group: { _id: "$paymentMethod", count: { $sum: 1 } } }
    ]);


    const offerStats = await Order.aggregate([
      {$match:{status:{$ne:"Cancelled"}}},
      
      {$unwind:"$items"},

      {
        $lookup:{
          from:"products",
          localField:"items.productId",
          foreignField:"_id",
          as:"product"
        }
      },

      {$unwind:"$product"},

      {$lookup:{
        from:"categories",
        localField:"product.category",
        foreignField:"_id",
        as:"category"
      }},

    {$unwind:"$category"},
  
     {$group:
      {_id:null,productOfferRevenue:{
        $sum:{
          $cond:[
            {$ifNull:["$product.productOffer",false]},
            "$items.finalPrice",
            0
          ]
        }
      },
         categoryOfferRevenue:{
        $sum:{
          $cond:[
            {$ifNull:["$category.categoryOffer",false]},
            "$items.finalPrice",
            0
          ]
        }
      }
      }

  
    }

    ])


    
    let groupId;
    if (filter === "weekly") {
      groupId = { $dayOfWeek: "$createdAt" };
    } else if (filter === "monthly") {
      groupId = { $dayOfMonth: "$createdAt" };
    } else if (filter === "yearly") {
      groupId = { $month: "$createdAt" };
    }

    const salesData = await Order.aggregate([
      { $match: { status: { $ne: "Cancelled" } } },
      { $group: { _id: groupId, totalRevenue: { $sum: "$totalAmount" } } },
      { $sort: { _id: 1 } }
    ]);

    const customerGrowthData = await User.aggregate([
      { $group: { _id: groupId, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const orderOverviewData = await Order.aggregate([
      { $match: { status: { $ne: "Cancelled" } } },
      { $group: { _id: groupId, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    let salesLabels = [];
    let salesValues = [];
    let customerLabels = [];
    let customerValues = [];
    let orderLabels = [];
    let orderValues = [];

    const labelsMap = {
      weekly: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      yearly: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    };

    const formatLabel = (id, type) => {
      if (type === "monthly") return "Day " + id;
      return labelsMap[type][id - 1] || id;
    };

    salesData.forEach(item => {
      salesLabels.push(formatLabel(item._id, filter));
      salesValues.push(item.totalRevenue);
    });

    customerGrowthData.forEach(item => {
      customerLabels.push(formatLabel(item._id, filter));
      customerValues.push(item.count);
    });

    orderOverviewData.forEach(item => {
      orderLabels.push(formatLabel(item._id, filter));
      orderValues.push(item.count);
    });

    res.render("dashboard", {
      overallStats,
      recentOrders,
      topProducts,
      topCategories,
      topBrands,
      paymentData,
      orderStatusData,
      itemStatusStats,
      offerStats,
      salesLabels,
      salesValues,
      customerLabels,
      customerValues,
      orderLabels,
      orderValues,
      currentFilter: filter
    })

    
  } catch (error) {
    console.log(error)
    res.redirect("/404")
    
  }



}



const logout = (req, res) => {
  const userId = req.session.user;
  const passportData = req.session.passport;
  
  req.session.regenerate((err) => {
    if (err) {
      console.log("Admin logout regeneration error:", err);
    }
    if (userId) req.session.user = userId;
    if (passportData) req.session.passport = passportData;
    res.redirect("/admin/login");
  });
};





module.exports = {

  loadlogin,
  login,
  dashboard,
  logout,

}