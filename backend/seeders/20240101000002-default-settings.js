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
      },
      {
        key: 'smhi_latitude',
        value: '59.3293',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        key: 'smhi_longitude',
        value: '18.0686',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        key: 'email_notifications_enabled',
        value: 'false',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        key: 'email_smtp_host',
        value: '',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        key: 'email_smtp_port',
        value: '587',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        key: 'email_smtp_user',
        value: '',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        key: 'email_smtp_password',
        value: '',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        key: 'email_from',
        value: '',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        key: 'email_to',
        value: '',
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
