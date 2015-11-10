var aqmap = {};

function aqcallback(cbHandler, s) {
  h = aqmap[cbHandler];
  if (!!h) h(s);
}

function aqworker(handlerId, w) {
  aqmap[handlerId] = function(s) {
    w.postMessage(s);
  };
  w.postMessage('!!!sethandlername?'+handlerId);
}
