# Cordova/PhoneGap sqlite storage - evmax legacy workers - premium enterprise version with legacy support for web workers

_Proof of concept test release_ with *very basic* support for web workers (_Android/iOS/macOS_ *ONLY*).

Native interface to sqlite in a Cordova/PhoneGap plugin for Android and iOS with API similar to HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/).

This version is available under GPL v3 (http://www.gnu.org/licenses/gpl.txt) or commercial license.

_includes components under MIT / Apache 2.0 license terms, please see LICENSE.md for details._


_NOTE: Commercial licenses for Cordova-sqlite-enterprise-free purchased before July 2016 are valid for this plugin version. Commercial licenses for Cordova-sqlite-evplus purchased before November 2017 are valid for this plugin version. Commercial licenses for Cordova-sqlite-evcore versions are *NOT* valid for this plugin version. Commercial licenses for Cordova-sqlite-evplus purchased in November 2017 or later are *NOT* valid for this plugin version._

<!-- XXX GONE:
TBD: no Circle CI or Travis CI working in this version branch.
 -->

## About this version branch

_Proof of concept with *very basic* support for web workers (Android/iOS/macOS ONLY)._

<!-- END About this version branch -->

## IMPORTANT API DEPRECATION NOTICE

The following API calls are now deprecated and may be removed in the near future (ref [litehelpers / cordova-sqlite-evplus-legacy-workers-free#5](https://github.com/litehelpers/cordova-sqlite-evplus-legacy-workers-free/issues/5)):
- `db.transaction()`
- `db.readTransaction()`
- `db.beginTransaction()`

It is recommended to use the following calls instead:

- `db.executeSql()` to read data or execute a single modification statement
- _`db.sqlBatch()` to execute a batch of modification statements within an ACID (atomic, failure-safe) transaction_

**OTHER CALLS DEPRECATED** in this version (not supported within web workers):
- `db.close()`
- `sqlitePlugin.deleteDatabase()`

**MAY BE DEPRECATED IN THE FUTURE:**
- non-default database location

## WARNING: Multiple SQLite problem on Android

This plugin uses a non-standard [Android-sqlite-connector](https://github.com/liteglue/Android-sqlite-connector) implementation on Android. In case an application access the **same** database using multiple plugins there is a risk of data corruption ref: [litehelpers/Cordova-sqlite-storage#626](https://github.com/litehelpers/Cordova-sqlite-storage/issues/626)) as described in <http://ericsink.com/entries/multiple_sqlite_problem.html> and <https://www.sqlite.org/howtocorrupt.html>.

The workaround is to use the `androidDatabaseImplementation: 2` setting as described in the **Android sqlite implementation** section below:

```js
var db = window.sqlitePlugin.openDatabase({name: "my.db", androidDatabaseImplementation: 2});
```

## BREAKING CHANGE: Database location parameter is now mandatory

The `location` or `iosDatabaseLocation` *must* be specified in the `openDatabase` and `deleteDatabase` calls, as documented below.

### IMPORTANT: iCloud backup of SQLite database is NOT allowed

As documented in the "**A User’s iCloud Storage Is Limited**" section of [iCloudFundamentals in Mac Developer Library iCloud Design Guide](https://developer.apple.com/library/mac/documentation/General/Conceptual/iCloudDesignGuide/Chapters/iCloudFundametals.html) (near the beginning):

<blockquote>
<ul>
<li><b>DO</b> store the following in iCloud:
  <ul>
   <li>[<i>other items omitted</i>]</li>
   <li>Change log files for a SQLite database (a SQLite database’s store file must never be stored in iCloud)</li>
  </ul>
</li>
<li><b>DO NOT</b> store the following in iCloud:
  <ul>
   <li>[<i>items omitted</i>]</li>
  </ul>
</li>
</ul>
- <cite><a href="https://developer.apple.com/library/mac/documentation/General/Conceptual/iCloudDesignGuide/Chapters/iCloudFundametals.html">iCloudFundamentals in Mac Developer Library iCloud Design Guide</a>
</blockquote>

### How to disable iCloud backup

Use the `location` or `iosDatabaseLocation` option in `sqlitePlugin.openDatabase()` to store the database in a subdirectory that is *NOT* backed up to iCloud, as described in the section below.

**NOTE:** Changing `BackupWebStorage` in `config.xml` has no effect on a database created by this plugin. `BackupWebStorage` applies only to local storage and/or Web SQL storage created in the WebView (*not* using this plugin). For reference: [phonegap/build#338 (comment)](https://github.com/phonegap/build/issues/338#issuecomment-113328140)

## SECURITY TODO(s)

- XHR URI request mechanism needs a secret code mechanism, like they have in the Cordova framework

TBD NOTE (only an issue if app loads external content)

## Usage in web worker(s)

It is *highly* recommended to use the sample application `www` as a starting point, at least during initial testing.

Some **important** pointers:
- See `www/sample-index.html`, the `aqmain.js` script must be included (or imported) before your app Javascript
- See `www/sample-index.js`: a worker must be registered with a unique name **with no special characters** (TBD: specify which ones) using the `AQ.aqregister` function before the worker can have access to the sqlite plugin features
- See `www/sample-worker.js`: some requirements in the worker script:
  - `SQLitePlugin.js` must be imported.
  - `SQLitePlugin.js` and `aqworker.js` must be in the same directory (`SQLitePlugin.js` automatically imports `aqworker.js` within a web worker).
  - To receive messages from the main thread, please use `self.addEventListener` instead of `self.onmessage`
  - This plugin sends internal string messages starting with `!!!` from the main thread to the worker thread. It is *highly* recommended to filter the messages for your own pattern.
  - Use `sqlitePlugin.openDatabase` instead of `window.sqlitePlugin.openDatabase`
- `www/SQLitePlugin.js` is no longer automatically included in the main thread by Cordova.

**iOS WKWebView NOTICE:** Usage in web workers is NOT supported for iOS WKWebView ref: [litehelpers / cordova-sqlite-evplus-legacy-workers-free#6](https://github.com/litehelpers/cordova-sqlite-evplus-legacy-workers-free/issues/6).

## LIMITATIONS and other TODO(s) to be fixed:

- extra logging statements (*almost completely* commented out)
- source code changes to the native Android and iOS versions needs some cleanup
- not supported for iOS WKWebView ref: [litehelpers / cordova-sqlite-evplus-legacy-workers-free#6](https://github.com/litehelpers/cordova-sqlite-evplus-legacy-workers-free/issues/6)
- not possible to close or delete a database from a web worker

## Status

- Major modifications have been made to to support web workers
- Certain features described below may be partially or completely broken

TBD test:
- Very large transaction in a web worker

- Commercial support is available by contacting: _<sales@litehelpers.net>_
- Patches patches will *NOT* be accepted on this project due to potential licensing issues.
- Features omitted from this version branch: pre-populated database support; REGEXP extension for iOS; Windows "Universal", WP(7/8), and Amazon Fire-OS support
- Status for the ~~other~~ target platforms:
  - Android: now using [Android-sqlite-connector](https://github.com/liteglue/Android-sqlite-connector) (with sqlite `3.7.17`), with support for FTS3/FTS4 and R-Tree
  - iOS: sqlite `3.8.10.2` embedded
- A recent version of the Cordova CLI (such as `6.5.0`) is recommended. Cordova versions older than `6.0.0` are missing the `cordova-ios@4.0.0` security fixes. In addition it is *required* to use `cordova prepare` in case of cordova-ios older than `4.3.0` (Cordova CLI `6.4.0`).
- This version uses a `before_plugin_install` hook to install sqlite3 library dependencies from `cordova-sqlite-storage-dependencies` via npm.
- Build with SQLite (version `3.8.10.2`) with the following build settings for iOS/macOS/Windows:
  - `SQLITE_THREADSAFE=1` (`SQLITE_THREADSAFE=2` on iOS/macOS)
  - `SQLITE_DEFAULT_MEMSTATUS=0`
  - `SQLITE_OMIT_DECLTYPE`
  - `SQLITE_OMIT_DEPRECATED`
  - `SQLITE_OMIT_PROGRESS_CALLBACK`
  - `SQLITE_OMIT_SHARED_CACHE`
  - `SQLITE_TEMP_STORE=2`
  - `SQLITE_OMIT_LOAD_EXTENSION`
  - `SQLITE_ENABLE_FTS3`
  - `SQLITE_ENABLE_FTS3_PARENTHESIS`
  - `SQLITE_ENABLE_FTS4`
  - `SQLITE_ENABLE_RTREE`
  - `SQLITE_DEFAULT_PAGE_SIZE=1024` and `SQLITE_DEFAULT_CACHE_SIZE=2000` to avoid "potentially distruptive change(s)" from SQLite 3.12.0 ref: <http://sqlite.org/pgszchng2016.html>
  - `SQLITE_OS_WINRT` for Windows only
- Use of other systems such as Cordova Plugman, PhoneGap CLI, PhoneGap Build, and Intel XDK is no longer supported since they do not honor the `before_plugin_install` hook. The supported solution is to use [litehelpers / Cordova-sqlite-evcore-extbuild-free](https://github.com/litehelpers/Cordova-sqlite-evcore-extbuild-free) (available with GPL or commercial license terms) or [litehelpers / Cordova-sqlite-legacy-build-support](https://github.com/litehelpers/Cordova-sqlite-legacy-build-support) (limited testing, limited updates)
- The iOS database location is now mandatory, as documented below.
- This version supports the ~~use of two (2) possible~~ _following_ Android sqlite database _implementation_:
  - default: lightweight [Android-sqlite-connector](https://github.com/liteglue/Android-sqlite-connector)
  - ~~optional: built-in Android database classes (usage described below)~~ _(NOT supported in this verison branch)_
- The following features are available in [litehelpers / cordova-sqlite-ext](https://github.com/litehelpers/cordova-sqlite-ext):
  - REGEXP (Android/iOS/macOS)
  - SELECT BLOB data in Base64 format (all platforms Android/iOS/macOS/Windows)
  - Pre-populated database (Android/iOS/macOS/Windows)
- FTS3 and FTS4 are tested working OK in this version branch (for all target platforms in this version branch Android/iOS/macOS)
- R-Tree is *not* tested or supported for Android in this version branch.
- ~~Android is supported back to SDK 10 (a.k.a. Gingerbread, Android 2.3.3); support for older versions is available upon request.~~
- _Android older than 5.0 *not* supported for web workers_
- iOS versions supported: 8.x/9.x/10.x

<!-- END Status -->

## Announcements

- Windows 10 (UWP) build with /SAFESEH flag on Win32 (x86) target to specify "Image has Safe Exception Handlers" as described in <https://docs.microsoft.com/en-us/cpp/build/reference/safeseh-image-has-safe-exception-handlers>
- Fixed iOS/macOS platform version to use [PSPDFThreadSafeMutableDictionary.m](https://gist.github.com/steipete/5928916) to avoid threading issue ref: [litehelpers/Cordova-sqlite-storage#716](https://github.com/litehelpers/Cordova-sqlite-storage/issues/716)
- Resolved transaction problem after window.location (page) change with possible data loss ref: [litehelpers/Cordova-sqlite-storage#666](https://github.com/litehelpers/Cordova-sqlite-storage/issues/666)
- [brodybits / cordova-sqlite-test-app](https://github.com/brodybits/cordova-sqlite-test-app) project is a CC0 (public domain) starting point (NOTE that this plugin must be added) and may also be used to reproduce issues with this plugin.
- The Lawnchair adapter is now moved to [litehelpers / cordova-sqlite-lawnchair-adapter](https://github.com/litehelpers/cordova-sqlite-lawnchair-adapter).
- [litehelpers / cordova-sqlite-ext](https://github.com/litehelpers/cordova-sqlite-ext) now supports SELECT BLOB data in Base64 format on all platforms in addition to REGEXP (Android/iOS/macOS) and pre-populated database (all platforms).
- [brodybits / sql-promise-helper](https://github.com/brodybits/sql-promise-helper) provides a Promise-based API wrapper.
- [nolanlawson / pouchdb-adapter-cordova-sqlite](https://github.com/nolanlawson/pouchdb-adapter-cordova-sqlite) supports this plugin along with other implementations such as [nolanlawson / sqlite-plugin-2](https://github.com/nolanlawson/sqlite-plugin-2) and [Microsoft / cordova-plugin-websql](https://github.com/Microsoft/cordova-plugin-websql).
- macOS ("osx" platform) is now supported
- New [litehelpers / Cordova-sqlite-evcore-extbuild-free](https://github.com/litehelpers/Cordova-sqlite-evcore-extbuild-free) version with Android JSON and SQL statement handling implemented in C, as well as support for PhoneGap Build, Intel XDK, etc. (GPL or commercial license terms). Handles large SQL batches in less than half the time as this version. Also supports arbitrary database location on Android.
- Published [brodybits / Cordova-quick-start-checklist](https://github.com/brodybits/Cordova-quick-start-checklist) and [brodybits / Avoiding-some-Cordova-pitfalls](https://github.com/brodybits/Avoiding-some-Cordova-pitfalls).
- Windows 8.1/Windows Phone 8.1/Windows 10 version is available **here** _(Visual Studio 2015 required, Visual Studio 2017 NOT supported by this version branch)_ as well as in [litehelpers / cordova-sqlite-ext](https://github.com/litehelpers/cordova-sqlite-ext) (with pre-populated database support) and [litehelpers / Cordova-sqlite-legacy](https://github.com/litehelpers/Cordova-sqlite-legacy) (with WP8 support).
- Android version _currently uses_ the lightweight [Android-sqlite-connector](https://github.com/liteglue/Android-sqlite-connector) by default configuration (may be changed as described below)
- Self-test functions to verify proper installation and operation of this plugin
- More explicit `openDatabase` and `deleteDatabase` `iosDatabaseLocation` option
- Added simple sql batch function
- This version has the following API improvement(s):
  - _DEPRECATED and may be removed in a future release:_ Multi-part transactions API (described below)
  - Error result with proper Web SQL `code` member and `sqliteCode` as reported by the SQLite C library (Android/iOS)
- This version has the following memory improvements:
  - flat JSON interface between Javascript and native parts
  - *optional*: transaction sql chunking, which can be enabled by changing the `MAX_SQL_CHUNK` value in SQLitePlugin.js
- PhoneGap Build is now supported through the npm package: http://phonegap.com/blog/2015/05/26/npm-plugins-available/
- [MetaMemoryT / websql-promise](https://github.com/MetaMemoryT/websql-promise) now provides a Promises-based interface to both Web SQL and this plugin
- Android version is now using the lightweight [Android-sqlite-connector](https://github.com/liteglue/Android-sqlite-connector)

<!-- END Announcements -->

## Highlights

- Drop-in replacement for HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/): the only change should be to replace the static `window.openDatabase()` factory call with `window.sqlitePlugin.openDatabase()`, with parameters as documented below.
- Failure-safe nested transactions with batch processing optimizations (according to HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/))
- API (based on HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/)) is designed to be as flexible as possible but does not allow the application to leave any transactions hanging open.
- As described in [this posting](http://brodyspark.blogspot.com/2012/12/cordovaphonegap-sqlite-plugins-offer.html):
  - Keeps sqlite database in a user data location that is known; can be reconfigured (iOS/macOS platform version); and may be synchronized to iCloud (iOS platform version).
  - No 5MB maximum, more information at: http://www.sqlite.org/limits.html
- Also tested for multi-page applications with window location changes
- This project is self-contained (with sqlite3 dependencies auto-fetched by npm); no dependencies on other plugins such as cordova-plugin-file
- Windows 8.1/Windows Phone 8.1/Windows 10 version uses the performant C++ [doo / SQLite3-WinRT](https://github.com/doo/SQLite3-WinRT) component.
- [SQLCipher](https://www.zetetic.net/sqlcipher/) support for Android/iOS/macOS/Windows is available in: [litehelpers / Cordova-sqlcipher-adapter](https://github.com/litehelpers/Cordova-sqlcipher-adapter)
- Intellectual property:
  - All source code is tracked to the original author in git
  - Major authors are tracked in AUTHORS.md
  - License of each component is tracked in LICENSE.md
  - History of this project is also described in HISTORY.md

**TIP:** It is possible to migrate from Cordova to a pure native solution and continue using the data stored by this plugin.

<!-- END Highlights -->

## Some apps using this plugin

TBD

## Some known deviations from the Web SQL database standard

- The `window.sqlitePlugin.openDatabase` static factory call takes a different set of parameters than the standard Web SQL `window.openDatabase` static factory call. In case you have to use existing Web SQL code with no modifications please see the **Web SQL replacement tip** below.
- This plugin does *not* support the database creation callback or standard database versions. Please read the **Database schema versions** section below for tips on how to support database schema versioning.
- This plugin does *not* support the synchronous Web SQL interfaces.
- Error reporting is not 100% compliant, with some issues described below.
- In case of a transaction with an sql statement error for which there is no error handler, the error handler does not return `false`, or the error handler throws an exception, the plugin will fire more sql statement callbacks before the transaction is aborted with ROLLBACK.
- This plugin supports some non-standard features as described below.

<!-- END Some apps using this plugin -->

## Security

### Security of sensitive data

According to [Web SQL Database API 7.2 Sensitivity of data](https://www.w3.org/TR/webdatabase/#sensitivity-of-data):
>User agents should treat persistently stored data as potentially sensitive; it's quite possible for e-mails, calendar appointments, health records, or other confidential documents to be stored in this mechanism.
>
>To this end, user agents should ensure that when deleting data, it is promptly deleted from the underlying storage.

Unfortunately this plugin will not actually overwrite the deleted content unless the [secure_delete PRAGMA](https://www.sqlite.org/pragma.html#pragma_secure_delete) is used.

### SQL injection

As "strongly recommended" by [Web SQL Database API 8.5 SQL injection](https://www.w3.org/TR/webdatabase/#sql-injection):
>Authors are strongly recommended to make use of the `?` placeholder feature of the `executeSql()` method, and to never construct SQL statements on the fly.

<!-- END Security -->

# Avoiding data loss

- Double-check that the application code follows the documented API for SQL statements, parameter values, success callbacks, and error callbacks.
- For standard Web SQL transactions include a transaction error callback with the proper logic that indicates to the user if data cannot be stored for any reason. In case of individual SQL error handlers be sure to indicate to the user if there is any issue with storing data.
- For single statement and batch transactions include an error callback with logic that indicates to the user if data cannot be stored for any reason.

<!-- Avoiding data loss -->

## Known issues

- iOS/macOS platform version does not support certain rapidly repeated open-and-close or open-and-delete test scenarios due to how the implementation handles background processing
- As described below, auto-vacuum is NOT enabled by default.
- It is possible to request a SQL statement list such as "SELECT 1; SELECT 2" within a single SQL statement string, however the plugin will only execute the first statement and silently ignore the others ref: [litehelpers/Cordova-sqlite-storage#551](https://github.com/litehelpers/Cordova-sqlite-storage/issues/551)
- INSERT statement that affects multiple rows (due to SELECT cause or using TRIGGER(s), for example) does not report proper rowsAffected on Android
- Memory issue observed when adding _super extreme_ large number of records _on Android_ ~~due to the JSON implementation~~ which is improved in [litehelpers / Cordova-sqlite-evcore-extbuild-free](https://github.com/litehelpers/Cordova-sqlite-evcore-extbuild-free) (GPL or commercial license terms)
- Infinity (positive or negative) values are not supported on Android/iOS/macOS due to issues described above including a possible crash on iOS/macOS ref: [litehelpers/Cordova-sqlite-storage#405](https://github.com/litehelpers/Cordova-sqlite-storage/issues/405)
- A stability issue was reported on the iOS version when in use together with [SockJS](http://sockjs.org/) client such as [pusher-js](https://github.com/pusher/pusher-js) at the same time (see [litehelpers/Cordova-sqlite-storage#196](https://github.com/litehelpers/Cordova-sqlite-storage/issues/196)). The workaround is to call sqlite functions and [SockJS](http://sockjs.org/) client functions in separate ticks (using setTimeout with 0 timeout).
- If a sql statement fails for which there is no error handler or the error handler does not return `false` to signal transaction recovery, the plugin fires the remaining sql callbacks before aborting the transaction.
- In case of an error, the error `code` member is bogus on _Android and Windows_.
- Possible crash on Android when using Unicode emoji and other 4-octet UTF-8 characters due to [Android bug 81341](https://code.google.com/p/android/issues/detail?id=81341), which *should* be fixed in Android 6.x
- Close/delete database bugs described below.
- When a database is opened and deleted without closing, the iOS/macOS platform version is known to leak resources.
- It is NOT possible to open multiple databases with the same name but in different locations (iOS/macOS platform version).
- Incorrect or missing insertId/rowsAffected in results for INSERT/UPDATE/DELETE SQL statements with extra semicolon(s) in the beginning for Android (android.database implementation)
- readTransaction does *not* reject modification SQL statements with extra semicolon(s) in the beginning
- Problems reported with PhoneGap Build in the past:
  - PhoneGap Build Hydration.
  - Apparently FIXED: ~~PhoneGap Build may fail to build the iOS version unless the name of the app starts with an uppercase and contains no spaces (see [litehelpers/Cordova-sqlite-storage#243](https://github.com/litehelpers/Cordova-sqlite-storage/issues/243); [Wizcorp/phonegap-facebook-plugin#830](https://github.com/Wizcorp/phonegap-facebook-plugin/issues/830); [phonegap/build#431](https://github.com/phonegap/build/issues/431)).~~

Issues fixed in some newer version branches:
- In case of an error, the error `code` member is bogus on Android
- iOS platform version generates extra logging in release version
- iOS platform version may crash if deleteDatabase is called with an object in place of the database name
- readTransaction does not reject ALTER, REINDEX, and REPLACE operations
- readTransaction does not reject modification statements with extra semicolon(s) in the beginning
- extra executeSql callbacks triggered in a transaction after a failure that was not recovered by an error callback that returns false
- does not signal an error in case of excess parameter argument values given on iOS/macOS

<!-- END Known issues -->

## Other limitations

- ~~The db version, display name, and size parameter values are not supported and will be ignored.~~ (No longer supported by the API)
- Absolute and relative subdirectory path(s) are not tested or supported.
- This plugin will not work before the callback for the 'deviceready' event has been fired, as described in **Usage**. (This is consistent with the other Cordova plugins.)
- _Super extreme_ large records are not supported by this plugin version. TBD: specify maximum record; FUTURE TBD: to be _further tested_ in [litehelpers / Cordova-sqlite-evcore-extbuild-free](https://github.com/litehelpers/Cordova-sqlite-evcore-extbuild-free) (GPL or commercial license terms).
- In-memory database `db=window.sqlitePlugin.openDatabase({name: ':memory:', ...})` is currently not supported.
- The Android version cannot work with more than 100 open db files (due to the threading model used).
- UNICODE `\u2028` (line separator) and `\u2029` (paragraph separator) characters are not supported and known to be broken on iOS, macOS, and Android platforms due to JSON issues reported in [Cordova bug CB-9435](https://issues.apache.org/jira/browse/CB-9435) and [cordova/cordova-discuss#57](https://github.com/cordova/cordova-discuss/issues/57). There *may* be a similar issue with certain other UNICODE characters in the iOS/macOS version (needs further investigation). This is fixed for iOS in [litehelpers / cordova-sqlite-evplus-ext-legacy-build-free](https://github.com/litehelpers/cordova-sqlite-evplus-ext-legacy-build-free) and [litehelpers / Cordova-sqlite-evplus-legacy-attach-detach-free](https://github.com/litehelpers/Cordova-sqlite-evplus-legacy-attach-detach-free) (GPL or special commercial license terms) as well as [litehelpers / cordova-sqlite-evmax-ext-workers-legacy-build-free](https://github.com/litehelpers/cordova-sqlite-evmax-ext-workers-legacy-build-free) (GPL or premium commercial license terms).
- The BLOB data type is not fully supported by this version branch. SELECT BLOB in Base64 format is supported by [litehelpers / cordova-sqlite-ext](https://github.com/litehelpers/cordova-sqlite-ext) (permissive license terms) and [litehelpers / Cordova-sqlite-evcore-extbuild-free](https://github.com/litehelpers/Cordova-sqlite-evcore-extbuild-free) (GPL or commercial license terms).
- Truncation in case of UNICODE `\u0000` (same as `\0`) character on Android (default Android-sqlite-connector database implementation) and Windows.
- Case-insensitive matching and other string manipulations on Unicode characters, which is provided by optional ICU integration in the sqlite source and working with recent versions of Android, is not supported for any target platforms.
- iOS/macOS platform version uses a thread pool but with only one thread working at a time due to "synchronized" database access
- Some large query results may be slow, also due to the JSON implementation.
- ATTACH to another database file is not supported by this version branch. Attach/detach is supported (along with the memory and iOS UNICODE `\u2028` line separator / `\u2029` paragraph separator fixes) in [litehelpers / Cordova-sqlite-evplus-legacy-attach-detach-free](https://github.com/litehelpers/Cordova-sqlite-evplus-legacy-attach-detach-free) (available with GPL or special commercial license terms).
- UPDATE/DELETE with LIMIT or ORDER BY is not supported.
- WITH clause is not supported by some older Android/iOS versions.
- User-defined savepoints are not supported and not expected to be compatible with the transaction locking mechanism used by this plugin. In addition, the use of BEGIN/COMMIT/ROLLBACK statements is not supported.
- Problems have been reported when using this plugin with Crosswalk (for Android). It may help to install Crosswalk as a plugin instead of using Crosswalk to create the project.
- Does not work with [axemclion / react-native-cordova-plugin](https://github.com/axemclion/react-native-cordova-plugin) since the `window.sqlitePlugin` object is *not* properly exported (ES5 feature). It is recommended to use [andpor / react-native-sqlite-storage](https://github.com/andpor/react-native-sqlite-storage) for SQLite database access with React Native Android/iOS instead.

<!-- END Other limitations -->

## Further testing needed

- Integration with PhoneGap developer app
- Use within [InAppBrowser](http://docs.phonegap.com/en/edge/cordova_inappbrowser_inappbrowser.md.html)
- Use within an iframe (see [litehelpers/Cordova-sqlite-storage#368 (comment)](https://github.com/litehelpers/Cordova-sqlite-storage/issues/368#issuecomment-154046367))
- Date/time handling
- Maximum record size supported
- Actual behavior when using SAVEPOINT(s)
- R-Tree is not fully tested with Android
- UNICODE characters not fully tested
- Use with TRIGGER(s), JOIN and ORDER BY RANDOM
- UPDATE/DELETE with LIMIT or ORDER BY (newer Android/iOS versions)
- Integration with JXCore for Cordova (must be built without sqlite(3) built-in)
- Delete an open database inside a statement or transaction callback.
- WITH clause (not supported by some older sqlite3 versions)
- Handling of invalid transaction and transaction.executeSql arguments
- Use of database locations on macOS
- Extremely large and small INTEGER and REAL values ref: [litehelpers/Cordova-sqlite-storage#627](https://github.com/litehelpers/Cordova-sqlite-storage/issues/627))
- More emojis and other 4-octet UTF-8 characters
- `?NNN`/`:AAA`/`@AAAA`/`$AAAA` parameter placeholders ref: <https://www.sqlite.org/lang_expr.html#varparam>, <https://www.sqlite.org/c3ref/bind_blob.html>)
- Single-statement and SQL batch transaction calls with invalid arguments (TBD behavior subject to change)

<!-- END Further testing needed -->

## Some tips and tricks

- If you run into problems and your code follows the asynchronous HTML5/[Web SQL](http://www.w3.org/TR/webdatabase/) transaction API, you can try opening a test database using `window.openDatabase` and see if you get the same problems.
- In case your database schema may change, it is recommended to keep a table with one row and one column to keep track of your own schema version number. It is possible to add it later. The recommended schema update procedure is described below.

<!-- END Some tips and tricks -->

## Pitfalls

### Some common pitfall(s)

- If a database is opened using the standard `window.openDatabase` call it will not have any of the benefits of this plugin and features such as the `sqlBatch` call would not be available.
- It is NOT allowed to execute sql statements on a transaction that has already finished, as described below. This is consistent with the HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/).
- The plugin class name starts with "SQL" in capital letters, but in Javascript the `sqlitePlugin` object name starts with "sql" in small letters.
- Attempting to open a database before receiving the 'deviceready' event callback.
- Inserting STRING into ID field
- Auto-vacuum is NOT enabled by default. It is recommended to periodically VACUUM the database.
- Transactions on a database are run sequentially. A large transaction could block smaller transactions requested afterwards.

### Some weird pitfall(s)

- intent whitelist: blocked intent such as external URL intent *may* cause this and perhaps certain Cordova plugin(s) to misbehave (see [litehelpers/Cordova-sqlite-storage#396](https://github.com/litehelpers/Cordova-sqlite-storage/issues/396))

### Angular/ngCordova/Ionic-related pitfalls

- Angular/ngCordova/Ionic controller/factory/service callbacks may be triggered before the 'deviceready' event is fired
- As discussed in [litehelpers/Cordova-sqlite-storage#355](https://github.com/litehelpers/Cordova-sqlite-storage/issues/355), it may be necessary to install ionic-plugin-keyboard
- Navigation items such as root page can be tricky on Ionic 2 ref: [litehelpers/Cordova-sqlite-storage#613](https://github.com/litehelpers/Cordova-sqlite-storage/issues/613)

### General Cordova pitfalls

Documented in: [brodybits / Avoiding-some-Cordova-pitfalls](https://github.com/brodybits/Avoiding-some-Cordova-pitfalls)

<!-- END pitfalls -->

## Major TODOs

- Integrate with IndexedDBShim and some other libraries such as Sequelize, Squel.js, WebSqlSync, Persistence.js, Knex, etc.

## For future considertion

- Auto-vacuum option
- Browser platform

## Alternatives

### Comparison of sqlite plugin versions

- [litehelpers / Cordova-sqlite-storage](https://github.com/litehelpers/Cordova-sqlite-storage) - core version for Android/iOS/macOS/Windows (permissive license terms)
- [litehelpers / cordova-sqlite-ext](https://github.com/litehelpers/cordova-sqlite-ext) - version with REGEXP (Android/iOS/macOS), SELECT BLOB in Base64 format (all platforms Android/iOS/macOS/Windows), and pre-populated databases (all platforms Android/iOS/macOS/Windows). Permissive license terms.
- [litehelpers / Cordova-sqlite-legacy-build-support](https://github.com/litehelpers/Cordova-sqlite-legacy-build-support) - maintenance of WP8 version along with Windows 8.1/Windows Phone 8.1 and the other supported platforms Android/iOS/macOS/Windows 10; limited support for PhoneGap CLI/PhoneGap Build/plugman/Intel XDK; limited testing; limited updates. Permissive license terms.
- [litehelpers / Cordova-sqlcipher-adapter](https://github.com/litehelpers/Cordova-sqlcipher-adapter) - supports [SQLCipher](https://www.zetetic.net/sqlcipher/) for Android/iOS/macOS/Windows
- [litehelpers / Cordova-sqlite-evcore-extbuild-free](https://github.com/litehelpers/Cordova-sqlite-evcore-extbuild-free) - Enhancements for Android: JSON and SQL statement handling implemented in C, supports larger transactions and handles large SQL batches in less than half the time as this version. Supports arbitrary database location on Android. Support for build environments such as PhoneGap Build and Intel XDK. Also includes REGEXP (Android/iOS/macOS) and SELECT BLOB in Base64 format (all platforms Android/iOS/macOS/Windows). GPL or commercial license terms.
- [litehelpers / cordova-sqlite-evplus-ext-legacy-build-free](https://github.com/litehelpers/cordova-sqlite-evplus-ext-legacy-build-free) - internal memory improvements to support larger transactions (Android/iOS) and fix to support all Unicode characters (iOS). (GPL or special commercial license terms).
- [litehelpers / Cordova-sqlite-evplus-legacy-attach-detach-free](https://github.com/litehelpers/Cordova-sqlite-evplus-legacy-attach-detach-free) - version with support for ATTACH, includes internal memory improvements to support larger transactions (Android/iOS) and fix to support all Unicode characters (GPL or special commercial license terms).
- [litehelpers / cordova-sqlite-evmax-ext-workers-legacy-build-free](https://github.com/litehelpers/cordova-sqlite-evmax-ext-workers-legacy-build-free) - version with support for web workers, includes internal memory improvements to support larger transactions (Android/iOS) and fix to support all Unicode characters (iOS). (GPL or premium commercial license terms).
- Adaptation for React Native Android and iOS: [andpor / react-native-sqlite-storage](https://github.com/andpor/react-native-sqlite-storage) (permissive license terms)
- Original version for iOS (with a non-standard, outdated transaction API): [davibe / Phonegap-SQLitePlugin](https://github.com/davibe/Phonegap-SQLitePlugin) (permissive license terms)

<!-- END Comparison of sqlite plugin versions -->

### Other SQLite adapter projects

- [object-layer / AnySQL](https://github.com/object-layer/anysql) - Unified SQL API over multiple database engines
- [samikrc / CordovaSQLite](https://github.com/samikrc/CordovaSQLite) - Simpler sqlite plugin with a simpler API and browser platform
- [nolanlawson / sqlite-plugin-2](https://github.com/nolanlawson/sqlite-plugin-2) - Simpler fork/rewrite
- [nolanlawson / node-websql](https://github.com/nolanlawson/node-websql) - Web SQL API implementation for Node.js
- [an-rahulpandey / cordova-plugin-dbcopy](https://github.com/an-rahulpandey/cordova-plugin-dbcopy) - Alternative way to copy pre-populated database
- [EionRobb / phonegap-win8-sqlite](https://github.com/EionRobb/phonegap-win8-sqlite) - WebSQL add-on for Win8/Metro apps (perhaps with a different API), using an old version of the C++ library from [SQLite3-WinRT Component](https://github.com/doo/SQLite3-WinRT) (as referenced by [01org / cordova-win8](https://github.com/01org/cordova-win8))
- [SQLite3-WinRT Component](https://github.com/doo/SQLite3-WinRT) - C++ component that provides a nice SQLite API with promises for WinJS
- [01org / cordova-win8](https://github.com/01org/cordova-win8) - old, unofficial version of Cordova API support for Windows 8 Metro that includes an old version of the C++ [SQLite3-WinRT Component](https://github.com/doo/SQLite3-WinRT)
- [Microsoft / cordova-plugin-websql](https://github.com/Microsoft/cordova-plugin-websql) - Windows 8(+) and Windows Phone 8(+) WebSQL plugin versions in C#
- [Thinkwise / cordova-plugin-websql](https://github.com/Thinkwise/cordova-plugin-websql) - fork of [Microsoft / cordova-plugin-websql](https://github.com/Microsoft/cordova-plugin-websql) that supports asynchronous execution
- [MetaMemoryT / websql-client](https://github.com/MetaMemoryT/websql-client) - provides the same API and connects to [websql-server](https://github.com/MetaMemoryT/websql-server) through WebSockets.

<!-- END Other SQLite adapter projects -->

### Alternative solutions

- Use [phearme / cordova-ContentProviderPlugin](https://github.com/phearme/cordova-ContentProviderPlugin) to query content providers on Android devices
- [ABB-Austin / cordova-plugin-indexeddb-async](https://github.com/ABB-Austin/cordova-plugin-indexeddb-async) - Asynchronous IndexedDB plugin for Cordova that uses [axemclion / IndexedDBShim](https://github.com/axemclion/IndexedDBShim) (Browser/iOS/Android/Windows) and [Thinkwise / cordova-plugin-websql](https://github.com/Thinkwise/cordova-plugin-websql) - (Windows)
- Another sqlite binding for React-Native (iOS version): [almost/react-native-sqlite](https://github.com/almost/react-native-sqlite)
- Use [NativeScript](https://www.nativescript.org) with its web view and [NathanaelA / nativescript-sqlite](https://github.com/Natha
naelA/nativescript-sqlite) (Android and/or iOS)
- Standard HTML5 [local storage](https://en.wikipedia.org/wiki/Web_storage#localStorage)
- [Realm.io](https://realm.io/)

<!-- END Alternative solutions -->

# Usage

## Self-test functions

To verify that both the Javascript and native part of this plugin are installed in your application:

```js
window.sqlitePlugin.echoTest(successCallback, errorCallback);
```

To verify that this plugin is able to open, populate, read, update, and delete a test database (named `___$$$___litehelpers___$$$___test___$$$___.db`) properly:

```js
window.sqlitePlugin.selfTest(successCallback, errorCallback);
```

**IMPORTANT:** Please wait for the 'deviceready' event (see below for an example).

## General

- Drop-in replacement for HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/): the only change should be to replace the static `window.openDatabase()` factory call with `window.sqlitePlugin.openDatabase()`, with parameters as documented below. (Some known deviations are documented in newer version branches.)
- Single-page application design is recommended.
- In case of a multi-page application the JavaScript used by each page must use `sqlitePlugin.openDatabase` to open the database access handle object before it can access the data.

**NOTE:** If a sqlite statement in a transaction fails with an error, the error handler *must* return `false` in order to recover the transaction. This is correct according to the HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/) standard. This is different from the WebKit implementation of Web SQL in Android and iOS which recovers the transaction if a sql error hander returns a non-`true` value.

## Opening a database

To open a database access handle object (in the **new** default location):

```js
var db = window.sqlitePlugin.openDatabase({name: 'my.db', location: 'default'}, successcb, errorcb);
```

**WARNING:** The new "default" location value is *NOT* the same as the old default location and would break an upgrade for an app that was using the old default value (0) on iOS.

**WARNING 2:** As described above: by default this plugin uses a non-standard [Android-sqlite-connector](https://github.com/liteglue/Android-sqlite-connector) implementation on Android. In case an application access the **same** database using multiple plugins there is a risk of data corruption ref: [litehelpers/Cordova-sqlite-storage#626](https://github.com/litehelpers/Cordova-sqlite-storage/issues/626)) as described in <http://ericsink.com/entries/multiple_sqlite_problem.html> and <https://www.sqlite.org/howtocorrupt.html>. The workaround is to use the `androidDatabaseImplementation: 2` setting as described in the **Android sqlite implementation** section below.

**MAY BE DEPRECATED IN THE FUTURE:** To specify a different location (affects iOS *only*):

```js
var db = window.sqlitePlugin.openDatabase({name: 'my.db', iosDatabaseLocation: 'Library'}, successcb, errorcb);
```

where the `iosDatabaseLocation` option may be set to one of the following choices:
- `default`: `Library/LocalDatabase` subdirectory - *NOT* visible to iTunes and *NOT* backed up by iCloud
- `Library`: `Library` subdirectory - backed up by iCloud, *NOT* visible to iTunes
- `Documents`: `Documents` subdirectory - visible to iTunes and backed up by iCloud

**WARNING:** Again, the new "default" iosDatabaseLocation value is *NOT* the same as the old default location and would break an upgrade for an app using the old default value (0) on iOS.

*ALTERNATIVE (deprecated, may be removed from a future version):*
- `var db = window.sqlitePlugin.openDatabase({name: "my.db", location: 1}, successcb, errorcb);`

with the `location` option set to one the following choices (affects iOS *only*):
- `0` ~~(default)~~: `Documents` - visible to iTunes and backed up by iCloud
- `1`: `Library` - backed up by iCloud, *NOT* visible to iTunes
- `2`: `Library/LocalDatabase` - *NOT* visible to iTunes and *NOT* backed up by iCloud (same as using "default")

No longer supported (see tip below to overwrite `window.openDatabase`): ~~`var db = window.sqlitePlugin.openDatabase("myDatabase.db", "1.0", "Demo", -1);`~~

**IMPORTANT:** Please wait for the 'deviceready' event, as in the following example:

```js
// Wait for Cordova to load
document.addEventListener('deviceready', onDeviceReady, false);

// Cordova is ready
function onDeviceReady() {
  var db = window.sqlitePlugin.openDatabase({name: 'my.db', location: 'default'});
  // ...
}
```

The successcb and errorcb callback parameters are optional but can be extremely helpful in case anything goes wrong. For example:

```js
window.sqlitePlugin.openDatabase({name: 'my.db', location: 'default'}, function(db) {
  db.transaction(function(tx) {
    // ...
  }, function(err) {
    console.log('Open database ERROR: ' + JSON.stringify(err));
  });
});
```

If any sql statements or transactions are attempted on a database object before the openDatabase result is known, they will be queued and will be aborted in case the database cannot be opened.

**DATABASE NAME NOTES:**

- Database file names with slash (`/`) character(s) are not supported and not expected to work.
- Database file names with ASCII control characters such as tab, vertical tab, carriage return, line feed, form feed, and backspace are not supported and do not work on Windows.
- Some other ASCII characters not supported and not working on Windows: `*` `<` `>` `?` `\` `"` `|`
- Database file names with emojis and other 4-octet UTF-8 characters are NOT RECOMMENDED.

**OTHER NOTES:**
- The database file name should include the extension, if desired.
- It is possible to open multiple database access handle objects for the same database.
- The database handle access object can be closed as described below.

**Web SQL replacement tip:**

To overwrite `window.openDatabase`:

```Javascript
window.openDatabase = function(dbname, ignored1, ignored2, ignored3) {
  return window.sqlitePlugin.openDatabase({name: dbname, location: 'default'});
};
```

<!-- NOT SUPPORTED by this version branch:
### Android sqlite implementation

By default, this plugin uses [Android-sqlite-connector](https://github.com/liteglue/Android-sqlite-connector), which is lightweight and should be more efficient than the built-in Android database classes. To use the built-in Android database classes instead:

```js
var db = window.sqlitePlugin.openDatabase({name: "my.db", androidDatabaseImplementation: 2});
```

**IMPORTANT:**
- As described above: by default this plugin uses a non-standard [Android-sqlite-connector](https://github.com/liteglue/Android-sqlite-connector) implementation on Android. In case an application access the **same** database using multiple plugins there is a risk of data corruption ref: [litehelpers/Cordova-sqlite-storage#626](https://github.com/litehelpers/Cordova-sqlite-storage/issues/626)) as described in <http://ericsink.com/entries/multiple_sqlite_problem.html> and <https://www.sqlite.org/howtocorrupt.html>. The workaround is to use the `androidDatabaseImplementation: 2` setting as described here.
- In case of the `androidDatabaseImplementation: 2` setting, [litehelpers/Cordova-sqlite-storage#193](https://github.com/litehelpers/Cordova-sqlite-storage/issues/193) reported that in certain Android versions, if the app is stopped or aborted without closing the database then there is an unexpected database lock and the data that was inserted is lost. The workaround is described below.

### Workaround for Android db locking issue

[litehelpers/Cordova-sqlite-storage#193](https://github.com/litehelpers/Cordova-sqlite-storage/issues/193) reported (as observed by several app developers) that certain versions of the Android database classes, if the app is stopped or aborted without closing the database then:
- (sometimes) there is an unexpected database lock
- the data that was inserted is lost.

The cause of this issue remains unknown. Of interest: [android / platform_external_sqlite commit d4f30d0d15](https://github.com/android/platform_external_sqlite/commit/d4f30d0d1544f8967ee5763c4a1680cb0553039f) which references and includes the sqlite commit at: http://www.sqlite.org/src/info/6c4c2b7dba

This is *not* an issue when default [Android-sqlite-connector](https://github.com/liteglue/Android-sqlite-connector) database implementation.

There is an optional workaround that simply closes and reopens the database file at the end of every transaction that is committed. The workaround is enabled by opening the database with options as follows:

```js
var db = window.sqlitePlugin.openDatabase({
  name: 'my.db',
  location: 'default',
  androidDatabaseImplementation: 2,
  androidLockWorkaround: 1
});
```

**IMPORTANT NOTE:** This workaround is *only* applied when using `db.sqlBatch` or `db.transaction()`, *not* applied when running `executeSql()` on the database object.
 -->

## SQL transactions

The following types of SQL transactions are supported by this version:
- Single-statement transactions
- SQL batch transactions

DEPRECATED, may be removed from this plugin version in the near future:
- Standard asynchronous transactions
- Multi-part transactions

**NOTE:** Transaction requests are kept in one queue per database and executed in sequential order, according to the HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/).

**WARNING:** It is possible to request a SQL statement list such as "SELECT 1; SELECT 2" within a single SQL statement string, however the plugin will only execute the first statement and silently ignore the others. This could result in data loss if such a SQL statement list with any INSERT or UPDATE statement(s) are included. For reference: [litehelpers/Cordova-sqlite-storage#551](https://github.com/litehelpers/Cordova-sqlite-storage/issues/551)

### Single-statement transactions

Sample with INSERT:

```Javascript
db.executeSql('INSERT INTO MyTable VALUES (?)', ['test-value'], function (resultSet) {
  console.log('resultSet.insertId: ' + resultSet.insertId);
  console.log('resultSet.rowsAffected: ' + resultSet.rowsAffected);
}, function(error) {
  console.log('SELECT error: ' + error.message);
});
```

Sample with SELECT:

```Javascript
db.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (resultSet) {
  console.log('got stringlength: ' + resultSet.rows.item(0).stringlength);
}, function(error) {
  console.log('SELECT error: ' + error.message);
});
```

**NOTE/minor bug:** The object returned by `resultSet.rows.item(rowNumber)` is **not** immutable. In addition, multiple calls to `resultSet.rows.item(rowNumber)` with the same `rowNumber` on the same `resultSet` object return the same object. For example, the following code will show `Second uppertext result: ANOTHER`:

```Javascript
db.executeSql("SELECT UPPER('First') AS uppertext", [], function (resultSet) {
  var obj1 = resultSet.rows.item(0);
  obj1.uppertext = 'ANOTHER';
  console.log('Second uppertext result: ' + resultSet.rows.item(0).uppertext);
  console.log('SELECT error: ' + error.message);
});
```

<!-- END Single-statement transactions -->

### SQL batch transactions

Sample:

```Javascript
db.sqlBatch([
  'DROP TABLE IF EXISTS MyTable',
  'CREATE TABLE MyTable (SampleColumn)',
  [ 'INSERT INTO MyTable VALUES (?)', ['test-value'] ],
], function() {
  db.executeSql('SELECT * FROM MyTable', [], function (resultSet) {
    console.log('Sample column value: ' + resultSet.rows.item(0).SampleColumn);
  });
}, function(error) {
  console.log('Populate table error: ' + error.message);
});
```

In case of an error, all changes in a sql batch are automatically discarded using ROLLBACK.

<!-- END SQL batch transactions -->

### Standard asynchronous transactions

**NOTICE:** This API call is deprecated and may be removed in the near future ref: [litehelpers / cordova-sqlite-evplus-legacy-workers-free#5](https://github.com/litehelpers/cordova-sqlite-evplus-legacy-workers-free/issues/5).

Standard asynchronous transactions follow the HTML5/[Web SQL API](http://www.w3.org/TR/webdatabase/) which is very well documented and uses BEGIN and COMMIT or ROLLBACK to keep the transactions failure-safe. Here is a simple example:

```Javascript
db.transaction(function(tx) {
  tx.executeSql('DROP TABLE IF EXISTS MyTable');
  tx.executeSql('CREATE TABLE MyTable (SampleColumn)');
  tx.executeSql('INSERT INTO MyTable VALUES (?)', ['test-value'], function(tx, resultSet) {
    console.log('resultSet.insertId: ' + resultSet.insertId);
    console.log('resultSet.rowsAffected: ' + resultSet.rowsAffected);
  }, function(tx, error) {
    console.log('INSERT error: ' + error.message);
  });
}, function(error) {
  console.log('transaction error: ' + error.message);
}, function() {
  console.log('transaction ok');
});
```

In case of a read-only transaction, it is possible to use `readTransaction` which will not use BEGIN, COMMIT, or ROLLBACK:

```Javascript
db.readTransaction(function(tx) {
  tx.executeSql("SELECT UPPER('Some US-ASCII text') AS uppertext", [], function(tx, resultSet) {
    console.log("resultSet.rows.item(0).uppertext: " + resultSet.rows.item(0).uppertext);
  }, function(tx, error) {
    console.log('SELECT error: ' + error.message);
  });
}, function(error) {
  console.log('transaction error: ' + error.message);
}, function() {
  console.log('transaction ok');
});
```

**NOTICE:** The `tx.executeSql` success and error callbacks should take two parameters (first parameter for the transaction object). This is different from the single-statement success and error callbacks described above.

**WARNING:** It is NOT allowed to execute sql statements on a transaction after it has finished. Here is an example from the **Populating Cordova SQLite storage with the JQuery API post** at <http://www.brodybits.com/cordova/sqlite/api/jquery/2015/10/26/populating-cordova-sqlite-storage-with-the-jquery-api.html>:

```Javascript
  // BROKEN SAMPLE:
  db.executeSql("DROP TABLE IF EXISTS tt");
  db.executeSql("CREATE TABLE tt (data)");

  db.transaction(function(tx) {
    $.ajax({
      url: 'https://api.github.com/users/litehelpers/repos',
      dataType: 'json',
      success: function(res) {
        console.log('Got AJAX response: ' + JSON.stringify(res));
        $.each(res, function(i, item) {
          console.log('REPO NAME: ' + item.name);
          tx.executeSql("INSERT INTO tt values (?)", JSON.stringify(item.name));
        });
      }
    });
  }, function(e) {
    console.log('Transaction error: ' + e.message);
  }, function() {
    // Check results:
    db.executeSql('SELECT COUNT(*) FROM tt', [], function(res) {
      console.log('Check SELECT result: ' + JSON.stringify(res.rows.item(0)));
    });
  });
```

You can find more details and a step-by-step description how to do this right in the **Populating Cordova SQLite storage with the JQuery API** post at: <http://www.brodybits.com/cordova/sqlite/api/jquery/2015/10/26/populating-cordova-sqlite-storage-with-the-jquery-api.html>

**NOTE/minor bug:** Just like the single-statement transaction described above, the object returned by `resultSet.rows.item(rowNumber)` is **not** immutable. In addition, multiple calls to `resultSet.rows.item(rowNumber)` with the same `rowNumber` on the same `resultSet` object return the same object. For example, the following code will show `Second uppertext result: ANOTHER`:

```Javascript
db.readTransaction(function(tx) {
  tx.executeSql("SELECT UPPER('First') AS uppertext", [], function(tx, resultSet) {
    var obj1 = resultSet.rows.item(0);
    obj1.uppertext = 'ANOTHER';
    console.log('Second uppertext result: ' + resultSet.rows.item(0).uppertext);
    console.log('SELECT error: ' + error.message);
  });
});
```

**FUTURE TBD:** It should be possible to get a row result object using `resultSet.rows[rowNumber]`, also in case of a single-statement transaction. This is non-standard but is supported by the Chrome desktop browser.

<!-- END Standard asynchronous transactions -->

### Multi-part transactions

**NOTICE:** This API call is deprecated and may be removed in the near future ref: [litehelpers / cordova-sqlite-evplus-legacy-workers-free#5](https://github.com/litehelpers/cordova-sqlite-evplus-legacy-workers-free/issues/5).

Sample (with success and error callbacks):

```Javascript
var tx = db.beginTransaction();
tx.executeSql("DROP TABLE IF EXISTS mytable");
tx.executeSql("CREATE TABLE mytable (myfield)");

tx.executeSql("INSERT INTO mytable values(?)", ['test value']);
tx.executeSql("SELECT * from mytable", [], function(tx, res) {
  console.log("Got value: " + res.rows.item(0).myfield);
}, function(tx, e) {
  console.log("Ignore unexpected error callback with message: " + e.message);
  return false;
});

tx.end(function() {
  console.log('Optional success callback fired');
}, function(e) {
  console.log("Optional error callback fired with message: " + e.message);
});
```

Sample with abort:

```Javascript
var tx = db.beginTransaction();
tx.executeSql("INSERT INTO mytable values(?)", ['wrong data']);
tx.abort(function() {
  console.log('Optional callback');
});
```

IMPORTANT NOTES:
- In case a `tx.executeSql` call results in an error and it does not have an error callback or the error callback does NOT return `false`, the transaction will be aborted *immediately* with a ROLLBACK ~~upon the `tx.end` call~~.
- **BUG:** If a `tx.executeSql` call results in an error for which there is no error callback, the error callback does NOT return `false`, or the error callback throws an exception, the transaction is silently aborted and no `tx.end` callbacks will be fired.
- When a multi-part transaction is started by the `db.beginTransaction` call, all other transactions are blocked until the multi-part transaction is either completed successfully or aborted (with a ROLLBACK).

## Background processing

The threading model depends on which version is used:
- For Android, one background thread per db;
- for _iOS/macOS_, background processing using a very limited thread pool (only one thread working at a time);
- for Windows, no background processing.

<!-- END Background processing -->

## Sample with PRAGMA feature

Creates a table, adds a single entry, then queries the count to check if the item was inserted as expected. Note that a new transaction is created in the middle of the first callback.

```js
// Wait for Cordova to load
document.addEventListener('deviceready', onDeviceReady, false);

// Cordova is ready
function onDeviceReady() {
  var db = window.sqlitePlugin.openDatabase({name: 'my.db', location: 'default'});

  db.transaction(function(tx) {
    tx.executeSql('DROP TABLE IF EXISTS test_table');
    tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data text, data_num integer)');

    // demonstrate PRAGMA:
    db.executeSql("pragma table_info (test_table);", [], function(res) {
      console.log("PRAGMA res: " + JSON.stringify(res));
    });

    tx.executeSql("INSERT INTO test_table (data, data_num) VALUES (?,?)", ["test", 100], function(tx, res) {
      console.log("insertId: " + res.insertId + " -- probably 1");
      console.log("rowsAffected: " + res.rowsAffected + " -- should be 1");

      db.transaction(function(tx) {
        tx.executeSql("select count(id) as cnt from test_table;", [], function(tx, res) {
          console.log("res.rows.length: " + res.rows.length + " -- should be 1");
          console.log("res.rows.item(0).cnt: " + res.rows.item(0).cnt + " -- should be 1");
        });
      });

    }, function(e) {
      console.log("ERROR: " + e.message);
    });
  });
}
```

**NOTE:** PRAGMA statements must be executed in `executeSql()` on the database object (i.e. `db.executeSql()`) and NOT within a transaction.

<!-- END Sample with PRAGMA feature -->

## Sample with transaction-level nesting

In this case, the same transaction in the first executeSql() callback is being reused to run executeSql() again.

```js
// Wait for Cordova to load
document.addEventListener('deviceready', onDeviceReady, false);

// Cordova is ready
function onDeviceReady() {
  var db = window.sqlitePlugin.openDatabase({name: 'my.db', location: 'default'});

  db.transaction(function(tx) {
    tx.executeSql('DROP TABLE IF EXISTS test_table');
    tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data text, data_num integer)');

    tx.executeSql("INSERT INTO test_table (data, data_num) VALUES (?,?)", ["test", 100], function(tx, res) {
      console.log("insertId: " + res.insertId + " -- probably 1");
      console.log("rowsAffected: " + res.rowsAffected + " -- should be 1");

      tx.executeSql("select count(id) as cnt from test_table;", [], function(tx, res) {
        console.log("res.rows.length: " + res.rows.length + " -- should be 1");
        console.log("res.rows.item(0).cnt: " + res.rows.item(0).cnt + " -- should be 1");
      });

    }, function(tx, e) {
      console.log("ERROR: " + e.message);
    });
  });
}
```

This case will also works with Safari (WebKit), assuming you replace `window.sqlitePlugin.openDatabase` with `window.openDatabase`.

<!-- END Sample with transaction-level nesting -->

## Close a database object

DEPRECATED and subject to removal from this plugin version:

This will invalidate **all** handle access handle objects for the database that is closed:

```js
db.close(successcb, errorcb);
```

It is OK to close the database within a transaction callback but *NOT* within a statement callback. The following example is OK:

```Javascript
db.transaction(function(tx) {
  tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function(tx, res) {
    console.log('got stringlength: ' + res.rows.item(0).stringlength);
  });
}, function(error) {
  // OK to close here:
  console.log('transaction error: ' + error.message);
  db.close();
}, function() {
  // OK to close here:
  console.log('transaction ok');
  db.close(function() {
    console.log('database is closed ok');
  });
});
```

The following example is NOT OK:

```Javascript
// BROKEN:
db.transaction(function(tx) {
  tx.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function(tx, res) {
    console.log('got stringlength: ' + res.rows.item(0).stringlength);
    // BROKEN - this will trigger the error callback:
    db.close(function() {
      console.log('database is closed ok');
    }, function(error) {
      console.log('ERROR closing database');
    });
  });
});
```

**BUG:** It is currently NOT possible to close a database in a `db.executeSql` callback. For example:

```Javascript
// BROKEN DUE TO BUG:
db.executeSql("SELECT LENGTH('tenletters') AS stringlength", [], function (res) {
  var stringlength = res.rows.item(0).stringlength;
  console.log('got stringlength: ' + res.rows.item(0).stringlength);

  // BROKEN - this will trigger the error callback DUE TO BUG:
  db.close(function() {
    console.log('database is closed ok');
  }, function(error) {
    console.log('ERROR closing database');
  });
});
```

**SECOND BUG:** When a database connection is closed, any queued transactions are left hanging. All pending transactions should be errored when a database connection is closed.

**NOTE:** As described above, if multiple database access handle objects are opened for the same database and one database handle access object is closed, the database is no longer available for the other database handle objects. Possible workarounds:
- It is still possible to open one or more new database handle objects on a database that has been closed.
- It *should* be OK not to explicitly close a database handle since database transactions are [ACID](https://en.wikipedia.org/wiki/ACID) compliant and the app's memory resources are cleaned up by the system upon termination.

**FUTURE TBD:** `dispose` method on the database access handle object, such that a database is closed once **all** access handle objects are disposed.

<!-- END Close a database object -->

## Delete a database

DEPRECATED and subject to removal from this plugin version:

```js
window.sqlitePlugin.deleteDatabase({name: 'my.db', location: 'default'}, successcb, errorcb);
```

with `location` or `iosDatabaseLocation` parameter *required* as described above for `openDatabase` (affects iOS/macOS *only*)

**BUG:** When a database is deleted, any queued transactions for that database are left hanging. TODO: All pending transactions should be errored when a database is deleted.

<!-- END Delete a database -->

## Database schema versions

The transactional nature of the API makes it relatively straightforward to manage a database schema that may be upgraded over time (adding new columns or new tables, for example). Here is the recommended procedure to follow upon app startup:
- Check your database schema version number (you can use `db.executeSql` since it should be a very simple query)
- If your database needs to be upgraded, do the following *within a single transaction* to be failure-safe:
  - Create your database schema version table (single row single column) if it does not exist (you can check the `sqlite_master` table as described at: http://stackoverflow.com/questions/1601151/how-do-i-check-in-sqlite-whether-a-table-exists)
  - Add any missing columns and tables, and apply any other changes necessary

**IMPORTANT:** Since we cannot be certain when the users will actually update their apps, old schema versions will have to be supported for a very long time.

<!-- END Database schema versions -->

## Use with Ionic/ngCordova/Angular

### Ionic 2

Tutorials with Ionic 2:
- <https://www.thepolyglotdeveloper.com/2016/08/using-sqlstorage-instead-sqlite-ionic-2-app/> (title is somewhat misleading, "SQL storage" *does* use this sqlite plugin)
- <https://www.thepolyglotdeveloper.com/2015/12/use-sqlite-in-ionic-2-instead-of-local-storage/> (older tutorial)

Sample for Ionic 2 wanted ref: [litehelpers/Cordova-sqlite-storage#585](https://github.com/litehelpers/Cordova-sqlite-storage/issues/585)

### Ionic 1

Tutorial with Ionic 1: <https://blog.nraboy.com/2014/11/use-sqlite-instead-local-storage-ionic-framework/>

A sample for Ionic 1 is provided at: [litehelpers / Ionic-sqlite-database-example](https://github.com/litehelpers/Ionic-sqlite-database-example)

Documentation at: <http://ngcordova.com/docs/plugins/sqlite/>

Other resource (apparently for Ionic 1): <https://www.packtpub.com/books/content/how-use-sqlite-ionic-store-data>

**NOTE:** Some Ionic and other Angular pitfalls are described above.

<!-- END Use with Ionic/ngCordova/Angular -->

# Installing

## Easy install with Cordova CLI tool

    npm install -g cordova # (in case you don't have cordova)
    cordova create MyProjectFolder com.my.project MyProject && cd MyProjectFolder # if you are just starting
    cordova plugin add https://github.com/litehelpers/cordova-sqlite-evplus-legacy-workers-free

**CLI NOTES:**

- You *may* have to update the platform and plugin version(s) before you can build: `cordova prepare` (or for a specific platform such as iOS: `cordova prepare ios`)
- If you cannot build for a platform after `cordova prepare`, you may have to remove the platform and add it again, such as:

```shell
cordova platform rm ios
cordova platform add ios
```

or more drastically:

```shell
rm -rf platforms
cordova platform add ios
```

<!-- END Easy installation with Cordova CLI tool -->

## Source tree

- `SQLitePlugin.coffee.md`: platform-independent (Literate coffee-script, can be read by recent coffee-script compiler)
- `src`: platform-specific source code:
   - `common` - sqlcipher version of `sqlite3.[hc]` to be built for iOS ~~and Windows "Universal" (8.1/XX)~~
   - `external` - placeholder for external dependencies - *not required in this version*
   - `android` - Java plugin code for Android
   - `ios` - Objective-C plugin code for iOS
   - `www` - `SQLitePluginHelper.js` to provide Cordova `exec` access for `SQLitePlugin.js`
- `sample-worker`: Sample application with web workers support integrated as described above
- `spec`: test suite using Jasmine (2.2.0), ported from QUnit `test-www` test suite, working on all platforms
- `tests`: very simple Jasmine test suite that is run on Circle CI (Android version) and Travis CI (iOS version)
- `www`: `SQLitePlugin.js` platform-independent Javascript as generated from `SQLitePlugin.coffee.md` (and checked in!)

## Installation test

### Easy installation test

Use `window.sqlitePlugin.echoTest` and/or `window.sqlitePlugin.selfTest` as described above (please wait for the `deviceready` event).

### Quick installation test

Assuming your app has a recent template as used by the Cordova create script, add the following code to the `onDeviceReady` function, after `app.receivedEvent('deviceready');`:

```Javascript
  window.sqlitePlugin.openDatabase({ name: 'hello-world.db', location: 'default' }, function (db) {
    db.executeSql("select length('tenletters') as stringlength", [], function (res) {
      var stringlength = res.rows.item(0).stringlength;
      console.log('got stringlength: ' + stringlength);
      document.getElementById('deviceready').querySelector('.received').innerHTML = 'stringlength: ' + stringlength;
   });
  });
```

<!-- END Installation test -->

# Support

## Policy

Free support is provided on a best-effort basis and is only available in public forums. Please follow the steps below to be sure you have done your best before requesting help.

Commercial support is available by contacting: <sales@litehelpers.net>

## Before asking for help

First steps:
- Verify that you have followed the steps in [brodybits / Cordova-quick-start-checklist](https://github.com/brodybits/Cordova-quick-start-checklist)
- Try the new self-test functions as described above
- Check the troubleshooting steps and pitfalls in [brodybits / Avoiding-some-Cordova-pitfalls](https://github.com/brodybits/Avoiding-some-Cordova-pitfalls) for possible troubleshooting

and check the following:
- You are using the latest version of the Plugin (Javascript and platform-specific part) from this repository.
- The plugin is installed correctly.
- You have included the correct version of `cordova.js`.
- You have registered the plugin properly in `config.xml`.

If you still cannot get something to work:
- create a fresh, clean Cordova project;
- add this plugin according to the instructions above;
- double-check that you follwed the steps in [brodybits / Cordova-quick-start-checklist](https://github.com/brodybits/Cordova-quick-start-checklist);
- try a simple test program;
- double-check the pitfalls in [brodybits / Avoiding-some-Cordova-pitfalls](https://github.com/brodybits/Avoiding-some-Cordova-pitfalls)

If you continue to see the issue in the fresh, clean Cordova project:
- Make the simplest test program you can to demonstrate the issue, including the following characteristics:
  - it completely self-contained, i.e. it is using no extra libraries beyond cordova & SQLitePlugin.js;
  - if the issue is with *adding* data to a table, that the test program includes the statements you used to open the database and create the table;
  - if the issue is with *retrieving* data from a table, that the test program includes the statements you used to open the database, create the table, and enter the data you are trying to retrieve.

Then you can [raise the new issue](https://github.com/litehelpers/Cordova-sqlite-evplus-legacy-workers-free/issues/new).

## Commercial support

_<sales@litehelpers.net>_

## What will be supported for free

Please make a small, self-contained test program that can demonstrate your problem and post it. Please do not use any other plugins or frameworks than are absolutely necessary to demonstrate your problem.

In case of a problem with a pre-populated database, please post your entire project.

## Support for issues with Angular/"ngCordova"/Ionic

Free support for issues with Angular/"ngCordova"/Ionic will only be provided if you can demonstrate that you can do the same thing without such a framework.
- Make a fresh, clean ngCordova or Ionic project with a test program that demonstrates the issue and post it. Please do not use any other plugins or frameworks unless absolutely necessary to demonstrate your issue.
- Make another project without any form of Angular including ngCordova or Ionic, with the same test program to show that it will work outside Angular/"ngCordova"/Ionic.

## What information is needed for help

Please include the following:
- Which platform(s) _(Android/iOS/macOS/Windows 8.1/Windows Phone 8.1/Windows 10)_
- Clear description of the issue
- A small, complete, self-contained program that demonstrates the problem, preferably as a Github project. ZIP/TGZ/BZ2 archive available from a public link is OK. No RAR or other such formats please!
- A Cordova project is highly preferred. Intel, MS IDE, or similar project formats should be avoided.

## Please do NOT use any of these formats

- screen casts or videos
- RAR or similar archive formats
- Intel, MS IDE, or similar project formats unless absolutely necessary

## Where to ask for help

Once you have followed the directions above, you may request free support in the following location(s):
- [litehelpers / Cordova-sqlite-evplus-legacy-workers-free / issues](https://github.com/litehelpers/Cordova-sqlite-evplus-legacy-workers-free/issues) can help improve the quality of this plugin.

Please include the information described above otherwise.

## Professional support

Professional support is available, please contact: <sales@litehelpers.net>

# Unit tests

Unit testing is done in `spec`.

## running tests from shell

To run the tests from \*nix shell, simply do either:

    ./bin/test.sh ios

or for Android:

    ./bin/test.sh android

To run from a windows powershell (here is a sample for android target):

    .\bin\test.ps1 android

<!-- END Unit tests -->

# Adapters

WARNING: these adapters are not tested, not supported with web workers.

## Lawnchair Adapter

- [litehelpers / cordova-sqlite-lawnchair-adapter](https://github.com/litehelpers/cordova-sqlite-lawnchair-adapter)

## PouchDB

- [nolanlawson / pouchdb-adapter-cordova-sqlite](https://github.com/nolanlawson/pouchdb-adapter-cordova-sqlite)

# Contributing

## Community

- Testimonials of apps that are using this plugin would be especially helpful.
- Reporting issues at [litehelpers / Cordova-sqlite-evplus-legacy-workers-free / issues](https://github.com/litehelpers/Cordova-sqlite-evplus-legacy-workers-free/issues) can help improve the quality of this plugin.

**NOTE:** As stated above, patches will *NOT* be accepted on this project due to potential licensing issues. Issues with reproduction scenarios will help maintain and improve the quality of this plugin for future users.

<!-- END Contributing -->

# External sources

- https://github.com/liteglue/Android-sqlite-connector
- https://github.com/liteglue/Android-sqlite-native-driver

## Contact

<sales@litehelpers.net>
