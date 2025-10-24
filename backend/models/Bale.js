module.exports = (sequelize, DataTypes) => {
  const Bale = sequelize.define('Bale', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    deliveryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'deliveries',
        key: 'id'
      },
      field: 'delivery_id'
    },
    isOpen: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_open'
    },
    isClosed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_closed'
    },
    isReimbursed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_reimbursed'
    },
    isBad: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_bad'
    },
    openedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'opened_date'
    },
    closedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'closed_date'
    },
    warmDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'warm_date'
    },
    warmTemperature: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'warm_temperature'
    },
    predictedWarmDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'predicted_warm_date'
    },
    imagePath: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'image_path'
    }
  }, {
    tableName: 'bales',
    timestamps: true,
    underscored: true,
    validate: {
      // A bale cannot be open and closed at the same time
      cannotBeOpenAndClosed() {
        if (this.isOpen && this.isClosed) {
          throw new Error('A bale cannot be open and closed at the same time');
        }
      }
    }
  });

  return Bale;
};
