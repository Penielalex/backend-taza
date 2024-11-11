const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const {createToken, validateToken} = require('../middleware/JWT');
const {property, propertyImage, user, userImage, payment, savedProperty,comment} = require('../../models');
const axios = require('axios');
const crypto = require('crypto');

router.post('/saveProperty', async (req, res) => {
    const { buyerId, propertyId } = req.body;
  
    try {
      // Check if the combination of brokerId and propertyId already exists
      const existingEntry = await savedProperty.findOne({
        where: { buyerId, propertyId },
      });
  
      if (existingEntry) {
        return res.status(400).json({ message: 'This property is already saved by the broker.' });
      }
  
      // If not, create a new entry
      const newEntry = await savedProperty.create({
        buyerId,
        propertyId,
      });
  
      return res.status(201).json(newEntry);
    } catch (error) {
      console.error('Error saving property:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  router.delete('/deleteSavedProperty', async (req, res) => {
    const { buyerId, propertyId } = req.body;
  
    try {
      // Check if the entry exists
      const existingEntry = await savedProperty.findOne({
        where: { buyerId, propertyId },
      });
  
      if (!existingEntry) {
        return res.status(404).json({ message: 'Saved property not found.' });
      }
  
      // Delete the saved property
      await savedProperty.destroy({
        where: { buyerId, propertyId },
      });
  
      return res.status(200).json({ message: 'Saved property deleted successfully.' });
    } catch (error) {
      console.error('Error deleting saved property:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  
  

  router.get('/getPropertiesByBuyer/:buyerId', async (req, res) => {
    const { buyerId } = req.params;
  
    try {
      // Get saved property IDs for the buyer
      const existingProperty = await savedProperty.findAll({
        where: { buyerId },
        attributes: ['propertyId']
      });
  
      if (existingProperty.length === 0) {
        return res.status(404).json({ message: 'No saved properties found for this buyer.' });
      }
  
      const propertyIds = existingProperty.map(sp => sp.propertyId);
  
      // Retrieve all properties by propertyIds along with associated property images, user information, and user images
      const allProperties = await property.findAll({
        where: {
          id: propertyIds,
        },
        include: [
          { model: propertyImage, as: 'propertyImages' },
          {
            model: user,
            as: 'user',
            include: [{ model: userImage, as: 'userImage' }]
          },
        ],
      });
  
      // Map the properties to include user information, user images, and property image URLs
      const propertiesWithDetails = [];
  
      for (const property of allProperties) {
        const imageUrls = property.propertyImages.map((image) => image.url);
  
        let userImage = '';
        if (property.user && property.user.userImage) {
          // Directly access the single user image
          userImage = property.user.userImage.url;
        }
  
        // Search for comments for the current user
        const brokerId = property.user ? property.user.id : null;
  
        let userComments = [];
        if (brokerId) {
          userComments = await comment.findAll({
            where: { brokerId },
            attributes: ['rateNo'], // Select only 'rateNo' for comments
          });
        }
  
        // Calculate total comments and sum of rateNo
        const totalComments = userComments.length;
        const sumRateNo = userComments.reduce((sum, comment) => sum + comment.rateNo, 0);
  
        // Calculate average rate
        const average = totalComments > 0 ? sumRateNo / totalComments : 0;
        const averageRate = parseFloat(average.toFixed(1));
  
        propertiesWithDetails.push({
          ...property.toJSON(),
          propertyImages: imageUrls,
          user: {
            ...property.user ? property.user.toJSON() : {},
            userImage: userImage || null, // Handle null user image
            totalComments,
            averageRate,
          },
        });
      }
  
      // Respond with the list of properties, associated image URLs, user information, and user images
      res.status(200).json(propertiesWithDetails);
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  module.exports = router;