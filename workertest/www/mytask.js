importScripts('aqworker.js');

aqsetcbprefix('sqlcb');

self.addEventListener('message', function(ev) {
  if (ev.data === 'go') {
    aqrequest('sq', 'open', encodeURIComponent(JSON.stringify([{name:"my.db"}])), function(s) {
      aqrequest('sq', 'backgroundExecuteSqlBatch', encodeURIComponent(JSON.stringify([{
          dbargs:{dbname:"my.db"}, flen: 1, flatlist: ["SELECT UPPER('MyText')", 0] }])), function(s) {
        self.postMessage('got result: ' + decodeURIComponent(s));
      });
    });
  }
});
