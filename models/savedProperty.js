const crypto = require('crypto');

const generateShortId = () => {
  return crypto.randomBytes(2).toString('hex');
};
module.exports = (sequelize, DataTypes)=>{

    const savedProperty = sequelize.define('savedProperty',{
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
          defaultValue: generateShortId,
          },
          buyerId: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          propertyId: {
            type: DataTypes.STRING,
            allowNull: false,
          }
          

         

    });

    

    return savedProperty;

};