/* jshint node: true */
'use strict';

var EventEmitter = require('events').EventEmitter;
var metaHeader = 'CHUNKS';
var metaHeaderLength = metaHeader.length;
var reByteChar = /%..|./;
var DEFAULT_MAXSIZE = 1024 * 16;

/**
  # rtc-bufferedchannel

  This is a wrapper for a native `RTCDataChannel` that ensures that data
  sent over the channel complies with the current data channel size limits
  (which is < 16Kb for firefox <--> chrome interop).

  ## Example Usage

  Shown below is a simple example of how you might use a buffered channel to
  send data that is larger than what you can typically send over a webrtc
  data channel:

  <<< examples/have-some-mentos.js
  
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
  var maxSize = (opts || {}).maxsize || DEFAULT_MAXSIZE;

  // initilaise the pending chunks count to 0
  var pendingChunks = 0;
  var collectedQueue = [];
  var queueDataType;

  // initialise the send queue
  var sendQueue = [];
  var sendTimer = 0;

  function buildData() {
    var totalByteSize = 0;
    var lastOffset = 0;
    var input = collectedQueue.splice(0);
    var dataView;

    // if we have string data, then it's simple
    if (queueDataType === 'string') {
      return input.join('');
    }

    // otherwise, rebuild the array buffer into the correct view type
    totalByteSize = input.reduce(function(memo, buffer) {
      console.log(memo, buffer.byteLength);
      return memo + buffer.byteLength;
    }, 0);

    console.log('recreating buffer, total byte size: ' + totalByteSize);

    // create data view
    dataView = createDataView(queueDataType, totalByteSize);

    // iterate through the collected queue and set the data
    input.forEach(function(chunk) {
      dataView.set(new dataView.constructor(chunk), lastOffset);
      lastOffset += (chunk.byteLength / dataView.bytesPerElement) | 0;
    });

    return dataView;
  }

  function createDataView(dt, size) {
    switch (dt) {
    }

    return new Uint8Array(size);
  }

  function handleClose(evt) {
    console.log('received dc close', evt);
  }

  function handleError(evt) {
    console.log('received dc error: ', evt);
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

  function queue(payload, timeout) {
    if (payload) {
      // add the payload to the send queue
      sendQueue[sendQueue.length] = payload;
    }

    // queue a transmit only if not already queued
    sendTimer = sendTimer || setTimeout(transmit, timeout || 0);
  }

  function segmentArrayBuffer(input) {
    var chunks = [];
    var offset = 0;

    while (offset < input.byteLength) {
      chunks.push(input.slice(offset, offset + maxSize));
      offset += maxSize;
    }

    return chunks;
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
    var dataType;

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
    else if (data && data.buffer && data.buffer instanceof ArrayBuffer) {
      // derive the data type
      dataType = 'uint8';

      if (data.byteLength < maxSize) {
        chunks[0] = data;
      }
      else {
        chunks = segmentArrayBuffer(data.buffer);
      }
    }
    // else if (data instanceof ArrayBuffer) {
    //   console.log('got an array buffer');
    // }

    // if we only have one chunk, just send the data
    if ((! dataType) && chunks.length === 1) {
      queue(chunks[0]);
    }
    else {
      queue(metaHeader + ':' + chunks.length + ':' + (dataType || 'string'));
      chunks.forEach(queue);
    }
  }

  function transmit() {
    var next = sendQueue.shift();

    // reset the send timer to 0 (means queuing will again occur)
    sendTimer = 0;

    // if we have cleaned out the queue then abort
    if (dc.readyState !== 'open' || (! next)) {
      return;
    }

    try {
      dc.send(next);
      queue();
    }
    catch (e) {
      console.error('error sending chunk: ', e);
      console.log('buffered amount = ' + dc.bufferedAmount);
      console.log('ready state = ' + dc.readyState);

      // TODO: reset the send queue?
      queue(null, 100);
    }
  }

  // patch in the send function
  channel.send = send;

  // handle data channel message events
  dc.onmessage = handleMessage;

  // handle the channel close
  dc.onclose = handleClose;
  dc.onerror = handleError;

  return channel;
};