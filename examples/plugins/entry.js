const { bundle } = require("../../src/main");

const pluginName = "ConsoleLogOnBuildWebpackPlugin";

class ConsoleLogOnBuildWebpackPlugin {
  apply(compiler) {
    compiler.hooks.emit.tap(pluginName, modules => {
      console.log("webpack 即将开始输出文件");
    });

    compiler.hooks.afterEmit.tap(pluginName, compilation => {
      console.log("webpack 输出文件完毕");
    });
  }
}

const compiler = bundle({
  entry: "../examples/plugins/index.js",
  output: {
    path: "dist",
    filename: "bundle.js"
  }
});

compiler.apply(new ConsoleLogOnBuildWebpackPlugin());

compiler.run(function(err, stats) {
  if (!err) {
    console.log("bundle finished...");

    console.log("this package was created by lucifer@duiba");
  } else {
    console.error(err);
  }
});
