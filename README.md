# rtc-bufferedchannel

This is a wrapper for a native `RTCDataChannel` that ensures that data
sent over the channel complies with the current data channel size limits
(which is < 16Kb for firefox <--> chrome interop).


[![NPM](https://nodei.co/npm/rtc-bufferedchannel.png)](https://nodei.co/npm/rtc-bufferedchannel/)

[![unstable](http://hughsk.github.io/stability-badges/dist/unstable.svg)](http://github.com/hughsk/stability-badges)

## Example Usage

Shown below is a simple example of how you might use a buffered channel to
send data that is larger than what you can typically send over a webrtc
data channel:

```js
var quickconnect = require('rtc-quickconnect');
var buffered = require('rtc-bufferedchannel');

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
```

## License(s)

### Apache 2.0

Copyright 2014 National ICT Australia Limited (NICTA)

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
