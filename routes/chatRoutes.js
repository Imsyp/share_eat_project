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

router.get('/chat/detail/:id', async(req, res) => {
    /*if문으로 채팅방에 속해있는지 검사*/
    let result = await db.collection('chatroom').findOne({_id : new ObjectId(req.params.id)})
    res.render('chatDetail.ejs', {result: result})
})


module.exports = router