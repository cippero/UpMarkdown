const fs = require('fs');

((filePath) => {
  const _RE = new RegExp(/\[.+?\](\(|:\s)(?!https?|www|ftps?)([^\)|\s]+)/, 'g');
  const data = fs.readFileSync(filePath, 'utf8');
  let match, matches = {};

  do {
    match = _RE.exec(data);
    if (match !== null) {
      const fileName = match[2].substring(match[2].lastIndexOf("/") + 1);
      const linkInstance = { locationInFile: match.index, lengthOfLink: match[2].length };
      if (typeof matches[fileName] === 'undefined') {
        matches[fileName] = {};
        matches[fileName].path = '';
        matches[fileName].linkInstances = [linkInstance];
      } else { matches[fileName].linkInstances.push(linkInstance); }
    }
  } while (match);
  for (let m in matches) { console.log(matches[m]); }
})('/home/gilwein/code/projects/upmarkdown/src/_testFileStructureFunctionality/file0.md');

// ---------------
inFile = '/home/gilwein/code/projects/upmarkdown/src/_testFileStructureFunctionality/file0.md';

referredFile = '/home/gilwein/code/projects/upmarkdown/src/_testFileStructureFunctionality/dir1/file10.md';
relPath = 'dir1/file10.md';

referredFile2 = '/home/gilwein/code/projects/upmarkdown/src/_testFileStructureFunctionality/dir2/dir21/file100.md';
relPath = 'dir2/dir21/file100.md';
// ---------------
inFile = '/home/gilwein/code/projects/upmarkdown/src/_testFileStructureFunctionality/dir1/file0.md';

referredFile = '/home/gilwein/code/projects/upmarkdown/src/_testFileStructureFunctionality/file10.md';
relPath = '../file10.md';

referredFile2 = '/home/gilwein/code/projects/upmarkdown/src/_testFileStructureFunctionality/dir2/dir21/file100.md';
relPath = '../dir2/dir21/file100.md';
