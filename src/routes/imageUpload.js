const express = require('express');
const router = express.Router();
const bcrypt =require('bcrypt')
const { userImage, user, property } = require("../../models");
const { propertyImage } = require("../../models");
const path = require('path')
const fs = require("fs");
const {createToken, validateToken} = require('../middleware/JWT')

//middleware

const multer = require('multer')

const storage = multer.diskStorage({
  destination:(req, file, cb) =>{
  cb(null, path.join(__dirname, '../../user_Images/'))},
  filename: (req, file, cb) => {
      console.log(file)
      cb(null, Date.now() + path.extname(file.originalname))
  }
})
const propertystorage = multer.diskStorage({
  destination:(req, file, cb) =>{
  cb(null, path.join(__dirname, '../../property_Images/'))},
  filename: (req, file, cb) => {
      console.log(file)
      cb(null, Date.now() + path.extname(file.originalname))
  }
})

const upload = multer({storage:storage})
const propUpload =multer({storage:propertystorage})

 router.post('/propertyimageupload',propUpload.array('images', 6),validateToken(['Broker', 'Seller']), async (req, res) => {

    //controller
    try {

      const {propertyId} = req.body
      if (!propertyId) {
        return res.status(400).json({ error: 'Property ID is required.' });
    }

        console.log(req.files);
    
        if (req.files.length === 0) {
            return res.status(400).send("Bad Request: You must select a file.");
        }
    
        const imagePromises = req.files.map(async (file) => {
          const image = await propertyImage.create({
              type: file.mimetype,
              name: file.filename,
              data: fs.readFileSync(
                  path.join(__dirname, '../../property_Images/') + file.filename
              ),
              propertyId: propertyId, // Save the user ID with the image
          });

          fs.writeFileSync(
              path.join(__dirname, '../../property_Images/tmp/') + image.name,
              image.data
          );

          return { propertyImageId: image.id };
      });

      const results = await Promise.all(imagePromises);

      return res.status(200).json({ propertyImageIds: results.map(result => result.propertyImageId) });

  } catch (error) {
      console.log(error);
      return res.status(500).send(`Internal Server Error: ${error}`);
  }
    
    
 });

 router.post('/userupload',upload.single('image'), async (req, res) => {

  //controller
  try {
      console.log(req.file);
  
      if (req.file == undefined) {
          return res.status(400).send("Bad Request: You must select a file.");
      }
  
      userImage.create({
        type: req.file.mimetype,
        name: req.file.filename,
        data: fs.readFileSync(
          path.join(__dirname, '../../user_Images/') + req.file.filename
        ),
      }).then(async (image) => {
        fs.writeFileSync(
          path.join(__dirname, '../../user_Images/tmp/') + image.name,
          image.data
        );

        const thisId = image.id

        const existingUser = await user.findOne({ where: { userImageId: thisId } });
          if (existingUser) {
             return res.status(400).json({ error: 'user image registered' });
           }else{
              return res.status(200).json({ userImageId: thisId });
           }


       
        
      });
    } catch (error) {
      console.log(error);


      return res.status(500).send(`Internal Server Error: ${error}`);
    }
  
  
});


 
 module.exports = router;
