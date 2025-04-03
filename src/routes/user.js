const express = require('express');
const router = express.Router();
const {createToken, validateToken} = require('../middleware/JWT');
const { user, userImage, comment } = require('../../models');
const {property, propertyImage, savedProperty} = require('../../models');
const multer = require('multer');
const path = require('path');
const fs = require("fs");
const bcrypt =require('bcrypt')
const db = require('../../models');
const { bucket } = require('../../config/firebase');

  
const upload = multer({
  storage: multer.memoryStorage(),
});

const extractFilePathFromUrl = (url) => {
  const matches = url.match(/user_images\/[^?]+/);
  return matches ? matches[0] : null;
};

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
            const imageLink = userWithImageAndComments.userImage ? userWithImageAndComments.userImage.url : null;
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
                woreda:userWithImageAndComments.woreda,
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

router.get('/getAllUsersWithImages', async (req, res) => {
  try {
    // Retrieve all users with role 1 along with associated image filenames and comments
    const usersWithImagesAndComments = await user.findAll({
      where: { roleId: 1 },
      include: [
        { model: userImage, as: 'userImage' },
      ],
    });

    // Retrieve all properties and comments
    const allProperties = await property.findAll();
    const allComments = await comment.findAll();

    if (usersWithImagesAndComments.length > 0) {
      const response = usersWithImagesAndComments.map(userWithImageAndComments => {
        const brokerProperties = allProperties.filter(property => property.brokerId === userWithImageAndComments.id);
        const brokerComments = allComments.filter(comment => comment.brokerId === userWithImageAndComments.id);

        const imageLink = userWithImageAndComments.userImage ? userWithImageAndComments.userImage.url : null;
        const commentNo = brokerComments.length;
        const totalRate = brokerComments.reduce(
          (sum, comment) => sum + comment.rateNo,
          0
        );

        const averageRate = commentNo === 0 ? 0 : totalRate / commentNo;

        return {
          id: userWithImageAndComments.id,
          firstName: userWithImageAndComments.firstName,
          lastName: userWithImageAndComments.lastName,
          city: userWithImageAndComments.city,
          subCity: userWithImageAndComments.subCity,
          woreda: userWithImageAndComments.woreda,
          phoneNo: userWithImageAndComments.phoneNo,
          totalComments: commentNo,
          averageRate: parseFloat(averageRate.toFixed(1)),
          properties: brokerProperties.length,
          image: imageLink,
          comments: brokerComments.map(comment => ({
            id: comment.id,
            comment: comment.comment,
            rateNo: comment.rateNo,
            brokerId: comment.brokerId,
            commenterId: comment.commenterId,
          })),
        };
      });

      res.status(200).json(response);
    } else {
      res.status(404).json({ error: 'No users found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.put('/updateUser/:id', upload.single('image'), validateToken(['Broker']), async (req, res) => {
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
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract updated user data from the request body
    const { firstName, lastName, city, subCity,woreda, phoneNo } = req.body;

    // Update the user data
    await existingUser.update({
      firstName: firstName || existingUser.firstName,
      lastName: lastName || existingUser.lastName,
      city: city || existingUser.city,
      subCity: subCity || existingUser.subCity,
      woreda: woreda || existingUser.woreda,
      phoneNo: phoneNo || existingUser.phoneNo,
    });

    // Check if a new image file is provided
    if (req.file) {
      // If yes, delete the existing image from Firebase (if any)
      if (existingUser.userImage) {
        const filePath = extractFilePathFromUrl(existingUser.userImage.url);
          if (filePath) {
            const imageRef = bucket.file(filePath);
            await imageRef.delete();
          }
      }

      // Upload the new image to Firebase
      const newImageName = `user_images/${Date.now()}_user`;
      const file = bucket.file(newImageName);
      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
        public: true,
      });

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

      // Update or create the associated userImage
      const userImageInstance = await userImage.findOne({ where: { id: existingUser.userImageId } });
      if (userImageInstance) {
        // Update the existing userImage
        await userImageInstance.update({
          type: req.file.mimetype,
          name: newImageName,
          url: publicUrl,
        });
      } else {
        // Create a new userImage if it doesn't exist
        await userImage.create({
          userId: existingUser.id,
          type: req.file.mimetype,
          name: newImageName,
          url: publicUrl,
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

  router.delete('/deleteUser/:id/:role', async (req, res) => {
    try {
      const userId = req.params.id;
      const userRole = req.params.role; // Get the role from the request
  
      // Check if the user with the specified ID exists
      const existingUser = await user.findOne({
        where: { id: userId },
        include: [
          { model: userImage, as: 'userImage' }, // Include the userImage
        ],
      });
  
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Handle deletion based on the role
      if (userRole === 'Broker') {
        // If userImage exists, delete the image from Firebase
        if (existingUser.userImage) {
          const filePath = extractFilePathFromUrl(existingUser.userImage.url);
          if (filePath) {
            const imageRef = bucket.file(filePath);
            await imageRef.delete(); // Delete the image from Firebase
          }
  
          // Also delete the userImage record from the database
          await userImage.destroy({ where: { id: existingUser.userImageId } });
        }
  
        // Find all properties associated with the user (broker)
        const brokerProperties = await property.findAll({ where: { brokerId: userId } });
  
        // Loop through each property and delete associated property images, saved properties, and the property itself
        for (const prop of brokerProperties) {
          const propertyId = prop.id;
  
          // Find and delete property images from Firebase and database
          const propertyImages = await propertyImage.findAll({ where: { propertyId: propertyId } });
          for (const img of propertyImages) {
            const filePath = extractFilePathFromUrl(img.url);
            if (filePath) {
              const imageRef = bucket.file(filePath);
              await imageRef.delete(); // Delete the image from Firebase
            }
  
            // Delete the propertyImage record from the database
            await propertyImage.destroy({ where: { id: img.id } });
          }
  
          // Delete associated savedProperty entries
          await savedProperty.destroy({ where: { propertyId: propertyId } });
  
          // Delete the property record itself
          await property.destroy({ where: { id: propertyId } });
        }
  
        // Delete broker comments associated with the user
        await comment.destroy({ where: { brokerId: userId } });
  
      } else if (userRole === 'Buyer') {
        // Delete only saved properties where buyerId matches the userId
        await savedProperty.destroy({ where: { buyerId: userId } });
  
      } else if (userRole === 'Seller') {
        // Sellers do not have userImage, so skip that part
  
        // Find all properties associated with the user (seller)
        const sellerProperties = await property.findAll({ where: { brokerId: userId } });
  
        // Loop through each property and delete associated property images, saved properties, and the property itself
        for (const prop of sellerProperties) {
          const propertyId = prop.id;
  
          // Find and delete property images from Firebase and database
          const propertyImages = await propertyImage.findAll({ where: { propertyId: propertyId } });
          for (const img of propertyImages) {
            const filePath = extractFilePathFromUrl(img.url);
            if (filePath) {
              const imageRef = bucket.file(filePath);
              await imageRef.delete(); // Delete the image from Firebase
            }
  
            // Delete the propertyImage record from the database
            await propertyImage.destroy({ where: { id: img.id } });
          }
  
          // Delete associated savedProperty entries
          await savedProperty.destroy({ where: { propertyId: propertyId } });
  
          // Delete the property record itself
          await property.destroy({ where: { id: propertyId } });
        }
  
        // Delete seller comments associated with the user
        
      }
  
      // Delete the user from the database
      await user.destroy({ where: { id: existingUser.id } });
  
      res.status(200).json({ message: 'User and associated data deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  
  
  
  
  
  module.exports = router;

