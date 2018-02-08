//Thank you Rich!! https://pathologist.surge.sh/
import * as pathologist  from 'pathologist';

export default function pathologize (original) {

  //handles issues with pathologist not parsing text and style elements
  const reText = /<text[\s\S]*?<\/text>/g;
  const reStyle = /<style[\s\S]*?<\/style>/g;
  const removedText = original.replace(reText, '');
  const removedStyle = removedText.replace(reStyle, '');

  try {
    const pathologized = pathologist.transform(removedStyle);
    return pathologized;
  } catch (e)  {
    return original;
  }
}
