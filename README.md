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

为了方便讲解，`配置方面`我们打算只支持 entry 和 output。

`模块方面`仅仅只是 es6 模块方案，且仅支持相对路径引用，后缀不可省略。

> 后缀会再后续增加解析器（resolver）的时候添加该功能

### 热身

我们的代码中有几处使用了 nodejs 的内置模块。开始正式的讲解之前，有必要先来了解一下 这几个 nodejs api。

#### fs.readFileSync

nodejs 有很多同步异步版本的 api，很明显这个 api 就是这样。
套路是异步版本的名字后面加 Sync。比如`fs.readFile`是异步读取文件的，`fs.readFileSync`则是同步读取文件的。关于同步和异步的区别，如果不清楚，
请自行查阅相关资料。

readFileSync 的完整的函数签名是`fs.readFileSync(path[, options])`,其中 path 是一个绝对路径。

> 函数签名的详细参数介绍可以直接访问官网查看。

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

这里有一个[在线的交互式场景](https://astexplorer.net/)，展示了我们的代码是转化成的 ast 是怎么样的。

#### babel-core

babel-core 是 babel 的核心模块，它提供了很多插件和 preset 扩展它的功能，
这里我们使用 babel-preset-env 这个 babel 内置的 preset 来讲我们的代码转化为
兼容性更强的代码。

#### babel-traverse

这个也是 babel 家族的一个库。用于提供用户访问 ast 节点的能力,官方称之为访问者（visitor）。 在这里我们使用它来完成依赖的收集，就是将文件的 import 语句 收集起来。

### bundle

有了上面的知识了，我们就着手开始实现了。
我们要实现打包的方法，我将其命名为`bundle`.
那么 bundle 做的就是两件事情，

- 一件事是构建 modules（需要大家对 es6 模块有了解）

- 另一件是将生成的代码（字符串）输出（根据配置的 output）。

输出的代码比较简单，直接调用 nodejs fs api 就可以了。

我们重点讲解一下如何`构建 modules`，待会再讲解`输出代码`.

#### 构建 modules

`createModules`功能就是构建整个项目的 modules，它会解析 module 的依赖，解析的原理就是静态分析，
如果有 import 'xxx' 这样的语句（这里不考虑动态引入 import('xxx')）就将其加入到依赖中。然后递归调用，从而构造出整个项目的 modules

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

我们来看下转化 module 中最重要的`createModule`方法。它接受两个参数一个是 id，另一个是绝对路径。

我们通过绝对路径来读取文件内容，然后使用`babylon`将其转化为`ast`，然后使用`babel-traverse`进行遍历,
目的其实就是为了找出该模块的依赖，然后继续递归调用，知道找到所有代码，这就是传说中的依赖树（图）。

> id 会被用到后面 require 使用。

```js
function createModule(id, absoluteEntryPath) {
  const dependencies = [];

  // 读取入口文件
  const content = fs.readFileSync(absoluteEntryPath, {
    encoding: "utf-8"
  });
  // 转化为ast
  const ast = babylon.parse(content, {
    sourceType: "module"
  });

  // 找到依赖
  babylon(ast, {
    ImportDeclaration({ node }) {
      dependencies.push(node.source.value);
    }
  });

  // 将其转化为兼容性更强的代码
  // info: 放到最后，否则ImportDeclaration visitor不生效
  const code = babel.transformFromAst(ast, null, {
    presets: ["env"]
  }).code;

  return {
    dependencies,
    id,
    filename: absoluteEntryPath,
    code,
    mapping: {}
  };
}
```

这里还涉及到一个方法，没那么重要，代码如下：

其实就是递归调用，并给所有的 module 添加 mapping

> mapping 会被用到后面 require 使用。

```js
function createModules(id, module) {
  let modules = [];
  // 递归dependencies
  const { dependencies, filename } = module;

  dependencies.forEach(relativePath => {
    const absolutePath = _path.resolve(_path.dirname(filename), relativePath);
    const _module = createModule(id, absolutePath);
    module.mapping[relativePath] = id;
    id = id + 1;
    modules = modules.concat(_module);
    if (_module.dependencies.length > 0) {
      modules = modules.concat(createModules(id, _module));
    }
  });

  return modules;
}
```

到这里我们已经得到了 modules 数组。

ta 大概长这样：

```json
[
  {
    "dependencies": ["./a.js"],
    "id": 0,
    "filename": "/Users/lucifer/code/index.js",
    "code": "you code here",
    "mapping": {}
  },
  {
    "dependencies": [],
    "id": 1,
    "filename": "/Users/lucifer/code/index.js",
    "code": "your code here",
    "mapping": {}
  }
]
```

#### 输出代码

得到了 modules 数组，我们需要将其转化为可以执行的代码。

我们继续看下代码:

```js
const emit = compose(
  writeDisk(output),
  createAssets,
  eliminateFields
);
```

可以看出主要进行了两个工作，一个是`createAssets`一个是`writeDisk`.
其中`writeDisk`就是直接 fs.writeFile 输出到文件系统，这里不赘述。重点讲一下 createAssets，
即如何根据 modules 生成目标代码（我称之为 assets）。

思考一个问题，我们的代码是基于 es6 module system 的。 拥有 import(其实已经被我转化为 require 了),module
以及 exports 这些东西，可是浏览器不一定识别，因此需要让其识别。

我们的做法是 fake 这些变量，然后将其作为参数传给函数，然后将 module 代码在函数中执行。
代码如下：

```js
function webpackRequire(id) {
  const { code, mapping } = modules[id];
  // 这个是给fake的require
  function require(name) {
    return webpackRequire(mapping[name]);
  }
  // 这个是fake的module和module.exports
  const module = { exports: {} };
  const wrap = new Function("require", "module", "exports", code);
  // 从这里可以看出module.exports和exports是同一个东西
  // module.exports === exports // true
  // 当然了，上面为true的前提是你没有手动改变二者的指向
  wrap(require, module, module.exports);
  return module.exports;
}
```

将 module 转化为 assets 的代码如下：

```js
function createAssets(modules) {
  // 包裹代码
  return `
  (function(modules) {
    function webpackRequire(id) {
      const { code, mapping } = modules[id];
      function require(name) {
        return webpackRequire(mapping[name]);
      }
      const module = { exports : {} };
      const wrap = new Function("require", "module", "exports", code);
      wrap(require, module, module.exports);
      return module.exports;
    }
    webpackRequire(0);
  })(${JSON.stringify(modules)})
`;
}
```

## 总结

这一节带大家完成了一个打包工具最简单的部分，如何根据入口文件扫描依赖，并且进行模块化加载等。
其中还借助了 babel 完成了一些转义工作。如果大家 ast 或者代码转化有兴趣，我会出一个专门的文章讲解。

下一节我们[引入 loaders](https://github.com/azl397985856/mono-webpack/tree/lecture/part-2)
