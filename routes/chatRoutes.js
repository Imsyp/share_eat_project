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
        let membersCursor = await db.collection('chatroom').find({ _id: new ObjectId(req.params.id) }, { member: 1 });
        let members = await membersCursor.toArray();
        if (members.length > 0) {
            members = members[0].member;
        } else {
            throw new Error('No members found for the chatroom');
        }

        let messages = await db.collection('chatMessage').find({ parentRoom: new ObjectId(req.params.id) }).sort({ createdAt: 1 }).toArray();
        console.log(userid);
        // 템플릿 렌더링 및 현재 사용자 정보 전달
        res.render('chatDetail.ejs', { result: result, messages: messages, userid: userid, members:JSON.stringify(members), useridj: JSON.stringify(userid) });
    } catch (err) {
        console.error('Error fetching chat details:', err);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/reserve', async (req, res) => {
    try {
        const opponentId = req.query.opponentId;
        console.log('opponentId:', opponentId); // 상대방 ID 로깅

        const list = await db.collection('flashPurchase').find({ username: opponentId }).toArray();
        console.log('list:', list); // 검색된 목록 로깅

        res.render('getReserve.ejs', { 글목록: list, currentUser: new ObjectId(req.user._id) });
    } catch (error) {
        console.error('Error in /user/reserve:', error);
        res.status(500).send('Internal Server Error');
    }
});



module.exports = router