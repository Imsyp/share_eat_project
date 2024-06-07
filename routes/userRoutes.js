const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt')
// app.js 또는 해당하는 파일에서 Passport 설정을 추가합니다.
const passport = require('passport');
const LocalStrategy = require('passport-local');
const {updateSession, reauthenticateUser} = require('../middlewares/sessionUtils')
const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
  region : 'ap-northeast-2',
  credentials : {
      accessKeyId : process.env.S3_KEY,
      secretAccessKey : process.env.S3_SECRET
  }
})
const upload = multer({
    storage: multerS3({
      s3: s3,
      bucket: 'shareeat',
      key: function (req, file, cb) {
        cb(null, Date.now().toString()) //업로드시 파일명 변경가능
      }
    })
  })


//DB불러옴

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
        return cb(null, false, { message: '존재하지 않는 id입니다.' })
    }
    if (await bcrypt.compare(password, result.password)) {
        return cb(null, result)
    } else {
        return cb(null, false, { message: '비밀번호가 일치하지 않습니다.' });
    }
}))

router.get('/signup', (req, res) => {
    res.render('signup.ejs')
})

router.post('/signup', async(req, res) => {
    if (req.body.password === '') {
        res.send('비밀번호를 입력하세요.');
        return;
    } else if (req.body.password !== req.body.confirm_password) {
        res.send('비밀번호가 일치하지 않습니다.');
        return;
    } else if (req.body.phonenumber === '') {
        res.send('전화번호를 입력하세요.');
        return;
    } else if (req.body.address === '') {
        res.send('주소를 입력하세요');
        return;
    }

    let hash = await bcrypt.hash(req.body.password, 10)
    await db.collection('user').insertOne({
        username: req.body.username,
        password: hash,
        phonenumber: req.body.phonenumber,
        address: req.body.address,
        profile: req.body.profile
    })
    res.redirect('/?signup=success');
})

router.get('/login', async(req, res) => {
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

router.get('/mypage', async (req, res) => {
    try {
        // 사용자 정보 가져오기
        const result = await db.collection('user').findOne({ _id: new ObjectId(req.user._id) });

        // flashPurchase와 regularPurchase 컬렉션에서 reserve 배열에 내 username이 있는지 확인하고,
        // accepted 배열의 동일한 인덱스가 "YES" 또는 "NO"인 이벤트를 가져오기
        const flashEventsPromise = db.collection('flashPurchase').find({
            $or: [
                { reserve: req.user.username },
                { username: req.user.username }
            ],
            $expr: { $in: ["YES", "$accepted"] }
        }).toArray();

        const regularEventsPromise = db.collection('regularPurchase').find({
            $or: [
                { reserve: req.user.username },
                { username: req.user.username }
            ],
            $expr: { $in: ["YES", "$accepted"] }
        }).toArray();

        const flashNEventsPromise = db.collection('flashPurchase').find({
            $or: [
                { reserve: req.user.username },
                { username: req.user.username }
            ],
            $expr: { $in: ["NO", "$accepted"] }
        }).toArray();

        const regularNEventsPromise = db.collection('regularPurchase').find({
            $or: [
                { reserve: req.user.username },
                { username: req.user.username }
            ],
            $expr: { $in: ["NO", "$accepted"] }
        }).toArray();

        // 모든 Promise 완료될 때까지 기다리기
        const [flashEvents, regularEvents, flashNEvents, regularNEvents] = await Promise.all([
            flashEventsPromise, regularEventsPromise, flashNEventsPromise, regularNEventsPromise
        ]);

        // 두 이벤트 배열을 합치기
        const reserve = [...flashEvents, ...regularEvents];
        const Nreserve = [...flashNEvents, ...regularNEvents];

        // mypage.ejs를 렌더링할 때 result, reserve, Nreserve를 전달
        res.render('mypage.ejs', { result: result, reserve: reserve, Nreserve: Nreserve, currentUser: req.user.username });
    } catch (err) {
        // 에러 발생 시 500 상태 코드와 에러 메시지 반환
        res.status(500).json({ message: err.message });
    }
});



  

router.get('/userinfo_change', async (req, res) => {
    const result = await db.collection('user').findOne({_id: new Object(req.user._id)});
    res.render('userinfo_change.ejs',{result: result});
});

//회원정보 수정
router.put('/edit_info', upload.single('profile'), async (req, res) => {
    try {
        if (req.body.password === '') {
            res.send('비밀번호를 입력하세요.');
            return;
        } else if (req.body.password !== req.body.confirm_password) {
            res.send('비밀번호가 일치하지 않습니다.');
            return;
        } else if (req.body.phonenumber === '') {
            res.send('전화번호를 입력하세요.');
            return;
        } else if (req.body.address === '') {
            res.send('주소를 입력하세요');
            return;
        }

        

        // 사진이 없는 경우에도 req.file이 존재하지 않으므로, 해당 부분을 처리해줍니다.
        let imgUrl = "https://shareeat.s3.ap-northeast-2.amazonaws.com/anonym_img.jpg";
        if (req.file) {
            imgUrl = req.file.location;
        }
        let hash = await bcrypt.hash(req.body.password, 10);
        const userId = req.user._id;

        // 회원 정보 업데이트
        await db.collection('user').updateOne(
            { _id: new ObjectId(userId) }, 
            { $set: { 
                password: hash, 
                phonenumber: req.body.phonenumber, 
                address: req.body.address,
                profile: imgUrl
            }}
        );

        // 업데이트된 사용자 정보 가져오기
        const updatedUser = await db.collection('user').findOne({ _id: new ObjectId(userId) });

        // 세션 업데이트: 새로운 사용자 정보로 세션 갱신
        req.login(updatedUser, (err) => {
            if (err) {
                console.error('Error updating session:', err);
                return res.status(500).send('세션 업데이트 중 오류 발생');
            }
            // 회원 정보 수정 후 마이 페이지로 리다이렉트
            res.redirect('/user/mypage');
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('서버에러남');
    }
});

// 마이 페이지 라우트. isLoggedIn 함수를 사용하여 인증 상태를 확인
router.get('/mypage', userController.mypage);

router.get('/logout', userController.logout); 

// router.get('/community_board', userController.community_board);
// router.get('/information_board', userController.information_board);
router.get('/purchase', userController.purchase);
router.get('/chat', userController.chat);

module.exports = router;