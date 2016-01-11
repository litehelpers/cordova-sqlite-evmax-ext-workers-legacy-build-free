importScripts('SQLitePlugin.js');

//var root = this;

self.addEventListener('message', function(ev) {
  if (ev.data === 'go') {

    function equal(a, b, s) {
      if (a !== b) {
        // XXX TODO: throw
        self.postMessage('FAILED TEST: ' + s + ' a: ' + a + ' b: ' + b);
      }
      //else self.postMessage('PASSED TEST: ' + s);
    }

    function expect(a) {
      return {
        toBe: function(b) {
          if (a !== b) {
            // XXX TODO: throw Exception
            self.postMessage('FAILED toBe expectation: ' + a + ' actual: ' + b);
          }
          //else self.postMessage('PASSED toBe expectation');
        },
        toEqual: function(b) {
          if (a != b) {
            // XXX TODO: throw Exception
            self.postMessage('FAILED toEqual expectation: ' + a + ' actual: ' + b);
          }
          //else self.postMessage('PASSED toEqual expectation');
        },
        toBeDefined: function() {
          if (a === undefined) {
            // XXX TODO: throw Exception
            self.postMessage('FAILED toBeDefined expectation');
          }
          //else self.postMessage('PASSED toBeDefined expectation');
        }
      };
    }

    sqlitePlugin.openDatabase({name:'worker-multi-part-constraint-violation-test.db'}, function(db) {

          db.executeSql('DROP TABLE IF EXISTS tt');
          db.executeSql('DROP TABLE IF EXISTS tt2');
          db.executeSql('CREATE TABLE tt (one TEXT NOT NULL, two TEXT NOT NULL, three TEXT NOT NULL)');
          db.executeSql('CREATE TABLE tt2 (col TEXT)');

          var tx = db.beginTransaction();

          expect(tx).toBeDefined()

          // This should be OK:
          tx.executeSql('INSERT INTO tt values(?,?)', ['a', 'b', 'c']);

          // NOT NULL constraint violation:
          //tx.executeSql('INSERT INTO tt values(?,?)', ['first', 'second']);

          // Should not be COMMITted:
          tx.executeSql('INSERT INTO tt2 values(?)', ['value']);

          tx.end(function() {
            // NOT EXPECTED:
            self.postMessage('ERROR: tx should not have succeeded');
          }, function(err) {
            // CORRECT:
            db.executeSql('SELECT * FROM tt2', [], function(res) {
              // CORRECT - should be empty:
              if (res.rows.length === 0)
                self.postMessage('OK');
              else
                self.postMessage('ERROR: Unexpected data in tt2');
            }, function(err) {
              // NOT EXPECTED:
              self.postMessage('SELECT ERROR: ' + JSON.stringify(err));
            });
          });

    });

  }
});
