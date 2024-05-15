const express = require('express');
const router = express.Router();

router.get('/flash_purchase', async (req, res) => {
    res.render('flash_purchase.ejs');
});

module.exports = router;
