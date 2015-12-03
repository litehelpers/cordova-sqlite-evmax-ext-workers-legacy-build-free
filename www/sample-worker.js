importScripts('SQLitePlugin.js');

self.addEventListener('message', function(ev) {
  if (ev.data === 'go') {
    sqlitePlugin.openDatabase({name:'my.db'}, function(db) {
      db.executeSql("SELECT UPPER('Some US-ASCII text') as uppertext", [], function(res) {
        self.postMessage('got uppertext: ' + res.rows.item(0).uppertext);
      });
    });
  }
});
