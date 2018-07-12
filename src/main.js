const fs = require("fs");
const _path = require("path");
const mkdirp = require("mkdirp");
const babylon = require("babylon");
const babel = require("babel-core");
const traverse = require("babel-traverse").default;

// utils
const { compose, eliminateFields } = require("./utils");

// function applyLoaders(loaders, module) {}

// function applyPlugins(plugins, asset) {}

const writeDisk = output => content => {
  const { path, filename } = output;
  // make paths if not exist
  mkdirp(path);
  return fs.writeFile(
    _path.join(path, filename),
    content,
    {
      encoding: "utf-8"
    },
    (err, data) => {
      if (err) {
        throw err;
      }
      console.log("bundle finished...");

      console.log("this package was created by lucifer@duiba");
    }
  );
};

//  生成module
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
  traverse(ast, {
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
  const { entry, output } = options;

  let id = 0;

  const absoluteEntryPath = _path.resolve(__dirname, entry);
  // 先创建入口文件模块（module）
  const entryModule = createModule(id++, absoluteEntryPath);
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

module.exports = {
  bundle
};
