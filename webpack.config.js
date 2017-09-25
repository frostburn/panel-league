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
      {
        test: /\.png$/,
        loader: 'url-loader?mimetype=image/png!image-webpack-loader',
      },
      {
        test: /\.svg$/,
        loader: 'url-loader?mimetype=image/svg+xml!image-webpack-loader',
      },
    ],
  },
  plugins: [new webpack.optimize.UglifyJsPlugin()],
};
