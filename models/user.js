const crypto = require('crypto');

const generateShortId = () => {
  return crypto.randomBytes(2).toString('hex');
};
module.exports = (sequelize, DataTypes)=>{

    const user = sequelize.define('user',{
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
          defaultValue: generateShortId,
            allowNull:false
          },
          firstName: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          lastName: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          city: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          subCity: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          phoneNo: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
          },
          password: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          //two foregn keys one from Role one From UserImage

    });

    user.associate = models => {

        
        
        
        user.hasMany(models.property,{ 
            foreignKey: {
                name: 'brokerId',
                allowNull: false
              }
    
        });
        user.hasMany(models.property,{ 
            foreignKey: {
                name: 'sellerId',
                allowNull: true
              }
    
        });

        user.hasMany(models.comment,{ 
            foreignKey: {
                name: 'brokerId',
                allowNull: false,
                as: 'comments'
              }
    
        });
        user.hasMany(models.comment,{ 
            foreignKey: {
                name: 'commenterId',
                allowNull: false,
                as: 'commenter'

              }
    
        });

        user.belongsTo(models.userImage, {
          foreignKey: 'userImageId',
          as: 'userImage', // You can use this alias to eager load the userImage
        });
      
        
        
      };

     
    return user;

};