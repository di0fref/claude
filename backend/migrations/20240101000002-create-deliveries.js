'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('deliveries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      supplier: {
        type: Sequelize.STRING,
        allowNull: false
      },
      delivery_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      invoice_number: {
        type: Sequelize.STRING,
        allowNull: true
      },
      number_of_bales: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      payment_status: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('deliveries');
  }
};
