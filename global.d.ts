interface String {
  replaceButNotSpan(
    searchValue: string | RegExp,
    replacer: (substring: string, ...args: any[]) => string
  ): string;
}
