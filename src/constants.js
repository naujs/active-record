/**
 * Global registry values
 */
const PREFIX = 'ActiveRecord';
const PRIMARY_KEY_TYPE = `${PREFIX}.primaryKeyType`;
const FOREIGN_KEY_TYPE = `${PREFIX}.foreignKeyType`;
const CONNECTOR = `${PREFIX}.connector`;

module.exports = {
  PREFIX: PREFIX,
  PRIMARY_KEY_TYPE: PRIMARY_KEY_TYPE,
  FOREIGN_KEY_TYPE: FOREIGN_KEY_TYPE,
  CONNECTOR: CONNECTOR
};
