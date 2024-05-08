const express = require('express');
const session = require('express-session');
const passport = require('passport');
const app = express();
const port = 3000;

// 사용자 정보 모듈 임포트
const { users, addUser } = require('./models/users');

// 미들웨어 설정
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));

// Passport 초기화 및 세션 설정
app.use(passport.initialize());
app.use(passport.session());

// 사용자의 인증 상태를 확인하는 미들웨어
app.use((req, res, next) => {
    const isLoggedIn = req.session.isAuthenticated;
    res.locals.isLoggedIn = isLoggedIn;

    next();
});

app.set('view engine', 'ejs');
app.use(express.static('public'));

// 라우트 설정
const mainRoutes = require('./routes/mainRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/', mainRoutes);
app.use('/user', userRoutes);
//추가한 부분
app.get('/', (req, res) => {
    const imagePath = 'images/logo_non_bg.png';
    res.render('mainPage.ejs', { imagePath: imagePath });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
