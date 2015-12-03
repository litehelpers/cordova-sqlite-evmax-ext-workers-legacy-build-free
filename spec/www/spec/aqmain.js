(function(root) {
  root.$AQCB = root.$AQCB || {};

  function aqworker(handlerId, w) {
    root.$AQCB[handlerId] = function(s) {
      w.postMessage(s);
    };

    w.postMessage('!!!sethandlername?'+handlerId);
  }

  var AQ = {
    aqworker: aqworker
  };

  // THANKS: http://blog.vjeux.com/2011/javascript/javascript-one-line-global-export.html
  root.AQ = (root.module || {}).exports = AQ;
})(this);
