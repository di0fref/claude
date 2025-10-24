'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    await queryInterface.bulkInsert('settings', [
      {
        key: 'winter_warning_days',
        value: '7',
        created_at: now,
        updated_at: now
      },
      {
        key: 'summer_warning_days',
        value: '5',
        created_at: now,
        updated_at: now
      },
      {
        key: 'email_smtp_host',
        value: 'smtp.gmail.com',
        created_at: now,
        updated_at: now
      },
      {
        key: 'email_smtp_port',
        value: '587',
        created_at: now,
        updated_at: now
      },
      {
        key: 'email_smtp_user',
        value: '',
        created_at: now,
        updated_at: now
      },
      {
        key: 'email_smtp_password',
        value: '',
        created_at: now,
        updated_at: now
      },
      {
        key: 'email_to',
        value: '',
        created_at: now,
        updated_at: now
      },
      {
        key: 'email_notifications_enabled',
        value: 'false',
        created_at: now,
        updated_at: now
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('settings', null, {});
  }
};
