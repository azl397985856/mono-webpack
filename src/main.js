const fs = require("fs");
const _path = require("path");
const mkdirp = require("mkdirp");
const babylon = require("babylon");
const traverse = require("babel-traverse").default;

const { compose, eliminateFields, composePromise } = require("./utils");
const { applyLoaders } = require("./applyLoaders");

const events = {};

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

const writeDisk = output => content => {
  const { path, filename } = output;
  // make paths if not exist
  mkdirp(path);
  fs.writeFileSync(_path.join(path, filename), content, {
    encoding: "utf-8"
  });
  return content;
};

//  生成chunk
function createModule(id, absoluteEntryPath, rules) {
  const dependencies = [];

  // 读取入口文件
  const readFileSyncByFilename = filename =>
    fs.readFileSync(filename, {
      encoding: "utf-8"
    });

  const content = readFileSyncByFilename(absoluteEntryPath);

  if (/\.js$/.test(absoluteEntryPath)) {
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
    });
  }

  const code = applyLoaders(absoluteEntryPath, rules, content);

  return {
    dependencies,
    id,
    filename: absoluteEntryPath,
    code,
    mapping: {}
  };
}

function createModules(id, module, rules) {
  let modules = [];
  // 递归dependencies
  const { dependencies, filename } = module;

  dependencies.forEach(relativePath => {
    const absolutePath = _path.resolve(_path.dirname(filename), relativePath);
    const _module = createModule(id, absolutePath, rules);
    module.mapping[relativePath] = id;
    id = id + 1;
    modules = modules.concat(_module);
    if (_module.dependencies.length > 0) {
      modules = modules.concat(createModules(id, _module, rules));
    }
  });

  return modules;
}

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

// 核心方法
function bundle(options) {
  const compiler = {
    hooks: {
      emit: {
        tap(pluginName, handler) {
          addEvent("beforeEmit", handler);
        }
      },
      afterEmit: {
        tap(pluginName, handler) {
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
        beforeEmit(compiler.plugins, modules);
        // 输出环节
        const emit = compose(
          writeDisk(output),
          createAssets,
          eliminateFields
        );

        const compilation = emit(modules);
        // emit之后，有了compilation
        afterEmit(compiler.plugins, compilation);

        cb(null, compilation);
      } catch (err) {
        cb(err, null);
      }
      return true;
    }
  };

  return compiler;
}

module.exports = {
  bundle
};
