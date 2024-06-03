const crypto = require('crypto');

const generateShortId = () => {
  return crypto.randomBytes(2).toString('hex');
};
module.exports = (sequelize, DataTypes)=>{

    const buyerNumber = sequelize.define('buyerNumber',{
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
          defaultValue: generateShortId,
          },
          buyerId: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          brokerId: {
            type: DataTypes.STRING,
            allowNull: false,
          }
          

         

    });

    

    return buyerNumber;

};