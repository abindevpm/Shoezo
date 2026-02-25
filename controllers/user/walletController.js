const User = require("../../models/userSchema")

const loadWallet = async (req, res) => {
    try {



        const userId = req.session.user;
        const user = await User.findById(userId);






        if (!user) {
            return res.redirect("/login");
        }

        res.render("wallet", {
            user,
            activePage: 'wallet',
     
            
        });

    } catch (error) {
        console.log("Wallet Error", error);
        res.status(500).send("Internal Server Error");
    }
}

module.exports = {
    loadWallet
}