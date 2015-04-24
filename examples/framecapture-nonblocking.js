var quickconnect = require('rtc-quickconnect');
var buffered = require('..');
var crel = require('crel');
var videoproc = require('rtc-videoproc');
var getUserMedia = require('getusermedia');
var attachmediastream = require('attachmediastream');
var video = crel('video');
var peers = [];
var channels = [];

// set up the video processing pipeline
videoproc(video)
  .on('frame', function(imageData, tick) {
    var data = this.canvas.toDataURL('image/png');

    channels.forEach(function(channel) {
      channel.send(data);
    });
  });

// capture media and render to the video
getUserMedia({ audio: false, video: true }, function(err, stream) {
  if (err) {
    return console.error(err);
  }

  attachmediastream(stream, video);
});

quickconnect('https://switchboard.rtc.io/', { room: 'bc-stresstest' })
  .on('call:ended', function(id) {
    var peerIdx = peers.indexOf(id);
    var img = document.getElementById('image_' + id);

    if (peerIdx >= 0) {
      peers.splice(peerIdx, 1);
      channels.splice(peerIdx, 1);
    }

    if (img && img.parentNode) {
      img.parentNode.removeChild(img);
    }
  })
  .createDataChannel('videoframes')
  .on('channel:opened:videoframes', function(id, dc) {
    var bc = buffered(dc, { calcCharSize: false });
    console.log('found new peer (id = ' + id + '), will send video frames');

    // when we get some data, then create a new image
    bc.on('data', function(data) {
      var img = document.getElementById('image_' + id);
      if (! img) {
        document.body.appendChild(img = crel('img', { id: 'image_' + id }));
      }

      console.log('received data');
      img.src = data;
    });

    peers.push(id);
    channels.push(bc);
  });

  // add the canvas to the dom
document.body.appendChild(video);
