const { bundle } = require("../../src/main");

bundle({
  entry: "../examples/simple/index.js",
  output: {
    path: "dist",
    filename: "bundle.js"
  }
});
