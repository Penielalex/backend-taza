const express = require('express');
const router = express.Router();
const bcrypt =require('bcrypt')
const { userImage, user, property } = require("../../models");
const { propertyImage } = require("../../models");
const path = require('path')
const fs = require("fs");
const {createToken, validateToken} = require('../middleware/JWT')
const { bucket } = require('../../config/firebase');
const multer = require('multer')

const storage = multer.memoryStorage();

// const propertystorage = multer.diskStorage({
//   destination:(req, file, cb) =>{
//   cb(null, path.join(__dirname, '../../property_Images/'))},
//   filename: (req, file, cb) => {
//       console.log(file)
//       cb(null, Date.now() + path.extname(file.originalname))
//   }
// })

const upload = multer({storage:storage})
const propUpload =multer({storage:storage})

router.post('/propertyimageupload', propUpload.array('images', 6), validateToken(['Broker', 'Seller']), async (req, res) => {
  try {
    const { propertyId } = req.body;
    if (!propertyId) {
      return res.status(400).json({ error: 'Property ID is required.' });
    }

    if (req.files.length === 0) {
      return res.status(400).send('Bad Request: You must select a file.');
    }

    const imagePromises = req.files.map(async (file) => {
      const fileName = `${Date.now()}_${file.originalname}`;
      const blob = bucket.file(`property_images/${Date.now()}_property`);
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      blobStream.on('error', (err) => {
        console.error(err);
        throw new Error('Unable to upload image');
      });

      blobStream.end(file.buffer);

      const [url] = await blob.getSignedUrl({
        action: 'read',
        expires: '03-01-2500',
      });

      const image = await propertyImage.create({
        type: file.mimetype,
        name: fileName,
        url,
        propertyId,
      });

      return { propertyImageId: image.id };
    });

    const results = await Promise.all(imagePromises);

    return res.status(200).json({ propertyImageIds: results.map((result) => result.propertyImageId) });
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Internal Server Error: ${error}`);
  }
});

router.post('/userupload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Bad Request: You must select a file.');
    }

    const blob = bucket.file(`user_images/${Date.now()}_user`);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on('error', (err) => {
      console.error(err);
      throw new Error('Unable to upload image');
    });

    blobStream.end(req.file.buffer);

    const [url] = await blob.getSignedUrl({
      action: 'read',
      expires: '03-01-2500',
    });

    const image = await userImage.create({
      type: req.file.mimetype,
      name: req.file.originalname,
      url,
    });

    const thisId = image.id;

    const existingUser = await user.findOne({ where: { userImageId: thisId } });
    if (existingUser) {
      return res.status(400).json({ error: 'User image already registered' });
    } else {
      return res.status(200).json({ userImageId: thisId });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send(`Internal Server Error: ${error}`);
  }
});


 
 module.exports = router;
