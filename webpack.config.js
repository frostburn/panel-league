const webpack = require('webpack');

module.exports = {
  entry: [
    './lib/ui/index.jsx',
  ],
  output: {
    filename: './public/asset/js/index.js',
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: ['es2015', 'react'],
        },
      },
      {
        test: /\.less$/,
        loader: 'style-loader!css-loader!less-loader',
      },
    ],
  },
  plugins: [new webpack.optimize.UglifyJsPlugin()],
};
