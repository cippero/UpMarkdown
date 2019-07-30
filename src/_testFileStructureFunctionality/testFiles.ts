import * as fs from 'fs';
import * as p from 'path';
import * as c from 'crypto';

interface IPaths {
  [filePath: string]: IPath;
}

interface IPath {
  path: string;
  hash: string;
  links: {
    [fileName: string]: {
      linkInstances: [{
        locationInFile: number;
        lengthOfLink: number;
      }]
    }
  };
}

interface ILink {
  [fileName: string]: {
    // path: string;
    linkInstances: [{
      locationInFile: number;
      lengthOfLink: number;
    }]
    /* __for live updating__
    outdated: boolean; 
    flip when the referred file is moved, 
    which marks that the link to this file
    should be updated in the referring file */
  };
}


// const sampleIPath: IPath = {
//   path: '/home/gilwein/code/temp/upmarkdown/src/_testFileStructureFunctionality/file0.md',
//   hash: '9366a95710845fef95979a2d2073b577',
//   links: {
//     'file10.md': { absPath: '', relPath: 'dir1 / ', locationsInFile: [85], lengthOfLink: 14 },
//     'test.png': { absPath: '', relPath: 'media/', locationsInFile: [116], lengthOfLink: 14 }
//   }
// };

// let dbSample: IPaths = {
//   'file0.md': sampleIPath
// };

export class UpMarkdown {
  _RE: RegExp = new RegExp(/\[.+?\](\(|:\s)(?!https?|www|ftps?)([^\)|\s]+)/, 'g');
  db: IPaths;
  // set: object;
  rootDirectory: string;

  constructor(dirInput: string, dbInput?: IPaths) {
    this.db = dbInput || {};
    // this.set = new Set();
    this.rootDirectory = dirInput;
  }

  //scan for fs snapshot initially (and when a file is edited?)
  scanFiles(directory: string): void {
    if (directory === '') { throw new Error('No input directory specified.'); }
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
            // console.log(`fileName: ${files[i]} \nfilePath: ${currentFile}`);
          }
        }
      }
    });
  }

  //save or update the file's data in storage
  SaveOrUpdateFile(fileName: string, filePath: string): void {
    // file exists in db? update : add;
    const hash = c.createHash('md5').update(fs.readFileSync(filePath, 'utf8')).digest("hex");
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
      console.log('**************************');
      console.log(`2. Adding ${fileName}.`);
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

  extractLinks(filePath: string): ILink {
    const data: string = fs.readFileSync(filePath, 'utf8');
    let match, matches: ILink = {};

    do {
      match = this._RE.exec(data);
      if (match !== null) {
        // console.log(match[2]);
        const fileName: string = p.basename(match[2]);
        // const path: string = this.db[fileName].path;
        // const path: string = p.relative(filePath, this.db[fileName].path);
        const linkInstance: { locationInFile: number, lengthOfLink: number } = {
          locationInFile: match.index, lengthOfLink: match[2].length
        };

        if (typeof matches[fileName] === 'undefined') {
          matches[fileName] = {
            // path,
            linkInstances: [linkInstance]
          };
        } else { matches[fileName].linkInstances.push(linkInstance); }
      }
    } while (match);
    for (let m in matches) { console.log(matches[m]); }
    return matches;
  }

  updateLinks(): any {
    setTimeout(() => {
      for (let file in this.db) {
        this.updateRefs(p.basename(this.db[file].path), this.db[file].path);
      }
    }, 100);
    // printLinks(this.db);
  }

  // interface IPath {
  //   path: string;
  //   hash: string;
  //   links: {
  //     [fileName: string]: {
  //       linkInstances: [{
  //         locationInFile: number;
  //         lengthOfLink: number;
  //       }]
  //     }
  //   };
  // }
  //update references to current file
  updateRefs(fileName: string, filePath: string): any {
    // loop through db, for any file that has links to this file, update its relative path
    // const newLinks = this.extractLinks(filePath);

    // [ToDo: FIX]
    for (let file in this.db) {
      if (fileName in this.db[file].links) {
        console.log(fileName);
        console.log(this.db[file].links[fileName]);
      }
      // for (let link in this.db[file].links) {
      //   console.log(link, fileName);
      //   if (link === fileName) {
      //     // const {i, l} = this.db[file].links[link];
      //     console.log(this.db[file].links[link]);
      // const newPath = ''; // resolve based on currentPath and filePath
      // this.db[file].links[link].path = newPath;
      //   this.db[file].links[link] = {
      //     absPath: '',
      //     relPath: 'dir1/',
      //     locationsInFile: [85],
      //     lengthOfLink: 5
      //   };
      // for (let loc in this.db[file].links[link].locationsInFile) {
      //   // edit file content with new link
      // }
      // }
    }
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

const Umd = new UpMarkdown(__dirname);
Umd.scanFiles(Umd.rootDirectory);

export const printLinks = (db: IPaths) => {
  let links: number = 0;
  setTimeout(() => {
    console.log('------------------------');
    for (let file in db) {
      links += Object.keys(db[file].links).length;
      let fileName: string = p.basename(db[file].path);
      console.log(`----${fileName}:`);
      console.log(db[file].links);
      //   const fileLinks: number = Object.keys(uMd.db[file].links).length;
      //   if (fileLinks > 0) { links += fileLinks; }
    }
    console.log(`${links} links found`);
    console.log('------------------------');
  }, 100);
};

// printLinks(uMd.db);
