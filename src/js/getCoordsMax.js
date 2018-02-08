export default function getCoordsMax( coords, index) {
  const max = coords.map(x => {
    return x[index];
  })
    .reduce(function(a, b) {
      return Math.max(a, b);
    });
  return max;
}
