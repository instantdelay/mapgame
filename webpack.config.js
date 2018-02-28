const ExtractTextPlugin = require('extract-text-webpack-plugin')
const path = require('path')

module.exports = {
   entry: ['./resources/main.js', './resources/main.scss'],
   mode: 'development',
   watch: true,
   output: {
      path: path.resolve(__dirname, 'public')
   },
   module: {
      rules: [
         {
            test: /\.js$/,
            exclude: /(node_modules|bower_components)/,
            use: {
               loader: 'babel-loader'
            }
         },
         {
            test: /\.(sass|scss)$/,
            loader: ExtractTextPlugin.extract(['css-loader', 'sass-loader'])
         }
      ]
   },
   plugins: [
      new ExtractTextPlugin({
         filename: '[name].bundle.css',
         allChunks: true,
      })
   ]
}