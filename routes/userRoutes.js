const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// app.js 또는 해당하는 파일에서 Passport 설정을 추가합니다.
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// 사용자 정보 모듈 임포트
const { users, addUser } = require('../models/users');

passport.use(new LocalStrategy(
    function(username, password, done) {
        // 여기서 사용자 정보를 DB 또는 사용자 배열에서 찾아 인증을 수행합니다.
        const user = users.find(user => user.username === username && user.password === password);
        if (!user) {
            return done(null, false, { message: '사용자 정보를 찾을 수 없습니다.' });
        }
        return done(null, user);
    }
));

router.get('/signup', userController.signupPage);
// 회원가입 라우트
router.post('/signup', (req, res) => {
    const { username, password } = req.body;

    // 이미 존재하는 사용자인지 확인
    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
        return res.send('Username already exists');
    }

    //새로운 사용자 정보 추가
    addUser({ username, password }); // 새로운 사용자 정보 추가
    res.redirect('/');
});
router.get('/login', userController.loginPage);
// 로그인 라우트에서 Passport 인증을 사용합니다.
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // 사용자 정보를 검증하여 로그인 여부를 확인
    const user = users.find(user => user.username === username && user.password === password);

    if (user) {
        req.session.isAuthenticated = true; // 인증에 성공하면 세션에 isLoggedIn을 true로 설정합니다.
        res.redirect('/');
    } else {
        req.session.errorMessage = '로그인에 실패했습니다. 사용자 정보를 확인해주세요.';
        res.redirect('/login');
    }
});

// 마이 페이지 라우트. isLoggedIn 함수를 사용하여 인증 상태를 확인
router.get('/mypage', userController.mypage);
router.get('/board', userController.board);
router.get('/purchase', userController.purchase);
router.get('/chat', userController.chat);

module.exports = router;