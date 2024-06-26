const crypto = require('crypto');

const generateShortId = () => {
  return crypto.randomBytes(2).toString('hex');
};

module.exports = (sequelize, DataTypes) => {
    const propertyImage = sequelize.define("propertyImage", {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
          defaultValue: generateShortId,
          },
      type: {
        type: DataTypes.STRING,
      },
      name: {
        type: DataTypes.STRING,
      },
      url: {
        type: DataTypes.TEXT,
      },
    });

    propertyImage.associate = models => {
        

    };
  
    return propertyImage;
  };