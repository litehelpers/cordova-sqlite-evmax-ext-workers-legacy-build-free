importScripts('SQLitePlugin.js');

self.addEventListener('message', function(ev) {
  if (ev.data === 'start') {
    sqlitePlugin.openDatabase({name:'worker-sqlbatch-success-test.db', location: 'default'}, function(db) {
      db.sqlBatch([
        'DROP TABLE IF EXISTS MyTable',
        'CREATE TABLE MyTable (SampleColumn)',
        [ 'INSERT INTO MyTable VALUES (?)', ['test-value'] ],
      ], function() {
        db.executeSql('SELECT * FROM MyTable', [], function (res) {
          if (res.rows.item(0).SampleColumn === 'test-value')
            self.postMessage('OK');
          else
            self.postMessage('res.rows.item(0): ' + JSON.stringify(res.rows.item(0)));
        });
      }, function(error) {
        // NOT EXPECTED:
        self.postMessage('UNEXPECTED sqlBatch ERROR: ' + JSON.stringify(error));
      });
    });
  }
});
