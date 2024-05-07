const crypto = require('crypto');

const generateShortId = () => {
  return crypto.randomBytes(2).toString('hex');
};
module.exports = (sequelize, DataTypes)=>{

    const property = sequelize.define('property',{
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
          defaultValue: generateShortId,
          },
          type: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          houseType: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          city: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          subCity: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          bedRoomNo: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          bathRoomNo: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          price: {
            type: DataTypes.INTEGER,
            allowNull: false,
          },
          status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
          },
          count: {
            type: DataTypes.INTEGER,
            allowNull: false,
          }

          //three foregn keys one from seller id, broker id, image id

    });

    property.associate = models => {
        property.hasMany(models.propertyImage,{ 
            foreignKey: {
                name: 'propertyId',
                allowNull: false
              }
    
        });
        property.belongsTo(models.user, {
          foreignKey: 'brokerId',
          as: 'user', // You can use this alias to eager load the userImage
        });
      };

    return property;

};