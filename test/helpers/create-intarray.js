module.exports = function(ArrayType, MAXVAL, size) {
  var input = [];
  var HALFVAL = MAXVAL >> 1;

  for (var ii = 0; ii < size; ii++) {
    input[ii] = ((Math.random() * MAXVAL) | 0) - HALFVAL;
  }

  return new ArrayType(input);
};