/*
 * Copyright (c) 2012-2015: Christopher J. Brody (aka Chris Brody)
 * Copyright (C) 2011 Davide Bertola
 *
 * License for this version: GPL v3 (http://www.gnu.org/licenses/gpl.txt) or commercial license.
 * Contact for commercial license: info@litehelpers.net
 */

#import <Cordova/CDVPlugin.h>

// Used to remove dependency on sqlite3.h in this header:
struct sqlite3;

enum WebSQLError {
    UNKNOWN_ERR = 0,
    DATABASE_ERR = 1,
    VERSION_ERR = 2,
    TOO_LARGE_ERR = 3,
    QUOTA_ERR = 4,
    SYNTAX_ERR = 5,
    CONSTRAINT_ERR = 6,
    TIMEOUT_ERR = 7
};
typedef int WebSQLError;

@interface SQLitePlugin : CDVPlugin {
    NSMutableDictionary *openDBs;
}

@property (nonatomic, copy) NSMutableDictionary *openDBs;
@property (nonatomic, copy) NSMutableDictionary *appDBPaths;

//-(void) openaq: (NSString *) name;

//-(void) open_dict: (NSDictionary *) dict;
//-(void) sql_batch_dict: (NSDictionary *) dict;

-(void) open_dict: (NSDictionary *) dict cbHandler: (NSString *) cbHandler cbId: (NSString *) cbid;

- (void) batch_start:(NSDictionary *)options;
- (void) batch_part:(NSDictionary *)options;
- (void) batch_run: (NSDictionary *) dict cbHandler: (NSString *) cbHandler cbId: (NSString *) cbid;

-(void) sql_batch_dict: (NSDictionary *) dict cbHandler: (NSString *) cbHandler cbId: (NSString *) cbid;

// Open / Close / Delete
-(void) open: (CDVInvokedUrlCommand*)command;
-(void) close: (CDVInvokedUrlCommand*)command;
-(void) delete: (CDVInvokedUrlCommand*)command;

// Batch processing interface
-(void) backgroundExecuteSqlBatch: (CDVInvokedUrlCommand*)command;
-(void) executeSqlBatch: (CDVInvokedUrlCommand*)command;

@end /* vim: set expandtab : */
