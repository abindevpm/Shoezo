const User = require("../../models/userSchema")
const StatusCodes = require("../../routes/utils/statusCodes")
const loadWallet = async (req, res) => {
    try {

        const userId = req.session.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const user = await User.findById(userId);

        if (!user) {
            return res.redirect("/login");
        }

        const transactions = user.wallet?.transactions || [];
        const totalTransactions = transactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);

        
        const paginatedTransactions = transactions.slice().reverse().slice((page - 1) * limit, page * limit);

        res.render("wallet", {
            user,
            activePage: 'wallet',
            transactions: paginatedTransactions,
            currentPage: page,
            totalPages: totalPages
        });

    } catch (error) {
        console.log("Wallet Error", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).redirect("/pageNotFound");
    }
}

module.exports = {
    loadWallet
}