module.exports = (sequelize, DataTypes)=>{

    const role = sequelize.define('role',{
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          name: {
            type: DataTypes.STRING,
            allowNull: false,
          }
    });

    role.associate = models => {
      role.hasMany(models.user,{ 
        foreignKey: {
        name: 'roleId',
        allowNull: false
      }
      })
    };

    return role;

};