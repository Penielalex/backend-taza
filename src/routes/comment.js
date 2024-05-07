const express = require('express');
const router = express.Router();
const {createToken, validateToken} = require('../middleware/JWT');
const {user, comment} = require('../../models');

router.post('/postComment/:commenterId', validateToken(['Seller','Buyer']), async (req, res) => {
    try {
      const { commenterId } = req.params;
      const { commenttext, rateNo, brokerId} = req.body;
  
      // Check if the property with the specified ID exists
      
      // Create the comment
      const newComment = await comment.create({
        comment: commenttext,
        rateNo: rateNo,
        commenterId: commenterId,
        brokerId: brokerId, // Assuming the broker's ID is extracted from the token
      });
  
      // Respond with the created comment
      res.status(201).json({ message: 'Comment posted successfully', comment: newComment });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  module.exports = router;