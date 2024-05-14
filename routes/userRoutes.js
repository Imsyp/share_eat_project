const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt')
// app.js 또는 해당하는 파일에서 Passport 설정을 추가합니다.
const passport = require('passport');
const LocalStrategy = require('passport-local');

// 사용자 정보 모듈 임포트

let connectDB = require('./../database.js') 
let db
connectDB.then((client)=>{
    console.log('DBconnected_userRoutes')
    db = client.db('shareEat');
    

}).catch((err)=>{
    console.log(err)
})

passport.use(new LocalStrategy(async (username, password, cb) => {// 여기서 사용자 정보를 DB 또는 사용자 배열에서 찾아 인증을 수행합니다.
    let result = await db.collection('user').findOne({ username : username})
    if (!result) {
        return cb(null, false, { message: '아이디 DB에 없음' })
    }
    if (await bcrypt.compare(password, result.password)) {
        return cb(null, result)
    } else {
        return cb(null, false, { message: '비번불일치' });
    }
}))

router.get('/signup', (req, res) => {

    res.render('signup.ejs')
})

router.post('/signup', async(req, res) => {
    let hash = await bcrypt.hash(req.body.password, 10)
    await db.collection('user').insertOne({
        username: req.body.username,
        password: hash
    })
    res.redirect('/')
})

router.get('/login', async(req, res) => {
    console.log(req.user)
    res.render('login.ejs')
})

router.post('/login', async(req, res, next) => {
    passport.authenticate('local', (error, user, info) => {
        if (error) return res.status(500).json(error)
        if (!user) return res.status(401).json(info.message)
        req.logIn(user, (err) =>{
            if(err) return next(err)
            res.redirect('/')
        })
    })(req, res, next)
})

/*router.get('/login', userController.loginPage);
// 로그인 라우트에서 Passport 인증을 사용합니다.
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // 사용자 정보를 검증하여 로그인 여부를 확인
    const user = users.find(user => user.username === username && user.password === password);

    if (user) {
        req.session.isAuthenticated = true; // 인증에 성공하면 세션에 isLoggedIn을 true로 설정합니다.
        req.session.username = username;
        res.redirect('/');
    } else {
        req.session.errorMessage = '로그인에 실패했습니다. 사용자 정보를 확인해주세요.';
        res.redirect('/login');
    }
});*/

// 마이 페이지 라우트. isLoggedIn 함수를 사용하여 인증 상태를 확인
router.get('/mypage', userController.mypage);

router.get('/logout', userController.logout); 

router.get('/board', userController.board);
router.get('/purchase', userController.purchase);
router.get('/chat', userController.chat);

module.exports = router;