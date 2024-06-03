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
        last_name: existingUser.last_name,
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
        });
      } else {
        return res.status(500).json({
          msg: "Something went wrong",
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  });

router.post('/verify-payment', async (req, res) => {
  try {

    const hash = crypto
      .createHmac("sha256","beb728459913ac239280a12b1048a39a7bd7e6c5852f61e26b638e8004235c24")
      .update(JSON.stringify(req.body))
      .digest("hex");
      if (hash == req.headers["x-chapa-signature"]) {
        // Retrieve the request's body
        const event = req.body;
        console.log(event);
  
        const { tx_ref, status } = event;
        if (status == "success" && tx_ref) {
          // hit the verify endpoint to make sure a transaction with the given
          // tx_ref was successful
          const response = await axios.get(
            `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
  
            {
              headers: {
                Authorization: "Bearer " + process.env.CHAPA_KEY,
              },
            }
          );
          if (response.status == 200) {
            // if successful find the order
            if (response.data["status"] == "success") {
              const chapaPaymentId = tx_ref;
              const pay = await payment.findOne({ where: { chapaPaymentId } });
              pay.status = response.data.data.status;
              await pay.save();
      
              if (pay.status === 'success') {
                  const User = await user.findByPk(pay.userId);
                  User.paid = true;
                  await User.save();
              }
              res.json({ success: true });
            }
          }
        }
      }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});



module.exports = router;