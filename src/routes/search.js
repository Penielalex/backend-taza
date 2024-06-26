const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const {createToken, validateToken} = require('../middleware/JWT');
const {property, propertyImage, user, userImage, comment} = require('../../models');


router.get('/searchBroker', async (req, res) => {
  try {
    const { searchTerm } = req.query;

    // Validate input parameters if needed

    // Step 1: Find users based on the search criteria
    const users = await user.findAll({
      where: {
        roleId: 1,
        [Op.or]: [
          {
            [Op.or]: [
              { firstName: { [Op.like]: `%${searchTerm}%` } },
              { lastName: { [Op.like]: `%${searchTerm}%` } },
            ],
          },
          { subCity: { [Op.like]: `%${searchTerm}%` } },
        ],
      },
      include: [
        { model: userImage, as: 'userImage', attributes: ['url'] },
        // Add associations for comments and properties if needed
      ],
    });

    // Extract user IDs from the result
    const userIds = users.map(user => user.id);

    // Step 2: Find properties based on the user IDs
    const properties = await property.findAll({
      where: {
        brokerId: userIds,
      },
      attributes: ['id', 'brokerId'], // Include sellerId for reference
    });

    // Step 3: Find comments based on the user IDs
    const comments = await comment.findAll({
      where: {
        brokerId: userIds,
      },
       // Include commenterId for reference
    });

    // Map the users to include the image link, property count, total comments, average rate, and comments details
    const usersWithDetails = users.map((user) => {
      const imageLink =user.userImage.url;

      // Filter properties and comments based on user ID
      const userProperties = properties.filter(property => property.brokerId === user.id);
      const userComments = comments.filter(comment => comment.brokerId === user.id);
      const totalRateNo = userComments.reduce((sum, comment) => sum + comment.rateNo, 0);
      const averageRate = userComments.length > 0 ? totalRateNo / userComments.length : 0;
      

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        city: user.city,
        subCity: user.subCity,
        woreda: user.woreda,
        phoneNo:user.phoneNo,
        image: imageLink,
        averageRate:parseFloat(averageRate.toFixed(1)),
        properties: userProperties.length,
        totalComments:userComments.length,
        comments: userComments.map(comment => ({
          id: comment.id,
          comment: comment.comment,
          rateNo: comment.rateNo,
          createdAt: comment.createdAt,
          // Include other comment attributes as needed
        })),
      };
    });

    res.status(200).json(usersWithDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




router.get('/searchProperties', async (req, res) => {
  try {
    // Extract filters from the query parameters
    const filters = req.query;

    // Define the conditions for the property query
    const conditions = [];

    // Apply filters for each property field
    if (filters.type) {
      conditions.push({ type: filters.type });
    }

    if (filters.houseType) {
      conditions.push({ houseType: filters.houseType });
    }

    if (filters.city) {
      conditions.push({ city: filters.city });
    }

    if (filters.subCity) {
      conditions.push({ subCity: filters.subCity });
    }

    if (filters.bedRoomNo) {
      conditions.push({ bedRoomNo: filters.bedRoomNo });
    }

    if (filters.bathRoomNo) {
      conditions.push({ bathRoomNo: filters.bathRoomNo });
    }

    if (filters.woreda) {
      conditions.push({ woreda: filters.woreda });
    }

    // Apply filter for the price range
    if (filters.minPrice && filters.maxPrice) {
      conditions.push({
        price: {
          [Op.between]: [filters.minPrice, filters.maxPrice],
        },
      });
    }

    // SpecificPlace filter (optional/non-strict)
    if (filters.specificPlace) {
      conditions.push({
        [Op.or]: [
          { specificPlace: { [Op.like]: `%${filters.specificPlace}%` } },
          { specificPlace: { [Op.eq]: null } }, // Include properties with no specificPlace
        ],
      });
    }

    console.log(conditions);

    // Include property images in the result and map them to links
    const allProperties = await property.findAll({
      where: {
        [Op.and]: conditions,
      },
      include: [
        { model: propertyImage, as: 'propertyImages' },
        {
          model: user,
          as: 'user',
          include: [{ model: userImage, as: 'userImage' }],
        },
      ],
    });

    // Map the properties to include image links
    const propertiesWithDetails = [];

    for (const property of allProperties) {
      const imageUrls = property.propertyImages.map((image) => image.url);

      let userImage = '';

      if (property.user && property.user.userImage) {
        userImage = property.user.userImage.url;
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
      const averageRate = parseFloat(average.toFixed(1));

      propertiesWithDetails.push({
        ...property.toJSON(),
        propertyImages: imageUrls,
        user: {
          ...property.user.toJSON(),
          userImage: userImage,
          totalComments,
          averageRate,
        },
      });
    }
    res.status(200).json(propertiesWithDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


  module.exports = router;