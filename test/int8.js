var test = require('tape');
var bufferedchannel = require('..');
var peerpair = require('peerpair');
var createArray = require('./helpers/create-intarray');
var peers = peerpair();
var channels = [];
var bcs = [];
var checkChunks = require('./helpers/check-chunks')(channels, bcs);
var smallArray = createArray(Int8Array, Math.pow(2, 8), 100);
var largeArray = createArray(Int8Array, Math.pow(2, 8), 45 * 1024);
var massiveArray = createArray(Int8Array, Math.pow(2, 8), 1035 * 1024);


test('int8: create test connections', function(t) {
  t.plan(2);
  peers.createChannelsAndConnect('test', function(err, dcs) {
    t.ifError(err);

    channels.push(dcs[0], dcs[1]);
    t.equal(channels.length, 2, 'have two channels');
  });
});

test('int8: have dc connectivity', function(t) {
  t.plan(1);

  channels[1].onmessage = function(evt) {
    t.equal(evt.data, 'hi', 'got hi from channel:0');
    channels[1].onmessage = null;
  };

  channels[0].send('hi');
});

test('int8: create buffered channels for existing channels', function(t) {
  t.plan(2);

  channels.forEach(function(dc, index) {
    bcs[index] = bufferedchannel(dc, { maxsize: 16 * 1024 });
  });

  t.equal(bcs.length, 2, 'created 2 buffered channels');
  t.equal(typeof bcs[0].send, 'function', 'buffered channels have a send function');
});

test('int8: small array is chunked', checkChunks(smallArray, 1, 'int8'));
test('int8: small array is sent ok', function(t) {
  t.plan(1);

  bcs[1].once('data', function(data) {
    var equal = true;
    for (var ii = data.length; equal && ii--; ) {
      equal = data[ii] === smallArray[ii];
    }

    t.ok(equal, 'small array passed through correctly');
  });

  bcs[0].send(smallArray);
});

test('int8: large array is chunked', checkChunks(largeArray, 3, 'int8'));
test('int8: large array is sent ok', function(t) {
  t.plan(1);

  bcs[1].once('data', function(data) {
    var equal = true;
    for (var ii = data.length; equal && ii--; ) {
      equal = data[ii] === largeArray[ii];
      // if (! equal) {
      //   console.log('failed at element: ' + ii);
      //   console.log(data.length);
      //   console.log(largeArray.length);
      //   console.log(data[ii], largeArray[ii]);
      //   console.log(data);
      // }
    }

    t.ok(equal, 'large array passed through correctly');
  });

  bcs[0].send(largeArray);
});


test('int8: massive array is chunked', checkChunks(massiveArray, 65, 'int8'));
test('int8: massive array is sent ok', function(t) {
  t.plan(1);

  bcs[1].once('data', function(data) {
    var equal = true;
    for (var ii = data.length; equal && ii--; ) {
      equal = data[ii] === massiveArray[ii];
      // if (! equal) {
      //   console.log('failed at element: ' + ii);
      //   console.log(data.length);
      //   console.log(largeArray.length);
      //   console.log(data);
      // }      
    }

    t.ok(equal, 'large array passed through correctly');
  });

  bcs[0].send(massiveArray);
});