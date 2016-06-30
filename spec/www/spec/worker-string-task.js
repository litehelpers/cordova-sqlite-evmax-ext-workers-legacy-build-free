importScripts('SQLitePlugin.js');

self.addEventListener('message', function(ev) {
    if (ev.data === 'go') {
        sqlitePlugin.openDatabase({name:'ASCII-string-test.db', location: 'default'}, function(db) {
          db.transaction(function(tx) {

            tx.executeSql("select upper('Some US-ASCII text') as uppertext", [], function(tx, res) {
              if (res.rows.item(0).uppertext === 'SOME US-ASCII TEXT')
                self.postMessage('OK');
              else
                self.postMessage('res.rows.item(0): ' + JSON.stringify(res.rows.item(0).uppertext));
            });
          });
        });
    }
});
