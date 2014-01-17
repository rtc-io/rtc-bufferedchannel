/* jshint node: true */
'use strict';

var EventEmitter = require('events').EventEmitter;
var bytes = require('utf8-length');
var metaHeader = 'CHUNKS';
var metaHeaderLength = metaHeader.length;

/**
  # rtc-bufferedchannel

  This is a wrapper for a native `RTCDataChannel` that ensures that data
  sent over the channel complies with the current data channel size limits
  (which is < 16Kb for firefox <--> chrome interop).

  ## Example Usage

  To be completed.
**/
module.exports = function(dc, opts) {
  // create an event emitter that will replace our datachannel
  // which does mean the replacement object will fail instanceof checks for
  // RTCDataChannel
  var channel = new EventEmitter();

  // initialise the default max buffer size
  // which at this stage is recommended to be 16Kb for interop between
  // firefox and chrome
  // see https://groups.google.com/forum/#!topic/discuss-webrtc/AefA5Pg_xIU
  var maxSize = (opts || {}).maxsize || (1024 * 16);

  // initilaise the pending chunks count to 0
  var pendingChunks = 0;
  var collectedQueue = [];
  var queueDataType;

  function buildData() {
    switch (queueDataType) {
      case 'string': {
        return collectedQueue.join('');
      }
    }
  } 

  function handleMessage(evt) {
    var haveData = evt && evt.data;
    var parts;
    var isMeta;

    if (haveData && pendingChunks) {
      collectedQueue.push(evt.data);
      pendingChunks -= 1;

      // if we have no more pending chunks then assemble the data
      // and emit the data event
      if (pendingChunks === 0) {
        channel.emit('data', buildData());
      }
    }
    else if (haveData) {
      // determine if this is a metadata chunk
      isMeta = typeof evt.data == 'string' &&
        evt.data.slice(0, metaHeaderLength) === metaHeader;

      if (isMeta) {
        parts = evt.data.split(':');
        pendingChunks = parseInt(parts[1], 10);
        queueDataType = parts[2] || 'string';
      }
      else {
        channel.emit('data', evt.data);
      }
    }
  }

  function send(data) {
    var size;
    var chunks = [];


    if (typeof data == 'string' || (data instanceof String)) {
      // calculate the utf8 encoding size of the data
      size = bytes(data);

      // chop the string into the correct number of bytes
      if (size < maxSize) {
        chunks = [ data ];
      }
    }

    // if we only have one chunk, just send the data
    if (chunks.length === 1) {
      dc.send(chunks[0]);
    }
    else {
      dc.send(metaHeader + ':' + chunks.length);

      // send the chunks
      chunks.forEach(function(chunk) {
        dc.send(chunk);
      });
    }
  }

  // patch in the send function
  channel.send = send;

  // handle data channel message events
  dc.onmessage = handleMessage;

  return channel;
};