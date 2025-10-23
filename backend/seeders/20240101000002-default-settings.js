'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('settings', [
      {
        key: 'winter_warning_days',
        value: '7',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        key: 'summer_warning_days',
        value: '5',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('settings', {
      key: ['winter_warning_days', 'summer_warning_days']
    }, {});
  }
};
