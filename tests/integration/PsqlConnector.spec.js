// var PsqlConnector = require('@naujs/psql-connector')
//   , ActiveRecord = require('../../')
//   , Registry = require('@naujs/registry');
//
// describe('PsqlConnector', () => {
//   beforeEach(() => {
//     var connector = PsqlConnector.getInstance(getPsqlTestDbOptions());
//     Registry.getInstance().set('ActiveRecord.connector', connector);
//
//     return setupPsqlDatabase(connector.getConnection());
//   });
//
//   testDataAccessMethods();
//
//   afterEach(() => {
//     return teardownPsqlDatabase(connector.getConnection());
//   });
// });
