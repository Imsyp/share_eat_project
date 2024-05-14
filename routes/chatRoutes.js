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

router.get('/chat/request', async(req, res) =>{
    await db.collection('chatroom').insertOne({
        member: [req.user._id, new ObjectId(req.query.writerId)],
        date: new Date()
    })
    res.redirect('/user/chat/list')
})

router.get('/chat/list', async(req, res) => {
    let result = await db.collection('chatroom').find({
        member : req.user._id
    }).toArray()
    res.render('chatList.ejs', {result: result})
})

router.get('/chat/detail/:id', async (req, res) => {
    try {
        // 현재 사용자 정보 가져오기
        const userid = req.user; // Passport를 사용하여 현재 사용자 정보를 가져옴

        // 채팅방 및 메시지 가져오기
        let result = await db.collection('chatroom').findOne({ _id: new ObjectId(req.params.id) });
        let messages = await db.collection('chatMessage').find({ parentRoom: new ObjectId(req.params.id) }).sort({ createdAt: 1 }).toArray();

        // 템플릿 렌더링 및 현재 사용자 정보 전달
        res.render('chatDetail.ejs', { result: result, messages: messages, userid: userid});
    } catch (err) {
        console.error('Error fetching chat details:', err);
        res.status(500).send('Internal Server Error');
    }
});



module.exports = router