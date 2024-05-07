const express = require('express');
const router = express.Router();
const {createToken, validateToken} = require('../middleware/JWT');
const { user, userImage, comment } = require('../../models');
const {property, propertyImage} = require('../../models');
const multer = require('multer');
const path = require('path');
const fs = require("fs");
const bcrypt =require('bcrypt')
const db = require('../../models');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../../user_Images/'));
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  });
  
  const upload = multer({ storage: storage });

  router.get('/getUserWithImage/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // Retrieve user data along with associated image filename and comments
        const userWithImageAndComments = await user.findOne({
            where: { id: userId },
            include: [
              { model: userImage, as: 'userImage' },
            ],
          });
        const brokerProperties = await property.findAll({
            where: { brokerId: userId },
          });
          const brokerComments = await comment.findAll({
            where: { brokerId: userId },
          });

        if (userWithImageAndComments) {
            // Construct the image link
            const imageLink = `/user_Images/${userWithImageAndComments.userImage.name}`;
            const commentNo = brokerComments.length;
            const totalRate = brokerComments.reduce(
                (sum, comment) => sum + comment.rateNo,
                0
            );

            // Calculate average rate (avoid division by zero)
            const averageRate = commentNo === 0 ? 0 : totalRate / commentNo;

            // Include the link, city, subCity, and comments in the response
            const response = {
                id: userWithImageAndComments.id,
                firstName: userWithImageAndComments.firstName,
                lastName: userWithImageAndComments.lastName,
                city: userWithImageAndComments.city,
                subCity: userWithImageAndComments.subCity,
                phoneNo:userWithImageAndComments.phoneNo,
                commentNo: commentNo,
                averageRate: parseFloat(averageRate.toFixed(1)),
                noOfProperty:brokerProperties.length,
                image: imageLink,
                comments: brokerComments.map(comment => ({
                    id: comment.id,
                    comment: comment.comment,
                    rateNo: comment.rateNo,
                    brokerId:comment.brokerId,
                    commenterId:comment.commenterId,
                })),
                
            };

            res.status(200).json(response);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

  router.put('/updateUser/:id', upload.single('image'),validateToken(['Broker']), async (req, res) => {
    

    try {
      const userId = req.params.id;
  
      // Check if the user with the specified ID exists
      const existingUser = await user.findOne({
            where: { id: userId },
            include: [
              { model: userImage, as: 'userImage' },
            ],
          });

      if (!existingUser) {
        await transaction.rollback();
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Extract updated user data from the request body
      const { firstName, lastName, city, subCity, phoneNo } = req.body;
  
      // Update the user data
      await existingUser.update({
        firstName: firstName || existingUser.firstName,
        lastName: lastName || existingUser.lastName,
        city: city || existingUser.city,
        subCity: subCity || existingUser.subCity,
        phoneNo: phoneNo || existingUser.phoneNo,
      },
      
      );
  
      // Check if a new image file is provided
      if (req.file) {
        // If yes, update or create the associated userImage
        const userImageInstance = await userImage.findOne({ where: { id: existingUser.userImageId } });
        if (userImageInstance) {
          // Update the existing userImage
          await userImageInstance.update({
            type: req.file.mimetype,
            name: req.file.filename,
            data: req.file.buffer,
            
            
          });
        } else {
          // Create a new userImage if it doesn't exist
          await userImage.create({
            id: existingUser.userImageId,
            type: req.file.mimetype,
            name: req.file.filename,
            data: req.file.buffer,
          });
        }
      }
  
      // Respond with the updated user data
      res.status(200).json({ message: 'User updated successfully', user: existingUser });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  router.put('/changePassword/:id', validateToken(['Buyer', 'Seller', 'Broker']), async (req, res) => {
    try {
      const userId = req.params.id;
  
      // Check if the user with the specified ID exists
      const existingUser = await user.findByPk(userId);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Extract old and new passwords from the request body
      const { oldPassword, newPassword } = req.body;
  
      // Compare old password with the existing hashed password
      const isPasswordValid = await bcrypt.compare(oldPassword, existingUser.password);
  
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Old password is incorrect' });
      }
  
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      // Update the user's password
      await existingUser.update({
        password: hashedPassword,
      });
  
      // Respond with a success message
      res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  module.exports = router;

