function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }
  return funcs.reduce((a, b) => (...args) => a(b(...args)));
}

// 去除不必须的字段，减少文件体积
function eliminateFields(modules) {
  return modules.map(module => ({
    ...module,
    dependencies: undefined,
    filename: undefined
  }));
}
module.exports = {
  compose,
  eliminateFields
};
