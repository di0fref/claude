'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bales', 'image_path', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'predicted_warm_date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('bales', 'image_path');
  }
};
