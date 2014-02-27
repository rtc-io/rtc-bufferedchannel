var quickconnect = require('rtc-quickconnect');
var buffered = require('..');
var media = require('rtc-media');
var videoproc = require('rtc-videoproc');
var video = document.createElement('video');
var peers = [];
var channels = [];

// set up the video processing pipeline
videoproc(video, { calcCharSize: false })
  .on('frame', function(imageData, tick) {
    var data = this.canvas.toDataURL('image/png');

    channels.forEach(function(channel) {
      channel.send(data);
    });
  });

// capture media and render to the video
media().render(video);

quickconnect('http://rtc.io/switchboard', { room: 'bc-stresstest' })
  .on('peer:leave', function(id) {
    var peerIdx = peers.indexOf(id);

    if (peerIdx >= 0) {
      peers.splice(peerIdx, 1);
      channels.splice(peerIdx, 1);
    }
  })
  .createDataChannel('videoframes')
  .on('videoframes:open', function(dc, id) {
    var bc = buffered(dc);
    console.log('found new peer (id = ' + id + '), will send video frames');

    // when we get some data, then create a new image
    bc.on('data', function(data) {
      console.log('received some image data');
      // var img;

      // console.log('received some image data', data);
      // img = document.createElement('img');
      // img.src = data;

      // document.body.appendChild(img);
    });

    peers.push(id);
    channels.push(bc);
  });

  // add the canvas to the dom
document.body.appendChild(video);