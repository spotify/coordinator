import getFillCoords from '../getFillCoords';

describe('test function getFillCoords', () => {
  it('should give random points inside the svg', () => {
    const item = [[23, 15], [66, 11], [299, 10], [20, 500]];
    const result = getFillCoords(item, item.length);
    expect(result[0][0]).toBeLessThan(299);
    expect(result[0][1]).toBeLessThan(500);
  });
});