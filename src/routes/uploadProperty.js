const express = require('express');
const router = express.Router();
const {createToken, validateToken} = require('../middleware/JWT');
const {property} = require('../../models');


router.post('/uploadproperty', validateToken(['Broker','Seller']), async(req, res)=>{
    const {type,houseType,city,subCity,bedRoomNo,bathRoomNo,price,status,countContact,views,brokerId, sellerId}= req.body;

    property.create({
        type:type,
        houseType:houseType,
        city:city,
        subCity:subCity,
        bedRoomNo:bedRoomNo,
        bathRoomNo:bathRoomNo,
        price:price,
        status:status,
        countContact:countContact,
        views:views,
        brokerId:brokerId,
        sellerId:sellerId
    }).then((savedProperty) =>{
        res.status(200).json({propertyId:savedProperty.id});
    }).catch((err)=>{
        if(err){
            res.status(500).json({error:err});
        }
    });
}
    );

    router.put('/incrementPropertyCount/:id', async (req, res) => {
        try {
          const propertyId = req.params.id;
      
          // Find the property by ID
          const propertyF = await property.findOne({ where: { id: propertyId } });
      
          if (!propertyF) {
            return res.status(404).json({ error: 'Property not found' });
          }
      
          // Increment the count by 1
          propertyF.countContact += 1;
      
          // Save the updated property
          await propertyF.save();
      
          // Respond with the updated property data
          res.status(200).json({ message: 'Property count incremented successfully', property: propertyF });
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });
      router.put('/incrementPropertyView/:id', async (req, res) => {
        try {
          const propertyId = req.params.id;
      
          // Find the property by ID
          const propertyF = await property.findOne({ where: { id: propertyId } });
      
          if (!propertyF) {
            return res.status(404).json({ error: 'Property not found' });
          }
      
          // Increment the count by 1
          propertyF.views += 1;
      
          // Save the updated property
          await propertyF.save();
      
          // Respond with the updated property data
          res.status(200).json({ message: 'Property count incremented successfully', property: propertyF });
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });

module.exports = router