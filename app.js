const express = require('express');
const session = require('express-session');
const passport = require('passport');
const app = express();
const { MongoClient, ObjectId } = require('mongodb');
const methodOverride = require('method-override');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo');
require('dotenv').config();
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = new S3Client({
  region : 'ap-northeast-2',
  credentials : {
      accessKeyId : process.env.S3_KEY,
      secretAccessKey : process.env.S3_SECRET
  }
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'shareeat',
    key: function (req, file, cb) {
      cb(null, Date.now().toString()) //업로드시 파일명 변경가능
    }
  })
});

app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(express.json());

let connectDB = require('./database.js');
let db;
connectDB.then((client)=>{
    console.log('DB연결성공')
    db = client.db('shareEat');
    app.listen(3000, () => {
    console.log('http://localhost:3000 에서 서버 실행중')
})
}).catch((err)=>{
    console.log(err)
})

app.use(express.urlencoded({ extended: true }));
// Passport 초기화 및 세션 설정
app.use(passport.initialize());
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false, 
    store: MongoStore.create({
        mongoUrl : process.env.DB_URL,
        dbName : 'shareEat'})
}));
app.use(passport.session());




// 사용자의 인증 상태를 확인하는 미들웨어
app.use((req, res, next) => {
    const isLoggedIn = req.session.isAuthenticated;
    res.locals.isLoggedIn = isLoggedIn;

    next();
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return next(); // 인증된 사용자일 경우 다음 미들웨어로 이동
  }
  // 인증되지 않은 사용자의 경우 로그인 페이지로 리다이렉트
  res.redirect('/login');
}


// 라우트 설정
const mainRoutes = require('./routes/mainRoutes');
const userRoutes = require('./routes/userRoutes');
const communityRoutes = require('./routes/communityRoutes');

app.use('/', mainRoutes);
app.use('/user', userRoutes);
app.use('/user', communityRoutes);
