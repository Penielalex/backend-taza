const express = require('express');
const router = express.Router();
const bcrypt =require('bcrypt')
const { user } = require("../../models");

router.post('/register', async (req, res) => {
    const { firstName, lastName, city, subCity,woreda, phoneNo, password, roleId, userImageId } = req.body;

    try {
        const existingUser = await user.findOne({ where: { phoneNo: phoneNo } });
        if (existingUser) {
            return res.status(400).json({ error: 'Phone number is already registered.' });
        }

        bcrypt.hash(password, 10).then(async (hash) => {
            try {
                const newUser = await user.create({
                    firstName,
                    lastName,
                    city,
                    subCity,
                    woreda,
                    phoneNo,
                    password: hash,
                    roleId,
                    userImageId
                });

                res.status(200).json({ message: 'User Registered', userId: newUser.id });
            } catch (err) {
                res.status(500).json({ error: err });
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;