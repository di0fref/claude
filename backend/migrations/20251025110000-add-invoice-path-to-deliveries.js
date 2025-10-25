'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('deliveries', 'invoice_path', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'invoice_number'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('deliveries', 'invoice_path');
  }
};
