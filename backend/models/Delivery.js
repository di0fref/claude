module.exports = (sequelize, DataTypes) => {
  const Delivery = sequelize.define('Delivery', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    supplier: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    deliveryDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'delivery_date'
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'invoice_number'
    },
    numberOfBales: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      },
      field: 'number_of_bales'
    },
    paymentStatus: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'payment_status'
    },
    pricePerKg: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'price_per_kg'
    },
    totalKg: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'total_kg'
    }
  }, {
    tableName: 'deliveries',
    timestamps: true,
    underscored: true
  });

  return Delivery;
};
