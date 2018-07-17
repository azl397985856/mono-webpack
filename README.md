# 从零开始开发一个 Webpack

这个是从零开始开发一个 Webpack 的第二章，本章主要为我们的打包模块增加 loaders。

## 先行知识

学习这个课程之前呢，需要各位对 Webpack 的 API 有一定的了解。

> 如果完全不了解的话，不建议您继续往下看。

如果你已经具备了相关 Webpack 的知识，那么就让我们开始吧!

## 开始学习

### 什么是 loader

引自 webpack 官方网站的描述：

> loader 让 webpack 能够去处理那些非 JavaScript 文件（webpack 自身只理解 JavaScript）。loader 可以将所有类型的文件转换为 webpack 能够处理的有效模块，然后你就可以利用 webpack 的打包能力，对它们进行处理。
> 本质上，webpack loader 将所有类型的文件，转换为应用程序的依赖图（和最终的 bundle）可以直接引用的模块。

在 webpack 的配置中 loader 有两个属性比较重要：

- test 属性，用于标识出应该被对应的 loader 进行转换的某个或某些文件。
- use 属性，表示进行转换时，应该使用哪个 loader。

我直接从 webpack 官网拿了一个 loader 的例子来介绍：

```js
module.exports = {
  //...
  module: {
    rules: [
      {
        test: /\.txt$/,
        use: ["raw-loader"]
      }
    ]
  }
};
```

这相当于你告诉 webpack

> “嘿，webpack 编译器，当你碰到「在 require()/import 语句中被解析为 '.txt' 的路径」时，在你对它打包之前，先使用 raw-loader 转换一下。”

### loader 就是函数

讲 loader 原理之前呢，先来看下 loader 的特性。以下内容摘自官网：

- loader 支持链式传递，并且数据流是从右向左。也就是说右边的输出会作为左边的输入

- loader 可以是同步的，也可以是异步的。(暂时不实现异步)

- loader 运行在 Node.js 中，并且能够执行任何可能的操作。

- loader 接收查询参数。用于对 loader 传递配置。

- 等等

本质上 loader 就是一个函数。 是一个接受前一个 loader 或原始内容处理的结果，并返回结果的一个函数。
webpack 将这些 loaders（很多函数）按照一定的顺序执行，如果你了解函数式编程的话，
他就是函数式编程中的 compose（组合），如果你了解 shell 的话，他就是 shell 中的 pipe（管道）。

### 如何实现

首先我们要改造入口函数，让其支持 modlue 配置。

```js
function bundle(options) {
+  const { entry, output, module } = options;
-  const { entry, output } = options;

  let id = 0;

  const absoluteEntryPath = _path.resolve(__dirname, entry);
  // 先创建入口文件模块（module）
+ const entryModule = createModule(id++, absoluteEntryPath, module.rules);
- const entryModule = createModule(id++, absoluteEntryPath);
  // 构建所有模块(modules)
  const modules = [entryModule].concat(
+   createModules(id, entryModule, module.rules)
-   createModules(id, entryModule, module.rules)
  );
  // 输出环节
  const emit = compose(
    writeDisk(output),
    createAssets,
    eliminateFields
  );

  return emit(modules);
}
```

之所以将 rules 传递给 createModules 是为了让他继续往下传给 createModule，
所以我们直接来看 createModule 的代码。

```js
function createModule(id, absoluteEntryPath, rules) {
  const dependencies = [];

  // 读取入口文件
  const readFileSyncByFilename = filename =>
    fs.readFileSync(filename, {
      encoding: "utf-8"
    });

  const content = readFileSyncByFilename(absoluteEntryPath);
// 由于增加了loader支持，理论上就支持了很多其他文件类型。
// 这里如果babylon解析其他文件类型就会挂掉，因此需要增加判断
+ if (/\.js$/.test(absoluteEntryPath)) {
    // 转化为ast
    const ast = babylon.parse(content, {
      sourceType: "module"
    });
    // 找到依赖
    traverse(ast, {
      ImportDeclaration({ node }) {
        const filename = node.source.value;
        dependencies.push(filename);
      }
+   });
  }

// 调用applyLoaders
+  const code = applyLoaders(absoluteEntryPath, rules, content);

  return {
    dependencies,
    id,
    filename: absoluteEntryPath,
    code,
    mapping: {}
  };
}
```

ok，来到了核心代码了。我们的`applyLoaders`.

```js
// fullpath用来test是否需要交给这个loader处理
// rules里面包含了所有loaders信息
// content为原始文件内容或者上一个loader处理后的文件内容
const applyLoaders = (fullpath, rules, content) => {
  let ret = content;
  // 用于提示该文件类型没有命中loader
  let hit = false;
  rules.forEach(rule => {
    if (rule.test.test(fullpath)) {
      hit = true;
      const loaders = rule.use.map(item =>
        item.loader.bind({
          loaders: rule.use // 这里bind过去一个context以便自定义loader可以通过this访问，webpack提供了很多上下文属性，这里暂不支持
        })
      );
      // 将loaders从右向左依次执行
      ret = compose(...loaders)(content);
    }
  });
  if (!hit) {
    console.log(
      `${fullpath}: You may need an appropriate loader to handle this file type.`
    );
  }

  return ret;
};
```

### 最终效果

由于我并没有实现 webpack loader 的异步 api，我使用了一个 babel-core 的原始版本 6to5-loader(因为他是同步的)。

另外我自己写了一个 loader`customLoader`,代码就一行，功能也很简单就是将单行注释给删除掉。

完整示例代码如下：

```js
// 这是我们的webpack核心代码
const { bundle } = require("../../src/main");
// 这是我找的网上的一个loader
// 我们要把它应用到我们的webpack来替换原油的babel-core的功能
const babelLoader = require("6to5-loader");

// 这个是我写的一个自定义的loader
// 功能是去除单行注释
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
```

运行上面的代码，会在 dist 目录输出一个 bundle.js. 并且代码
会先去除行内注释，然后转译为 es5.

## 总结

这一节带大家完成了 loader 的支持。

下一节我们引入 [plugin](https://github.com/azl397985856/mono-webpack/tree/lecture/part-3)
