var aqcbmap = {};

var aqbasecbprefix = '!!!';

var aqcbhandlername = null;

var aqcbprefix = null;

var aqcbid = 0;

// XXX SECURITY TODO: get, keep, and use internal security code

aqcbmap['!!!sethandlername'] = function(s) {
  aqcbhandlername = s;
};

self.addEventListener('message', function(ev) {
  if ((typeof ev.data === 'string' || ev.data instanceof String) &&
      ev.data.indexOf(aqbasecbprefix) == 0) {
    var components = ev.data.split('?');
    if (components.length < 2) return;

    if (!!aqcbmap[components[0]]) {
      aqcbmap[components[0]](components[1]);
      delete aqcbmap[components[0]];
    }
  }
});

function aqsetcbprefix(prefix) {
    aqcbprefix = prefix;
}

function aqrequest(handler, method, req, cb) {
  if (!aqcbhandlername) throw new Error("SORRY no aq cb handler yet")
  if (!aqcbprefix) throw new Error("SORRY must set cb prefix first")

  ++aqcbid;
  var cbid = aqbasecbprefix + aqcbprefix + '.' + aqcbid;
  aqcbmap[cbid] = cb;

  var r = new XMLHttpRequest();
  // XXX TBD: should req be JSON & URL encoded here instead of by caller?
  r.open("POST", 'file:///aqaq#'+handler+':'+method+'$'+aqcbhandlername+'-'+cbid+'@'+'todoSecurityCode'+'?'+req, true);
  r.send();
}
