'use strict';

/**
 * Global registry values
 */
var PREFIX = 'ActiveRecord';
var PRIMARY_KEY_TYPE = PREFIX + '.primaryKeyType';
var FOREIGN_KEY_TYPE = PREFIX + '.foreignKeyType';
var CONNECTOR = PREFIX + '.connector';
var ROLE = PREFIX + '.role';

module.exports = {
  PREFIX: PREFIX,
  PRIMARY_KEY_TYPE: PRIMARY_KEY_TYPE,
  FOREIGN_KEY_TYPE: FOREIGN_KEY_TYPE,
  CONNECTOR: CONNECTOR,
  ROLE: ROLE
};