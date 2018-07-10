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

我们的代码中有几处使用了 nodejs 的内置模块。开始正式的讲解之前，有必要先来了解一下 这几个 nodejs api。

#### fs.readFileSync

nodejs 有很多同步异步版本的 api，很明显这个 api 就是这样。
套路是异步版本的名字后面加 Sync。比如`fs.readFile`是异步读取文件的，`fs.readFileSync`则是同步读取文件的。关于同步和异步的区别，如果不清楚，
请自行查阅相关资料。

完整的函数签名是`fs.readFileSync(path[, options])`,其中 path 是一个绝对路径。函数签名的详细参数介绍可以直接访问官网查看。

它的作用就是同步读取一个文件，并将`文件内容以返回值的形式返回`。

#### fs.writeFile

经过前面的介绍，其实大家应该可以猜到 fs.writeFile 也是有同步的版本的，
就是 fs.writeFileSync, 只不过我没有用到。

完整的函数签名是`fs.writeFile(file, data[, options], callback)`,其中 path 是一个绝对路径。函数签名的详细参数介绍可以直接访问官网查看。

> 值得注意的是如果试图写入的文件路径不存在，会报错。因此我使用 mkdir 库解决这个问题

它的作用就是异步写入一个文件，并在`内容写入完成的时候触发回调函数将出错信息或者读取的内容传给回调函数`。

#### path.join

完整的函数签名是`path.join([...paths])`

功能就是把多个路径拼接起来返回。
举个例子：

```bash
path.join('/foo', 'bar', 'baz/asdf', 'quux', '..');
// Returns: '/foo/bar/baz/asdf'
```

#### path.resolve

函数签名和上面的`path.join`类似。 完整的函数签名为：`path.resolve([...paths])`
简单来说，你可以把它看成是你在命令行使用 cd 切换目录。
举个例子：

```bash
path.resolve('/foo/bar', './baz');
// Returns: '/foo/bar/baz'

path.resolve('/foo/bar', '/tmp/file/');
// Returns: '/tmp/file'
```

#### \_\_dirname

直接返回当前的模块所在的目录。 它和 path.dirname()是一样的。

```js
__dirname === path.dirname(); // true
```

除了 nodejs 的内置模块，还使用了 npm 的第三方模块。
这里做一下简单的介绍。

#### mkdirp

一句话介绍: `Like mkdir -p, but in node.js!`

#### babylon

它的功能非常丰富，在这里我用它将代码转化为 AST(抽象语法树)。
如果对这个概念不是很熟悉的，建议先学习（至少知道做了什么）再继续往下看。

#### babel-core

babel-core 是 babel 的核心模块，它提供了很多插件和 preset 扩展它的功能，
这里我们使用 babel-preset-env 这个 babel 内置的 preset 来讲我们的代码转化为
兼容性更强的代码。

#### babel-traverse

这个也是 babel 家族的一个库。用于提供用户访问 ast 节点的能力,官方称之为访问者（visitor）。 在这里我们使用它来完成依赖的收集，就是将文件的 import 语句 收集起来。

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
