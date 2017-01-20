const webpack = require('webpack');

module.exports = {
  entry: {
    index: './src/js/index.js',
    index_vs: './src/js/index_vs.js'
  },
  output: {
    filename: './dist/asset/js/[name].js',
    sourceMapFilename: './dist/asset/js/[name].js.map',
  },
  plugins: [new webpack.optimize.UglifyJsPlugin()],
};
