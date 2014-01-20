var quickconnect = require('rtc-quickconnect');
var buffered = require('..');

// include the base64 encoded image data
var mentosImage = require('../test/data/dietcoke-mentos');

quickconnect('http://rtc.io/switchboard', { room: 'buffertest' })
  .createDataChannel('mentos')
  .once('mentos:open', function(dc, id) {
    var bc = buffered(dc);
    console.log('found new peer (id = ' + id + '), sending an image');

    // when we get some data, then create a new image
    bc.on('data', function(data) {
      var img;

      console.log('received some image data', data);
      img = document.createElement('img');
      img.src = data;

      document.body.appendChild(img);
    });

    // send the mentos data to the person that just connected to us
    bc.send(mentosImage);
  });