// controllers/mainController.js
exports.mainPage = (req, res) => {
    res.render('../views/mainPage', {isAuthenticated: req.isAuthenticated()});
};