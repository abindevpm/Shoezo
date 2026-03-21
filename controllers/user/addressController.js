const User = require("../../models/userSchema");

const loadAddresses = async (req, res) => {
  try {
    const user = req.user;

  

    res.render("address", {
      user,
      addresses: user.addresses || [],
      activePage: "address"
    });
  } catch (err) {
    console.log(err);
    res.redirect("/profile");
  }
};


const loadaddAdresses = async (req, res) => {
  try {
    const user = req.user;

    res.render("addAdress", {
      user,
      addresses: user.addressess || []
    })
  } catch (error) {
    console.log(error, "Add address have error")
    res.redirect("/address")
  }
}


const addAdress = async (req, res) => {
  try {
    const userId = req.user._id;

    const {
      fullName,
      phone,
      addressLine,
      city,
      state,
      pincode,
      isDefault
    } = req.body;

    const defaultStatus = isDefault === "on" || isDefault === true;

    if (defaultStatus) {
      await User.findByIdAndUpdate(userId, {
        $set: { "addresses.$[].isDefault": false }
      });
    }

    await User.findByIdAndUpdate(userId, {
      $push: {
        addresses: {
          fullName,
          phone,
          addressLine,
          city,
          state,
          pincode,
          isDefault: defaultStatus
        }
      }
    })

    res.redirect("/address")


  } catch (error) {
    console.log(error, "Add address have error")
    res.redirect("/addAdress")

  }

}

const deleteAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.addressId;

    await User.findByIdAndUpdate(userId, {
      $pull: {
        addresses: { _id: addressId }
      }
    });

    res.json({
      success: true,
      message: "Address deleted successfully"
    });

  } catch (error) {
    console.log("Delete address error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete address"
    });
  }
};


const loadEditAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.id;

    const user = req.user;


    const address = user.addresses.id(addressId);

    if (!address) {
      return res.redirect("/address");
    }

    res.render("editAddress", {
      user,
      address
    });

  } catch (error) {
    console.log("Load edit address error:", error);
    res.redirect("/address");
  }
};



const updateAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.id;

    const {
      fullName,
      phone,
      addressLine,
      city,
      state,
      pincode,
      addressType,
      landmark,
      isDefault
    } = req.body;

    const defaultStatus = isDefault === "on" || isDefault === true;

    if (defaultStatus) {
      await User.findByIdAndUpdate(userId, {
        $set: { "addresses.$[].isDefault": false }
      });
    }

    await User.updateOne(
      { _id: userId, "addresses._id": addressId },
      {
        $set: {
          "addresses.$.fullName": fullName,
          "addresses.$.phone": phone,
          "addresses.$.addressLine": addressLine,
          "addresses.$.city": city,
          "addresses.$.state": state,
          "addresses.$.pincode": pincode,
          "addresses.$.addressType": addressType,
          "addresses.$.landmark": landmark,
          "addresses.$.isDefault": defaultStatus
        }
      }
    );
    res.redirect("/address?updated=true");

  } catch (error) {
    console.log("Update address error:", error);
    res.redirect("/address");
  }

}








const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.id;

    await User.findByIdAndUpdate(userId, {
      $set: { "addresses.$[].isDefault": false }
    });

    await User.updateOne(
      { _id: userId, "addresses._id": addressId },
      { $set: { "addresses.$.isDefault": true } }
    );

    res.redirect("/address");
  } catch (error) {
    console.log("Set default address error:", error);
    res.redirect("/address");
  }
};


module.exports = {
  loadAddresses,
  loadaddAdresses,
  addAdress,
  deleteAddress,
  loadEditAddress,
  updateAddress,
  setDefaultAddress
}