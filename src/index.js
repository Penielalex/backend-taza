const express = require('express');
const compression = require('compression');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const PORT = 3000;
const db = require('../models');

const register =require('./routes/register');
const imageUpload = require('./routes/imageUpload');
const checkPhone = require('./routes/checkPhone');
const login = require('./routes/login');
const uploadProperty = require('./routes/uploadProperty');
const getProperty =require('./routes/getProperty');
const user = require('./routes/user');
const search= require('./routes/search');
const comment= require('./routes/comment');
const payment= require('./routes/payment');
const saveProperty = require('./routes/saveProperty');

app.use(compression());

app.use(register);
app.use(imageUpload);
app.use(checkPhone);
app.use(login);
app.use(uploadProperty);
app.use(getProperty);
app.use(user);
app.use(search);
app.use(comment);
app.use(payment);
app.use(saveProperty)
app.use('/property_Images', express.static('property_Images'));
app.use('/user_Images', express.static('user_Images'));



async function ensureRolesExist() {
    try {
      const predefinedRoles = ['Broker', 'Seller', 'Buyer'];
  
      // Check if there are any roles in the database
      const existingRoles = await db.role.findAll();
  
      // If no roles exist, create them
      if (existingRoles.length === 0) {
        await db.role.bulkCreate(predefinedRoles.map(name => ({ name })));
        console.log('Predefined roles created.');
      }
    } catch (error) {
      console.error('Error ensuring roles exist:', error);
    }
  }



  db.sequelize
  .authenticate() // First, authenticate to test the connection
  .then(() => {
    console.log('Database connection established successfully.');
    return db.sequelize.sync(); // Proceed with syncing if authentication succeeds
  })
  .then(() => {
    console.log('Database synchronized successfully.');
    return ensureRolesExist(); // Call your custom logic
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log('App listening on port ' + PORT);
      console.log(`Running in ${process.env.NODE_ENV || 'development'} mode`);
    });
  })
  .catch((error) => {
    console.error('Error during database setup:', error.stack); // Log the error stack
  });

