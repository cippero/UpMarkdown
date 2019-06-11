// 1. select mother directory and assign Path var to the name of the mother directory

// 2. recursively look for other directories, if exists go in and add name of directory to Path var

// 3. if not directory, assign name of file as key with the value as an object with Path var and location in file of all links to update
// (what if two files in different locations have the same name?)

/* example fs:
dir1/file1
dir1/file2
dir1/dir2
dir1/dir2/file3
dir1/dir2/dir3
dir1/dir2/dir3/file4

- dir1 is mother directory, Path = "dir1"
- file1 is saved as file1 = {path: path, links: {fileName: (position, length)}}
file1.path -> "dir1"
file1.links.file2 -> (600, 32)
*/

// 4. when done saving fs into an object/database, go into each file and update the links in the text. 
// *if using relative paths instead of absolute, another step after this one will require to update the length value of each link reference*

/* example fs if file1 has references to both file2 and file3:
dir1/file1
dir1/file2
dir1/dir2/file3

file2 moved to dir2:
dir1/file1
dir1/dir2/file2
dir1/dir2/file3

first, scan and update the fs object:
file2.path updates from "dir1" to "dir1/dir2", based on Path var
file2.links stays the same
file1.path stays the same
file1.links.file2 stays the same

then, update links:
file2.path & file2.links stays the same
file1.path stays the same
file1 link to file2 in the text is updated based on new path of file2 minus current path
*file1.links.file2 is updated with the new length

*length doesn't need to be updated if only using absolute paths*
*/

import * as fs from 'fs';
import * as path from 'path';

interface IPaths {
  [prop: string]: IPath; //fileName: file props
}

interface IPath {
  path: string;
  links: {
  } & {
    [prop: string]: [number, number], //fileName: [location, length]
  };
}

const getFS = (): IPaths => {

  return {
    'file1': { path: '/path', links: { 'name-of-file': [50, 12] } },
    'file2': { path: '/path2', links: { 'name-of-file': [100, 12] } }
  };
};

fs.readdir('.', function (err, files) {
  const currentPath = path.resolve(__dirname).replace(/.*\//, '');
  if (err) { throw err; }
  for (let i in files) {
    if (fs.existsSync(files[i]) && fs.lstatSync(files[i]).isDirectory()) {
      console.log(files[i]);
    }
  }
});