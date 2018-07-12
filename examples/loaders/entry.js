const { bundle } = require("../../src/main");

const babelLoader = require("6to5-loader");

// 去除单行注释
const customLoader = content => content.replace(/\/\/.*\n/g, "");

bundle({
  entry: "../examples/loaders/index.js",
  output: {
    path: "dist",
    filename: "bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: babelLoader
          },
          {
            loader: customLoader
          }
        ]
      }
    ]
  }
});
