export default function getTotalLengthAllPaths (paths) {
  return Array.from(paths).reduce((prev, curr) => {
    return prev + curr.getTotalLength();
  }, 0);
}
