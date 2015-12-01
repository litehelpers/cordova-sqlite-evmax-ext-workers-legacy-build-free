var w = new Worker('sample-worker.js');
aqworker('w1', w);
w.addEventListener('message', function(ev) {
  document.getElementById('res').innerHTML=ev.data;
});

w.postMessage('go');
