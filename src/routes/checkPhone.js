const express = require('express');
const router = express.Router();
const bcrypt =require('bcrypt')
const { user } = require("../../models");

router.post('/phone/check', async (req, res) => {
    const{ phoneNo }= req.body;
 
    const existingUser = await user.findOne({ where: { phoneNo: phoneNo } });
     if (existingUser) {
         return res.status(400).json({ error: 'Phone number is already registered.' });
     }});
     
     
module.exports = router;