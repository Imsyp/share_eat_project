const express = require('express');
const router = express.Router();

router.get('/userinfo_change', async (req, res) => {
    res.render('userinfo_change.ejs');
});

module.exports = router;
