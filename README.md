# 从零开始开发一个 Webpack

这个是从零开始开发一个 Webpack 的第一章，本章主要实现一个模块打包系统的最基本功能，而且为了教学方便，功能可能不完整。

## 先行知识

学习这个课程之前呢，需要各位对 Webpack 的 API 有一定的了解。

> 如果完全不了解的话，不建议您继续往下看。

如果你已经具备了相关 Webpack 的知识，那么就让我们开始吧!

## 开始学习

我直接从 webpack 官网拿了一个最简单的例子来介绍：

```js
const path = require("path");

module.exports = {
  entry: "./path/to/my/entry/file.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "my-first-webpack.bundle.js"
  }
};
```

配置方面，只支持 entry 和 output。

模块方面仅仅只是 es6 模块方案，且仅支持相对路径引用，后缀不可省略。

### 热身

开始正式的讲解之前，有必要先来了解一下 nodejs api。
因为我们的一些操作是需要依赖 nodejs 提供的底层文件读写的 api 的。

### bundle

我们要实现打包的方法，我将其命名为`bundle`.
那么 bundle 做的就是两件事情， 一件事是构建 modules，另一件是将生成的代码（字符串）输出（根据配置的 output）。

输出的代码比较简单，直接调用 nodejs fs api 就可以了。

我们重点讲解一下如何`构建 modules`，待会再讲解`输出代码`.

#### 构建 modules

以下代码省略了一部分：

```js
function bundle(options) {
    ...
  // 构建所有模块(modules)
  const modules = [entryModule].concat(createModules(id, entryModule));
  // 输出环节
  const emit = compose(
    writeDisk(output),
    createAssets,
    eliminateFields
  );

  return emit(modules);
}
```

#### 输出代码

## 总结

这一节带大家完成了一个打包工具最简单的部分，如何根据入口文件扫描依赖，并且进行模块化加载等。
其中还借助了 babel 完成了一些转义工作。如果大家 ast 或者代码转化有兴趣，我会出一个专门的文章讲解。

下一节我们引入 loaders(文章暂时未更新，敬请期待～)
