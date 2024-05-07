const express = require('express');
const router = express.Router();
const bcrypt =require('bcrypt')
const { user } = require("../../models");

router.post('/register', async (req, res) => {
   const{firstName, lastName, city, subCity,phoneNo,password, roleId, userImageId }= req.body;

   const existingUser = await user.findOne({ where: { phoneNo: phoneNo } });
    if (existingUser) {
        return res.status(400).json({ error: 'Phone number is already registered.' });
    }
   bcrypt.hash(password, 10).then((hash)=>{
    user.create({
        firstName:firstName,
        lastName:lastName,
        city:city,
        subCity:subCity,
        phoneNo:phoneNo,
        password:hash,
        roleId:roleId,
        userImageId:userImageId
    }).then(() =>{
        res.status(200).json('User Registered');
    }).catch((err) =>{
        if (err) {
            res.status(500).json({ error: err });
          }
    });
   })
});

module.exports = router;