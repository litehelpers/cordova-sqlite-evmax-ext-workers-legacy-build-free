importScripts('aqsend.js');

self.addEventListener('message', function(ev) {
if (ev.data == 'go') {
  aqsend("file:///aqaq#sq:open$123?" + encodeURIComponent(JSON.stringify([{name:"my.db"}])));
}
});

self.addEventListener('message', function(ev) {
if (ev.data == 'next') {
  var r = new XMLHttpRequest();
  aqsend("file:///aqaq#sq:backgroundExecuteSqlBatch$123?" + encodeURIComponent(JSON.stringify([{
    dbargs:{dbname:"my.db"}, flen: 1, flatlist: ["SELECT UPPER('MyText')", 0] }])) );
  r.send();

}
});
