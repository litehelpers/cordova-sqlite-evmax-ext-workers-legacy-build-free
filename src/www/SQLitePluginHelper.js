/*
License for this version: GPL v3 (http://www.gnu.org/licenses/gpl.txt) or commercial license.
Contact for commercial license: info@litehelpers.net
 */

(function() {
  var root = this;

  root.sqlitePluginHelper = {
    exec: function(op, args, success, error) {
      cordova.exec(success, error, "SQLitePlugin", op, args);
    }
  };

}).call(this);
