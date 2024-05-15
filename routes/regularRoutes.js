const express = require('express');
const router = express.Router();

router.get('/regular_purchase', async (req, res) => {
    res.render('regular_purchase.ejs');
});

module.exports = router;
