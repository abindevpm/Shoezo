const Review = require("../../models/reviewSchema")

const addReview = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, comment, rating } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please login to add a review", loginRedirect: true });
    }

    if (!rating || !comment) {
      return res.status(400).json({ success: false, message: "Rating and comment are required" });
    }

    const alreadyReviewed = await Review.findOne({
      user: userId,
      product: productId
    });

    if (alreadyReviewed) {
      return res.status(400).json({ success: false, message: "You have already reviewed this product" });
    }

    const newReview = new Review({
      user: userId,
      product: productId,
      rating: Number(rating),
      comment
    });

    await newReview.save();

    res.json({ success: true, message: "Review added successfully!" });

  } catch (error) {
    console.log(error, 'Add review Error');
    res.status(500).json({ success: false, message: "An error occurred while adding the review" });
  }
}

module.exports = {
    addReview
}