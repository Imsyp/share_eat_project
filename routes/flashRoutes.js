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
    })
  })


//DB불러옴
let connectDB = require('./../database.js'); 
const { request } = require('express');
let db
connectDB.then((client)=>{
    console.log('DBconnected_flashRoutes')
    db = client.db('shareEat');
    

}).catch((err)=>{
    console.log(err)
})

router.get('/flash_purchase', async (req, res) => {
    try {
        let result = await db.collection('flashPurchase').find().toArray();
        
        // Iterate through each document to count the number of "YES" in the accepted array
        result.forEach(doc => {
            if (doc.accepted && Array.isArray(doc.accepted)) {
                doc.yesCount = doc.accepted.filter(answer => answer === "YES").length;
            } else {
                doc.yesCount = 0;
            }
        });

        res.render('flash_purchase.ejs', { 
            글목록: result, 
            page: req.query.page, 
            currentUser: new ObjectId(req.user._id)
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/write_flash', (req, res) => {
    res.render('write_flash.ejs', {})
})


router.post('/add_flash', upload.single('img1'), async (req, res) => {
    try {
        if (req.body.product_name === '') {
            res.send('제품명을 입력하세요.');
            return;
        } else if (req.body.quantity === '') {
            res.send('수량을 입력하세요.');
            return;
        } else if (req.body.number_of_recruits === '') {
            res.send('모집인원을 입력하세요.');
            return;
        } else if (req.body.total_amount === '') {
            res.send('총 금액을 입력하세요.');
            return;
        } else if (req.body.location === '') {
            res.send('거래장소를 입력하세요.');
            return;
        } 
        const date = new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Seoul'
        }).format(new Date());
        // 사진이 없는 경우에도 req.file이 존재하지 않으므로, 해당 부분을 처리해줍니다.
        let imgUrl = '';
        if (req.file) {
            imgUrl = req.file.location;
        }
        let me = req.user.username;
        await db.collection('flashPurchase').insertOne({
            product_name: req.body.product_name,
            quantity: req.body.quantity,
            number_of_recruits: req.body.number_of_recruits,
            total_amount: req.body.total_amount,
            img: imgUrl, // 사진이 없는 경우 빈 문자열이 됩니다.
            location: req.body.location,
            user: req.user._id,
            username: req.user.username,
            date: date,
            datey: req.body.datey,
            time: req.body.time,
            accepted:["YES"],
            reserve: [me], 
            description: req.body.description
        });

        res.redirect('/user/flash_purchase');
    } catch (error) {
        console.error(error);
        res.status(500).send('서버에러남');
    }
});


router.get('/post_flash/:postId', async (req, res) => {
    try {
        const result = await db.collection('flashPurchase').findOne({ _id: new ObjectId(req.params.postId) });
        const userprofile = await db.collection('user').findOne({_id: new ObjectId(result.user)})
        if (!result) {
            res.status(404).send('게시물을 찾을 수 없습니다.');
            return;
        }
        res.render('post_flash.ejs', { post: result , userprofile: userprofile, currentUser: new ObjectId(req.user._id), opponentId: result.username});
    } catch (error) {
        console.error(error);
        res.status(500).send('게시물 조회 중 오류가 발생했습니다.');
    }
});

router.get('/edit_flash/:editId', async (req, res) => {
        const result = await db.collection('flashPurchase').findOne({ _id: new ObjectId(req.params.editId) });
        
        res.render('edit_flash.ejs', { edit: result });
});

router.put('/edit_flash', upload.single('img1'), async (req, res) => {
    let imgUrl = '';
        if (req.file) {
            imgUrl = req.file.location;
        }

    await db.collection('flashPurchase').updateOne({_id: new ObjectId(req.body.id), 
        user : new ObjectId(req.user._id)
    }, 
    {$set : {product_name: req.body.product_name,
        quantity: req.body.quantity,
        number_of_recruits: req.body.number_of_recruits,
        total_amount: req.body.total_amount,
        img: imgUrl, // 사진이 없는 경우 빈 문자열이 됩니다.
        location: req.body.location,datey: req.body.datey,
        time: req.body.time,
        description: req.body.description}})
    res.redirect('/user/flash_purchase')
});

router.get('/delete_flash/:deleteId', async (req, res) => {
    await db.collection('flashPurchase').deleteOne({_id : new ObjectId(req.params.deleteId)})
    res.redirect('/user/flash_purchase')
})

router.get('/search_flash', async(req, res) => {
    let 검색조건 = [
        { $search: { index: 'default', text: { query: req.query.val, path: 'datey' } } },
        { $search: { index: 'default', text: { query: req.query.val, path: 'location' } } },
        { $search: { index: 'default', text: { query: req.query.val, path: 'username' } } },
        { $search: { index: 'default', text: { query: req.query.val, path: 'product_name' } } }
    ];

    let results = [];
    for (let i = 0; i < 검색조건.length; i++) {
        let result = await db.collection('flashPurchase').aggregate([검색조건[i]]).toArray();
        results.push(result);
    }
    
    // 결과를 하나로 합치기 위해 배열을 평탄화합니다.
    let flattenedResults = results.flat();

    res.render('search_flash.ejs', { 글목록: flattenedResults, page: req.query.page });
});



module.exports = router