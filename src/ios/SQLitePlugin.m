/*
 * Copyright (c) 2012-2016: Christopher J. Brody (aka Chris Brody)
 * Copyright (C) 2011 Davide Bertola
 *
 * License for this version: GPL v3 (http://www.gnu.org/licenses/gpl.txt) or commercial license.
 * Contact for commercial license: info@litehelpers.net
 */

#import "SQLitePlugin.h"

#import "sqlite3.h"

static SQLitePlugin * plugin = NULL;

#ifdef USE_MACOS_WEBVIEW
static WebView * webView = NULL;
#else
static UIWebView * webView = NULL;
#endif

static NSMutableDictionary * batchmap = NULL;

@interface AQSURLProtocol: NSURLProtocol

@end


@implementation AQSURLProtocol

+ (BOOL) canInitWithRequest:(NSURLRequest *)request {
    // XXX TBD is this really the most efficient possible?
    //NSLog(@"got uri: %@", request.URL.absoluteString);
    if ([request.URL.absoluteString hasPrefix:@"file:///aqaq"]) {
        NSString * req = request.URL.absoluteString;
        NSArray * topComponents = [req componentsSeparatedByString: @"#"];

        if ([topComponents count] < 2) {
            NSLog(@"SORRY missing # in URI: %@", req);
            return NO;
        }

        NSString * handleString = [topComponents objectAtIndex: 1];
        NSArray * handleComponents = [handleString componentsSeparatedByString: @"?"];
        if ([handleComponents count] < 2) {
            NSLog(@"SORRY missing ? in URI: %@", req);
            return NO;
        }

        NSString * parameters = [handleComponents objectAtIndex: 1];
        NSString * json = [parameters stringByReplacingPercentEscapesUsingEncoding:NSUTF8StringEncoding];
        //NSLog(@"req json: %@", json);

        NSArray * routeComponents = [[handleComponents objectAtIndex: 0] componentsSeparatedByString: @":"];
        if ([routeComponents count] < 2) {
            NSLog(@"SORRY missing : in URI: %@", req);
            return NO;
        }

        NSArray * routeParamComponents = [[routeComponents objectAtIndex: 1] componentsSeparatedByString: @"$"];
        if ([routeParamComponents count] < 2) {
            NSLog(@"SORRY missing $ in URI: %@", req);
            return NO;
        }

        NSString * method = [routeParamComponents objectAtIndex: 0];

        NSArray * internalComponents = [[routeParamComponents objectAtIndex: 1] componentsSeparatedByString: @"@"];
        if ([internalComponents count] < 2) {
            NSLog(@"SORRY missing @ in URI: %@", req);
            return NO;
        }

        NSArray * cbComponents = [[internalComponents objectAtIndex: 0] componentsSeparatedByString: @"-"];
        if ([cbComponents count] < 2) {
            NSLog(@"SORRY missing - in URI: %@", req);
            return NO;
        }


        // XXX SECURITY TODO: use code parameter to check a security code, like they do in the Cordova framework
        //NSString * code = [internalComponents objectAtIndex: 1];
        // ...

        NSError * e = nil;
        NSArray * a = [NSJSONSerialization JSONObjectWithData:[json dataUsingEncoding: NSUTF8StringEncoding] options:kNilOptions error: &e];
        //NSLog(@"req array length: %lu", [a count]);

        NSDictionary * d = [a objectAtIndex:0];
        if ([method isEqualToString:@"open"])
            [plugin open_dict:d cbHandler: [cbComponents objectAtIndex: 0] cbId: [cbComponents objectAtIndex: 1]];
        else if ([method isEqualToString:@"backgroundExecuteSqlBatch"])
            [plugin sql_batch_dict:d cbHandler: [cbComponents objectAtIndex: 0] cbId: [cbComponents objectAtIndex: 1]];
        else if ([method isEqualToString: @"batchStart"])
            [plugin batch_start: d];
        else if ([method isEqualToString: @"batchPart"])
            [plugin batch_part: d];
        else if ([method isEqualToString: @"batchRun"])
            [plugin batch_run: d cbHandler: [cbComponents objectAtIndex: 0] cbId: [cbComponents objectAtIndex: 1]];

/* FUTURE TBD:
        AQHandler * handler = [AQManager getHandlerFor:[routeComponents objectAtIndex:0]];
        if (handler != nil) {
            [handler handleMessage: me withParameters: parameters];
        }
*/
        // NEEDED to prevent ugly error messages in Web Inspector console:
        return YES;
    }
    return NO;
}

+ (NSURLRequest *) canonicalRequestForRequest:(NSURLRequest *)request {
    return request;
}

- (void) startLoading {
    //NSLog(@"start loading");
}

- (void) stopLoading {
    //NSLog(@"stop loading");
}

@end


@implementation SQLitePlugin

@synthesize openDBs;
@synthesize appDBPaths;

-(void)pluginInitialize
{
    NSLog(@"Initializing SQLitePlugin");

    plugin = self;
    batchmap = [NSMutableDictionary dictionaryWithCapacity: 0];

    webView = self.webView;
    [NSURLProtocol registerClass: [AQSURLProtocol class]];

    {
        openDBs = [NSMutableDictionary dictionaryWithCapacity:0];
        appDBPaths = [NSMutableDictionary dictionaryWithCapacity:0];
#if !__has_feature(objc_arc)
        [openDBs retain];
        [appDBPaths retain];
#endif

        NSString *docs = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) objectAtIndex: 0];
        NSLog(@"Detected docs path: %@", docs);
        [appDBPaths setObject: docs forKey:@"docs"];

        NSString *libs = [NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES) objectAtIndex: 0];
        NSLog(@"Detected Library path: %@", libs);
        [appDBPaths setObject: libs forKey:@"libs"];

        NSString *nosync = [libs stringByAppendingPathComponent:@"LocalDatabase"];
        NSError *err;
        if ([[NSFileManager defaultManager] fileExistsAtPath: nosync])
        {
            NSLog(@"no cloud sync at path: %@", nosync);
            [appDBPaths setObject: nosync forKey:@"nosync"];
        }
        else
        {
            if ([[NSFileManager defaultManager] createDirectoryAtPath: nosync withIntermediateDirectories:NO attributes: nil error:&err])
            {
                NSURL *nosyncURL = [ NSURL fileURLWithPath: nosync];
                if (![nosyncURL setResourceValue: [NSNumber numberWithBool: YES] forKey: NSURLIsExcludedFromBackupKey error: &err])
                {
                    NSLog(@"IGNORED: error setting nobackup flag in LocalDatabase directory: %@", err);
                }
                NSLog(@"no cloud sync at path: %@", nosync);
                [appDBPaths setObject: nosync forKey:@"nosync"];
            }
            else
            {
                // fallback:
                NSLog(@"WARNING: error adding LocalDatabase directory: %@", err);
                [appDBPaths setObject: libs forKey:@"nosync"];
            }
        }
    }
}

-(id) getDBPath:(NSString *)dbFile at:(NSString *)atkey {
    if (dbFile == NULL) {
        return NULL;
    }

    NSString *dbdir = [appDBPaths objectForKey:atkey];
    NSString *dbPath = [dbdir stringByAppendingPathComponent: dbFile];
    return dbPath;
}

-(void)open: (CDVInvokedUrlCommand*)command
{
    NSMutableDictionary *options = [command.arguments objectAtIndex:0];

    // expected to be NSString:
    NSString * res = [self openWithOptions: options];

    // XXX TODO fix error handling:
    CDVPluginResult * pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString: res];

    [self.commandDelegate sendPluginResult:pluginResult callbackId: command.callbackId];
}

- (void) open_dict: (NSDictionary *) dict cbHandler: (NSString *) cbHandler cbId: (NSString *) cbid
{
    // expected to be NSString:
    NSObject * res = [self openWithOptions: dict];

    // XXX TODO fix error handling
    NSString * myScript = [NSString stringWithFormat:@"%@['%@']('%@?%@');", @"$AQCB", cbHandler, cbid, res];

    [self dispatch_aqcb: cbHandler cbId: cbid res: res];
}

- (id) openWithOptions: (NSDictionary *) options
{
    NSString *dbfilename = [options objectForKey:@"name"];

    NSString *dblocation = [options objectForKey:@"dblocation"];
    if (dblocation == NULL) dblocation = @"docs";
    //NSLog(@"using db location: %@", dblocation);

    NSString *dbname = [self getDBPath:dbfilename at:dblocation];
    //NSLog(@"got dbname", dbname);

    if (dbname == NULL) {
        NSLog(@"No db name specified for open");

        //pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:@"You must specify database name"];
        return @"ERROR";
    }
    else {
        NSValue *dbPointer = [openDBs objectForKey:dbfilename];

        if (dbPointer != NULL) {
            NSLog(@"Reusing existing database connection for db name %@", dbfilename);

            //pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:@"Database opened"];
            return @"a1";
        } else {
            const char *name = [dbname UTF8String];
            sqlite3 *db;

            NSLog(@"open full db path: %@", dbname);

            if (sqlite3_open(name, &db) != SQLITE_OK) {
                NSLog(@"open db ERROR");
                //pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Unable to open DB"];
                return @"ERROR";
            } else {
                // for SQLCipher version:
                // NSString *dbkey = [options objectForKey:@"key"];
                // const char *key = NULL;
                // if (dbkey != NULL) key = [dbkey UTF8String];
                // if (key != NULL) sqlite3_key(db, key, strlen(key));

                // Attempt to read the SQLite master table [to support SQLCipher version]:
                if(sqlite3_exec(db, (const char*)"SELECT count(*) FROM sqlite_master;", NULL, NULL, NULL) == SQLITE_OK) {
                    dbPointer = [NSValue valueWithPointer:db];
                    [openDBs setObject: dbPointer forKey: dbfilename];
                    //pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:@"a1"];
                    return @"a1";
                } else {
                    //pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Unable to open DB with key"];

                    // XXX TODO: close the db handle & [perhaps] remove from openDBs!!

                    return @"ERROR";
                }
            }
        }
    }

#if 0 // XXX FUTURE TBD check:
    if (sqlite3_threadsafe()) {
        NSLog(@"Good news: SQLite is thread safe!");
    }
    else {
        NSLog(@"Warning: SQLite is not thread safe.");
    }

    //[self.commandDelegate sendPluginResult:pluginResult callbackId: command.callbackId];

    // NSLog(@"open cb finished ok");
#endif
}


-(void) close: (CDVInvokedUrlCommand*)command
{
    CDVPluginResult* pluginResult = nil;
    NSMutableDictionary *options = [command.arguments objectAtIndex:0];

    NSString *dbFileName = [options objectForKey:@"path"];

    if (dbFileName == NULL) {
        // Should not happen:
        NSLog(@"No db name specified for close");
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"You must specify database path"];
    } else {
        NSValue *val = [openDBs objectForKey:dbFileName];
        sqlite3 *db = [val pointerValue];

        if (db == NULL) {
            // Should not happen:
            NSLog(@"close: db name was not open: %@", dbFileName);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Specified db was not open"];
        }
        else {
            NSLog(@"close db name: %@", dbFileName);
            sqlite3_close (db);
            [openDBs removeObjectForKey:dbFileName];
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:@"DB closed"];
        }
    }

    [self.commandDelegate sendPluginResult:pluginResult callbackId: command.callbackId];
}

-(void) delete: (CDVInvokedUrlCommand*)command
{
    CDVPluginResult* pluginResult = nil;
    NSMutableDictionary *options = [command.arguments objectAtIndex:0];

    NSString *dbFileName = [options objectForKey:@"path"];

    NSString *dblocation = [options objectForKey:@"dblocation"];
    if (dblocation == NULL) dblocation = @"docs";

    if (dbFileName==NULL) {
        // Should not happen:
        NSLog(@"No db name specified for delete");
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"You must specify database path"];
    } else {
        NSString *dbPath = [self getDBPath:dbFileName at:dblocation];

        if ([[NSFileManager defaultManager]fileExistsAtPath:dbPath]) {
            NSLog(@"delete full db path: %@", dbPath);
            [[NSFileManager defaultManager]removeItemAtPath:dbPath error:nil];
            [openDBs removeObjectForKey:dbFileName];
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:@"DB deleted"];
        } else {
            NSLog(@"delete: db was not found: %@", dbPath);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"The database does not exist on that path"];
        }
    }
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}


-(void) backgroundExecuteSqlBatch: (CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        [self executeSqlBatch: command];
    }];
}

- (void) batch_start:(NSDictionary *)options
{
    NSMutableDictionary *dbargs = [options objectForKey:@"dbargs"];
    NSString * batchid = [options objectForKey: @"batchid"];
    NSNumber *flen = [options objectForKey:@"flen"];

    NSString *dbFileName = [dbargs objectForKey:@"dbname"];
    NSMutableDictionary * d1 = [NSMutableDictionary dictionaryWithCapacity: 0];
    [d1 setObject: dbFileName forKey: @"dbname"];
    [d1 setObject: batchid forKey: @"batchid"];
    [d1 setObject: flen forKey: @"flen"];

    NSMutableArray * flatlist = [NSMutableArray arrayWithCapacity: 0];
    [d1 setObject: flatlist forKey: @"flatlist"];

    [batchmap setObject: d1 forKey: batchid];
}

- (void) batch_part: (NSDictionary *)options
{
    NSString * batchid = [options objectForKey: @"batchid"];
    NSMutableArray * part = [options objectForKey: @"part"];
    //NSLog(@"part for batch id %@ dbname %@", batchid, [[batchmap objectForKey: batchid] objectForKey: @"dbname"]);

    NSMutableDictionary * b2 = [batchmap objectForKey: batchid];
    NSMutableArray * flatlist = [b2 objectForKey: @"flatlist"];
    long pl = [part count];
    for (int ii2=0; ii2<pl; ++ii2)
        [flatlist addObject: [part objectAtIndex: ii2]];
}

- (void) batch_run: (NSDictionary *) options cbHandler: (NSString *) cbHandler cbId: (NSString *) cbid
{
    NSString * batchid = [options objectForKey: @"batchid"];
    NSMutableDictionary * b3 = [batchmap objectForKey: batchid];
    [batchmap removeObjectForKey: batchid];
    NSString * dbFileName = [b3 objectForKey: @"dbname"];
    NSMutableArray * flatlist = [b3 objectForKey: @"flatlist"];

    NSMutableDictionary * dbargs = [NSMutableDictionary dictionaryWithCapacity:0];
    [dbargs setObject: dbFileName forKey: @"dbname"];
    NSMutableDictionary * o2 = [NSMutableDictionary dictionaryWithCapacity:0];
    [o2 setObject: dbargs forKey:@"dbargs"];
    [o2 setObject: [b3 objectForKey: @"flen"] forKey: @"flen"];
    [o2 setObject: flatlist forKey: @"flatlist"];

    [self sql_batch_dict: o2 cbHandler: cbHandler cbId: cbid];
}

-(void) executeSqlBatch: (CDVInvokedUrlCommand*)command
{
    NSMutableDictionary *options = [command.arguments objectAtIndex:0];

    // expected to be NSMutableArray:
    NSMutableArray * results = [self sqlBatchWithOptions: options];

    CDVPluginResult * pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:results];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void) sql_batch_dict:(NSDictionary *) dict cbHandler: (NSString *) cbHandler cbId: (NSString *) cbid
{
    // expected to be NSMutableArray:
    NSMutableArray * results = [self sqlBatchWithOptions: dict];

    NSError * e = nil;
    NSData * da = [NSJSONSerialization dataWithJSONObject:results options:kNilOptions error:&e];
    NSString * r = [[NSString alloc] initWithData:da encoding:NSUTF8StringEncoding];
    //NSLog(@"res string: %@", r);

    NSString * ur = [r stringByAddingPercentEncodingWithAllowedCharacters: [NSCharacterSet URLHostAllowedCharacterSet ]];
    // NSLog(@"encoded res: %@", ur);

    [self dispatch_aqcb: cbHandler cbId: cbid res: ur];
}

- (id) sqlBatchWithOptions: (NSDictionary *) options
{
    NSMutableArray *results = [NSMutableArray arrayWithCapacity:0];
    NSMutableDictionary *dbargs = [options objectForKey:@"dbargs"];
    NSNumber *flen = [options objectForKey:@"flen"];
    NSMutableArray *flatlist = [options objectForKey:@"flatlist"];
    int sc = [flen integerValue];

    NSString *dbFileName = [dbargs objectForKey:@"dbname"];

    int ai = 0;

    @synchronized(self) {
        for (int i=0; i<sc; ++i) {
            NSString *sql = [flatlist objectAtIndex:(ai++)];
            NSNumber *pc = [flatlist objectAtIndex:(ai++)];
            int params_count = [pc integerValue];

            [self executeSql:sql withParams:flatlist first:ai count:params_count onDatabaseName:dbFileName results:results];
            ai += params_count;
        }
    }

    return results;
}

-(void)executeSql: (NSString*)sql withParams: (NSMutableArray*)params first: (int)first count:(int)params_count onDatabaseName: (NSString*)dbFileName results: (NSMutableArray*)results
{
#if 0 // XXX TODO check in executeSqlBatch: [should NEVER occur]:
    if (dbFileName == NULL) {
        return [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"You must specify database path"];
    }
#endif

    NSValue *dbPointer = [openDBs objectForKey:dbFileName];

#if 0 // XXX TODO check in executeSqlBatch: [should NEVER occur]:
    if (dbPointer == NULL) {
        return [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"No such database, you must open it first"];
    }
#endif

    sqlite3 *db = [dbPointer pointerValue];

    const char *sql_stmt = [sql UTF8String];
    NSDictionary *error = nil;
    sqlite3_stmt *statement;
    int result, i, column_type, count;
    int previousRowsAffected, nowRowsAffected, diffRowsAffected;
    long long nowInsertId;
    BOOL keepGoing = YES;
    BOOL hasInsertId;

    NSMutableArray *resultRows = [NSMutableArray arrayWithCapacity:0];
    NSMutableDictionary *entry;
    NSObject *columnValue;
    NSString *columnName;
    NSObject *insertId;
    NSObject *rowsAffected;

    hasInsertId = NO;
    previousRowsAffected = sqlite3_total_changes(db);

    if (sqlite3_prepare_v2(db, sql_stmt, -1, &statement, NULL) != SQLITE_OK) {
        error = [SQLitePlugin captureSQLiteErrorFromDb:db];
        keepGoing = NO;
    } else if (params != NULL) {
        for (int b = 0; b < params_count; b++) {
            [self bindStatement:statement withArg:[params objectAtIndex:(first+b)] atIndex:(b+1)];
        }
    }

    BOOL hasRows = NO;

    while (keepGoing) {
        result = sqlite3_step (statement);
        switch (result) {

            case SQLITE_ROW:
                if (!hasRows) [results addObject:@"okrows"];
                hasRows = YES;
                i = 0;
                entry = [NSMutableDictionary dictionaryWithCapacity:0];
                count = sqlite3_column_count(statement);

                [results addObject:[NSNumber numberWithInt:count]];

                while (i < count) {
                    columnValue = nil;
                    columnName = [NSString stringWithFormat:@"%s", sqlite3_column_name(statement, i)];

                    [results addObject:columnName];

                    column_type = sqlite3_column_type(statement, i);
                    switch (column_type) {
                        case SQLITE_INTEGER:
                            columnValue = [NSNumber numberWithLongLong: sqlite3_column_int64(statement, i)];
                            break;
                        case SQLITE_FLOAT:
                            columnValue = [NSNumber numberWithDouble: sqlite3_column_double(statement, i)];
                            break;
                        case SQLITE_BLOB:
                        case SQLITE_TEXT:
                            columnValue = [[NSString alloc] initWithBytes:(char *)sqlite3_column_text(statement, i)
                                                                   length:sqlite3_column_bytes(statement, i)
                                                                 encoding:NSUTF8StringEncoding];
#if !__has_feature(objc_arc)
                            [columnValue autorelease];
#endif
                            break;
                        case SQLITE_NULL:
                        // just in case (should not happen):
                        default:
                            columnValue = [NSNull null];
                            break;
                    }

                    [results addObject:columnValue];

                    i++;
                }
                [resultRows addObject:entry];
                break;

            case SQLITE_DONE:
                if (hasRows) [results addObject:@"endrows"];
                nowRowsAffected = sqlite3_total_changes(db);
                diffRowsAffected = nowRowsAffected - previousRowsAffected;
                rowsAffected = [NSNumber numberWithInt:diffRowsAffected];
                nowInsertId = sqlite3_last_insert_rowid(db);
                if (nowRowsAffected > 0 && nowInsertId != 0) {
                    hasInsertId = YES;
                    insertId = [NSNumber numberWithLongLong:nowInsertId];
                }
                else insertId = [NSNumber numberWithLongLong:-1];
                keepGoing = NO;
                break;

            default:
                error = [SQLitePlugin captureSQLiteErrorFromDb:db];
                keepGoing = NO;
        }
    }

    sqlite3_finalize (statement);

    if (error) {
        /* add error with result.message: */

        [results addObject:@"error"];
        [results addObject:[error objectForKey:@"code"]];
        [results addObject:[error objectForKey:@"sqliteCode"]];
        [results addObject:[error objectForKey:@"message"]];

        return;
    }

    if (!hasRows) {
        [results addObject:@"ch2"];
        [results addObject:rowsAffected];
        [results addObject:insertId];
    }
}

-(void)bindStatement:(sqlite3_stmt *)statement withArg:(NSObject *)arg atIndex:(int)argIndex
{
    if ([arg isEqual:[NSNull null]]) {
        sqlite3_bind_null(statement, argIndex);
    } else if ([arg isKindOfClass:[NSNumber class]]) {
        NSNumber *numberArg = (NSNumber *)arg;
        const char *numberType = [numberArg objCType];
        if (strcmp(numberType, @encode(int)) == 0 ||
            strcmp(numberType, @encode(long long int)) == 0) {
            sqlite3_bind_int64(statement, argIndex, [numberArg longLongValue]);
        } else if (strcmp(numberType, @encode(double)) == 0) {
            sqlite3_bind_double(statement, argIndex, [numberArg doubleValue]);
        } else {
            sqlite3_bind_text(statement, argIndex, [[arg description] UTF8String], -1, SQLITE_TRANSIENT);
        }
    } else { // NSString
        NSString *stringArg;

        if ([arg isKindOfClass:[NSString class]]) {
            stringArg = (NSString *)arg;
        } else {
            stringArg = [arg description]; // convert to text
        }

        {
            NSData *data = [stringArg dataUsingEncoding:NSUTF8StringEncoding];
            sqlite3_bind_text(statement, argIndex, data.bytes, (int)data.length, SQLITE_TRANSIENT);
        }
    }
}

-(void) dispatch_aqcb: (NSString *) cbHandler cbId: (NSString *) cbid res: (NSObject *) cbres
{
    NSString * myScript = [NSString stringWithFormat:@"%@['%@']('%@?%@');", @"$AQCB", cbHandler, cbid, cbres];

    // THANKS for GUIDANCE:
    // https://nachbaur.com/2014/02/22/forcing-a-method-to-run-on-the-main-thread/
    dispatch_async(dispatch_get_main_queue(), ^{
        [webView stringByEvaluatingJavaScriptFromString: myScript];
    });

}

-(void)dealloc
{
    int i;
    NSArray *keys = [openDBs allKeys];
    NSValue *pointer;
    NSString *key;
    sqlite3 *db;

    /* close db the user forgot */
    for (i=0; i<[keys count]; i++) {
        key = [keys objectAtIndex:i];
        pointer = [openDBs objectForKey:key];
        db = [pointer pointerValue];
        sqlite3_close (db);
    }

#if !__has_feature(objc_arc)
    [openDBs release];
    [appDBPaths release];
    [super dealloc];
#endif
}

+(NSDictionary *)captureSQLiteErrorFromDb:(struct sqlite3 *)db
{
    int code = sqlite3_errcode(db);
    int webSQLCode = [SQLitePlugin mapSQLiteErrorCode:code];
#if 0 // XXX NOT SUPPORTED IN THIS VERSION:
    int extendedCode = sqlite3_extended_errcode(db);
#endif
    const char *message = sqlite3_errmsg(db);

    NSMutableDictionary *error = [NSMutableDictionary dictionaryWithCapacity:4];

    [error setObject:[NSNumber numberWithInt:webSQLCode] forKey:@"code"];
    [error setObject:[NSString stringWithUTF8String:message] forKey:@"message"];

    [error setObject:[NSNumber numberWithInt:code] forKey:@"sqliteCode"];
#if 0 // XXX NOT SUPPORTED IN THIS VERSION:
    [error setObject:[NSNumber numberWithInt:extendedCode] forKey:@"sqliteExtendedCode"];
    [error setObject:[NSString stringWithUTF8String:message] forKey:@"sqliteMessage"];
#endif

    return error;
}

+(int)mapSQLiteErrorCode:(int)code
{
    // map the sqlite error code to
    // the websql error code
    switch(code) {
        case SQLITE_ERROR:
            return SYNTAX_ERR;
        case SQLITE_FULL:
            return QUOTA_ERR;
        case SQLITE_CONSTRAINT:
            return CONSTRAINT_ERR;
        default:
            return UNKNOWN_ERR;
    }
}

@end /* vim: set expandtab : */
