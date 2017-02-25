const webpack = require('webpack');

module.exports = {
  entry: [
    './lib/ui/index.js',
  ],
  output: {
    filename: './public/asset/js/index.js',
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
