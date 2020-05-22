const evaluate = (() => {
  return (s) =>
    Function(`
  const ObjectId = (s) => s;
  const ISODate = (s) => s;
  return ${s}`)();
})();
