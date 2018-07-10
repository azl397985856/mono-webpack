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
