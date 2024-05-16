// 세션을 업데이트하는 함수
const updateSession = (req, user) => {
    req.session.passport.user = { id: user._id, username: user.username };
};

// 사용자의 인증 상태를 확인하는 미들웨어
const reauthenticateUser = (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/login');
    }
};

module.exports = { updateSession, reauthenticateUser };
