var opencb = null;
var execsqlcb = null;

// NOTE: for some reason aqcallback needs to be in Javascript file, NOT in index.html:
function aqcallback(s) {
  if (s === 'a1') {
    if (!!opencb) opencb();
  } else {
    if (!!execsqlcb) execsqlcb(s);
  }
}
