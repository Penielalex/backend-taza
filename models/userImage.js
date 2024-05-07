const crypto = require('crypto');

const generateShortId = () => {
  return crypto.randomBytes(2).toString('hex');
};
module.exports = (sequelize, DataTypes) => {
    const userImage = sequelize.define("userImage", {
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
      data: {
        type: DataTypes.BLOB("long"),
      },
    });

    userImage.associate = models => {
        userImage.hasOne(models.user,{ 
            foreignKey: {
                name: 'userImageId',
                allowNull: true
              }
        });

    };
  
    return userImage;
  };