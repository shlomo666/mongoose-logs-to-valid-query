(() => {
  const output = document.getElementById('outputCode');
  const suggestionsMenu = document.getElementById('suggestionsMenu');

  output.oncontextmenu = function (ev) {
    const suggestions = [];

    if (ev.button === 2) {
      let from = output.selectionStart + 1;
      let to = output.selectionEnd - 1;

      while (suggestions.length === 0 && from > output.value.indexOf('[')) {
        from--;
        to++;
        const { block, start, end } = getBlock(output.value, from, to);

        from = start;
        to = end;

        try {
          const {
            block: inputBlock,
            start: inputStart,
            end: inputEnd
          } = getMatchingBlock(output.value, start, end, input.value);

          const json = eval(`p=${block}`);
          const $lookup = json.$lookup;
          if ($lookup?.localField) {
            suggestions.push(alterLookupToPipeline(json, inputStart, inputEnd));
          }
          if (
            /^\$[^\$]/.test($lookup?.pipeline?.[0]?.$match?.$expr?.$eq?.[0]) &&
            $lookup?.let?.[
              $lookup?.pipeline?.[0]?.$match?.$expr?.$eq?.[1]
                ?.split?.('$$')
                .pop()
            ]
          ) {
            suggestions.push(alterLookupToSimple(json, inputStart, inputEnd));
          }
          if ($lookup) {
            try {
              const nextJson = getNextJson(end, output.value);
              if (
                !nextJson?.$unwind &&
                !JSON.stringify(nextJson).includes(
                  `"$elementAt":["$${$lookup.as}"`
                )
              ) {
                suggestions.push(addSingular(json, inputStart, inputEnd));
                suggestions.push(attachUnwind(json, inputStart, inputEnd));
              }
            } catch (e) {
              console.log(e);
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
              JSON.stringify(json) ===
              JSON.stringify({
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
    }
  };

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
        })
    );

    output.onclick = () => {
      if (!suggestionsMenu.hidden) suggestionsMenu.hidden = true;
    };
  }

  function attachUnwind(json, start, end) {
    return {
      text: 'Attach $unwind',
      action: () => {
        const unwind = { $unwind: `$${json.$lookup.as}` };
        input.value =
          input.value.slice(0, end + 1) +
          ',' +
          JSON.stringify(unwind) +
          input.value.slice(end + 1);

        action();
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
        input.value =
          input.value.slice(0, end + 1) +
          ',' +
          JSON.stringify(elementAt) +
          input.value.slice(end + 1);

        action();
      }
    };
  }

  function replaceSingularWithUnwind(path, start, end) {
    return {
      text: 'Replace singular with $unwind (to get many)',
      action: () => {
        const unwind = { $unwind: `$${path}` };
        input.value =
          input.value.slice(0, start) +
          JSON.stringify(unwind) +
          input.value.slice(end + 1);

        action();
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
        input.value =
          input.value.slice(0, start) +
          JSON.stringify(elementAt) +
          input.value.slice(end + 1);

        action();
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

        input.value =
          input.value.slice(0, start) +
          JSON.stringify(newLookup) +
          input.value.slice(end + 1);

        action();
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

        input.value =
          input.value.slice(0, start) +
          JSON.stringify(newLookup) +
          (furtherMatch ? ',' + JSON.stringify(furtherMatch) : '') +
          input.value.slice(end + 1);

        action();
      }
    };
  }
})();