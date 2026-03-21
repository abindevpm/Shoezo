const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    // Check if it's an AJAX request or expects JSON
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Something went wrong"
        });
    }

    if (statusCode === 404) {
        return res.status(404).render("404", {
            message: err.message
        });
    }

    if (statusCode === 500) {
        return res.status(500).render("500", {
            message: err.message
        });
    }

    if (statusCode === 400) {
        return res.status(400).render("400", {
            message: err.message
        });
    }
}

module.exports = errorHandler


