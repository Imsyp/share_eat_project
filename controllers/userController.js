// controllers/userController.js
exports.signupPage = (req, res) => {
    res.render('../views/signup');
};

exports.loginPage = (req, res) => {
    res.render('../views/login');
};

exports.mypage = (req, res) => {
    res.render('../views/mypage');
};

exports.board = (req, res) => {
    res.render('../views/board');
};

exports.purchase = (req, res) => {
    res.render('../views/purchase');
};

exports.chat = (req, res) => {
    res.render('../views/chat');
};