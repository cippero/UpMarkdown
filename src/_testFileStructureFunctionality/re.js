/*
https://regexr.com/

matches text in [] and () including the parentheses, excluding preceding [alt-text]
e.g. [link text][link/to/file.md] -> "[link/to/file.md]"

issues: 
  1. it matches links e.g. [lnk_example]: www.google.com -> ": www.google.com"
  2. it captures brackets/parentheses and preceding e.g. "[captured.md]", "(captured.md)", ": captured.md"
*/

// const re = new RegExp(/(?<=!?\[.*?\])(\[.*?\])?(\(.*?\))?(:\s.*)?/, 'g');
const re = new RegExp(/(?<=!?\[.+?\]\(|:\s)(.+?)\)/, 'g');

const s = 'test [link](dir1/file10.md)';

console.log(re.exec(s)[1]);