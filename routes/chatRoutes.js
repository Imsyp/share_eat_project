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
        let chatRooms = await db.collection('chatroom').find({
            member : req.user.username
        }).toArray();
        let currentUser = req.user.username;
        
        // 결과가 있는지 확인 후 렌더링
        if (chatRooms.length > 0) {
          let memberUsernames = chatRooms.flatMap(chatRoom=>chatRoom.member);
          let users = await db.collection('user').find({username:{$in:memberUsernames}}).toArray();
          res.render('chatList.ejs', {result: chatRooms, currentUser: currentUser, users: users});
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

        // 템플릿 렌더링 및 현재 사용자 정보 전달
        res.render('chatDetail.ejs', {
            result: result,
            messages: messages,
            userid: userid,
            members: JSON.stringify(members),
            useridj: JSON.stringify(userid),
            opponent: opponent, // 상대방 username 전달
            myname: userid.username
        });
    } catch (err) {
        console.error('Error fetching chat details:', err);
        res.status(500).send('Internal Server Error');
    }
});



router.get('/opponent', async (req, res) => {
  try {
      const opponentId = req.query.opponentId;
      const currentUserId = req.user.username;  // 현재 사용자의 username

      const flash = await db.collection('flashPurchase').find({
          username: opponentId,
          reserve: { $ne: currentUserId },  // 현재 사용자의 아이디가 reserve 배열에 없을 때
          $where: function() {
              return this.accepted.filter(a => a === 'YES').length !== this.number_of_recruits;
          }
      }).toArray();

      const regular = await db.collection('regularPurchase').find({
          username: opponentId,
          reserve: { $ne: currentUserId },  // 현재 사용자의 아이디가 reserve 배열에 없을 때
          $where: function() {
              return this.accepted.filter(a => a === 'YES').length !== this.number_of_recruits;
          }
      }).toArray();

      const opponent = await db.collection('user').findOne({ username: opponentId });

      res.render('userprofile.ejs', { 
          flash: flash, 
          regular: regular, 
          currentUser: new ObjectId(req.user._id), 
          opponent: opponent 
      });
  } catch (error) {
      console.error('Error in /user/reserve:', error);
      res.status(500).send('Internal Server Error');
  }
});


router.post('/reserve_flash/:id', async (req, res) => {
  try {
      console.log(req.body);
      const flashPurchase = await db.collection('flashPurchase').findOne({ _id: new ObjectId(req.params.id) });
      
      if (!flashPurchase) {
          return res.status(404).send('Flash purchase not found');
      }

      const acceptedYesCount = flashPurchase.accepted.filter(status => status === "YES").length;

      // 예약이 모두 찼을 때의 처리
      if (acceptedYesCount == flashPurchase.number_of_recruits) {
          return res.status(400).send('All recruits are already accepted');
      }

      await db.collection('flashPurchase').updateOne(
          { _id: new ObjectId(req.params.id) },
          {
              $push: {
                  reserve: req.user.username,
                  accepted: "NO"
              }
          }
      );

      res.redirect('/user/mypage');
  } catch (error) {
      console.error('Error in /reserve_flash:', error);
      res.status(500).send('Internal Server Error');
  }
});


router.post('/reserve_regular/:id', async (req, res) => {
  try {
      console.log(req.body);
      const flashPurchase = await db.collection('regularPurchase').findOne({ _id: new ObjectId(req.params.id) });
      
      if (!flashPurchase) {
          return res.status(404).send('regular purchase not found');
      }

      const acceptedYesCount = flashPurchase.accepted.filter(status => status === "YES").length;

      // 예약이 모두 찼을 때의 처리
      if (acceptedYesCount == flashPurchase.number_of_recruits) {
          return res.status(400).send('All recruits are already accepted');
      }

      await db.collection('regularPurchase').updateOne(
          { _id: new ObjectId(req.params.id) },
          {
              $push: {
                  reserve: req.user.username,
                  accepted: "NO"
              }
          }
      );

      res.redirect('/user/mypage');
  } catch (error) {
      console.error('Error in /reserve_regular:', error);
      res.status(500).send('Internal Server Error');
  }
});


router.post('/accept/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const objectId = new ObjectId(id);

    // flashPurchase 컬렉션에서 항목 찾기
    const flashPurchaseResult = await db.collection('flashPurchase').findOne({ _id: objectId });

    // regularPurchase 컬렉션에서 항목 찾기
    const regularPurchaseResult = await db.collection('regularPurchase').findOne({ _id: objectId });

    // 일치하는 항목을 result 변수에 저장
    let result;
    let collectionName;

    if (flashPurchaseResult) {
      result = flashPurchaseResult;
      collectionName = 'flashPurchase';
    } else if (regularPurchaseResult) {
      result = regularPurchaseResult;
      collectionName = 'regularPurchase';
    }

    if (result) {
      const reserveName = req.body.reserveName; // 클라이언트에서 보낸 reserveName 가져오기

      // 항목의 reserve 배열에서 reserveName과 같은 문자열이 있는지 확인
      const index = result.reserve.findIndex(name => name === reserveName);

      if (index !== -1) {
        // reserve 배열에서 일치하는 인덱스에 대해 accepted 값을 "YES"로 업데이트
        await db.collection(collectionName).updateOne(
          { _id: objectId },
          { $set: { [`accepted.${index}`]: "YES" } } // 인덱스에 해당하는 accepted 값을 "YES"로 변경
        );

        res.status(200).json({ message: 'accepted 값을 "YES"로 변경하였습니다.', result });
      } else {
        res.status(404).json({ message: '일치하는 reserveName이 없습니다.' });
      }
    } else {
      res.status(404).json({ message: '일치하는 항목이 없습니다.' });
    }
  } catch (err) {
    res.status(500).json({ message: '서버 오류 발생', error: err.message });
  }
});



  router.get('/flashPurchase', async (req, res) => {
    try {
      // 두 컬렉션에서 데이터를 비동기로 가져오기
      const flashEventsPromise = db.collection('flashPurchase').find({
        $or: [
          { reserve: req.user.username },
          { username: req.user.username }
      ],
      $expr: { $eq: [{ $arrayElemAt: ["$accepted", { $indexOfArray: ["$reserve", req.user.username] }] }, "YES"] }
      }).toArray();
      
      const regularEventsPromise = db.collection('regularPurchase').find({
        $or: [
          { reserve: req.user.username },
          { username: req.user.username }
      ],
      $expr: { $eq: [{ $arrayElemAt: ["$accepted", { $indexOfArray: ["$reserve", req.user.username] }] }, "YES"] }
      }).toArray();
  
      // 두 Promise 모두 완료될 때까지 기다림
      const [flashEvents, regularEvents] = await Promise.all([flashEventsPromise, regularEventsPromise]);
  
      // 두 이벤트 배열을 합침
      const allEvents = [...flashEvents, ...regularEvents];
  
      // 날짜 형식을 변환
      const formattedEvents = allEvents.map(event => {
        try {
          // 날짜와 시간 결합하여 ISO 형식으로 변환
          const isoDate = `${event.datey}T${event.time}:00`; // 시간에 초 추가
  
          return {
            title: event.product_name,
            start: isoDate,
            allDay: false // Adjust this according to your requirements
          };
        } catch (error) {
          console.error('Error formatting event date:', error, event);
          return null;
        }
      }).filter(event => event !== null);
  
      res.json(formattedEvents);
    } catch (err) {
      console.error('Error retrieving events:', err);
      res.status(500).json({ message: err.message });
    }
  });
  
  
  
  

module.exports = router