const crypto = require('crypto');

const generateShortId = () => {
  return crypto.randomBytes(2).toString('hex');
};
module.exports = (sequelize, DataTypes)=>{

    const payment = sequelize.define('payment',{
        chapaPaymentId: {
          type: DataTypes.STRING,
          primaryKey: true,
          defaultValue: generateShortId,
          },
        amount: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false
        },
        fromRole: {
            type: DataTypes.STRING,
            allowNull: false
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false
        }

          //three foregn keys one from seller id, broker id, image id

    });

    

    return payment;

};