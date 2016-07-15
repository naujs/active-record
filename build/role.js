'use strict';

var Registry = require('@naujs/registry'),
    _ = require('lodash');

function getRoleByName(name) {
  this._roles = this._roles || [];
  var role = this._roles[name];
  if (!role) role = Registry.getRole(name);
  return role || null;
}

module.exports = {
  getRole: function getRole(name) {
    return getRoleByName.call(this, name);
  },

  role: function role(name, fn) {
    this._roles = this._roles || [];
    this._roles[name] = fn;
    return this;
  }
};