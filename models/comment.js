const crypto = require('crypto');

const generateShortId = () => {
  return crypto.randomBytes(2).toString('hex');
};
module.exports = (sequelize, DataTypes)=>{

    const comment = sequelize.define('comment',{
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
          defaultValue: generateShortId,
          },
          comment: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          rateNo: {
            type: DataTypes.INTEGER,
            allowNull: false,
          }
         

          

    });

    comment.associate = models => {
      comment.belongsTo(models.user, {
        foreignKey: 'commenterId',
        as: 'commenter'
    });

    comment.belongsTo(models.user, {
      foreignKey: 'brokerId',
      as: 'comments'
  });
        
      };

    return comment;

};