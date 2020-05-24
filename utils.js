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
  return (
    typeof o1 === typeof o2 &&
    Object.entries(o1).length === Object.entries(o2).length &&
    Object.entries(o1).every(([k, v]) => deepEqual(o2[k], v))
  );
}

/** @param {string} text */
function scopes(text) {
  return text.split(/\{|\[/).length - text.split(/\}|\]/).length;
}

function replaceInputJson(start, end, ...jsonArr) {
  input.value =
    input.value.slice(0, start) +
    jsonArr
      .filter((p) => p !== '' && p !== null && p !== undefined)
      .map((json) => JSON.stringify(json))
      .join(',') +
    input.value.slice(end + 1);
}

function appendInputJson(start, json) {
  input.value =
    input.value.slice(0, start) +
    ',' +
    JSON.stringify(json) +
    input.value.slice(start);
}

const getBlock = (text, start, end) => {
  let a = start;
  let b = end;

  const min = text.indexOf('[');
  const max = text.lastIndexOf(']');
  if (a < min || b > max) return null;

  while (text[a] !== '{' && text[a] !== '[' && a >= min) a--;
  while (text[b] !== '}' && text[b] !== ']' && b <= max) b++;

  let safeExitCounter = 0;
  let isBlock = true;
  do {
    if (++safeExitCounter === 1e5) {
      debugger;
      throw new Error('endless loop detected');
    }

    while (
      text.slice(a, b + 1).filter((p) => p === '{').length <
      text.slice(a, b + 1).filter((p) => p === '}').length
    ) {
      if (++safeExitCounter === 1e5) {
        debugger;
        throw new Error('endless loop detected');
      }
      while (text[--a] !== '{' && a >= min);
    }
    while (
      text.slice(a, b + 1).filter((p) => p === '{').length >
      text.slice(a, b + 1).filter((p) => p === '}').length
    ) {
      if (++safeExitCounter === 1e5) {
        debugger;
        throw new Error('endless loop detected');
      }
      while (text[++b] !== '}' && b <= max);
    }

    while (
      text.slice(a, b + 1).filter((p) => p === '[').length <
      text.slice(a, b + 1).filter((p) => p === ']').length
    ) {
      if (++safeExitCounter === 1e5) {
        debugger;
        throw new Error('endless loop detected');
      }
      while (text[--a] !== '[' && a >= min);
    }
    while (
      text.slice(a, b + 1).filter((p) => p === '[').length >
      text.slice(a, b + 1).filter((p) => p === ']').length
    ) {
      if (++safeExitCounter === 1e5) {
        debugger;
        throw new Error('endless loop detected');
      }
      while (text[++b] !== ']' && b <= max);
    }

    isBlock = true;
    const counters = text[a] === '{' ? { '{': 0, '}': 0 } : { '[': 0, ']': 0 };
    for (let i = a; isBlock && i < b; i++) {
      if (text[i] in counters) counters[text[i]]++;
      const [cOpen, cClose] = Object.values(counters);
      if (cOpen === cClose) {
        isBlock = false;
        if (a > min) a--;
        if (b < max) b++;
      }
      if (++safeExitCounter === 1e5) {
        debugger;
        throw new Error('endless loop detected');
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

function getPrevBlock(from, text) {
  const prevBlockEndIndex = text.slice(0, from).lastIndexOf('}');
  if (prevBlockEndIndex === -1) return null;

  const { block, start, end } = getBlock(
    text,
    prevBlockEndIndex - 1,
    prevBlockEndIndex
  );
  if (from < end) {
    return null;
  }
  return { block, start, end };
}

function getPrevJson(start, text) {
  const prevBlock = getPrevBlock(start, text);
  if (!prevBlock) return prevBlock;
  const { block, start: prevStart, end: prevEnd } = prevBlock;

  try {
    const prevJson = evaluate(block);
    return prevJson;
  } catch (err) {}
}

function getNextBlock(to, text) {
  const nextBlockStartIndex = to + text.slice(to).indexOf('{');
  if (nextBlockStartIndex === -1) return null;

  const { block, start, end } = getBlock(
    text,
    nextBlockStartIndex,
    nextBlockStartIndex + 1
  );
  if (to > start) {
    return null;
  }
  return { block, start, end };
}

function getNextJson(end, text) {
  const prevBlock = getNextBlock(end, text);
  if (!prevBlock) return prevBlock;
  const { block, start: prevStart, end: prevEnd } = prevBlock;

  try {
    const nextJson = evaluate(block);
    return nextJson;
  } catch (err) {}
}

function memoize(fn, millisec) {
  let memoizeMap = new Map();
  return (...args) => {
    let { time, value } = memoizeMap.get(JSON.stringify(args)) || {};
    if (time && performance.now() - time < millisec) {
      return value;
    }
    value = fn(...args);
    time = performance.now();
    memoizeMap.set(JSON.stringify(args), { time, value });
    return value;
  };
}
