importScripts('aqworker.js');
importScripts('Worker-SQLitePlugin.js');

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

/* **
    sqlitePlugin.openDatabase({name:'my.db'}, function(db) {
      db.executeSql("SELECT UPPER('MyText') AS u1", [], function(res) {
        self.postMessage('sql res u1: ' + res.rows.item(0).u1);
      });
    });
// */

/* **
    sqlitePlugin.openDatabase({name:'ASCII-string-test.db'}, function(db) {
          db.transaction(function(tx) {

            //expect(tx).toBeDefined()

            tx.executeSql("select upper('Some US-ASCII text') as uppertext", [], function(tx, res) {
              //console.log("res.rows.item(0).uppertext: " + res.rows.item(0).uppertext);
              //expect(res.rows.item(0).uppertext).toEqual("SOME US-ASCII TEXT");

              //done();
              self.postMessage('uppertext: ' + res.rows.item(0).uppertext);
            });
          });
    });
// */

/* **
    sqlitePlugin.openDatabase({name:'INSERT-test.db'}, function(db) {
          db.transaction(function(tx) {
            //ok(!!tx, "tx object");

            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data text, data_num integer)');

            tx.executeSql("INSERT INTO test_table (data, data_num) VALUES (?,?)", ["test", 100], function(tx, res) {
              //console.log("insertId: " + res.insertId + " -- probably 1");
              //console.log("rowsAffected: " + res.rowsAffected + " -- should be 1");

              //ok(!!res.insertId, "Valid res.insertId");
              //equal(res.rowsAffected, 1, "res rows affected");

              //done();
              self.postMessage('res.insertId: ' + res.insertId + ' res.rowsAffected: ' + res.rowsAffected);
            });

          });

    });
// */

/* **
    sqlitePlugin.openDatabase({name:'worker-db-trx-test.db'}, function(db) {

          var check = 0;

          db.transaction(function(tx) {

            //ok(!!tx, "tx object");
            //self.postMessage('start first tx');

            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data text, data_num integer)');

            tx.executeSql("INSERT INTO test_table (data, data_num) VALUES (?,?)", ["test", 100], function(tx, res) {
              //expect(tx).toBeDefined();
              //expect(res).toBeDefined();

              //console.log("insertId: " + res.insertId + " -- probably 1");
              //console.log("rowsAffected: " + res.rowsAffected + " -- should be 1");

              //expect(res.insertId).toBeDefined();
              //expect(res.rowsAffected).toBe(1);

              db.transaction(function(tx) {
                //self.postMessage('start inner tx');

                //ok(!!tx, "second tx object");

                tx.executeSql("SELECT count(id) as cnt from test_table;", [], function(tx, res) {
                  ++check;

                  console.log("res.rows.length: " + res.rows.length + " -- should be 1");
                  console.log("res.rows.item(0).cnt: " + res.rows.item(0).cnt + " -- should be 1");

                  equal(res.rows.length, 1, "res rows length");
                  equal(res.rows.item(0).cnt, 1, "select count");
                });

                tx.executeSql("SELECT data_num from test_table;", [], function(tx, res) {
                  //self.postMessage('t2');
                  ++check;

                  equal(res.rows.length, 1, "SELECT res rows length");
                  equal(res.rows.item(0).data_num, 100, "SELECT data_num");
                });

                tx.executeSql("UPDATE test_table SET data_num = ? WHERE data_num = 100", [101], function(tx, res) {
                  //self.postMessage('t3');
                  ++check;

                  //console.log("UPDATE rowsAffected: " + res.rowsAffected + " -- should be 1");

                  expect(res.rowsAffected).toBe(1);
                  //self.postMessage('t3 ok');
                });

                tx.executeSql("SELECT data_num from test_table;", [], function(tx, res) {
                  ++check;

                  equal(res.rows.length, 1, "SELECT res rows length");
                  equal(res.rows.item(0).data_num, 101, "SELECT data_num");
                });

                tx.executeSql("DELETE FROM test_table WHERE data LIKE 'tes%'", [], function(tx, res) {
                  ++check;

                  //console.log("DELETE rowsAffected: " + res.rowsAffected + " -- should be 1");

                  expect(res.rowsAffected).toBe(1);
                });

                tx.executeSql("SELECT data_num from test_table;", [], function(tx, res) {
                  ++check;

                  equal(res.rows.length, 0, "SELECT res rows length");
                  //self.postMessage('t6 ok');
                });
              }, function(e) {
                //console.log("ERROR: " + e.message);
                //expect(false);
              }, function() {
                //console.log("second tx ok success cb");
                //expect(check).toBe(6);

                //done();
                self.postMessage('TX check count (should be 6): ' + check);
              });

            }, function(e) {
              //console.log("ERROR: " + e.message);
              //expect(false);
            });
          }, function(e) {
            //console.log("ERROR: " + e.message);
            //expect(false);
          }, function() {
            //console.log("tx success cb");
          });

    });
// */

/* **
    sqlitePlugin.openDatabase({name:'worker-multi-part-test.db'}, function(db) {

          db.executeSql("DROP TABLE IF EXISTS tt");
          db.executeSql("CREATE TABLE tt (tf)");

          var tx = db.beginTransaction();

          expect(tx).toBeDefined()

          tx.executeSql("INSERT INTO tt values(?)", ['tv']);
          tx.executeSql("SELECT * from tt", [], function(tx, res) {
            //self.postMessage('s1');
            expect(res.rows.item(0).tf).toEqual('tv');
            //self.postMessage('s2');
            setTimeout(function() {
              //self.postMessage('CHECK tt data');
              tx.executeSql("SELECT * from tt", [], function(tx, res) {
                expect(res.rows.item(0).tf).toEqual('tv');

                tx.end(function() {
                  var t2 = db.beginTransaction();
                  t2.executeSql("SELECT * from tt", [], function(tx, res) {
                    expect(res.rows.item(0).tf).toEqual('tv');

                    t2.executeSql("DROP TABLE IF EXISTS tt");
                    t2.executeSql("CREATE TABLE tt (tf)");

                    t2.executeSql("INSERT INTO tt values(?)", ['t2']);
                    t2.executeSql("SELECT * from tt", [], function(tx, res) {
                      expect(res.rows.item(0).tf).toEqual('t2');

                      t2.abort(function() {
                        var t3 = db.beginTransaction();
                        t3.executeSql("SELECT * from tt", [], function(tx, res) {
                          expect(res.rows.item(0).tf).toEqual('tv');
                          t3.end();

                          //done();
                          self.postMessage('first multi-part tx test done ok');
                        });
                      });
                    });
                  });
                });
              });
            }, 0);
          }, function(err) {
            expect(false).toBe(true);
            tx.abort();

            //done();
            self.postMessage('first multi-part tx test failed with ERROR: ' + JSON.stringify(err));
          });
          //self.postMessage('t2');

    });
// */

//* ** {{
    var db = sqlitePlugin.openDatabase({name:'worker-multi-part-interleaved-test.db'});

          db.executeSql("DROP TABLE IF EXISTS tt");
          db.executeSql("CREATE TABLE tt (tf)");

          var tx1 = db.beginTransaction();

          expect(tx1).toBeDefined()

          tx1.executeSql("INSERT INTO tt values(?)", ['tv']);

          var tx2 = db.beginTransaction();

          tx1.executeSql("DROP TABLE IF EXISTS tt");
          tx1.executeSql("CREATE TABLE tt (tf)");
          tx1.executeSql("INSERT INTO tt values(?)", ['tv2']);

          tx2.executeSql("SELECT * from tt", [], function(tx, res) {
            expect(res.rows.item(0).tf).toEqual('tv2');

            // just in case:
            try {
              tx1.end();
            } catch(e) {
              // expected here
              expect(true).toBe(true);
            }

            tx2.end();
            //done();
            self.postMessage('multi-part interleaved tx test OK');
          }, function(err) {
            // not expected:
            expect(false).toBe(true);

            // just in case:
            try {
              tx.end();
            } catch(e) {
              // expected here
              expect(true).toBe(true);
            }

            tx2.end();
            //done();
            self.postMessage('multi-part interleaved tx test failed with ERROR: ' + JSON.stringify(err));
          });

          tx1.end();

// ** }} */

  }
});
