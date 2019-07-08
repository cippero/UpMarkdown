/*
1. select mother directory and assign Path var to the name of the mother directory

2. recursively look for other directories, if exists go in and add name of directory to Path var

3. if not directory, assign name of file as key with the value as an object with Path var and 
location in file of all links to update (what if two files in different locations have the same name?)

example fs:
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


4. when done saving fs into an object/database, go into each file and update the links in the text. 
*if using relative paths instead of absolute, another step after this one will require to update the 
length value of each link reference*

example fs if file1 has references to both file2 and file3:
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

5. To convert app into continuously link updating, use fs.watch() to watch for files emitting the "rename" event:

"change" = file was edited => nothing
"rename" = file was renamed OR moved OR deleted => update references TO the file & FROM the file

*6. When refactoring for watching/automatic updates change db to obj for faster performance
updating specific files, instead of linear speed looping 
[ToDo] refactor db object to set

-----------------
known issues:

- before continuous updates is implemented, changing a file's name and content without scanning in between those actions
will result in a new snapshot being created in storage without removing the old one, and other issues

*/

import * as fs from 'fs';
import * as crypto from 'crypto';
// const partition = require('lodash.partition');

interface IPaths {
  [filePath: string]: IPath;
}

interface IPath {
  path: string;
  hash: string;
  links: ILink;
  // links: {
  // } & {
  //   [fileName: string]: ILink
  // };
}

interface ILink {
  [fileName: string]: {
    relativePath: string;
    locationInFile: number;
    lengthOfLink: number;
  };
}


const sampleIPath: IPath = {
  path: '/home/gilwein/code/temp/upmarkdown/src/_testFileStructureFunctionality/file0.md',
  hash: '9366a95710845fef95979a2d2073b577',
  links: {
    'file10.md': { relativePath: 'dir1 / ', locationInFile: 85, lengthOfLink: 14 },
    'test.png': { relativePath: 'media/', locationInFile: 116, lengthOfLink: 14 }
  }
};

let dbSample: IPaths = {
  'file0.md': sampleIPath
};

class UpMarkdown {
  db: IPaths;
  // set: object;

  constructor(dbInput?: IPaths) {
    this.db = dbInput || {};
    // this.set = new Set();
  }

  //scan for fs snapshot initially (and when a file is edited?)
  scanFiles(directory: string): void {
    fs.readdir(directory, (err, files): void => {
      if (err) { throw err; }
      for (let i in files) {
        const currentFile = directory + '/' + files[i];
        if (fs.existsSync(currentFile)) {
          const stats = fs.lstatSync(currentFile);
          if (stats.isDirectory()) {
            this.scanFiles(currentFile);
          }
          else if (stats.isFile() && /^.+\.md$/.test(currentFile)) {
            this.SaveOrUpdateFile(files[i], currentFile);
          }
        }
      }
    });
  }

  //save or update the file's data in storage
  SaveOrUpdateFile(fileName: string, filePath: string): void {
    // file exists in db? update : add;
    const hash = crypto.createHash('md5').update(fs.readFileSync(filePath, 'utf8')).digest("hex");
    if (typeof this.db[fileName] !== 'undefined') {
      console.log(`2. ${fileName} already exists in storage.`);
      if (this.db[fileName].hash !== hash) {
        this.db[fileName].links = this.extractLinks(filePath);
        console.log(`  Updated $LINKS for ${fileName}.`);
        // } else {
        // console.log(`  Didn't update $LINKS for ${fileName} - hash hasn't changed:\n
        // old: ${this.db[fileName].hash}\n
        // new: ${hash}`);
      }
      if (this.db[fileName].path !== filePath) {
        this.db[fileName].path = filePath;
        console.log(`  Updated $PATH for ${fileName}.`);
        this.updateRefs(fileName, filePath);
        // } else {
        //   console.log(`  Didn't update $PATH for ${fileName} - path hasn't changed:\n
        //   old: ${this.db[fileName].path}\n
        //   new: ${filePath}`);
      }
    } else {
      this.db[fileName] = {
        hash,
        path: filePath,
        links: this.extractLinks(filePath)
      };
      console.log(`2. Added ${fileName}.`);
      console.log('**************************');
      // console.log(this.db);
    }
    // console.log(`2. ${fileName} wasn't modified. Didn't update.`);
  }

  extractLinks(file: string): ILink {
    const data: string = fs.readFileSync(file, 'utf8');
    const re: RegExp = new RegExp(/(?<=!?\[.+?\]\(|:\s)(.+?)\)/, 'g');
    let match, matches: ILink = {};

    while ((match = re.exec(data)) !== null) {
      let fileName: string, relativePath: string, div: number = match[1].lastIndexOf("/");
      fileName = match[1].substring(div + 1);
      relativePath = match[1].substring(0, div + 1);

      matches[fileName] = {
        relativePath,
        locationInFile: match.index,
        lengthOfLink: match[1].length,
      };
    }
    return matches;
  }

  //update references to current file
  updateRefs(fileName: string, filePath: string) {

  }

  // //watch for file edits
  // watchFiles(): void {
  //   fs.watch(__dirname, { recursive: true }, (eventType: string, filename: string): void => {
  //     if (filename) {
  //       console.log(`1. ${filename}: ${eventType}`);
  //       if (eventType === 'rename') {
  //         this.SaveOrUpdateFile('file1', sampleIPath.path);
  //         console.log('3.', this.db);
  //       }
  //     }
  //   });
  // }
}

const uMd = new UpMarkdown(dbSample);
uMd.scanFiles(__dirname);

const printLinks = () => {
  let links: number = 0;
  setTimeout(() => {
    console.log('------------------------');
    for (let file in uMd.db) {
      links += Object.keys(uMd.db[file].links).length;
      console.log(uMd.db[file].links);
      //   const fileLinks: number = Object.keys(uMd.db[file].links).length;
      //   if (fileLinks > 0) { links += fileLinks; }
    }
    console.log(`${links} links found`);
    console.log('------------------------');
  }, 1000);
};

printLinks();
