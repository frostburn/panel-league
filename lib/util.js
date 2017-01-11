/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items The array containing the items.
 */
module.exports.shuffle = ((a) => {
  for (let i = a.length; i; --i) {
    let j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
  }
});
