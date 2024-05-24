const router = require('express').Router()
const userController = require('../controllers/userController');
const { MongoClient, ObjectId } = require('mongodb');
const methodOverride = require('method-override');

//DB불러옴
let connectDB = require('./../database.js'); 
const { request } = require('express');
let db
connectDB.then((client)=>{
    console.log('DBconnected_chatRoutes')
    db = client.db('shareEat');
    

}).catch((err)=>{
    console.log(err)
})

router.get('/chat/request', async (req, res) => {
    try {
        const currentUser = req.user.username;
        const writerId = req.query.writerId;

        // 동일한 멤버 배열이 있는지 확인
        const existingChatroom = await db.collection('chatroom').findOne({
            member: { $all: [currentUser, writerId] }
        });

        if (!existingChatroom) {
            // 동일한 멤버 배열이 없는 경우에만 채팅방을 생성
            await db.collection('chatroom').insertOne({
                member: [currentUser, writerId],
                date: new Date()
            });
        }

        res.redirect('/user/chat/list');
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});


router.get('/chat/list', async(req, res) => {
    try {
        let result = await db.collection('chatroom').find({
            member : req.user.username
        }).toArray();
        let currentUser = req.user.username;
        
        // 결과가 있는지 확인 후 렌더링
        if (result.length > 0) {
            res.render('chatList.ejs', {result: result, currentUser: currentUser});
        } else {
            // 결과가 없을 때 처리
            res.render('chatList.ejs', {result: []});
        }
    } catch (err) {
        console.error(err);
        // 오류 처리
        res.status(500).send("Internal Server Error");
    }
})


router.get('/chat/detail/:id', async (req, res) => {
    try {
        // 현재 사용자 정보 가져오기
        const userid = req.user; // Passport를 사용하여 현재 사용자 정보를 가져옴
        
        // 채팅방 및 메시지 가져오기
        let result = await db.collection('chatroom').findOne({ _id: new ObjectId(req.params.id) });

        // 현재 채팅방의 멤버 가져오기
        let membersCursor = await db.collection('chatroom').find({ _id: new ObjectId(req.params.id) }, { projection: { member: 1 } });
        let members = await membersCursor.toArray();
        if (members.length > 0) {
            members = members[0].member;
        } else {
            throw new Error('No members found for the chatroom');
        }

        // 상대방의 username 추출
        let opponentUsername = members.find(member => member !== userid.username);
        let opponent = await db.collection('user').findOne({username: opponentUsername});

        let messages = await db.collection('chatMessage').find({ parentRoom: new ObjectId(req.params.id) }).sort({ createdAt: 1 }).toArray();
        console.log(opponent)

        // 템플릿 렌더링 및 현재 사용자 정보 전달
        res.render('chatDetail.ejs', {
            result: result,
            messages: messages,
            userid: userid,
            members: JSON.stringify(members),
            useridj: JSON.stringify(userid),
            opponent: opponent // 상대방 username 전달
        });
    } catch (err) {
        console.error('Error fetching chat details:', err);
        res.status(500).send('Internal Server Error');
    }
});



router.get('/opponent', async (req, res) => {
    try {
        const opponentId = req.query.opponentId;
        console.log('opponentId:', opponentId); // 상대방 ID 로깅

        const list = await db.collection('flashPurchase').find({ username: opponentId }).toArray();
        const opponent = await db.collection('user').findOne({username: opponentId});
        console.log('list:', list); // 검색된 목록 로깅

        res.render('userprofile.ejs', { 글목록: list, currentUser: new ObjectId(req.user._id), opponent: opponent });
    } catch (error) {
        console.error('Error in /user/reserve:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/reserve/:id', async(req, res) =>{
    await db.collection('flashPurchase').updateOne({_id: new ObjectId(req.params.id)}, 
    {$set : {reserve: req.user.username}})
    res.redirect('/user/mypage')
})

router.get('/flashPurchase', async (req, res) => {
    try {
      const events = await db.collection('flashPurchase').find().toArray();
      const formattedEvents = events.map(event => {
        // Convert date to ISO format
        const dateParts = event.date.split('.');
        const timePart = dateParts[3].trim().split(' ');
        const time = timePart[1].split(':');
        let hours = parseInt(time[0], 10);
        const minutes = time[1];
        const seconds = time[2];
        if (timePart[0] === '오후' && hours !== 12) {
          hours += 12;
        } else if (timePart[0] === '오전' && hours === 12) {
          hours = 0;
        }
        const isoDate = `${dateParts[0].trim()}-${dateParts[1].trim()}-${dateParts[2].trim()}T${hours.toString().padStart(2, '0')}:${minutes}:${seconds}`;
        
        return {
          title: event.product_name,
          start: isoDate,
          allDay: false // Adjust this according to your requirements
        };
      });
      res.json(formattedEvents);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  

module.exports = router