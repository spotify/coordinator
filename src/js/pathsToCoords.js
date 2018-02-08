import flatten from './flatten';
import polygonize from './polygonize';
import getTotalLengthAllPaths from './getTotalLengthAllPaths';


export default function pathsToCoords ( paths, scale, numPoints, translateX, translateY ) {
  const totalLengthAllPaths = getTotalLengthAllPaths( paths );

  let separatePathsCoordsCollection = [];
  let individualPathPoints;

  let pointsForPath;
  let runningPointsTotal = 0;
  for (let i = 0; i < paths.length; i++) {

    if (i + 1 === paths.length) {
      //ensures that the total number of points = the actual requested number (because using rounding)
      pointsForPath = numPoints - runningPointsTotal;
    } else {
      pointsForPath = Math.round(numPoints * paths[i].getTotalLength() / totalLengthAllPaths);
      runningPointsTotal += pointsForPath;
    }
    individualPathPoints = polygonize(paths[i], pointsForPath, scale, translateX, translateY);
    separatePathsCoordsCollection.push(individualPathPoints);
  }
  return flatten(separatePathsCoordsCollection);
}
