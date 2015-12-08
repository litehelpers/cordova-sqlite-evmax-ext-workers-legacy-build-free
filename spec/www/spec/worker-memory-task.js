importScripts('SQLitePlugin.js');

self.addEventListener('message', function(ev) {
    if (ev.data === 'go') {
        sqlitePlugin.openDatabase({name:'worker-memory-test.db'}, function(db) {
          db.transaction(function(tx) {


            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data text, data_num integer)');
            tx.executeSql('DROP TABLE IF EXISTS db');
            tx.executeSql('CREATE TABLE IF NOT EXISTS db (idd integer primary key, dataa text, data_numm integer)');
            tx.executeSql('DROP TABLE IF EXISTS abc');
            tx.executeSql('CREATE TABLE IF NOT EXISTS abc (iddd integer primary key, dataaa text, data_nummm integer)');
            tx.executeSql('DROP TABLE IF EXISTS abcd');

            for (var k = 0; k < 40000; k++) { //loop: add [40000] records
              tx.executeSql("INSERT INTO test_table (data, data_num) VALUES (?,?)", ["test", 100]);
              tx.executeSql("INSERT INTO db (dataa, data_numm) VALUES (?,?)", ["abc", 100]);

              tx.executeSql("INSERT INTO abc (dataaa, data_nummm) VALUES (?,?)", ["abc", 100]);
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
