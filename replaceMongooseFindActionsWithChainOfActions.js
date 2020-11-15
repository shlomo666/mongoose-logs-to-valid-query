const replaceMongooseFindActionsWithChainOfActions = (() => {
  /** @param {string} txt */
  function replaceMongooseFindActionsWithChainOfActions(txt) {
    if(txt.match(/db\.[^\.]+\.find/)) {
      const secondParam = eval(`p=${getSecondParam(txt) || '{}'}`);
      if(secondParam && Object.keys(secondParam).length) {
        const txtWithoutSecondParam = removeSecondParam(txt);
        const chainedFindActions = Object.keys(secondParam).reduce((chain, key) => `${chain}.${key}(${collapse(removeQuotes(JSON.stringify(secondParam[key], null, 2)), 100)})`, txtWithoutSecondParam);
        return chainedFindActions;
      }
    }
    return txt;
  }

  /** @param {string} txt */
  function getSecondParam(txt) {
    let bracketsCounter = 0;
    let i = txt.indexOf('{');
    do {
      if(txt[i] === '{') {
        bracketsCounter++;
      }
      if(txt[i] === '}') {
        bracketsCounter--;
      }
      i++;
    }while(bracketsCounter);

    const afterFirstBlock = txt.substring(i);
    const secondBlock = afterFirstBlock.substring(afterFirstBlock.indexOf('{'), afterFirstBlock.lastIndexOf('}') + 1);
    return secondBlock;
  }

  /** @param {string} txt */
  function removeSecondParam(txt) {
let bracketsCounter = 0;
    let i = txt.indexOf('{');
    do {
      if(txt[i] === '{') {
        bracketsCounter++;
      }
      if(txt[i] === '}') {
        bracketsCounter--;
      }
      i++;
    }while(bracketsCounter);

    return txt.substring(0, i) + ')';
  }

  return replaceMongooseFindActionsWithChainOfActions;
})();