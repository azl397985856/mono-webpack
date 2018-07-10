
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
  })([{"id":0,"code":"\"use strict\";\n\nvar _say = require(\"./say.js\");\n\nvar _say2 = _interopRequireDefault(_say);\n\nvar _info = require(\"./info.js\");\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nconsole.log((0, _say2.default)(_info.name));","mapping":{"./say.js":1,"./info.js":2}},{"id":1,"code":"\"use strict\";\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\n\nexports.default = function (name) {\n  return \"hello \" + name;\n};","mapping":{}},{"id":2,"code":"\"use strict\";\n\nvar _name = require(\"./name.js\");\n\nmodule.exports = {\n  name: _name.name\n};","mapping":{"./name.js":3}},{"id":3,"code":"\"use strict\";\n\nmodule.exports = {\n  name: \"lucifer\"\n};","mapping":{}}])
