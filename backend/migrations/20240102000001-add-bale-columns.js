'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add warm_temperature column
    await queryInterface.addColumn('bales', 'warm_temperature', {
      type: Sequelize.FLOAT,
      allowNull: true
    });

    // Add predicted_warm_date column
    await queryInterface.addColumn('bales', 'predicted_warm_date', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('bales', 'warm_temperature');
    await queryInterface.removeColumn('bales', 'predicted_warm_date');
  }
};
