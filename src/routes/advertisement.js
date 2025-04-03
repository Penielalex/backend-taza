const express = require('express');
const router = express.Router();
const bcrypt =require('bcrypt')
const { userImage, user, property, advertisement } = require("../../models");
const { propertyImage } = require("../../models");
const path = require('path')
const fs = require("fs");
const {createToken, validateToken} = require('../middleware/JWT')
const { bucket } = require('../../config/firebase');
const multer = require('multer')

const storage = multer.memoryStorage();



const upload = multer({storage:storage})
const propUpload =multer({storage:storage}) // Replace with your bucket name

const extractFilePathFromUrl = (url) => {
  const matches = url.match(/advertisements\/[^?]+/);
  return matches ? matches[0] : null;
};

// API to upload an image and save URL + link
router.post('/upload-ad', upload.single('image'), async (req, res) => {
  try {
    const { link } = req.body;

    if (!req.file || !link) {
      return res.status(400).json({ error: 'Image file and link are required.' });
    }

    // Upload the image to Cloud Storage
    const fileName = `advertisements/${Date.now()}_ad`;
    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on('error', (err) => {
      console.error('Upload Error:', err);
      return res.status(500).json({ error: 'Failed to upload image.' });
    });

    blobStream.end(req.file.buffer);

    // Generate a signed URL for the image
    const [url] = await blob.getSignedUrl({
      action: 'read',
      expires: '03-01-2500',
    });

    // Save to database
    const advertisements = await advertisement.create({
      link,
      url,
    });

    return res.status(201).json({
      message: 'Advertisement uploaded successfully',
      advertisementId: advertisements.id,
      imageUrl: url,
      link,
    });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET all advertisements
router.get('/advertisements', async (req, res) => {
  try {
    const advertisements = await advertisement.findAll();
    return res.status(200).json(advertisements);
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE an advertisement by ID
router.delete('/advertisements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await advertisement.findByPk(id);

    if (!ad) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }

    // Extract the file path from the URL
    const filePath = extractFilePathFromUrl(ad.url); 
    console.log(filePath);
    const file = bucket.file(filePath);
    console.log(file);

    // Delete image from storage
    await file.delete();
    
    // Delete from database
    await ad.destroy();

    return res.status(200).json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
