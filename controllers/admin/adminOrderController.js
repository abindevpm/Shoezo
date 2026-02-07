const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");

const loadOrders = async (req, res) => {
    try {
        const { search, status, paymentStatus, page = 1 } = req.query;
        const limit = 10;
        const skip = (page - 1) * limit;

        let query = {};

        if (search) {
            if (search.startsWith('ORD-')) {
                query.orderId = { $regex: search, $options: 'i' };
            } else if (!isNaN(search)) {
                query.totalAmount = Number(search);
            } else {
                query.orderId = { $regex: search, $options: 'i' };
            }
        }

        if (status && status !== 'All Status') {
            query.status = status;
        }

        if (paymentStatus && paymentStatus !== 'All Payments') {
            query.paymentStatus = paymentStatus;
        }

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find(query)
            .populate("userId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render("orderlist", {
            orders,
            currentPage: Number(page),
            totalPages,
            search: search || '',
            statusFilter: status || 'All Status',
            paymentFilter: paymentStatus || 'All Payments'
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const loadReturnRequests = async (req, res) => {
    try {
        const orders = await Order.find({ status: "Return Requested" })
            .populate("userId")
            .populate("items.productId")
            .sort({ updatedAt: -1 });
        res.render("return-requests", { orders });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const getOrderDetailsAdmin = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("userId")
            .populate("items.productId");
        if (!order) return res.status(404).send("Order not found");
        res.render("admin-order-details", { order });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const getEditOrderAdmin = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("userId")
            .populate("items.productId");
        if (!order) return res.status(404).send("Order not found");
        res.render("admin-order-edit", { order });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const order = await Order.findById(orderId);

        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const oldStatus = order.status;


        if (["Placed", "Processing", "Shipped", "Delivered", "Cancelled"].includes(status)) {
            order.items.forEach(item => {
                if (item.itemStatus !== "Cancelled" && item.itemStatus !== "Returned") {
                    item.itemStatus = status;
                }
            });
        }

        if (status === "Returned" && oldStatus === "Return Requested") {
            for (const item of order.items) {
                if (item.itemStatus === "Return Requested" || item.itemStatus === "Delivered") {
                    if (!item.isRestocked) {
                        await Product.updateOne(
                            { _id: item.productId, "variants.size": item.size },
                            { $inc: { "variants.$.stock": item.quantity } }
                        );
                        item.isRestocked = true;
                    }
                    item.itemStatus = "Returned";
                }
            }
            order.paymentStatus = "Refunded";
        } else if (status === "Return Rejected" && oldStatus === "Return Requested") {
            order.items.forEach(item => {
                if (item.itemStatus === "Return Requested") {
                    item.itemStatus = "Delivered";
                }
            });
        }

        order.status = status;
        if (status === "Delivered") order.paymentStatus = "Paid";

        await order.save();
        res.json({ success: true, message: "Order status updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const updatePaymentStatus = async (req, res) => {
    try {
        const { orderId, paymentStatus } = req.body;
        await Order.findByIdAndUpdate(orderId, { paymentStatus });
        res.json({ success: true, message: "Payment status updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const approveItemReturn = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const item = order.items.id(itemId);
        if (!item || item.itemStatus !== "Return Requested") {
            return res.status(400).json({ success: false, message: "Invalid item status for return approval" });
        }


        if (!item.isRestocked) {
            await Product.updateOne(
                { _id: item.productId, "variants.size": item.size },
                { $inc: { "variants.$.stock": item.quantity } }
            );
            item.isRestocked = true;
        }

        item.itemStatus = "Returned";


        const allTerminal = order.items.every(i => ["Cancelled", "Returned"].includes(i.itemStatus));
        if (allTerminal) {
            order.status = "Returned";
            order.paymentStatus = "Refunded";
        }

        await order.save();
        res.json({ success: true, message: "Item return approved and customer refunded" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const rejectItemReturn = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const item = order.items.id(itemId);
        if (!item || item.itemStatus !== "Return Requested") {
            return res.status(400).json({ success: false, message: "Invalid item status for return rejection" });
        }

        item.itemStatus = "Return Rejected"; // Or "Delivered"
        await order.save();
        res.json({ success: true, message: "Item return rejected" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const cancelItemAdmin = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { reason } = req.body;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const item = order.items.id(itemId);
        if (!item) return res.status(404).json({ success: false, message: "Item not found" });

        if (item.itemStatus === "Cancelled") {
            return res.status(400).json({ success: false, message: "Item already cancelled" });
        }

        if (["Shipped", "Delivered", "Returned", "Return Requested"].includes(item.itemStatus)) {
            return res.status(400).json({ success: false, message: `Cannot cancel item as it is already ${item.itemStatus}` });
        }


        if (!item.isRestocked) {
            await Product.updateOne(
                { _id: item.productId, "variants.size": item.size },
                { $inc: { "variants.$.stock": item.quantity } }
            );
            item.isRestocked = true;
        }

        item.itemStatus = "Cancelled";
        item.cancelReason = reason || "Cancelled by Admin";


        const allCancelled = order.items.every(i => i.itemStatus === "Cancelled");
        if (allCancelled) {
            order.status = "Cancelled";
            order.cancelReason = "All items cancelled by Admin";
        }

        await order.save();
        res.json({ success: true, message: "Item cancelled and stock updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const updateItemStatusAdmin = async (req, res) => {
    try {
        const { orderId, itemId, status } = req.body;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const item = order.items.id(itemId);
        if (!item) return res.status(404).json({ success: false, message: "Item not found" });

        item.itemStatus = status;



        await order.save();
        res.json({ success: true, message: "Item status updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const restockItem = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const item = order.items.id(itemId);
        if (!item) return res.status(404).json({ success: false, message: "Item not found" });

        if (item.isRestocked) {
            return res.status(400).json({ success: false, message: "Item already restocked" });
        }


        await Product.updateOne(
            { _id: item.productId, "variants.size": item.size },
            { $inc: { "variants.$.stock": item.quantity } }
        );

        item.isRestocked = true;
        await order.save();

        res.json({ success: true, message: "Item added back to inventory" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = {
    loadOrders,
    loadReturnRequests,
    getOrderDetailsAdmin,
    getEditOrderAdmin,
    updateOrderStatus,
    updatePaymentStatus,
    approveItemReturn,
    rejectItemReturn,
    cancelItemAdmin,
    updateItemStatusAdmin,
    restockItem
};
