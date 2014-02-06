module.exports = function(ArrayType, MAXVAL, size) {
  var input = [];

  for (var ii = 0; ii < size; ii++) {
    input[ii] = (Math.random() * MAXVAL) | 0;
  }

  return new ArrayType(input);
};