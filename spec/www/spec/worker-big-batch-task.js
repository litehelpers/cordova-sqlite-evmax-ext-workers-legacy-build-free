importScripts('SQLitePlugin.js');

self.addEventListener('message', function(ev) {
    if (ev.data === 'go') {
        sqlitePlugin.openDatabase({name:'worker-big-batch-test.db', location: 'default'}, function(db) {
          db.transaction(function(tx) {


            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data text, data_num integer)');
            tx.executeSql('DROP TABLE IF EXISTS db');

            // exceed standard MAX_PART_SIZE [500]
            for (var k = 0; k < 800; k++) {
              tx.executeSql("INSERT INTO test_table (data, data_num) VALUES (?,?)", ["test", 100]);
            } ////-for loop ends
          //db.transaction ends
          }, function (e) {
            // not expected:
            self.postMessage('ERROR: ' + JSON.stringify(e));
          }, function () {
            // expected ok:
            self.postMessage('OK');
          });
        });
    }
});
