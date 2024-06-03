const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const {createToken, validateToken} = require('../middleware/JWT');
const {property, propertyImage, user, userImage, payment, buyerNumber} = require('../../models');
const axios = require('axios');
const crypto = require('crypto');

router.post('/create-payment', async (req, res) => {
    const { amount, userId,fromRole } = req.body;
    //const Chapa_Auth_Key = CHASECK_TEST-VNHcYDRNqJ4LXi0ADJ7gWophtt9qBsHV;
    
  
    try {
      const existingUser = await user.findByPk(userId);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      const tx_ref = `${existingUser.firstName}-${Date.now()}`;
      const response = await axios.post('https://api.chapa.co/v1/transaction/mobile-initialize', {
        amount,
        currency: 'ETB',
        first_name: existingUser.firstName,
        last_name: existingUser.lastName,
        phone_number: existingUser.phoneNo,
       callback_url:"https://backend-taza.onrender.com/verify-payment",
        tx_ref: tx_ref,
        
      }, {
        headers: {
          Authorization: 'Bearer CHASECK_TEST-VNHcYDRNqJ4LXi0ADJ7gWophtt9qBsHV',
          "Content-Type": "application/json",
        }
      });
  
      if (response.data["status"] == "success") {
        const Payment = await payment.create({
          chapaPaymentId: tx_ref,
          amount,
          fromRole,
          status: 'pending',
          userId
      });
        return res.json({
          msg: "Order created successfully. Perform payment.",
          paymentUrl: response.data["data"]["checkout_url"],
          tx_ref: tx_ref
        });
      } else {
        return res.status(500).json({
          msg: "Something went wrong",
        });
      }
    } catch (error) {
      if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    } else {
      console.error('Error message:', error.message);
    }
      res.status(500).json({ error: 'Failed to create payment' });
    }
  });

  router.post('/verify-payment/', async (req, res) => {
    const { tx_ref } = req.body;

    try {
        const response = await axios.get(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
            headers: {
                Authorization: 'Bearer CHASECK_TEST-VNHcYDRNqJ4LXi0ADJ7gWophtt9qBsHV',
            }
        });
        const chapaPaymentId = tx_ref;

        const pay = await payment.findOne({ where: { chapaPaymentId } });
        if (!pay) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        pay.status = response.data.data.status;
        await pay.save();

        if (pay.status === 'success') {
            const existinguser = await user.findByPk(pay.userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            existinguser.paid = true;
            await existinguser.save();
            return res.json(response.data.data.status);
        }else{
         return res.status(404).json({ error: 'status still pending' });
        }

        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});



module.exports = router;