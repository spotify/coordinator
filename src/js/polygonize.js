import { range } from 'd3-array';

export default function polygonize (path, numPoints, scale, translateX, translateY) {
  //Thank you Noah!! http://bl.ocks.org/veltman/fc96dddae1711b3d756e0a13e7f09f24

  const length = path.getTotalLength();

  return range(numPoints).map(function(i) {
    const point = path.getPointAtLength(length * i / numPoints);
    return [point.x * scale + translateX, point.y * scale + translateY];
  });
}
