const express = require('express');
const session = require('express-session');
const passport = require('passport');
const app = express();
const { MongoClient, ObjectId } = require('mongodb');
const methodOverride = require('method-override');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');

const { createServer } = require('http');
const { Server } = require('socket.io');
const server = createServer(app);
const io = new Server(server) ;
const path = require('path')

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

var favicon = require('serve-favicon');
app.use(express.static(path.join(__dirname, 'public/images')));


//미들웨어 설정
app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let connectDB = require('./database.js');
let db;
connectDB.then((client)=>{
    console.log('DBconnected_app')
    db = client.db('shareEat');
    server.listen(3000, () => {
    console.log('http://localhost:3000 에서 서버 실행중')
})
}).catch((err)=>{
    console.log(err)
})


//Express 세션 미들웨어 설정
const sessionMiddleware = session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false, 
    store: MongoStore.create({
        mongoUrl : process.env.DB_URL,
        dbName : 'shareEat'})
});
app.use(sessionMiddleware);

// Passport 초기화 및 세션 설정
app.use(passport.initialize());
app.use(passport.session());

// Passport Serialize 및 Deserialize 설정
passport.serializeUser((user, done) => {
  process.nextTick(() => {
      done(null, { id: user._id, username: user.username })
  })
})

passport.deserializeUser(async (user, done) => {
  try {
      const result = await db.collection('user').findOne({ _id: new ObjectId(user.id) });
      if (result) {
          delete result.password;
          return done(null, result);
      } else {
          return done(new Error('User not found'));
      }
  } catch (err) {
      return done(err);
  }
});


// 사용자의 인증 상태를 확인하는 미들웨어
app.use((req, res, next) => {
  const isLoggedIn = req.isAuthenticated(); // Passport를 사용하여 인증 상태 확인
  res.locals.isLoggedIn = isLoggedIn;

  next();
});



// 라우트 설정
const mainRoutes = require('./routes/mainRoutes');
const userRoutes = require('./routes/userRoutes');
const communityRoutes = require('./routes/communityRoutes');
const informationRoutes = require('./routes/informationRoutes');
const chatRoutes = require('./routes/chatRoutes');
const flashRoutes = require('./routes/flashRoutes');
const regularRoutes = require('./routes/regularRoutes');


app.use('/', mainRoutes);
app.use('/user', userRoutes);
app.use('/user', communityRoutes);
app.use('/user', informationRoutes);
app.use('/user', chatRoutes);
app.use('/user', flashRoutes);
app.use('/user', regularRoutes);


// 채팅 웹 소켓 설정
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});


io.on('connection', (socket) =>{
  console.log('websocket connected')

  socket.on('ask-join', async(data)=>{
    socket.join(data)
  })
  socket.on('message-send', async(data) =>{
    await db.collection('chatMessage').insertOne({
      parentRoom: new ObjectId(data.room),
      content: data.message,
      who: new ObjectId(socket.request.session.passport.user.id),
      date: new Date().toLocaleString()
    })
    console.log('유저가 보낸거:', data)
    io.to(data.room).emit('message-broadcast', {message: data.message})
  })
})

