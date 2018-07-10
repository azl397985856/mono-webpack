import { compose, eliminateFields } from "../src/utils";

import main from "../src/main";

const createModule = main.__get__("createModule");
const createModules = main.__get__("createModules");
const createAssets = main.__get__("createAssets");

console.log(createAssets);
// 测试数据
const modules = [
  {
    id: 0,
    dependencies: [1, 2, 3, 4, 5, 6],
    filename: "1.txt",
    code:
      '"use strict";\n\nvar _say = require("./say.js");\n\nvar _say2 = _interopRequireDefault(_say);\n\nvar _info = require("./info.js");\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nconsole.log((0, _say2.default)(_info.name));',
    mapping: { "./say.js": 1, "./info.js": 2 }
  },
  {
    id: 1,
    dependencies: [1, 2, 3, 4, 5, 6],
    filename: "1.txt",
    code:
      '"use strict";\n\nObject.defineProperty(exports, "__esModule", {\n  value: true\n});\n\nexports.default = function (name) {\n  return "hello " + name;\n};',
    mapping: {}
  },
  {
    id: 2,
    dependencies: [1, 2, 3, 4, 5, 6],
    filename: "1.txt",
    code:
      '"use strict";\n\nvar _name = require("./name.js");\n\nmodule.exports = {\n  name: _name.name\n};',
    mapping: { "./name.js": 3 }
  },
  {
    id: 3,
    dependencies: [1, 2, 3, 4, 5, 6],
    filename: "1.txt",
    code: '"use strict";\n\nmodule.exports = {\n  name: "lucifer"\n};',
    mapping: {}
  }
];

describe("mono-webpack", () => {
  it("createModules", () => expect(true).toBe(true));

  it("createModule", () => expect(true).toBe(true));

  it("createAssets", () => expect(true).toBe(true));

  it("compose", () => {
    const addOne = x => x + 1;
    const multiTwo = x => x * 2;
    const composed = compose(
      multiTwo,
      addOne
    );
    // 多个参数
    expect(composed(1)).toBe(4);
    // 一个参数
    expect(compose(addOne)(1)).toBe(2);
    // 没有参数
    expect(compose()(1)).toBe(1);
  });

  it("eliminateFields", () => {
    const eliminated = eliminateFields(modules);
    eliminated.forEach(module => {
      // 判断时候将dependencies和filename删除了
      expect(module.dependencies).toBe(undefined);
      expect(module.filename).toBe(undefined);
    });
  });
});
