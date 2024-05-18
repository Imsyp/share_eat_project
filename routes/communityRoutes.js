const router = require('express').Router()
const userController = require('../controllers/userController');
const { MongoClient, ObjectId } = require('mongodb');
const methodOverride = require('method-override');
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
    }), 
    limits: {fieldSize: 15 * 1024 * 1024}
  })


//DB불러옴
let connectDB = require('./../database.js'); 
const { request } = require('express');
let db
connectDB.then((client)=>{
    console.log('DBconnected_communityRoutes')
    db = client.db('shareEat');
    

}).catch((err)=>{
    console.log(err)
})

router.get('/community_board', async (req, res) => {
    let result = await db.collection('community').find().toArray();
    res.render('board_community.ejs', { 글목록: result, page: req.query.page, currentUser: new ObjectId(req.user._id)});

});

router.get('/write_community', (req, res) => {
    res.render('write_community.ejs', {})
})


router.post('/add_community', upload.single('img1'), async (req, res) => {
    try {
        if (req.body.title === '') {
            res.send('제목을 입력하세요.');
            return;
        } else if (req.body.content === '') {
            res.send('내용을 입력하세요.');
            return;
        } else if(req.body.content.length > 1000) {
                res.send('내용이 너무 깁니다. 1000자 이하로 작성해주세요. 또는 이미지 첨부는 위의 찾아보기 버튼을 이용하세요')
                return;
        } 

        // 사진이 없는 경우에도 req.file이 존재하지 않으므로, 해당 부분을 처리해줍니다.
        let imgUrl = '';
        if (req.file) {
            imgUrl = req.file.location;
        }

        await db.collection('community').insertOne({
            title: req.body.title,
            content: req.body.content,
            views: 0,
            img: imgUrl, // 사진이 없는 경우 빈 문자열이 됩니다.
            user: req.user._id,
            username: req.user.username,
            date: new Date().toLocaleString()
        });

        res.redirect('/user/community_board');
    } catch (error) {
        console.error(error);
        res.status(500).send('서버에러남');
    }
});


router.get('/post_community/:postId', async (req, res) => {
    try {
        const result = await db.collection('community').findOne({ _id: new ObjectId(req.params.postId) });
        const comment = await db.collection('community_comment').find({parentId: new ObjectId(req.params.postId)}).toArray();

        if (!result) {
            res.status(404).send('게시물을 찾을 수 없습니다.');
            return;
        }
        await db.collection('community').updateOne(
            {_id: new ObjectId(req.params.postId)}, 
            {$inc : {views : 1}})
        res.render('post_community.ejs', { post: result , comment: comment});
    } catch (error) {
        console.error(error);
        res.status(500).send('게시물 조회 중 오류가 발생했습니다.');
    }
});

router.get('/edit_community/:editId', async (req, res) => {
        const result = await db.collection('community').findOne({ _id: new ObjectId(req.params.editId) });
        
        res.render('edit_community.ejs', { edit: result });
});

router.put('/edit_community', async (req, res) => {
    
    await db.collection('community').updateOne({_id: new ObjectId(req.body.id), 
        user : new ObjectId(req.user._id)
    }, 
    {$set : {title : req.body.title, content : req.body.content}})
    res.redirect('/user/community_board')
});

router.delete('/delete_community', async (req, res) => {
    const result = await db.collection('community').deleteOne({_id : new ObjectId(req.query.docid),
        user: new ObjectId(req.user._id)
    })
    res.send('삭제완료')
})

router.get('/search_community', async(req, res) => {
    let 검색조건 = [
        {$search : {
            index : 'title_index',
            text : { query : req.query.val, path : 'title' }
        }}
        ]
    let result = await db.collection('community').aggregate(검색조건).toArray()

    res.render('search.ejs', {글목록 : result, page: req.query.page})
})

router.post('/comment_community', async (req, res) => {
    try {
        if (req.body.title === '') {
            res.send('제목을 입력하세요.');
            return;
        } else if (req.body.content === '') {
            res.send('내용을 입력하세요.');
            return;
        }
        
        await db.collection('community_comment').insertOne({
            content: req.body.content,
            parentId: new ObjectId(req.body.parentId),
            date: new Date().toLocaleString(),
            user: req.user._id,
            username: req.user.username,
        });

        // 데이터베이스에 댓글을 추가한 후에 리디렉션
        res.redirect('back');
    } catch (error) {
        // 에러가 발생한 경우
        console.error(error);
        res.status(500).send('서버에러남');
    }
});


module.exports = router