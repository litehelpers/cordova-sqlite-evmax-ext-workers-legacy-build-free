importScripts('SQLitePlugin.js');

self.addEventListener('message', function(ev) {
  if (ev.data === 'start') {

    sqlitePlugin.openDatabase({name:'worker-sqlbatch-failure-test.db', location: 'default'}, function(db) {
      db.executeSql('DROP TABLE IF EXISTS MyTable');
      db.executeSql('CREATE TABLE MyTable (SampleColumn)');
      db.executeSql('INSERT INTO MyTable VALUES (?)', ['test-value'], function() {
        db.sqlBatch([
          'DELETE FROM MyTable',
          // syntax error below:
          [ 'INSRT INTO MyTable VALUES (?)', 'test-value' ]
        ], function() {
          // NOT EXPECTED:
          self.postMessage('UNEXPECTED sqlBatch success');
        }, function(error) {
          // CHECK INTEGRITY:
          db.executeSql('SELECT * FROM MyTable', [], function (res) {
            if (res.rows.item(0).SampleColumn === 'test-value')
              self.postMessage('OK');
            else
              self.postMessage('INCORRECT DATA: res.rows.item(0): ' + JSON.stringify(res.rows.item(0)));
          });
        });

      }, function(error) {
        // NOT EXPECTED:
        self.postMessage('UNEXPECTED sqlBatch ERROR: ' + JSON.stringify(error));
      });
    });
  }
});
