const express = require('express');
const router = express.Router();
const {createToken, validateToken} = require('../middleware/JWT');
const {property, propertyImage, user, userImage, comment} = require('../../models');
const db = require('../../models');
const path = require('path')
const fs = require("fs");

const multer = require('multer')


const propertystorage = multer.diskStorage({
  destination:(req, file, cb) =>{
  cb(null, path.join(__dirname, '../../property_Images/'))},
  filename: (req, file, cb) => {
      console.log(file)
      cb(null, Date.now() + path.extname(file.originalname))
  }
})


const propUpload =multer({storage:propertystorage})



router.get('/getAllProperties', async (req, res) => {
  try {
    // Retrieve all properties from the database along with associated property images, user information, and user images
    const allProperties = await property.findAll({
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
      const imageUrls = property.propertyImages.map((image) => {
        return `/property_Images/${image.name}`;
      });

      let userImage = '';
      console.log(property.user)

      if (property.user && property.user.userImage) {
        // Directly access the single user image
        userImage = `/user_Images/${property.user.userImage.name}`;
      }
      

      // Search for comments for the current user
      const userComments = await comment.findAll({
        where: {
          brokerId: property.user.id,
        },
        attributes: ['rateNo'], // Select only 'rateNo' for comments
      });

      // Calculate total comments and sum of rateNo
      const totalComments = userComments.length;
      const sumRateNo = userComments.reduce((sum, comment) => sum + comment.rateNo, 0);

      // Calculate average rate
      const average = totalComments > 0 ? sumRateNo / totalComments : 0;
      const averageRate= parseFloat(average.toFixed(1));

      propertiesWithDetails.push({
        ...property.toJSON(),
        propertyImages: imageUrls,
        user: {
          ...property.user.toJSON(),
          userImage: userImage || null, // Handle null user image
          totalComments,
          averageRate,
        },
      });
    }

    // Respond with the list of properties, associated image URLs, user information, and user images
    res.status(200).json(propertiesWithDetails);
    propertiesWithDetails.forEach(property => {
      console.log('Data types for property:');
      console.log(`id: ${ user.firstName}`);
      console.log(`type: ${typeof property.type}`);
      console.log(`city: ${typeof property.city}`);
      console.log(`price: ${typeof property.price}`);
      console.log(`status: ${typeof property.user.averageRate}`);
    });
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
          return `/propertyImages/${image.name}`;
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
  

  router.get('/getPropertiesByBrokerId/:brokerId', validateToken(['Broker']), async (req, res) => {
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
          return `/property_Images/${image.name}`;
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
          return `/property_Images/${image.name}`;
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


  router.put('/updateProperty/:id', validateToken(['Broker','Seller']), propUpload.array('images', 5), async (req, res) => {
    const transaction = await db.sequelize.transaction();
  
    try {
      const propertyId = req.params.id;
      console.log('propertyID:'+propertyId)
  
      // Check if the property with the specified ID exists
      const existingProperty = await property.findByPk(propertyId, {
        include: [{ model: propertyImage, as: 'propertyImages' }],
      });
      if (!existingProperty) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Property not found' });
      }
  
      // Extract updated property data from the request body
      const { type, houseType, city, subCity, bedRoomNo, bathRoomNo, price, status } = req.body;
  
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
        },
        { transaction }
      );
  
      // Update associated property images if provided in the request
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const existingImages = await propertyImage.findAll({
            where: { propertyId: propertyId },
            attributes: ['name'], // Assuming 'name' is the property that stores the file name
            raw: true,
            transaction,
        });
    
        existingImages.forEach((image) => {
            const imagePath = path.join(__dirname, '../../property_Images/', image.name);
            const tmpPath = path.join(__dirname, '../../property_Images/tmp', image.name);

    
            // Delete the file from the server
            fs.unlinkSync(imagePath);
            fs.unlinkSync(tmpPath);
            
        });
        
        // Delete existing property images
        await propertyImage.destroy({
          where: { propertyId: propertyId },
          transaction,
        });
  
        // Create new property images
        const newImages = req.files.map((file) => {
            const imagePath = path.join(__dirname, '../../property_Images/') + file.filename;
            return {
              type: file.mimetype,
              name: file.filename,
              data: fs.readFileSync(imagePath),
              propertyId: propertyId,
            };
          });
          
          // Write new images to the tmp directory
          newImages.forEach((newImage) => {
            const tmpPath = path.join(__dirname, '../../property_Images/tmp/') + newImage.name;
            fs.writeFileSync(tmpPath, newImage.data);
          });
          
          // Use propertyImage.bulkCreate to create new images within the transaction
          await propertyImage.bulkCreate(newImages, { transaction });
          
      }
  
      // Fetch the updated property data
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

  router.delete('/deleteProperty/:id',validateToken(['Broker','Seller']), async (req, res) => {
    const propertyId = req.params.id;
  
    try {
      // Check if the property with the specified ID exists
      const existingProperty = await property.findByPk(propertyId, {
        include: [{ model: propertyImage, as: 'propertyImages' }],
      });
  
      if (!existingProperty) {
        return res.status(404).json({ error: 'Property not found' });
      }
  
      // Delete the associated images on the server
      for (const image of existingProperty.propertyImages) {
        const imagePath = path.join(__dirname, '../../property_Images/', image.name);
        const tmpPath = path.join(__dirname, '../../property_Images/tmp', image.name);


        // Delete the file from the server
        fs.unlinkSync(imagePath);
        fs.unlinkSync(tmpPath);
      }
  
      // Delete the temporary images in the tmp directory
      
  
      // Delete the property
      await existingProperty.destroy();
  
      res.status(200).json({ message: 'Property deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  module.exports = router;