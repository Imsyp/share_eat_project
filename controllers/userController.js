// controllers/userController.js
exports.signupPage = (req, res) => {
    res.render('../views/signup');
};

exports.loginPage = (req, res) => {
    res.render('../views/login');
};

exports.logout = (req, res) => {
    // 세션에서 사용자 정보 제거
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        // 로그아웃 후 메인 페이지로 리디렉션
        res.redirect('/');
    });
};

exports.mypage = (req, res) => {
    const username = req.session.passport.user.username; // 로그인한 유저의 유저네임을 가져옵니다.
    res.render('../views/mypage', { username });
};

exports.board = (req, res) => {
    res.render('../views/community_board');
};

exports.purchase = (req, res) => {
    res.render('../views/purchase');
};

exports.chat = (req, res) => {
    res.render('../views/chatList');
};