module.exports = function(channels, bcs) {
  return function(input, expectedChunks, expectedType) {
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
        t.equal(evt.data, 'CHUNKS:' + expectedChunks + ':' + expectedType, 'will receive ' + expectedChunks + ' chunks');
        channels[1].onmessage = expect(expectedChunks);
      }

      t.plan(2);
      saveHandler = channels[1].onmessage;
      channels[1].onmessage = readHeader;

      bcs[0].send(input);
    }
  };
};