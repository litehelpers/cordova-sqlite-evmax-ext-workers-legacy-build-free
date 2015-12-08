/* 'use strict'; */

var MYTIMEOUT = 360000;

var DEFAULT_SIZE = 5000000; // max to avoid popup in safari/ios

var scenarioList = [ 'Plugin' ];
var scenarioCount = 1;

var mytests = function() {

  for (var i=0; i<scenarioCount; ++i) {

    describe(scenarioList[i] + ': worker memory test(s)', function() {
      var scenarioName = scenarioList[i];
      var suiteName = scenarioName + ': ';
      var isWebSql = (i === 1);
      var isOldImpl = (i === 2);

      // NOTE: MUST be defined in function scope, NOT outer scope:
      var openDatabase = function(name, ignored1, ignored2, ignored3) {
        if (isOldImpl) {
          return window.sqlitePlugin.openDatabase({name: name, androidDatabaseImplementation: 2});
        }
        if (isWebSql) {
          return window.openDatabase(name, "1.0", "Demo", DEFAULT_SIZE);
        } else {
          return window.sqlitePlugin.openDatabase(name, "1.0", "Demo", DEFAULT_SIZE);
        }
      }

      it(suiteName + 'worker memory test',
        function(done) {

          var w = new Worker('spec/worker-memory-task.js');
          expect(w).toBeDefined()
          AQ.aqworker('memory_test', w);

          w.addEventListener('message', function(ev) {
            expect(ev.data).toBe('OK');
            done();
          });

          w.postMessage('go');
        }, MYTIMEOUT);

      // FUTURE TBD: ...
      // Big memory test with 80000 iterations causes memory problem in worker
      xit(suiteName + 'BROKEN for Android: worker big memory test',
        function(done) {
          // TBD: ...
        }, MYTIMEOUT);
    });
  };
}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
