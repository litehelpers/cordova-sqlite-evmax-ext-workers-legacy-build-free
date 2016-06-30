/* 'use strict'; */

var MYTIMEOUT = 12000;

var DEFAULT_SIZE = 5000000; // max to avoid popup in safari/ios

var scenarioList = [ 'Plugin' ];
var scenarioCount = 1;

var mytests = function() {

  for (var i=0; i<scenarioCount; ++i) {

    describe(scenarioList[i] + ': worker tx test(s)', function() {
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

      it(suiteName + 'worker string test',
        function(done) {

          var w = new Worker('spec/worker-string-task.js');
          expect(w).toBeDefined()
          AQ.aqworker('string_test', w);

          w.addEventListener('message', function(ev) {
            expect(ev.data).toBe('OK');
            done();
          });

          w.postMessage('go');
        }, MYTIMEOUT);

      /* ** FUTURE TODO:
      it(suiteName + 'worker multi-part string tx test',
        function(done) {

          var w = new Worker('spec/worker-multi-part-string-task.js');
          expect(w).toBeDefined()
          AQ.aqworker('string_test', w);

          w.addEventListener('message', function(ev) {
            expect(ev.data).toBe('OK');
            done();
          });

          w.postMessage('go');
        }, MYTIMEOUT);

      // FUTURE TODO: some more worker tests (commented out in spec/mytask.js)

      // ** */

      it(suiteName + 'worker [multi-part interleaved tx] test',
        function(done) {

          var w = new Worker('spec/mytask.js');
          expect(w).toBeDefined()
          AQ.aqworker('multi_part_interleaved', w);

          w.addEventListener('message', function(ev) {
            expect(ev.data).toBe('multi-part interleaved tx test OK');
            done();
          });

          w.postMessage('go');
        }, MYTIMEOUT);

      it(suiteName + 'worker multi-part tx with NOT NULL contraint violation test',
        function(done) {

          var w = new Worker('spec/worker-multi-part-constraint-violation-task.js');
          expect(w).toBeDefined()
          AQ.aqworker('multi_part_constraint_violation', w);

          w.addEventListener('message', function(ev) {
            expect(ev.data).toBe('OK');
            done();
          });

          w.postMessage('go');
        }, MYTIMEOUT);

      xit(suiteName + 'worker big batch test',
        function(done) {

          var w = new Worker('spec/worker-big-batch-task.js');
          expect(w).toBeDefined()
          AQ.aqworker('big_batch_test', w);

          w.addEventListener('message', function(ev) {
            expect(ev.data).toBe('OK');
            done();
          });

          w.postMessage('go');
        }, MYTIMEOUT);

    });
  };
}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
