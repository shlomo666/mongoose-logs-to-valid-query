(() => {
  String.prototype.replaceButNotSpan = function (...args) {
    const reg = /<span[^>]+>[^>]+<\/span>/g;
    const spans = this.match(reg);
    if (!spans) return this.replace(...args);
    return this.split(reg)
      .map((s) => s.replace(...args))
      .flatMap((s, i) => [s, spans[i]])
      .filter((s) => s)
      .join('');
  };

  function escapeHTMLForAllText(s) {
    const reg = /<span[^>]+>[^>]+<\/span>/g;
    const spans = s.match(reg);
    if (!spans) return escapeHtml(s);
    return s
      .split(reg)
      .map((s) => escapeHtml(s))
      .flatMap((s, i) => [s, spans[i]])
      .filter((s) => s)
      .join('');
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/ /g, '&nbsp;');
  }

  /** @param {string} s */
  function spanStrings(s) {
    return (
      s
        // .split('\n')
        // .map((s) =>
        // s
        .replaceButNotSpan(
          /"[^"]+"/g,
          (s) => `<span style="color: #ce9178">${s}</span>`
        )
        .replaceButNotSpan(
          /'[^']+'/g,
          (s) => `<span style="color: #ce9178">${s}</span>`
        )
        .replaceButNotSpan(
          /\/[^\/]+\/[iug]*/g,
          (s) =>
            `<span style="color: #ce9178">${s.slice(
              0,
              s.lastIndexOf('/') + 1
            )}</span><span style="color: #3491d3">${s.slice(
              s.lastIndexOf('/') + 1
            )}</span>`
        )
        .replaceButNotSpan(
          /[\{\}\[\]]/g,
          (s) => `<span style="color: #eec902">${s}</span>`
        )
        .replaceButNotSpan(
          /[\w\$\_]+\:/g,
          (s) => `<span style="color: #98d7f2">${s}</span>`
        )
        .replaceButNotSpan(
          /[\w\$\_]+\./g,
          (s) => `<span style="color: #98d7f2">${s.slice(0, -1)}</span>.`
        )
        .replaceButNotSpan(
          /[\w\$\_]+\(/g,
          (s) => `<span style="color: #dcdcaa">${s.slice(0, -1)}</span>(`
        )
        .replaceButNotSpan(
          /[\(\)]/g,
          (s) => `<span style="color: #ffd700">${s}</span>`
        )
        .replaceButNotSpan(
          /true|false/g,
          (s) => `<span style="color: #559ad3">${s}</span>`
        )
        .replaceButNotSpan(
          /\d+(\.\d+)?/g,
          (s) => `<span style="color: #b5cea8">${s}</span>`
        )
        // )
        // .join('\n')
        .split('\n')
        .map((s) => `<div>${escapeHTMLForAllText(s)}</div>`)
        .join('\n')
        .toString()
    );
  }

  window.spanStrings = spanStrings;
  // outputCode.oninput = (e) => {
  //   outputCode.innerHTML = spanStrings(outputCode.innerText);
  // };
})();
