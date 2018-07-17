# 从零开始开发一个 Webpack

这个是从零开始开发一个 Webpack 的第三章，本章主要为我们的打包模块增加 plugins。

## 先行知识

学习这个课程之前呢，需要各位对 Webpack 的 API 有一定的了解。

> 如果完全不了解的话，不建议您继续往下看。

如果你已经具备了相关 Webpack 的知识，那么就让我们开始吧!

## 开始学习

### 什么是 plugins

引自 webpack 官方网站的描述：

> 插件是 webpack 的支柱功能。webpack 自身也是构建于插件系统之上！插件目的在于解决 loader 无法实现的其他事。

这个说明一点都不夸张，你打开 webpack 的源码，你会发现有`数量众多`的名字包含 plugin 文件.
没错，他们就是 webpack plugin，只不过他们很多不提供给用户而已。

#### plugin 就是一个 JavaScript 对象

webpack 插件是一个具有 apply 属性的 JavaScript 对象。apply 属性会被 webpack compiler 调用，并且 compiler 对象可在整个编译生命周期访问。

一个简单的插件：

```js
const pluginName = "ConsoleLogOnBuildWebpackPlugin";

class ConsoleLogOnBuildWebpackPlugin {
  apply(compiler) {
    compiler.hooks.run.tap(pluginName, compilation => {
      console.log("webpack 构建过程开始！");
    });
  }
}
```

> compiler hook 的 tap 方法的第一个参数，应该是驼峰式命名的插件名称。建议为此使用一个常量，以便它可以在所有 hook 中复用。

由于插件可以携带参数/选项，你必须在 webpack 配置中，向 plugins 属性传入 new 实例。

根据你的 webpack 用法，这里有多种方式使用插件。

一个插件大概是这样使用的：

```js
const webpack = require("webpack"); //访问 webpack 运行时(runtime)
const configuration = require("./webpack.config.js");

let compiler = webpack(configuration);
compiler.apply(new webpack.ProgressPlugin());

compiler.run(function(err, stats) {
  // ...
});
```

### 如何实现

我们先来 webpack 是怎么做的。

webpack 其实主要做了两件事情

1.  保存外界传入的插件列表

webpack 关于保存插件列表的部分源码：

```js
if (options.plugins && Array.isArray(options.plugins)) {
  for (const plugin of options.plugins) {
    plugin.apply(compiler);
  }
}
```

2.  在适当的时候（插件注册的生命周期）触发事件。

webpack 关于注册事件的部分源码：

```js
  const events = [];

	function addEvent(name, handler) {
		events.push({
			name,
			handler
		});
	}

	function getEventName(hookName) {
		// Convert a hook name to an event name.
		// e.g. `buildModule` -> `build-module`
		return hookName.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
	}
this.getEnvironmentStub = function() {
		const hooks = new Map();
		return {
			plugin: addEvent,
			// TODO: Figure out a better way of doing this
			// In the meanwhile, `hooks` is a `Proxy` which creates fake hooks
			// on demand. Instead of creating a dummy object with a few `Hook`
			// method, a custom `Hook` class could be used.
			hooks: new Proxy({}, {
				get(target, hookName) {
					let hook = hooks.get(hookName);
					if (hook === undefined) {
						const eventName = getEventName(hookName);
						hook = {
							tap(_, handler) {
								addEvent(eventName, handler);
							},
							tapAsync(_, handler) {
								addEvent(eventName, handler);
							},
							tapPromise(_, handler) {
								addEvent(eventName, handler);
							}
						};
						hooks.set(hookName, hook);
					}
					return hook;
				}
			})
		};
```

因此总结一下 webpack 是如何实现插件系统的。
这里有两个关键点：

- 插件注册，然后在适当时候调用注册的回调函数，这里采用订阅者模式即可。

- 另一个是 webpack 构建的生命周期。webpack 将这些节点 hooks 提供给插件供插件注册。

我们一个个实现。

#### 插件注册

要实现上面的功能，我们的 bundle 方法需要进行结构上的改造，至少应该返回 compiler 对象。
调用 compiler，不会直接进行编译，而是返回一个 compiler 对象，只有手动调用 run 才会进行编译工作。

我们在 compiler 增加属性`hooks`和 `apply`，然后我们将直接的逻辑移动到 run 中。

代码大概是下面这样：

```js
 const compiler = {
    hooks: {
      emit: {
        tap(pluginName, handler) {
		  // 在webpack的生命周期beforeEmit注册
		  // handler会在webpack生成文件之前执行
          addEvent("beforeEmit", handler);
        }
      },
      afterEmit: {
        tap(pluginName, handler) {
		  // 在webpack的生命周期afterEmit注册
		  // handler会在webpack生成文件之后执行
          addEvent("afterEmit", handler);
        }
      }
    },
    apply(...plugins) {
      compiler.plugins = plugins;
      for (const plugin of plugins) {
		// 向对应hook注册事件
        plugin.apply(compiler);
      }
    },
    run(cb) {
      try {
       ...
        cb(null, compilation);
      } catch (err) {
        cb(err, null);
      }
      return true;
    }
  };

  return compiler;
```

执行的时候，会先执行 apply,apply 最终调用 hooks 之中的方法完成`addEvent`（事件的注册）;

> 这里只实现了两个事件`emit`和`afterEmit`

其中`addEvent`代码如下：

```js
const events = {};

function addEvent(eventName, handler) {
  if (events[eventName]) {
    event.push({
      eventName,
      handler
    });
  } else {
    events[eventName] = [
      {
        eventName,
        handler
      }
    ];
  }
}
```

#### 生命周期

webpack 的生命周期按照顺序排列有如下几个：

- compile (starting to compile)

- compilation(starting a new compilation)

- make (making file)

- after-compile

- emit

- after-emit

这里的生命周期，光是解释起来就要半天。
因此我挑选了两个比较好理解的`emit`和`after-emit`实现，如果大家有兴趣，可以给我提 PR。

我们继续改造 run 中的代码,
我们要在 emit 的前后写两个函数，用来触发之前注册的插件，分别是`beforeEmit`和`afterEmit`,
在最后我们将最终生成的文件通过回调函数传给使用者。

```js
try {
  const { entry, output, module = {} } = options;

  let id = 0;

  const absoluteEntryPath = _path.resolve(__dirname, entry);
  // 先创建入口文件模块（module）
  const entryModule = createModule(id++, absoluteEntryPath, module.rules);
  // 构建所有模块(modules)
  const modules = [entryModule].concat(
    createModules(id, entryModule, module.rules)
  );
  // emit之前，只有modules
+  beforeEmit(compiler.plugins, modules);
  // 输出环节
  const emit = compose(
    writeDisk(output),
    createAssets,
    eliminateFields
  );

+  const compilation = emit(modules);
  // emit之后，有了compilation
+  afterEmit(compiler.plugins, compilation);

+  cb(null, compilation);
} catch (err) {
+  cb(err, null);
}
return true;
```

`beforeEmit` 和 `afterEmit` 是两个全新的函数，
功能就是找出对应注册的事件，然后执行回调函数。

实现如下：

```js
function beforeEmit(plugins, modules) {
  if (events.beforeEmit && events.beforeEmit.length > 0) {
    events.beforeEmit.forEach(event => {
      event.handler && event.handler(modules);
    });
  }
}

function afterEmit(plugins, compilation) {
  if (events.afterEmit && events.afterEmit.length > 0) {
    events.afterEmit.forEach(event => {
      event.handler && event.handler(compilation);
    });
  }
}
```

真正的 webpack 的构建周期非常复杂， 这里只是大概梳理一下他们是做什么的。
如果有可能，会在后面章节继续完善。

### 最终效果

```js
const { bundle } = require("../../src/main");

const pluginName = "ConsoleLogOnBuildWebpackPlugin";

// 自定义的一个插件
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

// 应用插件
compiler.apply(new ConsoleLogOnBuildWebpackPlugin());
// 手动调用run
compiler.run(function(err, stats) {
  if (!err) {
    console.log("bundle finished...");

    console.log("this package was created by lucifer@duiba");
  } else {
    console.error(err);
  }
});
```

## 总结

这一节带大家完成了 plugin 的支持。

下一节我们引入 模块解析系统(module resolver)(文章暂时未更新，敬请期待～)
