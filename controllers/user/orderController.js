const Order = require("../../models/orderSchema")

const loadorders = async (req, res) => {
  try {
    const userId = req.session.user

    if (!userId) return res.redirect("/login")

    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })

    res.render("orders", { orders })

  } catch (error) {
    console.log(error)
    res.redirect("/")
  }
}

module.exports = { 
    loadorders 
}
