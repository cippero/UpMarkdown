import * as fs from 'fs';
import * as crypto from 'crypto';

interface IPaths {
  [filePath: string]: IPath;
}

interface IPath {
  path: string;
  hash: string;
  links: ILink;
}

interface ILink {
  [fileName: string]: {
    relativePath: string;
    locationsInFile: number[];
    lengthOfLink: number;
    /* __for live updating__
    outdated: boolean; 
    flip when the referred file is moved, 
    which marks that the link to this file
    should be updated in the referring file */
  };
}


const sampleIPath: IPath = {
  path: '/home/gilwein/code/temp/upmarkdown/src/_testFileStructureFunctionality/file0.md',
  hash: '9366a95710845fef95979a2d2073b577',
  links: {
    'file10.md': { relativePath: 'dir1 / ', locationsInFile: [85], lengthOfLink: 14 },
    'test.png': { relativePath: 'media/', locationsInFile: [116], lengthOfLink: 14 }
  }
};

let dbSample: IPaths = {
  'file0.md': sampleIPath
};

export class UpMarkdown {
  db: IPaths;
  // set: object;
  rootDirectory: string;
  reLinks: RegExp;

  constructor(dirInput: string, dbInput?: IPaths) {
    this.db = dbInput || {};
    // this.set = new Set();
    this.rootDirectory = dirInput;
    this.reLinks = new RegExp(/\[.+?\](\(|:\s)(?!https?|www|ftps?)([^\)|\s]+)/, 'g');
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

  extractLinks(file: string): ILink {
    const data: string = fs.readFileSync(file, 'utf8');
    let match, matches: ILink = {};

    let iterations: number = 0;
    while ((match = this.reLinks.exec(data)) !== null) {
      console.log(`Iteration ${iterations++} - RE matches in "${file}": \n  ${match}`);
      // let div: number = match[1].lastIndexOf("/");
      const fileName: string = match[2].substring(match[2].lastIndexOf("/") + 1);
      const relativePath: string = match[2];
      console.log(`fileName: ${fileName}\nrelativePath: ${relativePath}`);
      if (typeof matches[fileName] !== 'undefined') {
        matches[fileName] = {
          relativePath,
          locationsInFile: [match.index],
          lengthOfLink: match[2].length,
        };
      } else {
        if (!(match.index in matches[fileName].locationsInFile)) { matches[fileName].locationsInFile.push(match.index); }
      }
    }
    return matches;
  }

  //update references to current file
  updateRefs(fileName: string, filePath: string): any {

  }

  updateLinks(): any {
    // 1. loop through files in db
    // 2. for every referred link in file, update link based on actual referred file's location
    for (let file in this.db) {
      for (let link in this.db[file].links) {
        this.db[file].links[link] = {
          relativePath: 'dir1/',
          locationsInFile: [85],
          lengthOfLink: 5
        };
      }
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

const Umd = new UpMarkdown(__dirname, dbSample);
Umd.scanFiles(Umd.rootDirectory);

export const printLinks = (db: IPaths) => {
  let links: number = 0;
  setTimeout(() => {
    console.log('------------------------');
    for (let file in db) {
      links += Object.keys(db[file].links).length;
      let fileName: string = db[file].path.slice(db[file].path.lastIndexOf('/') + 1);
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

/* ------------------------ToDoS
1. Fix logic not picking up all files/links atm
*/
