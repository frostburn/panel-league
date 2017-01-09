const webpack = require('webpack');

module.exports = {
  entry: [
    './src/js/index.js',
  ],
  output: {
    filename: './dist/asset/js/index.js',
  },
  module: {
    loaders: [
      {
        test: /\.less$/,
        loader: 'style-loader!css-loader!less-loader',
      },
    ],
  },
  plugins: [new webpack.optimize.UglifyJsPlugin()],
};
