/* jshint node: true */
'use strict';

var EventEmitter = require('events').EventEmitter;
var metaHeader = 'CHUNKS';
var metaHeaderLength = metaHeader.length;
var reByteChar = /%..|./;

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
        return collectedQueue.splice(0).join('');
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
    var abort = false;
    var charSize;
    var currentSize = 0;
    var currentStartIndex = 0;
    var ii = 0;
    var length;

    if (typeof data == 'string' || (data instanceof String)) {
      // organise into data chunks
      length = data.length;
      while (ii < length) {
        // calculate the current character size
        charSize = ~-encodeURI(data.charAt(ii)).split(reByteChar).length;

        // if this will tip us over the limit, copy the chunk
        if (currentSize + charSize >= maxSize) {
          // copy the chunk
          chunks[chunks.length] = data.slice(currentStartIndex, ii);

          // reset tracking variables
          currentStartIndex = ii;
          currentSize = 0;
        }
        // otherwise, increment the current chunk size
        else {
          currentSize += charSize;
        }

        // increment the index
        ii += 1;
      }

      // if we have a pending chunk, then add it
      if (currentSize > 0) {
        chunks[chunks.length] = data.slice(currentStartIndex);
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
        if (abort) {
          return;
        }

        try {
          dc.send(chunk);
        }
        catch (e) {
          console.error('error sending chunk: ', e);
          console.log('buffered amount = ' + dc.bufferedAmount);
          console.log('ready state = ' + dc.readyState);

          abort = true;
        }
      });
    }
  }

  // patch in the send function
  channel.send = send;

  // handle data channel message events
  dc.onmessage = handleMessage;

  return channel;
};