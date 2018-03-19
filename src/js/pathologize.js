//Thank you Rich!! https://pathologist.surge.sh/
import * as pathologist from 'pathologist';
import { load } from 'opentype.js';

const FONT_URL =
  'https://sp-bootstrap.global.ssl.fastly.net/8.0.0/fonts/circular-book.woff';
let loadedFont;

export default function pathologize(original) {
  //handles issues with pathologist not parsing text and style elements
  if (loadedFont !== undefined) {
    return pathologizeWithFont(original, loadedFont);
  }
  return load(FONT_URL, (err, font) => {
    if (err) {
      return pathologizeWithFont(original, null);
    }
    return pathologizeWithFont(original, font);
  });
}

export function pathologizeWithFont(original, font) {
  // caches font as to not load it every time
  loadedFont = font;
  const reText = /<text[\s\S]*?<\/text>/g;
  const reStyle = /<style[\s\S]*?<\/style>/g;
  const transformedText = original.replace(reText, text =>
    transformText(text, font)
  );
  const removedStyle = transformedText.replace(reStyle, '');

  try {
    const pathologized = pathologist.transform(removedStyle);
    return pathologized;
  } catch (e) {
    return original;
  }
}

export function transformText(text, font) {
  if (font === null) {
    return '';
  }
  // to generate a path from text we need
  // x and y coordinates, font size and inner text
  // these can be deduced from the text tag.
  // all of the values are supposed to be in pixels
  // defaults are: x=0, y=0,  font size=12
  const reInnerText = />([^<]*)</;
  const innerText = text.match(reInnerText) ? text.match(reInnerText)[1] : '';
  if (innerText === '') {
    return '';
  }

  const reX = / x="([^"]*)"/;
  const reY = / y="([^"]*)"/;
  const reFS = / font-size="([^"]*)"/;

  const x = text.match(reX) ? parseFloat(text.match(reX)[1]) : 0;
  const y = text.match(reX) ? parseFloat(text.match(reY)[1]) : 0;
  const fontSize = text.match(reFS) ? parseFloat(text.match(reFS)[1]) : 12;
  const { commands } = font.getPath(innerText, x, y, fontSize);
  // commands is an array of objects where type is either M, L, Q or Z.
  // we can build a path from that array
  
  const pathFromText = commands.reduce((prev, curr) => {
    switch (curr.type) {
    case 'M':
      return prev + `M ${curr.x} ${curr.y} `;
    case 'L':
      return prev + `L ${curr.x} ${curr.y} `;
    case 'Q':
      return prev + `Q ${curr.x1} ${curr.y1}, ${curr.x} ${curr.y} `;
    case 'Z':
      return prev + 'Z ';
    default:
      return prev;
    }
  }, '');

  return `<path d="${pathFromText}"/>`;
}
