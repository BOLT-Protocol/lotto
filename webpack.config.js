const webpack = require('webpack');
const fs = require('fs');
const path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

function getExternals() {
  const nodeModules = fs.readdirSync(path.join(process.cwd(), 'node_modules'));
  return nodeModules.reduce((ext, mod) => {
    ext[mod] = `commonjs ${mod}`;
    return ext;
  }, {});
}

const frontend = {
  mode: 'none',
  entry: [
    'webpack/hot/dev-server',
    path.resolve(__dirname, 'src/frontend/main.js'),
  ],
  output: {
    publicPath: '/dist/',
    path: path.resolve(__dirname, 'build/dist'),
    filename: 'main.js',
    // chunkFilename: '[id].js'
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      // this will apply to both plain `.js` files
      // AND `<script>` blocks in `.vue` files
      {
        test: /\.js$/,
        loader: 'babel-loader',
      },
      // this will apply to both plain `.css` files
      // AND `<style>` blocks in `.vue` files
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]?[hash]',
        },
      },
    ],
  },
  resolve: {
    /**
     * Vue v2.x 之後 NPM Package 預設只會匯出 runtime-only 版本
     */
    alias: {
      vue: 'vue/dist/vue.js',
    },
    extensions: ['.js', '.vue'],
  },
  devServer: {
    contentBase: path.join(__dirname, '/build'),
    compress: true,
    port: 8080,
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new VueLoaderPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  ],
};

const backend = {
  mode: 'none',
  target: 'node',
  entry: path.resolve(__dirname, 'src/backend/main.js'),
  output: {
    path: path.resolve(__dirname, 'build/backend'),
    filename: 'main.js',
    chunkFilename: '[id].js',
  },
  externals: getExternals(),
  node: {
    __filename: true,
    __dirname: true,
  },
  module: {
    rules: [{
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: /(node_modules)/,
    }],
    exprContextCritical: false,
  },
  plugins: [
    new webpack.IgnorePlugin(/\.(css|less|scss|svg|png|jpe?g|png)$/),
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false,
    }),
  ],
};

module.exports = [
  frontend,
];
