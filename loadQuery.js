window.onload = () => {
  const queryEnc = window.location.search.split('query=').pop();
  const query = atob(queryEnc);
  setTimeout(() => {
    input.value = query;
    action();
  }, 10);
};
