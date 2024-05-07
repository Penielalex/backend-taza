const express = require('express');
const router = express.Router();
const bcrypt =require('bcrypt')
const {createToken, validateToken} = require('../middleware/JWT')
const { user } = require("../../models");


router.post('/login', async (req, res) => {
    const{phoneNo, password,}= req.body;

    const existingUser = await user.findOne({where:{phoneNo: phoneNo}});

    if(!existingUser){res.status(400).json({error:"User Doesn't Exist"});
}else{
    const dbpassword = existingUser.password;
    bcrypt.compare(password, dbpassword).then((match) => {
        if(!match){
            res.status(400).json({error: "wrong username and password"});
        }else{
            const accessToken = createToken(existingUser, res)
            res.status(200).json({ accessToken: accessToken, message: existingUser.roleId });
            
        }
    })
}
    
 });



module.exports = router;