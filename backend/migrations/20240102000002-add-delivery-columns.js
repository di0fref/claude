'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add price_per_kg column
    await queryInterface.addColumn('deliveries', 'price_per_kg', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });

    // Add total_kg column
    await queryInterface.addColumn('deliveries', 'total_kg', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('deliveries', 'price_per_kg');
    await queryInterface.removeColumn('deliveries', 'total_kg');
  }
};
