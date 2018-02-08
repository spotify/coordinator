export default function flatten (arrOfArrs) {
  const flatArr = [];
  arrOfArrs.forEach( arrs => {
    arrs.forEach( arr => {
      flatArr.push(arr);
    });
  });
  return flatArr;
}
