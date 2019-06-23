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

*/

import * as fs from 'fs';
import * as crypto from 'crypto';

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

const sampleIPath: IPath = {
  path: 'samplePath',
  links: {
    'sampleLink': [1, 1]
  }
};

let dbSample: IPaths = {
  'sampleFile': sampleIPath
};

class UpMarkdown {
  // private db: IPaths = dbSample;
  private db = {} as IPaths;

  //scan for fs snapshot initially (and when a file is edited?)
  scanFiles(): void {
    fs.readdir('/home/gilwein/code/temp/upmarkdown/src/_testFileStructureFunctionality', (err, files): void => {
      // fs.readdir('.', (err, files): void => {
      if (err) { throw err; }
      const currentDirectory = __dirname.replace(/.*\//, '');
      for (let file in files) {
        // if (fs.existsSync(files[file]) && fs.lstatSync(files[file]).isDirectory()) { // if current file is a directory
        if (fs.existsSync(files[file]) && !fs.lstatSync(files[file]).isDirectory() && /^.+\.md$/.test('' + files[file])) {
          console.log(files[file]);
          let data = fs.readFileSync(files[file], 'utf8');
          // let links = this.extractLinks(data);
          let hash = crypto.createHash('md5').update(data).digest("hex");
          console.log(hash);
        }
      }
    });
  }

  extractLinks(data: string): void {
    const links = data.match(/\[(.+)\])\[|\(/g);
    console.log(links);
  }

  //add or update the file's data in the fs snapshot
  addFileToStorage(fileName: string, filePath: IPath): void {
    // file exists in db? update : add;
    // console.log(`file value is: "${file}"`);
    // console.log(`typeof: ${typeof db[file]}, value: ${db[file]}`);
    if (typeof this.db[fileName] !== 'undefined') {
      if (this.db[fileName] !== filePath) {
        this.db[fileName] = filePath;
        console.log(`2. Updated ${fileName}.`);
      }
      console.log(`2. ${fileName} wasn't modified. Didn't update.`);
    } else {
      this.db[fileName] = filePath;
      console.log(`2. Added ${fileName}.`);
    }
  }

  //watch for file edits
  watchFiles(): void {
    fs.watch(__dirname, { recursive: true }, (eventType: string, filename: string): void => {
      if (filename) {
        console.log(`1. ${filename}: ${eventType}`);
        if (eventType === 'rename') {
          this.addFileToStorage('file1', sampleIPath);
          console.log('3.', this.db);
        }
      }
    });
  }
}

const uMd = new UpMarkdown();
uMd.scanFiles();
