const express = require('express');
const router = express.Router();
const {createToken, validateToken} = require('../middleware/JWT');
const {property, propertyImage, user, userImage, comment} = require('../../models');
const db = require('../../models');
const path = require('path')
const fs = require("fs");
const { bucket } = require('../../config/firebase');
const multer = require('multer')


const upload = multer({
  storage: multer.memoryStorage(),
});

const extractFilePathFromUrl = (url) => {
  const matches = url.match(/property_images\/[^?]+/);
  return matches ? matches[0] : null;
};



const { sequelize } = require('../../models'); // Ensure this is correctly imported

router.get('/getAllProperties', async (req, res) => {
  try {
    // Fetch all properties with associated images and user data
    const allProperties = await property.findAll({
      include: [
        {
          model: propertyImage,
          as: 'propertyImages',
          attributes: ['url'],
        },
        {
          model: user,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName'],
          include: [
            {
              model: userImage,
              as: 'userImage',
              attributes: ['url'],
            },
          ],
        },
      ],
    });

    // Fetch comment statistics using a raw query
    const [commentStats] = await sequelize.query(`
      SELECT brokerId, COUNT(rateNo) AS totalComments, AVG(rateNo) AS averageRate
      FROM comments
      GROUP BY brokerId
    `);

    // Convert commentStats into a map by brokerId for fast access
    const commentsMap = commentStats.reduce((map, stat) => {
      map[stat.brokerId] = {
        totalComments: stat.totalComments,
        averageRate: parseFloat(stat.averageRate).toFixed(1),
      };
      return map;
    }, {});

    // Structure the properties with necessary details
    const propertiesWithDetails = allProperties.map(property => {
      const propertyImages = property.propertyImages.map(img => img.url);
      const userImage = property.user?.userImage ? property.user.userImage.url : null;
      const brokerId = property.user ? property.user.id : null;

      // Retrieve comment statistics for the current broker
      const userCommentStats = commentsMap[brokerId] || { totalComments: 0, averageRate: 0 };

      return {
        ...property.toJSON(),
        propertyImages,
        user: {
          ...property.user?.toJSON(),
          userImage,
          totalComments: userCommentStats.totalComments,
          averageRate: userCommentStats.averageRate,
        },
      };
    });

    // Respond with the final data
    res.status(200).json(propertiesWithDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




  router.get('/getPropertyById/:id', async (req, res) => {
    try {
      const propertyId = req.params.id;
  
      // Retrieve the property by its ID from the database along with associated property images
      const foundProperty = await property.findByPk(propertyId, {
        include: [{ model: propertyImage, as: 'propertyImages' }],
      });
  
      if (foundProperty) {
        // Map the property to include only image URLs
        const imageUrls = foundProperty.propertyImages.map((image) => {
          return image.url;
        });
  
        // Respond with the property and associated image URLs
        const propertyWithImageUrls = {
          ...foundProperty.toJSON(), // Convert property to plain JSON object
          propertyImages: imageUrls,
        };
  
        res.status(200).json(propertyWithImageUrls);
      } else {
        // Property not found
        res.status(404).json({ error: 'Property not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  

  router.get('/getPropertiesByBrokerId/:brokerId', validateToken(['Broker','Seller']), async (req, res) => {
    try {
      const brokerId = req.params.brokerId;
  
      // Retrieve all properties associated with the specified broker ID from the database along with associated property images
      const brokerProperties = await property.findAll({
        where: { brokerId: brokerId },
        include: [{ model: propertyImage, as: 'propertyImages' }],
      });
  
      // Map the properties to include only image URLs
      const propertiesWithImageUrls = brokerProperties.map((property) => {
        const imageUrls = property.propertyImages.map((image) => {
          return image.url;
        });
  
        return {
          ...property.toJSON(), // Convert property to plain JSON object
          propertyImages: imageUrls,
        };
      });
  
      // Respond with the list of properties and associated image URLs
      res.status(200).json(propertiesWithImageUrls);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  router.get('/getPropertiesBySellerId/:sellerId', validateToken(['Seller']), async (req, res) => {
    try {
      const sellerId = req.params.sellerId;
  
      // Retrieve all properties associated with the specified broker ID from the database along with associated property images
      const brokerProperties = await property.findAll({
        where: { sellerId: sellerId },
        include: [{ model: propertyImage, as: 'propertyImages' }],
      });
  
      // Map the properties to include only image URLs
      const propertiesWithImageUrls = brokerProperties.map((property) => {
        const imageUrls = property.propertyImages.map((image) => {
          return image.url;
        });
  
        return {
          ...property.toJSON(), // Convert property to plain JSON object
          propertyImages: imageUrls,
        };
      });
  
      // Respond with the list of properties and associated image URLs
      res.status(200).json(propertiesWithImageUrls);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  router.put('/updateProperty/:id', validateToken(['Broker', 'Seller']), upload.array('images', 5), async (req, res) => {
    const transaction = await property.sequelize.transaction();
  
    try {
      const propertyId = req.params.id;
      console.log('propertyID:', propertyId);
  
      // Check if the property with the specified ID exists
      const existingProperty = await property.findByPk(propertyId, {
        include: [{ model: propertyImage, as: 'propertyImages' }],
      });
  
      if (!existingProperty) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Property not found' });
      }
  
      // Extract updated property data from the request body
      const { type, houseType, city, subCity, bedRoomNo, bathRoomNo, price, status, specificPlace, woreda,description } = req.body;
  
      // Update the property data
      await existingProperty.update(
        {
          type: type || existingProperty.type,
          houseType: houseType || existingProperty.houseType,
          city: city || existingProperty.city,
          subCity: subCity || existingProperty.subCity,
          bedRoomNo: bedRoomNo || existingProperty.bedRoomNo,
          bathRoomNo: bathRoomNo || existingProperty.bathRoomNo,
          price: price || existingProperty.price,
          status: status || existingProperty.status,
          specificPlace: specificPlace || existingProperty.specificPlace,
          woreda: woreda || existingProperty.woreda,
          description: description || existingProperty.description
        },
        { transaction }
      );
  
      // If new images are uploaded, delete previous images and upload new ones
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        // Delete previous images from Firebase Storage and the database
        const existingImages = await propertyImage.findAll({
          where: { propertyId: propertyId },
          transaction,
        });
  
        for (const image of existingImages) {
          const filePath = extractFilePathFromUrl(image.url);
          if (filePath) {
            const imageRef = bucket.file(filePath);
            await imageRef.delete();
          }
        }
  
        await propertyImage.destroy({
          where: { propertyId: propertyId },
          transaction,
        });
  
        // Upload new property images to Firebase Storage and update URLs in the database
        const imagePromises = req.files.map(async (file) => {
          const newFileName = `property_images/${Date.now()}_${file.originalname}`;
          const blob = bucket.file(newFileName);
          const blobStream = blob.createWriteStream({
            metadata: {
              contentType: file.mimetype,
            },
          });
  
          await new Promise((resolve, reject) => {
            blobStream.on('error', reject);
            blobStream.on('finish', resolve);
            blobStream.end(file.buffer);
          });
  
          const [url] = await blob.getSignedUrl({
            action: 'read',
            expires: '03-01-2500',
          });
  
          const image = await propertyImage.create({
            type: file.mimetype,
            name: newFileName,
            url,
            propertyId,
          }, { transaction });
  
          return { propertyImageId: image.id };
        });
  
        await Promise.all(imagePromises);
      }
  
      // Fetch the updated property data with new image URLs
      const updatedProperty = await property.findByPk(propertyId, {
        include: [{ model: propertyImage, as: 'propertyImages' }],
        transaction,
      });
  
      // Commit the transaction
      await transaction.commit();
  
      // Respond with the updated property data
      res.status(200).json({ message: 'Property updated successfully', property: updatedProperty });
    } catch (error) {
      console.log(error);
      // Rollback the transaction in case of an error
      await transaction.rollback();
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  
  router.delete('/deleteProperty/:id', validateToken(['Broker', 'Seller']), async (req, res) => {
    const propertyId = req.params.id;
  
    try {
      // Check if the property with the specified ID exists
      const existingProperty = await property.findByPk(propertyId, {
        include: [{ model: propertyImage, as: 'propertyImages' }],
      });
  
      if (!existingProperty) {
        return res.status(404).json({ error: 'Property not found' });
      }
  
      // Delete the associated images from Firebase Storage
      for (const image of existingProperty.propertyImages) {
        const filePath = extractFilePathFromUrl(image.url);
        if (filePath) {
          const fileRef = bucket.file(filePath);
          await fileRef.delete();
        }
      }
  
      // Delete the property images from the database
      await propertyImage.destroy({
        where: { propertyId: propertyId },
      });
  
      // Delete the property
      await existingProperty.destroy();
  
      res.status(200).json({ message: 'Property deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  module.exports = router;