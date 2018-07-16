const { compose } = require("./utils");

const applyLoaders = (fullpath, rules, content) => {
  let ret = content;
  let hit = false;
  rules.forEach(rule => {
    if (rule.test.test(fullpath)) {
      hit = true;
      const loaders = rule.use.map(item =>
        item.loader.bind({
          loaders: rule.use
        })
      );

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
module.exports = {
  applyLoaders
};
