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

在 webpack 的配置中 loader 有两个目标：

test 属性，用于标识出应该被对应的 loader 进行转换的某个或某些文件。
use 属性，表示进行转换时，应该使用哪个 loader。

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

### loader 原理

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

`createModules`功能就是构建整个项目的 modules，它会解析 module 的依赖，解析的原理就是静态分析，
如果有 import 'xxx' 这样的语句（这里不考虑动态引入 import('xxx')）就将其加入到依赖中。然后递归调用，从而构造出整个项目的 modules

`createModules`功能就是构建整个项目的 modules，它会解析 module 的依赖，解析的原理就是静态分析，
如果有 import 'xxx' 这样的语句（这里不考虑动态引入 import('xxx')）就将其加入到依赖中。然后递归调用，从而构造出整个项目的 modules

以下代码省略了一部分：

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

我们来看下转化 module 中最重要的`createModule`方法。它接受两个参数一个是 id，另一个是绝对路径。

我们通过绝对路径来读取文件内容，然后使用`babylon`将其转化为`ast`，然后使用`babel-babylon`进行遍历,
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

# <<<<<<< HEAD

我们来看下转化 module 中最重要的`createModule`方法。它接受两个参数一个是 id，另一个是绝对路径。

我们通过绝对路径来读取文件内容，然后使用`babylon`将其转化为`ast`，然后使用`babel-babylon`进行遍历,
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

> > > > > > > 83d500e... doc: 完善文档
> > > > > > > 这里还涉及到一个方法，没那么重要，代码如下：

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

<<<<<<< HEAD
#### 输出代码
=======
有了上面的知识了，我们就着手开始实现了。
我们要实现打包的方法，我将其命名为`bundle`.
那么 bundle 做的就是两件事情， 一件事是构建 modules（需要大家对 es6 模块有了解），另一件是将生成的代码（字符串）输出（根据配置的 output）。
>>>>>>> 83d500e... doc: 完善文档

> > > > > > > 83d500e... doc: 完善文档

得到了 modules 数组，我们需要将其转化为可以执行的代码。

我们继续看下代码:

<<<<<<< HEAD
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
=======
`createModules`功能就是构建整个项目的 modules，它会解析 module 的依赖，解析的原理就是静态分析，
如果有 import 'xxx' 这样的语句（这里不考虑动态引入 import('xxx')）就将其加入到依赖中。然后递归调用，从而构造出整个项目的 modules

以下代码省略了一部分：
>>>>>>> 83d500e... doc: 完善文档

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

<<<<<<< HEAD
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
=======
我们来看下转化 module 中最重要的`createModule`方法。它接受两个参数一个是 id，另一个是绝对路径。

我们通过绝对路径来读取文件内容，然后使用`babylon`将其转化为`ast`，然后使用`babel-babylon`进行遍历,
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

#### 输出代码
>>>>>>> 83d500e... doc: 完善文档

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

这一节带大家完成了 loader 的支持。

下一节我们引入 plugin(文章暂时未更新，敬请期待～)
