String.prototype.filter = function (...args) {
  return this.split('').filter(...args);
};

const simpleTypes = new Set([
  'string',
  'number',
  'boolean',
  'bigint',
  'undefined',
  'function',
  'symbol'
]);
function deepEqual(o1, o2) {
  if (
    [o1, o2].includes(null) ||
    simpleTypes.has(typeof o1) ||
    simpleTypes.has(typeof o2)
  ) {
    return o1 === o2;
  }
  // not null object or array
  return Object.entries(o1).every(([k, v]) => deepEqual(o2[k], v));
}

const getBlock = (text, start, end) => {
  let a = start;
  let b = end;

  while (text[a] !== '{' && text[a] !== '[') a--;
  while (text[b] !== '}' && text[b] !== ']') b++;

  let isBlock = true;
  do {
    while (
      text.slice(a, b + 1).filter((p) => p === '{').length <
      text.slice(a, b + 1).filter((p) => p === '}').length
    ) {
      while (text[--a] !== '{');
    }
    while (
      text.slice(a, b + 1).filter((p) => p === '{').length >
      text.slice(a, b + 1).filter((p) => p === '}').length
    ) {
      while (text[++b] !== '}');
    }

    while (
      text.slice(a, b + 1).filter((p) => p === '[').length <
      text.slice(a, b + 1).filter((p) => p === ']').length
    ) {
      while (text[--a] !== '[');
    }
    while (
      text.slice(a, b + 1).filter((p) => p === '[').length >
      text.slice(a, b + 1).filter((p) => p === ']').length
    ) {
      while (text[++b] !== ']');
    }

    isBlock = true;
    const counters = text[a] === '{' ? { '{': 0, '}': 0 } : { '[': 0, ']': 0 };
    for (let i = a; isBlock && i < b; i++) {
      if (text[i] in counters) counters[text[i]]++;
      const [cOpen, cClose] = Object.values(counters);
      if (cOpen === cClose) {
        isBlock = false;
        a--;
        b++;
      }
    }
  } while (!isBlock);

  return { block: text.slice(a, b + 1), start: a, end: b };
};

const getIndexOfNth = (string, subString, nth) => {
  return string.split(subString).slice(0, nth).join(subString).length;
};

const countInString = (string, subString) => string.split(subString).length - 1;

const getMatchingBlock = (text, start, end, textToMatchIn) => {
  const { start: startIdx } = getBlock(text, start, end);
  const firstChar = text[startIdx];
  const before = text.slice(0, startIdx);
  const countCharsBefore = countInString(before, firstChar);
  const firstCharIdxInMatching = getIndexOfNth(
    textToMatchIn,
    firstChar,
    countCharsBefore + 1
  );
  return getBlock(
    textToMatchIn,
    firstCharIdxInMatching,
    firstCharIdxInMatching
  );
};

function getPrevJson(start, text) {
  const prevBlockEndIndex = text.slice(0, start).lastIndexOf('}');
  if (prevBlockEndIndex === -1) return null;

  const { block } = getBlock(text, prevBlockEndIndex - 1, prevBlockEndIndex);
  try {
    const prevJson = evaluate(block);
    return prevJson;
  } catch (err) {}
}

function getNextJson(end, text) {
  const nextBlockStartIndex = end + text.slice(end).indexOf('{');
  if (nextBlockStartIndex === -1) return null;

  const { block } = getBlock(
    text,
    nextBlockStartIndex,
    nextBlockStartIndex + 1
  );
  try {
    const nextJson = evaluate(block);
    return nextJson;
  } catch (err) {}
}
