function aqsend(s) {
  var r = new XMLHttpRequest();
  r.open("POST", s, true);
  r.send();
}
