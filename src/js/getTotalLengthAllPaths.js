export default function getTotalLengthAllPaths (paths) {
  let totalLengthAllPaths = 0;
  for (let i = 0; i < paths.length; i++) {
    totalLengthAllPaths += paths[i].getTotalLength();
  }
  return totalLengthAllPaths;
}
