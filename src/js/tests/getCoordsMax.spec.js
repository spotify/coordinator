import getCoordsMax from '../getCoordsMax';

describe('test function getCoordsMax', () => {
  it('should get the max coord of an index', () => {
    const item = [[23, 15], [66, 11], [299, 10], [20, 500]];
    const resultOne = getCoordsMax(item, 0);
    const resultTwo = getCoordsMax(item, 1);
    expect(resultOne).toBe(299);
    expect(resultTwo).toBe(500);
  });
});