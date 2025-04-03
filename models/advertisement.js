const crypto = require('crypto');

const generateShortId = () => {
  return crypto.randomBytes(2).toString('hex');
};

module.exports = (sequelize, DataTypes) => {

    const advertisement = sequelize.define('advertisement', {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
          defaultValue: generateShortId,
          },
      link: {
        type: DataTypes.TEXT,
      },
      url: {
        type: DataTypes.TEXT,
      },
    });

    
  
    return advertisement;
  };