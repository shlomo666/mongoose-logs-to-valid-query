const DEFAULT_MAX_COLLAPSE = 50;

const input = document.getElementById('inputCode');
const output = document.getElementById('outputCode');

function action(noPushState = false) {
  if (!noPushState) {
    window.history.pushState(
      null,
      document.title,
      window.location.href.split('?')[0]
    );
  }

  markOptionsUsage();

  const shouldReplaceStringIds = document.getElementById('shouldIds').checked;
  const shouldReplaceStringDates = document.getElementById('shouldDates')
    .checked;
  const MAX_COLLAPSE =
    Number(document.getElementById('maxCollapse').value) ||
    DEFAULT_MAX_COLLAPSE;

  localStorage.shouldIds = shouldReplaceStringIds;
  localStorage.shouldDates = shouldReplaceStringDates;
  localStorage.maxCollapse = MAX_COLLAPSE;

  /** @type {string} */
  const txt = input.value;
  const badQueryMatch = txt.match(/\[Array\]|\[Object\]/);
  if (badQueryMatch) {
    const from = badQueryMatch.index;
    highlight(from, from + badQueryMatch[0].length);
    output.value = badQueryErrorMessage(badQueryMatch[0]);
    return;
  }
  const originalArr = txt.substring(txt.indexOf('['), txt.lastIndexOf(']') + 1);
  if (originalArr.length === 0) return (output.value = '');

  let arr = originalArr;
  arr = replaceObjectIdAndDateWrappers(arr);
  if (shouldReplaceStringIds) {
    arr = replaceStringIds(arr);
  }
  if (shouldReplaceStringDates) {
    arr = replaceStringDates(arr);
  }
  arr = format(arr);
  arr = removeQuotes(arr);
  arr = collapse(arr, MAX_COLLAPSE);

  // Don't use replace because $$ is special combo of replace and it's common in mongo scripts
  output.value =
    'db.' +
    removeFromStart(removeFromStart(txt, 'Mongoose: '), 'db.')
      .split(originalArr)
      .join(arr);

  if (!noPushState) {
    window.history.replaceState(
      null,
      document.title,
      window.location.href + '?query=' + btoa(input.value)
    );
  }
}

function replaceObjectIdAndDateWrappers(txt) {
  return txt
    .replace(/ObjectId\(['"](\w{24})['"]\)/g, (s, id) => id)
    .replace(
      /ISODate\(['"](\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{1,3})?Z)['"]\)/g,
      (s, date) => date
    );
}

function format(txt) {
  map.clear();

  const exchanged = txt
    .replace(
      /"(\/(\\\\|\\"|[^"])+\/[a-z]*)"/g,
      (s, regex) => `"${exchange(regex, 'Regexp')}"`
    )
    .replace(/\/[^\n]+\/[a-z]*/g, (s) => `"${exchange(s, 'Regexp')}"`)
    .replace(
      /[^'"\.\w](\w{24})/g,
      (s, id) => `${s[0]}"${exchange(id, 'ObjectId')}"`
    )
    .replace(
      /[^'"\.\w](\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{1,3})?Z)/g,
      (s, date) => `${s[0]}"${exchange(date, 'ISODate')}"`
    )
    .replace(/'|`/g, '"');

  try {
    eval(exchanged);
  } catch (e) {
    output.value = exchanged;
    const from = exchanged.indexOf(e.message.slice(-2, -1));
    highlight(from, from + 1, output);
    throw e;
  }

  let stringified = JSON.stringify(eval(exchanged), null, 2);
  map.forEach(
    (v, k) =>
      (stringified = stringified
        .split(`"${v}"`)
        .join(`${v.split('_')[0]}("${k}")`))
  );
  return stringified.replace(/Regexp\("([^\n]+)"\)/g, (s, regex) => regex);
}

function notInString(txt, s) {
  return (
    txt
      .replace(/\\"/g, '')
      .split('"')
      .findIndex((part) => part.includes(s)) %
      2 ===
    0
  );
}

const map = new Map();
function exchange(s, prefix) {
  if (!map.has(s)) {
    map.set(s, prefix + '_' + Math.random());
  }
  return map.get(s);
}

function removeQuotes(txt) {
  return txt.replace(/['"]([\$\w]+)['"]: /g, (_, s) => s + ': ');
}

function collapse(txt, MAX_COLLAPSE) {
  for (let i = 0; i < txt.length; i++) {
    if (txt[i] === '{' || txt[i] === '[') {
      let depthCounter = 1;
      let letterCounter = 1;
      let j = i;
      while (depthCounter > 0 && letterCounter < MAX_COLLAPSE) {
        j++;
        if (txt[j] === '{' || txt[j] === '[') depthCounter++;
        else if (txt[j] === '}' || txt[j] === ']') depthCounter--;
        if (txt[j].trim().length > 0) letterCounter++;
      }
      if (depthCounter === 0) {
        const partialString = txt.substring(i, j + 1);
        // Don't use replace because $$ is special combo of replace and it's common in mongo scripts
        txt = txt.split(partialString).join(
          partialString
            .split('\n')
            .map((p) => p.trim())
            .join(' ')
        );
      }
    }
  }

  return txt;
}

function replaceStringIds(txt) {
  return txt.replace(/['"]\w{24}['"]/g, (s) => s.slice(1, -1));
}

function replaceStringDates(txt) {
  return txt.replace(
    /['"]\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{1,3})?Z['"]/g,
    (s) => s.slice(1, -1)
  );
}

function markOptionsUsage() {
  const txt = input.value;
  document.getElementById('shouldIdsLabel').style.background =
    replaceStringIds(txt) !== txt ? 'gainsboro' : 'none';
  document.getElementById('shouldDatesLabel').style.background =
    replaceStringDates(txt) !== txt ? 'gainsboro' : 'none';
}

function highlight(from, to, textArea = input) {
  textArea.focus();
  const fullText = textArea.value;
  textArea.value = fullText.substring(0, to);
  textArea.scrollTop = textArea.scrollHeight;
  textArea.value = fullText;

  textArea.setSelectionRange(from, to);
}

function removeFromStart(txt, start) {
  return txt.startsWith(start) ? txt.substring(start.length) : txt;
}

const badQueryErrorMessage = (
  badString
) => `Your query contains ${badString}. Change DAL mongoose debug to use JSON.stringify instead of default

mongoose.set('debug', (coll, method, queryObj, optionsObj) => {
  const query = JSON.stringify(queryObj);
  const options = JSON.stringify(optionsObj || {});

  console.log(\`db.\${coll}.\${method}(\${query}, \${options});\`);
});
(RegExp.prototype as any).toJSON = function() {
  return this.toString();
};
`;
