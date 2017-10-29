# Changes

## 0.8.3-pre2

- Dispatch result for worker in main thread, needed for macOS ("osx") platform; support macOS ("osx") in this version branch
- Open database in the next event tick

## 0.8.2

- Fix sqlitePlugin.openDatabase and sqlitePlugin.deleteDatabase to check location/iosDatabaseLocation values
- Fix sqlitePlugin.deleteDatabase to check that db name is really a string (prevents possible crash on iOS)
- Support location: 'default' setting in openDatabase & deleteDatabase
- More explicit iosDatabaseLocation option
- iOS database location is now mandatory

## 0.8.1-pre

- Same version of SQLitePlugin.js working in both main thread and worker thread(s)
- Fix iOS version to work in main thread using Cordova again
- Fix conversion warnings in iOS version
- Fix readTransaction to skip BEGIN/COMMIT/ROLLBACK
