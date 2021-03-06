/*
License for this version: GPL v3 (http://www.gnu.org/licenses/gpl.txt) or commercial license.
Contact for commercial license: info@litehelpers.net
 */

(function() {
  var DB_STATE_INIT, DB_STATE_OPEN, MAX_PART_SIZE, MAX_SQL_CHUNK, READ_ONLY_REGEX, SQLiteFactory, SQLitePlugin, SQLitePluginTransaction, SelfTest, argsArray, batchid, dblocations, iosLocationMap, isWorker, newSQLError, nextTick, root, txLocks, useflatjson;

  root = this;

  READ_ONLY_REGEX = /^\s*(?:drop|delete|insert|update|create)\s/i;

  DB_STATE_INIT = "INIT";

  DB_STATE_OPEN = "OPEN";


  /*
  OPTIONAL: Transaction SQL chunking
  MAX_SQL_CHUNK is adjustable, set to 0 (or -1) to disable chunking
   */

  MAX_SQL_CHUNK = 0;

  MAX_PART_SIZE = 500;

  isWorker = !!!root.document;

  txLocks = {};

  useflatjson = false;

  if (isWorker) {
    importScripts('aqworker.js');
    aqsetcbprefix('sqlcb');
  }

  newSQLError = function(error, code) {
    var sqlError;
    sqlError = error;
    if (!code) {
      code = 0;
    }
    if (!sqlError) {
      sqlError = new Error("a plugin had an error but provided no response");
      sqlError.code = code;
    }
    if (typeof sqlError === "string") {
      sqlError = new Error(error);
      sqlError.code = code;
    }
    if (!sqlError.code && sqlError.message) {
      sqlError.code = code;
    }
    if (!sqlError.code && !sqlError.message) {
      sqlError = new Error("an unknown error was returned: " + JSON.stringify(sqlError));
      sqlError.code = code;
    }
    return sqlError;
  };

  nextTick = isWorker ? function(fun) {
    setTimeout(fun, 0);
  } : window.setImmediate || function(fun) {
    window.setTimeout(fun, 0);
  };


  /*
    Utility that avoids leaking the arguments object. See
    https://www.npmjs.org/package/argsarray
   */

  argsArray = function(fun) {
    return function() {
      var args, i, len;
      len = arguments.length;
      if (len) {
        args = [];
        i = -1;
        while (++i < len) {
          args[i] = arguments[i];
        }
        return fun.call(this, args);
      } else {
        return fun.call(this, []);
      }
    };
  };

  SQLitePlugin = function(openargs, openSuccess, openError) {
    var dbname;
    if (!(openargs && openargs['name'])) {
      throw newSQLError("Cannot create a SQLitePlugin db instance without a db name");
    }
    dbname = openargs.name;
    if (typeof dbname !== 'string') {
      throw newSQLError('sqlite plugin database name must be a string');
    }
    this.openargs = openargs;
    this.dbname = dbname;
    this.openSuccess = openSuccess;
    this.openError = openError;
    this.openSuccess || (this.openSuccess = function() {
      console.log("DB opened: " + dbname);
    });
    this.openError || (this.openError = function(e) {
      console.log(e.message);
    });
    this.open(this.openSuccess, this.openError);
  };

  SQLitePlugin.prototype.databaseFeatures = {
    isSQLitePluginDatabase: true
  };

  SQLitePlugin.prototype.openDBs = {};

  SQLitePlugin.prototype.addTransaction = function(t) {
    if (!txLocks[this.dbname]) {
      txLocks[this.dbname] = {
        queue: [],
        inProgress: false
      };
    }
    txLocks[this.dbname].queue.push(t);
    if (this.dbname in this.openDBs && this.openDBs[this.dbname] !== DB_STATE_INIT) {
      this.startNextTransaction();
    } else {
      if (this.dbname in this.openDBs) {
        console.log('new transaction is queued, waiting for open operation to finish');
      } else {
        console.log('database is closed, new transaction is [stuck] waiting until db is opened again!');
      }
    }
  };

  SQLitePlugin.prototype.beginTransaction = function(error) {
    var myfn, mytx;
    if (!this.openDBs[this.dbname]) {
      throw newSQLError('database not open');
    }
    myfn = function(tx) {};
    mytx = new SQLitePluginTransaction(this, myfn, error, null, false, false);
    mytx.canPause = true;
    mytx.addStatement("BEGIN", [], null, function(tx, err) {
      throw newSQLError("unable to begin transaction: " + err.message, err.code);
    });
    mytx.txlock = true;
    this.addTransaction(mytx);
    return mytx;
  };

  SQLitePlugin.prototype.transaction = function(fn, error, success) {
    if (!this.openDBs[this.dbname]) {
      error(newSQLError('database not open'));
      return;
    }
    this.addTransaction(new SQLitePluginTransaction(this, fn, error, success, true, false));
  };

  SQLitePlugin.prototype.readTransaction = function(fn, error, success) {
    if (!this.openDBs[this.dbname]) {
      error(newSQLError('database not open'));
      return;
    }
    this.addTransaction(new SQLitePluginTransaction(this, fn, error, success, false, true));
  };

  SQLitePlugin.prototype.startNextTransaction = function() {
    var self;
    self = this;
    nextTick((function(_this) {
      return function() {
        var txLock;
        if (!(_this.dbname in _this.openDBs) || _this.openDBs[_this.dbname] !== DB_STATE_OPEN) {
          console.log('cannot start next transaction: database not open');
          return;
        }
        txLock = txLocks[self.dbname];
        if (!txLock) {
          console.log('cannot start next transaction: database connection is lost');
          return;
        } else if (txLock.queue.length > 0 && !txLock.inProgress) {
          txLock.inProgress = true;
          txLock.queue.shift().start();
        }
      };
    })(this));
  };

  SQLitePlugin.prototype.abortAllPendingTransactions = function() {
    var l, len1, ref, tx, txLock;
    txLock = txLocks[this.dbname];
    if (!!txLock && txLock.queue.length > 0) {
      ref = txLock.queue;
      for (l = 0, len1 = ref.length; l < len1; l++) {
        tx = ref[l];
        tx.abortFromQ(newSQLError('Invalid database handle'));
      }
      txLock.queue = [];
      txLock.inProgress = false;
    }
  };

  SQLitePlugin.prototype.open = function(success, error) {
    var openerrorcb, opensuccesscb;
    if (this.dbname in this.openDBs) {
      console.log('database already open: ' + this.dbname);
      nextTick((function(_this) {
        return function() {
          success(_this);
        };
      })(this));
    } else {
      console.log('OPEN database: ' + this.dbname);
      opensuccesscb = (function(_this) {
        return function(a1) {
          var txLock;
          console.log('OPEN database: ' + _this.dbname + ' OK');
          if (!!a1 && a1 === 'a1') {
            console.log('Detected Android/iOS version with flat JSON interface');
            useflatjson = true;
          }
          if (!_this.openDBs[_this.dbname]) {
            console.log('database was closed during open operation');
          }
          if (_this.dbname in _this.openDBs) {
            _this.openDBs[_this.dbname] = DB_STATE_OPEN;
          }
          if (!!success) {
            success(_this);
          }
          txLock = txLocks[_this.dbname];
          if (!!txLock && txLock.queue.length > 0 && !txLock.inProgress) {
            _this.startNextTransaction();
          }
        };
      })(this);
      openerrorcb = (function(_this) {
        return function() {
          console.log('OPEN database: ' + _this.dbname + ' failed, aborting any pending transactions');
          if (!!error) {
            error(newSQLError('Could not open database'));
          }
          delete _this.openDBs[_this.dbname];
          _this.abortAllPendingTransactions();
        };
      })(this);
      this.openDBs[this.dbname] = DB_STATE_INIT;
      if (true) {
        if (isWorker) {
          aqrequest('sq', 'open', encodeURIComponent(JSON.stringify([this.openargs])), function(s) {
            if (s === 'a1') {
              return opensuccesscb(s);
            } else {
              return openerrorcb();
            }
          });
        } else {
          root.sqlitePluginHelper.exec('open', [this.openargs], opensuccesscb, openerrorcb);
        }
      }
    }
  };

  SQLitePlugin.prototype.close = function(success, error) {
    if (this.dbname in this.openDBs) {
      if (txLocks[this.dbname] && txLocks[this.dbname].inProgress) {
        console.log('cannot close: transaction is in progress');
        error(newSQLError('database cannot be closed while a transaction is in progress'));
        return;
      }
      console.log('CLOSE database: ' + this.dbname);
      delete this.openDBs[this.dbname];
      if (txLocks[this.dbname]) {
        console.log('closing db with transaction queue length: ' + txLocks[this.dbname].queue.length);
      } else {
        console.log('closing db with no transaction lock state');
      }
      root.sqlitePluginHelper.exec('close', [
        {
          path: this.dbname
        }
      ], success, error);
    } else {
      console.log('cannot close: database is not open');
      if (error) {
        nextTick(function() {
          return error();
        });
      }
    }
  };

  SQLitePlugin.prototype.executeSql = function(statement, params, success, error) {
    var myerror, myfn, mysuccess;
    mysuccess = function(t, r) {
      if (!!success) {
        return success(r);
      }
    };
    myerror = function(t, e) {
      if (!!error) {
        return error(e);
      }
    };
    myfn = function(tx) {
      tx.addStatement(statement, params, mysuccess, myerror);
    };
    this.addTransaction(new SQLitePluginTransaction(this, myfn, null, null, false, false));
  };

  SQLitePlugin.prototype.sqlBatch = function(sqlStatements, success, error) {
    var batchList, l, len1, myfn, st;
    if (!sqlStatements || sqlStatements.constructor !== Array) {
      throw newSQLError('sqlBatch expects an array');
    }
    batchList = [];
    for (l = 0, len1 = sqlStatements.length; l < len1; l++) {
      st = sqlStatements[l];
      if (st.constructor === Array) {
        if (st.length === 0) {
          throw newSQLError('sqlBatch array element of zero (0) length');
        }
        batchList.push({
          sql: st[0],
          params: st.length === 0 ? [] : st[1]
        });
      } else {
        batchList.push({
          sql: st,
          params: []
        });
      }
    }
    myfn = function(tx) {
      var elem, len2, m, results;
      results = [];
      for (m = 0, len2 = batchList.length; m < len2; m++) {
        elem = batchList[m];
        results.push(tx.addStatement(elem.sql, elem.params, null, null));
      }
      return results;
    };
    this.addTransaction(new SQLitePluginTransaction(this, myfn, error, success, true, false));
  };

  SQLitePluginTransaction = function(db, fn, error, success, txlock, readOnly) {
    if (typeof fn !== "function") {

      /*
      This is consistent with the implementation in Chrome -- it
      throws if you pass anything other than a function. This also
      prevents us from stalling our txQueue if somebody passes a
      false value for fn.
       */
      throw newSQLError("transaction expected a function");
    }
    this.db = db;
    this.fn = fn;
    this.error = error;
    this.success = success;
    this.txlock = txlock;
    this.readOnly = readOnly;
    this.canPause = false;
    this.isPaused = false;
    this.executes = [];
    if (txlock) {
      this.addStatement("BEGIN", [], null, function(tx, err) {
        throw newSQLError("unable to begin transaction: " + err.message, err.code);
      });
    } else {
      this.addStatement("SELECT 1", [], null, null);
    }
  };

  SQLitePluginTransaction.prototype.start = function() {
    var err;
    try {
      this.fn(this);
      if (this.executes.length > 0) {
        this.run();
      }
    } catch (error1) {
      err = error1;
      txLocks[this.db.dbname].inProgress = false;
      this.db.startNextTransaction();
      if (this.error) {
        this.error(newSQLError(err));
      }
    }
  };

  SQLitePluginTransaction.prototype.executeSql = function(sql, values, success, error) {
    if (this.finalized) {
      throw {
        message: 'InvalidStateError: DOM Exception 11: This transaction is already finalized. Transactions are committed after its success or failure handlers are called. If you are using a Promise to handle callbacks, be aware that implementations following the A+ standard adhere to run-to-completion semantics and so Promise resolution occurs on a subsequent tick and therefore after the transaction commits.',
        code: 11
      };
      return;
    }
    if (this.readOnly && READ_ONLY_REGEX.test(sql)) {
      this.handleStatementFailure(error, {
        message: 'invalid sql for a read-only transaction'
      });
      return;
    }
    this.addStatement(sql, values, success, error);
    if (this.isPaused) {
      this.isPaused = false;
      this.run();
    }
  };

  SQLitePluginTransaction.prototype.end = function(success, error) {
    if (!this.canPause) {
      throw newSQLError('Sorry invalid usage');
    }
    this.canPause = false;
    this.success = success;
    this.error = error;
    if (this.isPaused) {
      this.isPaused = false;
      if (this.executes.length === 0) {
        this.$finish();
      } else {
        this.run();
      }
    }
  };

  SQLitePluginTransaction.prototype.abort = function(errorcb) {
    if (!this.canPause) {
      throw newSQLError('Sorry invalid usage');
    }
    this.canPause = false;
    this.error = errorcb;
    this.addStatement('INVALID STATEMENT', [], null, null);
    if (this.isPaused) {
      this.isPaused = false;
      this.run();
    }
  };

  SQLitePluginTransaction.prototype.addStatement = function(sql, values, success, error) {
    var l, len1, params, t, v;
    params = [];
    if (!!values && values.constructor === Array) {
      for (l = 0, len1 = values.length; l < len1; l++) {
        v = values[l];
        t = typeof v;
        params.push((v === null || v === void 0 || t === 'number' || t === 'string' ? v : v instanceof Blob ? v.valueOf() : v.toString()));
      }
    }
    this.executes.push({
      success: success,
      error: error,
      sql: sql,
      params: params
    });
    if (MAX_SQL_CHUNK > 0 && this.executes.length > MAX_SQL_CHUNK) {
      this.run();
    }
  };

  SQLitePluginTransaction.prototype.handleStatementSuccess = function(handler, response) {
    var payload, rows;
    if (!handler) {
      return;
    }
    rows = response.rows || [];
    payload = {
      rows: {
        item: function(i) {
          return rows[i];
        },
        length: rows.length
      },
      rowsAffected: response.rowsAffected || 0,
      insertId: response.insertId || void 0
    };
    handler(this, payload);
  };

  SQLitePluginTransaction.prototype.handleStatementFailure = function(handler, response) {
    if (!handler) {
      throw newSQLError("a statement with no error handler failed: " + response.message, response.code);
    }
    if (handler(this, response) !== false) {
      throw newSQLError("a statement error callback did not return false: " + response.message, response.code);
    }
  };

  SQLitePluginTransaction.prototype.run = function() {
    var batchExecutes, handlerFor, tx, txFailure, waiting;
    txFailure = null;
    batchExecutes = this.executes;
    waiting = batchExecutes.length;
    this.executes = [];
    tx = this;
    handlerFor = function(index, didSucceed) {
      return function(response) {
        var err, sqlError;
        try {
          if (didSucceed) {
            tx.handleStatementSuccess(batchExecutes[index].success, response);
          } else {
            sqlError = newSQLError(response);
            if (!!response.result) {
              sqlError.code = response.result.code;
              sqlError.sqliteCode = response.result.sqliteCode;
            }
            tx.handleStatementFailure(batchExecutes[index].error, sqlError);
          }
        } catch (error1) {
          err = error1;
          if (!txFailure) {
            txFailure = newSQLError(err);
          }
        }
        if (--waiting === 0) {
          if (txFailure) {
            tx.$abort(txFailure);
          } else if (tx.executes.length > 0) {
            tx.run();
          } else if (tx.canPause) {
            tx.isPaused = true;
          } else {
            tx.$finish();
          }
        }
      };
    };
    this.run_batch(batchExecutes, handlerFor);
  };

  batchid = 0;

  SQLitePluginTransaction.prototype.run_batch = function(batchExecutes, handlerFor) {
    var batchname, flatlist, i, k, l, len1, mycb, mycbmap, p, part, partid, pl, ref, rem, request, rlength;
    flatlist = [];
    mycbmap = {};
    i = 0;
    while (i < batchExecutes.length) {
      request = batchExecutes[i];
      mycbmap[i] = {
        success: handlerFor(i, true),
        error: handlerFor(i, false)
      };
      flatlist.push(request.sql);
      flatlist.push(request.params.length);
      ref = request.params;
      for (l = 0, len1 = ref.length; l < len1; l++) {
        p = ref[l];
        flatlist.push(p);
      }
      i++;
    }
    mycb = function(result) {
      var c, changes, code, errormessage, insert_id, j, k, q, r, ri, rl, row, rows, sqliteCode, v;
      i = 0;
      ri = 0;
      rl = result.length;
      while (ri < rl) {
        r = result[ri++];
        q = mycbmap[i];
        if (r === 'ok') {
          q.success({
            rows: []
          });
        } else if (r === "ch2") {
          changes = result[ri++];
          insert_id = result[ri++];
          q.success({
            rowsAffected: changes,
            insertId: insert_id
          });
        } else if (r === 'okrows') {
          rows = [];
          changes = 0;
          insert_id = void 0;
          if (result[ri] === 'changes') {
            ++ri;
            changes = result[ri++];
          }
          if (result[ri] === 'insert_id') {
            ++ri;
            insert_id = result[ri++];
          }
          while (result[ri] !== 'endrows') {
            c = result[ri++];
            j = 0;
            row = {};
            while (j < c) {
              k = result[ri++];
              v = result[ri++];
              row[k] = v;
              ++j;
            }
            rows.push(row);
          }
          q.success({
            rows: rows,
            rowsAffected: changes,
            insertId: insert_id
          });
          ++ri;
        } else if (r === 'error') {
          code = result[ri++];
          sqliteCode = result[ri++];
          errormessage = result[ri++];
          q.error({
            result: {
              code: code,
              sqliteCode: sqliteCode,
              message: errormessage
            }
          });
        }
        ++i;
      }
    };
    if (isWorker) {
      ++batchid;
      batchname = aqcbhandlername + '.' + batchid;
      rem = flatlist;
      flatlist = null;
      aqrequest('sq', 'batchStart', encodeURIComponent(JSON.stringify([
        {
          dbargs: {
            dbname: this.db.dbname
          },
          batchid: batchname,
          flen: batchExecutes.length
        }
      ])), function(s) {});
      k = 0;
      partid = 0;
      while (rem.length > 0) {
        rlength = rem.length;
        pl = rlength > MAX_PART_SIZE ? MAX_PART_SIZE : rlength;
        part = rem.slice(0, pl);
        rem = rem.slice(pl);
        aqrequest('sq', 'batchPart', encodeURIComponent(JSON.stringify([
          {
            batchid: batchname,
            partid: ++partid,
            flen: batchExecutes.length,
            part: part
          }
        ])), function(s) {});
      }
      aqrequest('sq', 'batchRun', encodeURIComponent(JSON.stringify([
        {
          batchid: batchname
        }
      ])), function(s) {
        var json, res;
        json = decodeURIComponent(s);
        res = JSON.parse(json);
        mycb(res);
      });
    } else {
      root.sqlitePluginHelper.exec('backgroundExecuteSqlBatch', [
        {
          dbargs: {
            dbname: this.db.dbname
          },
          flen: batchExecutes.length,
          flatlist: flatlist
        }
      ], mycb, null);
    }
  };

  SQLitePluginTransaction.prototype.$abort = function(txFailure) {
    var failed, succeeded, tx;
    if (this.finalized) {
      return;
    }
    tx = this;
    succeeded = function(tx) {
      txLocks[tx.db.dbname].inProgress = false;
      tx.db.startNextTransaction();
      if (tx.error) {
        tx.error(txFailure);
      }
    };
    failed = function(tx, err) {
      txLocks[tx.db.dbname].inProgress = false;
      tx.db.startNextTransaction();
      if (tx.error) {
        tx.error(newSQLError("error while trying to roll back: " + err.message, err.code));
      }
    };
    this.finalized = true;
    if (this.txlock) {
      this.addStatement("ROLLBACK", [], succeeded, failed);
      this.run();
    } else {
      succeeded(tx);
    }
  };

  SQLitePluginTransaction.prototype.$finish = function() {
    var failed, succeeded, tx;
    if (this.finalized) {
      return;
    }
    tx = this;
    succeeded = function(tx) {
      txLocks[tx.db.dbname].inProgress = false;
      tx.db.startNextTransaction();
      if (tx.success) {
        tx.success();
      }
    };
    failed = function(tx, err) {
      txLocks[tx.db.dbname].inProgress = false;
      tx.db.startNextTransaction();
      if (tx.error) {
        tx.error(newSQLError("error while trying to commit: " + err.message, err.code));
      }
    };
    this.finalized = true;
    if (this.txlock) {
      this.addStatement("COMMIT", [], succeeded, failed);
      this.run();
    } else {
      succeeded(tx);
    }
  };

  SQLitePluginTransaction.prototype.abortFromQ = function(sqlerror) {
    if (this.error) {
      this.error(sqlerror);
    }
  };

  dblocations = ["docs", "libs", "nosync"];

  iosLocationMap = {
    'default': 'nosync',
    'Documents': 'docs',
    'Library': 'libs'
  };

  SQLiteFactory = {

    /*
    NOTE: this function should NOT be translated from Javascript
    back to CoffeeScript by js2coffee.
    If this function is edited in Javascript then someone will
    have to translate it back to CoffeeScript by hand.
     */
    openDatabase: argsArray(function(args) {
      var dblocation, errorcb, okcb, openargs;
      if (args.length < 1 || !args[0]) {
        throw newSQLError('Sorry missing mandatory open arguments object in openDatabase call');
      }
      openargs = args[0];
      if (!openargs.name) {
        throw newSQLError('Database name value is missing in openDatabase call');
      }
      if (!openargs.iosDatabaseLocation && !openargs.location && openargs.location !== 0) {
        throw newSQLError('Database location or iosDatabaseLocation value is now mandatory in openDatabase call');
      }
      if (!!openargs.location && !!openargs.iosDatabaseLocation) {
        throw newSQLError('Ambiguous: both location or iosDatabaseLocation values are present in openDatabase call');
      }
      dblocation = !!openargs.location && openargs.location === 'default' ? iosLocationMap['default'] : !!openargs.iosDatabaseLocation ? iosLocationMap[openargs.iosDatabaseLocation] : dblocations[openargs.location];
      if (!dblocation) {
        throw newSQLError('Valid iOS database location could not be determined in openDatabase call');
      }
      openargs.dblocation = dblocation;
      if (!!openargs.createFromLocation && openargs.createFromLocation === 1) {
        openargs.createFromResource = "1";
      }
      if (!!openargs.androidDatabaseImplementation && openargs.androidDatabaseImplementation === 2) {
        openargs.androidOldDatabaseImplementation = 1;
      }
      if (!!openargs.androidLockWorkaround && openargs.androidLockWorkaround === 1) {
        openargs.androidBugWorkaround = 1;
      }
      okcb = null;
      errorcb = null;
      if (args.length >= 2) {
        okcb = args[1];
        if (args.length > 2) {
          errorcb = args[2];
        }
      }
      return new SQLitePlugin(openargs, okcb, errorcb);
    }),
    deleteDatabase: function(first, success, error) {
      var args, dblocation, dbname;
      args = {};
      if (first.constructor === String) {
        throw newSQLError('Sorry first deleteDatabase argument must be an object');
      } else {
        if (!(first && first['name'])) {
          throw new Error("Please specify db name");
        }
        dbname = first.name;
        if (typeof dbname !== 'string') {
          throw newSQLError('delete database name must be a string');
        }
        args.path = dbname;
      }
      if (!first.iosDatabaseLocation && !first.location && first.location !== 0) {
        throw newSQLError('Database location or iosDatabaseLocation value is now mandatory in deleteDatabase call');
      }
      if (!!first.location && !!first.iosDatabaseLocation) {
        throw newSQLError('Ambiguous: both location or iosDatabaseLocation values are present in deleteDatabase call');
      }
      dblocation = !!first.location && first.location === 'default' ? iosLocationMap['default'] : !!first.iosDatabaseLocation ? iosLocationMap[first.iosDatabaseLocation] : dblocations[first.location];
      if (!dblocation) {
        throw newSQLError('Valid iOS database location could not be determined in deleteDatabase call');
      }
      args.dblocation = dblocation;
      delete SQLitePlugin.prototype.openDBs[args.path];
      root.sqlitePluginHelper.exec('delete', [args], success, error);
    }
  };

  SelfTest = {
    DBNAME: '___$$$___litehelpers___$$$___test___$$$___.db',
    start: function(successcb, errorcb) {
      SQLiteFactory.deleteDatabase({
        name: SelfTest.DBNAME,
        location: 'default'
      }, (function() {
        return SelfTest.step1(successcb, errorcb);
      }), (function() {
        return SelfTest.step1(successcb, errorcb);
      }));
    },
    step1: function(successcb, errorcb) {
      SQLiteFactory.openDatabase({
        name: SelfTest.DBNAME,
        location: 'default'
      }, function(db) {
        var check1;
        check1 = false;
        db.transaction(function(tx) {
          tx.executeSql('SELECT UPPER("Test") AS upperText', [], function(ignored, resutSet) {
            if (!resutSet.rows) {
              return SelfTest.finishWithError(errorcb, 'Missing resutSet.rows');
            }
            if (!resutSet.rows.length) {
              return SelfTest.finishWithError(errorcb, 'Missing resutSet.rows.length');
            }
            if (resutSet.rows.length !== 1) {
              return SelfTest.finishWithError(errorcb, "Incorrect resutSet.rows.length value: " + resutSet.rows.length + " (expected: 1)");
            }
            if (!resutSet.rows.item(0).upperText) {
              return SelfTest.finishWithError(errorcb, 'Missing resutSet.rows.item(0).upperText');
            }
            if (resutSet.rows.item(0).upperText !== 'TEST') {
              return SelfTest.finishWithError(errorcb, "Incorrect resutSet.rows.item(0).upperText value: " + (resutSet.rows.item(0).upperText) + " (expected: 'TEST')");
            }
            check1 = true;
          }, function(ignored, tx_sql_err) {
            return SelfTest.finishWithError(errorcb, "TX SQL error: " + tx_sql_err);
          });
        }, function(tx_err) {
          return SelfTest.finishWithError(errorcb, "TRANSACTION error: " + tx_err);
        }, function() {
          if (!check1) {
            return SelfTest.finishWithError(errorcb, 'Did not get expected upperText result data');
          }
          db.executeSql('BEGIN', null, function(ignored) {
            return nextTick(function() {
              delete db.openDBs[SelfTest.DBNAME];
              delete txLocks[SelfTest.DBNAME];
              nextTick(function() {
                db.transaction(function(tx2) {
                  tx2.executeSql('SELECT 1');
                }, function(tx_err) {
                  if (!tx_err) {
                    return SelfTest.finishWithError(errorcb, 'Missing error object');
                  }
                  SelfTest.step2(successcb, errorcb);
                }, function() {
                  return SelfTest.finishWithError(errorcb, 'Missing error object');
                });
              });
            });
          });
        });
      }, function(open_err) {
        return SelfTest.finishWithError(errorcb, "Open database error: " + open_err);
      });
    },
    step2: function(successcb, errorcb) {
      SQLiteFactory.openDatabase({
        name: SelfTest.DBNAME,
        location: 'default'
      }, function(db) {
        db.transaction(function(tx) {
          tx.executeSql('SELECT ? AS myResult', [null], function(ignored, resutSet) {});
        }, function(txError) {
          if (!txError) {
            return SelfTest.finishWithError(errorcb, 'Missing txError object');
          }
          db.transaction(function(tx2) {
            tx2.executeSql('SELECT ? AS myResult', [null], function(ignored, resutSet) {
              if (!resutSet.rows) {
                return SelfTest.finishWithError(errorcb, 'Missing resutSet.rows');
              }
              if (!resutSet.rows.length) {
                return SelfTest.finishWithError(errorcb, 'Missing resutSet.rows.length');
              }
              if (resutSet.rows.length !== 1) {
                return SelfTest.finishWithError(errorcb);
              }
              SelfTest.step3(successcb, errorcb);
            });
          }, function(tx2_err) {
            return SelfTest.finishWithError(errorcb, "UNEXPECTED TRANSACTION ERROR: " + tx2_err);
          });
        }, function() {
          return SelfTest.finishWithError(errorcb, 'UNEXPECTED SUCCESS ref: litehelpers/Cordova-sqlite-storage#666');
        });
      }, function(open_err) {
        return SelfTest.finishWithError(errorcb, "Open database error: " + open_err);
      });
    },
    step3: function(successcb, errorcb) {
      SQLiteFactory.openDatabase({
        name: SelfTest.DBNAME,
        location: 'default'
      }, function(db) {
        return db.sqlBatch(['CREATE TABLE TestTable(TestColumn);', ['INSERT INTO TestTable (TestColumn) VALUES (?);', ['test-value']]], function() {
          return db.executeSql('SELECT * FROM TestTable', [], function(resutSet) {
            if (!resutSet.rows) {
              SelfTest.finishWithError(errorcb, 'Missing resutSet.rows');
              return;
            }
            if (!resutSet.rows.length) {
              SelfTest.finishWithError(errorcb, 'Missing resutSet.rows.length');
              return;
            }
            if (resutSet.rows.length !== 1) {
              SelfTest.finishWithError(errorcb, "Incorrect resutSet.rows.length value: " + resutSet.rows.length + " (expected: 1)");
              return;
            }
            if (!resutSet.rows.item(0).TestColumn) {
              SelfTest.finishWithError(errorcb, 'Missing resutSet.rows.item(0).TestColumn');
              return;
            }
            if (resutSet.rows.item(0).TestColumn !== 'test-value') {
              SelfTest.finishWithError(errorcb, "Incorrect resutSet.rows.item(0).TestColumn value: " + (resutSet.rows.item(0).TestColumn) + " (expected: 'test-value')");
              return;
            }
            return db.transaction(function(tx) {
              return tx.executeSql('UPDATE TestTable SET TestColumn = ?', ['new-value']);
            }, function(tx_err) {
              return SelfTest.finishWithError(errorcb, "UPDATE transaction error: " + tx_err);
            }, function() {
              return db.readTransaction(function(tx2) {
                return tx2.executeSql('SELECT * FROM TestTable', [], function(ignored, resutSet2) {
                  if (!resutSet2.rows) {
                    throw newSQLError('Missing resutSet.rows');
                  }
                  if (!resutSet2.rows.length) {
                    throw newSQLError('Missing resutSet.rows.length');
                  }
                  if (resutSet2.rows.length !== 1) {
                    throw newSQLError("Incorrect resutSet.rows.length value: " + resutSet.rows.length + " (expected: 1)");
                  }
                  if (!resutSet2.rows.item(0).TestColumn) {
                    throw newSQLError('Missing resutSet.rows.item(0).TestColumn');
                  }
                  if (resutSet2.rows.item(0).TestColumn !== 'new-value') {
                    throw newSQLError("Incorrect resutSet.rows.item(0).TestColumn value: " + (resutSet.rows.item(0).TestColumn) + " (expected: 'test-value')");
                  }
                });
              }, function(tx2_err) {
                return SelfTest.finishWithError(errorcb, "readTransaction error: " + tx2_err);
              }, function() {
                return db.close(function() {
                  return SQLiteFactory.deleteDatabase({
                    name: SelfTest.DBNAME,
                    location: 'default'
                  }, successcb, function(cleanup_err) {
                    if (/Windows /.test(navigator.userAgent) || /IEMobile/.test(navigator.userAgent)) {
                      console.log("IGNORE CLEANUP (DELETE) ERROR: " + (JSON.stringify(cleanup_err)) + " (Windows/WP8)");
                      successcb();
                      return;
                    }
                    return SelfTest.finishWithError(errorcb, "Cleanup error: " + cleanup_err);
                  });
                }, function(close_err) {
                  if (/Windows /.test(navigator.userAgent) || /IEMobile/.test(navigator.userAgent)) {
                    console.log("IGNORE close ERROR: " + (JSON.stringify(close_err)) + " (Windows/WP8)");
                    SQLiteFactory.deleteDatabase({
                      name: SelfTest.DBNAME,
                      location: 'default'
                    }, successcb, successcb);
                    return;
                  }
                  return SelfTest.finishWithError(errorcb, "close error: " + close_err);
                });
              });
            });
          }, function(select_err) {
            return SelfTest.finishWithError(errorcb, "SELECT error: " + select_err);
          });
        }, function(batch_err) {
          return SelfTest.finishWithError(errorcb, "sql batch error: " + batch_err);
        });
      }, function(open_err) {
        return SelfTest.finishWithError(errorcb, "Open database error: " + open_err);
      });
    },
    finishWithError: function(errorcb, message) {
      console.log("selfTest ERROR with message: " + message);
      SQLiteFactory.deleteDatabase({
        name: SelfTest.DBNAME,
        location: 'default'
      }, function() {
        return errorcb(newSQLError(message));
      }, function(err2) {
        return errorcb(newSQLError("Cleanup error: " + err2 + " for error: " + message));
      });
    }
  };

  root.sqlitePlugin = {
    sqliteFeatures: {
      isSQLitePlugin: true
    },
    echoTest: function(okcb, errorcb) {
      var error, ok;
      ok = function(s) {
        if (s === 'test-string') {
          return okcb();
        } else {
          return errorcb("Mismatch: got: '" + s + "' expected 'test-string'");
        }
      };
      error = function(e) {
        return errorcb(e);
      };
      return cordova.exec(okcb, errorcb, "SQLitePlugin", "echoStringValue", [
        {
          value: 'test-string'
        }
      ]);
    },
    selfTest: SelfTest.start,
    openDatabase: SQLiteFactory.openDatabase,
    deleteDatabase: SQLiteFactory.deleteDatabase
  };

}).call(this);
