/* jshint node: true */
'use strict';

var EventEmitter = require('events').EventEmitter;

/**
  # rtc-bufferedchannel

  This is a wrapper for a native `RTCDataChannel` that ensures that data
  sent over the channel complies with the current data channel size limits
  (which is < 16Kb for firefox <--> chrome interop).

  ## Example Usage

  To be completed.
**/
module.exports = function(dc) {
  // create an event emitter that will replace our datachannel
  // which does mean the replacement object will fail instanceof checks for
  // RTCDataChannel
  var channel = new EventEmitter();

  function handleMessage(evt) {
    if (evt && evt.data) {
      channel.emit('data', evt.data);
    }
  }

  function send(data) {
    dc.send(data);
  }

  // patch in the send function
  channel.send = send;

  // handle data channel message events
  dc.onmessage = handleMessage;

  return channel;
};