var test = require('tape');
var bufferedchannel = require('..');
var peerpair = require('peerpair');
var peers = peerpair();
var channels;
var bcs;
var moonLanding = require('./data/moonlanding');
var mentos = require('./data/dietcoke-mentos');

function checkChunks(input, expectedChunks) {
  return function(t) {
    var saveHandler;

    function expect(count) {
      return function(evt) {
        count -= 1;

        if (count === 0) {
          t.pass('got expected number of chunks');
          channels[1].onmessage = saveHandler;
        }
      }
    }

    function readHeader(evt) {
      t.equal(evt.data, 'CHUNKS:' + expectedChunks, 'will receive ' + expectedChunks + ' chunks');
      channels[1].onmessage = expect(expectedChunks);
    }

    t.plan(2);
    saveHandler = channels[1].onmessage;
    channels[1].onmessage = readHeader;

    bcs[0].send(input);
  }
}

test('create test connections', function(t) {
  t.plan(2);
  peers.createChannelsAndConnect('test', function(err, dcs) {
    t.ifError(err);
    channels = dcs;
    t.equal(channels.length, 2, 'have two channels');
  });
});

test('have dc connectivity', function(t) {
  t.plan(1);

  channels[1].onmessage = function(evt) {
    t.equal(evt.data, 'hi', 'got hi from channel:0');
    channels[1].onmessage = null;
  };

  channels[0].send('hi');
});

test('create buffered channels for existing channels', function(t) {
  t.plan(2);
  bcs = channels.map(bufferedchannel);

  t.equal(bcs.length, 2, 'created 2 buffered channels');
  t.equal(typeof bcs[0].send, 'function', 'buffered channels have a send function');
});

test('small string data is send straight through', function(t) {
  t.plan(1);

  bcs[1].once('data', function(data) {
    t.equal(data, 'hi', 'bufferedchannel:1 received hi');
  });

  bcs[0].send('hi');
});

test('moonlanding image is chunked', checkChunks(moonLanding, 2));
test('moonlanding image sent through as expected', function(t) {
  t.plan(1);

  bcs[1].once('data', function(data) {
    t.equal(data, moonLanding, 'data correctly rebuilt');
  });

  bcs[0].send(moonLanding);
});

test('mentos image is chunked', checkChunks(mentos, 36));
test('mentos image sent through as expected', function(t) {
  t.plan(1);

  bcs[1].once('data', function(data) {
    t.equal(data, mentos, 'data correctly rebuilt');
  });

  bcs[0].send(mentos);
});

