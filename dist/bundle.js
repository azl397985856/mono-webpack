
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
  })([{"id":0,"code":"import say from \"./say.js\";\n// 这是注释\nimport { name } from \"./info.js\";\n\nconsole.log(say(name));\n","mapping":{"./say.js":1,"./info.js":2}},{"id":1,"code":"export default name => `hello ${name}`;\n","mapping":{}},{"id":2,"code":"import { name } from \"./name.js\";\n\nmodule.exports = {\n  name\n};\n","mapping":{"./name.js":3}},{"id":3,"code":"module.exports = {\n  name: \"lucifer\"\n};\n","mapping":{}}])
