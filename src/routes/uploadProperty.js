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

module.exports = router