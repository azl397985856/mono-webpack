
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
  })([{"id":0,"code":"\"use strict\";\n\nvar _interopRequire = function (obj) { return obj && obj.__esModule ? obj[\"default\"] : obj; };\n\nvar say = _interopRequire(require(\"./say.js\"));\n\nvar name = require(\"./info.js\").name;\n\n\nconsole.log(say(name));","mapping":{"./say.js":1,"./info.js":2}},{"id":1,"code":"\"use strict\";\n\nmodule.exports = function (name) {\n  return \"hello \" + name;\n};","mapping":{}},{"id":2,"code":"\"use strict\";\n\nvar name = require(\"./name.js\").name;\n\n\nmodule.exports = {\n  name: name\n};","mapping":{"./name.js":3}},{"id":3,"code":"\"use strict\";\n\nmodule.exports = {\n  name: \"lucifer\"\n};","mapping":{}}])
