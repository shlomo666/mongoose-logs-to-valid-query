const getSuggestions = (() => {
  const output = document.getElementById('outputCode');
  const suggestionsMenu = document.getElementById('suggestionsMenu');

  output.oncontextmenu = function (ev) {
    if (ev.button === 2) {
      const from = output.selectionStart + 1;
      const to = output.selectionEnd - 1;

      const { suggestions, start, end } = getSuggestions(from, to);
      if (suggestions.length) {
        suggestionsMenu.hidden = false;
        setSuggestionsMenuHTML(suggestions);
        suggestionsMenu.style.top = ev.y;
        suggestionsMenu.style.left = ev.x;
        ev.preventDefault();

        output.setSelectionRange(start, end + 1);
      } else {
        suggestionsMenu.hidden = true;
      }
    }
  };

  function getSuggestions(from, to) {
    const suggestions = [];
    let block, start, end;

    let safeExitCounter = 0;
    while (
      suggestions.length === 0 &&
      from > output.value.indexOf('[') &&
      to < input.value.lastIndexOf(']')
    ) {
      if (++safeExitCounter === 1e5) {
        debugger;
        throw new Error('endless loop detected');
      }
      ({ block, start, end } = getBlock(output.value, from, to));

      from = start;
      to = end;
      from--;
      to++;

      try {
        const {
          block: inputBlock,
          start: inputStart,
          end: inputEnd
        } = getMatchingBlock(output.value, start, end, input.value);

        const json = evaluate(block);

        if (
          Object.values(json).length === 1 &&
          Object.values(json)[0] === false
        ) {
          const start = inputStart + inputBlock.indexOf('false');
          const end = start + 'false'.length - 1;
          suggestions.push(changeFalseToNotTrue(start, end));
        }

        if (deepEqual(json, { $ne: true })) {
          suggestions.push(changeNotTrueToFalse(inputStart, inputEnd));
        }

        if (deepEqual(json, { $ne: [] })) {
          suggestions.push(
            changeNotEmptyArrayToArrayAndNotEmpty(inputStart, inputEnd)
          );
        }

        const $lookup = json.$lookup;
        if ($lookup?.localField) {
          suggestions.push(alterLookupToPipeline(json, inputStart, inputEnd));
        }
        if (
          /^\$[^\$]/.test($lookup?.pipeline?.[0]?.$match?.$expr?.$eq?.[0]) &&
          $lookup?.let?.[
            $lookup?.pipeline?.[0]?.$match?.$expr?.$eq?.[1]?.split?.('$$').pop()
          ]
        ) {
          suggestions.push(alterLookupToSimple(json, inputStart, inputEnd));
        }
        if ($lookup) {
          const nextJson = getNextJson(end, output.value);
          if (
            !nextJson?.$unwind &&
            !JSON.stringify(nextJson).includes(`"$elementAt":["$${$lookup.as}"`)
          ) {
            suggestions.push(addSingular(json, inputStart, inputEnd));
            suggestions.push(attachUnwind(json, inputStart, inputEnd));
          }
        }

        const prevJson = getPrevJson(start, output.value);
        const lookupAs = prevJson?.$lookup?.as;
        if (lookupAs) {
          if (json?.$unwind && json?.$unwind?.slice?.(1) === lookupAs) {
            suggestions.push(
              replaceUnwindWithSingular(lookupAs, inputStart, inputEnd)
            );
          }

          if (
            deepEqual(json, {
              $addFields: {
                [lookupAs]: {
                  $elementAt: [`$${lookupAs}`, 0]
                }
              }
            })
          ) {
            suggestions.push(
              replaceSingularWithUnwind(lookupAs, inputStart, inputEnd)
            );
          }
        }
      } catch (err) {
        console.log(err);
      }
    }
    return { suggestions, block, start, end };
  }

  function setSuggestionsMenuHTML(suggestions) {
    suggestionsMenu.innerHTML = `${suggestions
      .map(
        (p, i) => `<button class="menuButton" id="menu_${i}">${p.text}</button>`
      )
      .join('')}`;
    suggestions.forEach(
      (p, i) =>
        (document.getElementById('menu_' + i).onclick = () => {
          suggestionsMenu.hidden = true;
          output.onclick = null;
          p.action();
          action();
          setTimeout(() => {
            output.focus();
          }, 100);
        })
    );

    output.onclick = () => {
      if (!suggestionsMenu.hidden) suggestionsMenu.hidden = true;
    };
  }

  function changeFalseToNotTrue(inputStart, inputEnd) {
    return {
      text: 'Change to { $ne: true }',
      action: () => {
        const ne = { $ne: true };
        replaceInputJson(inputStart, inputEnd, ne);
      }
    };
  }

  function changeNotTrueToFalse(inputStart, inputEnd) {
    return {
      text: 'Change to false',
      action: () => {
        const falseString = false;
        replaceInputJson(inputStart, inputEnd, falseString);
      }
    };
  }

  function changeNotEmptyArrayToArrayAndNotEmpty(inputStart, inputEnd) {
    return {
      text: 'Change not empty array to "array & not empty"',
      action: () => {
        const arrayAndNotEmpty = { $gt: [] };
        replaceInputJson(inputStart, inputEnd, arrayAndNotEmpty);
      }
    };
  }

  function attachUnwind(json, start, end) {
    return {
      text: 'Attach $unwind',
      action: () => {
        const unwind = { $unwind: `$${json.$lookup.as}` };
        appendInputJson(end + 1, unwind);
      }
    };
  }

  function addSingular(json, start, end) {
    return {
      text: 'Attach $elementAt 0 to make result single',
      action: () => {
        const elementAt = {
          $addFields: {
            [json.$lookup.as]: { $elementAt: [`$${json.$lookup.as}`, 0] }
          }
        };
        appendInputJson(end + 1, elementAt);
      }
    };
  }

  function replaceSingularWithUnwind(path, start, end) {
    return {
      text: 'Replace singular with $unwind (to get many)',
      action: () => {
        const unwind = { $unwind: `$${path}` };
        replaceInputJson(start, end, unwind);
      }
    };
  }

  function replaceUnwindWithSingular(path, start, end) {
    return {
      text:
        'Replace $unwind with $elementAt 0 (Do this only if single return value is expected)',
      action: () => {
        const elementAt = {
          $addFields: {
            [path]: { $elementAt: [`$${path}`, 0] }
          }
        };
        replaceInputJson(start, end, elementAt);
      }
    };
  }

  function alterLookupToPipeline(json, start, end) {
    return {
      text: 'Transform into pipeline lookup',
      action: () => {
        const { from, as, localField, foreignField } = json.$lookup;
        const newLookup = {
          $lookup: {
            from,
            let: { id: `$${localField}` },
            pipeline: [
              { $match: { $expr: { $eq: [`$${foreignField}`, `$$id`] } } }
            ],
            as
          }
        };
        replaceInputJson(start, end, newLookup);
      }
    };
  }

  function alterLookupToSimple(json, start, end) {
    return {
      text: 'Transform into simple lookup (beta - could be buggy)',
      action: () => {
        // e.g. {
        //   $lookup: {
        //     from: "groups",
        //     let: { id: "$contextId" },
        //     pipeline: [ { $expr: { $eq: [ "$_id", "$$id" ] } } ],
        //     as: "groups"
        //   }
        // },
        const { from, as, let: lookUpLet, pipeline } = json.$lookup;
        const newLookup = {
          $lookup: {
            from,
            localField: lookUpLet[
              pipeline[0].$match.$expr.$eq[1].slice(2)
            ].slice(1),
            foreignField: pipeline[0].$match.$expr.$eq[0].slice(1),
            as
          }
        };
        let furtherMatch = '';
        const entries = Object.entries(pipeline[0].$match);
        if (entries.length > 1) {
          entries.splice(
            entries.findIndex(([k, v]) => k === '$expr'),
            1
          );

          furtherMatch = {
            $addFields: {
              [as]: {
                $filter: {
                  input: `$${as}`,
                  as: 'item',
                  cond:
                    entries.length > 1
                      ? {
                          $and: entries.map(([k, v]) => ({
                            $eq: [`$$item.${k}`, v]
                          }))
                        }
                      : {
                          $eq: [`$$item.${entries[0][0]}`, entries[0][1]]
                        }
                }
              }
            }
          };
        }
        replaceInputJson(start, end, newLookup, furtherMatch);
      }
    };
  }

  return getSuggestions;
})();
