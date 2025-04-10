'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameTable('advertisments', 'advertisements');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameTable('advertisements', 'advertisments');
  }
};

