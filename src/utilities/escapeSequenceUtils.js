export function interpretEscapeSequences(input) {
  // Replace escape sequences with their actual characters
  return input
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\'/g, '\'')
    // eslint-disable-next-line no-useless-escape
    .replace(/\\"/g, '\"')
    .replace(/\\\\/g, '\\');
}
