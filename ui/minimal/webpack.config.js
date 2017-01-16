const webpack = require('webpack');

module.exports = {
  entry: [
    './src/js/index.js',
  ],
  output: {
    filename: './dist/asset/js/index.js',
    sourceMapFilename: './dist/asset/js/index.js.map',
  },
  plugins: [new webpack.optimize.UglifyJsPlugin()],
};
