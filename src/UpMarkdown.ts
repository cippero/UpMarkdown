import * as fs from 'fs';
import * as p from 'path';
// import * as c from 'crypto';

interface IPaths {
  [filePath: string]: IPath;
}

interface IPath {
  path: string;
  // hash: string;
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
  private _DIR: string;
  private _RE: RegExp = new RegExp(/\[.+?\](\(|:\s)(?!https?|www|ftps?)([^\)|\s]+)/, 'g');
  // private instances: number = 0;
  db: IPaths;

  constructor(dirInput: string, dbInput?: IPaths) {
    this.db = dbInput || {};
    this._DIR = dirInput;
  }

  //scan to store file structure snapshot in storage
  scanFiles(directory: string = this._DIR): void {
    if (directory === '') { throw new Error('No input directory specified.'); }
    fs.readdir(directory, (err, files): void => {
      if (err) { throw err; }
      files.forEach((fileName) => {
        const filePath = directory + '/' + fileName;
        if (fs.existsSync(filePath)) {
          const stats = fs.lstatSync(filePath);
          if (stats.isDirectory()) { this.scanFiles(filePath); }
          else if (stats.isFile()) {
            // this.instances++;
            this.saveFile(fileName, filePath);
            // this.instances--;
          }
          // this.updateLinks();
        }
      });
    });
  }

  // printInstances(): void {
  //   const interval = setInterval(() => {
  //     console.log(Object.keys(this.db).length);
  //   }, 10);
  //   setTimeout(() => {
  //     clearInterval(interval);
  //   }, 1000);
  // }

  //save the file's data in storage
  saveFile(fileName: string, filePath: string): void {
    if (typeof this.db[fileName] !== 'undefined') {
      console.error('File already exists in storage.');
      // this.updateFile(fileName, filePath);
    }
    // console.log('**************************');
    // console.log(`2. Adding ${fileName}.`);
    this.db[fileName] = {
      // hash,
      path: filePath,
      links: /^.+\.md$/.test(fileName) ? this.extractLinks(filePath) : {}
    };
    // console.log(`2. Added ${fileName}.`);
    // console.log('**************************');
  }

  //update the file's data in storage
  // updateFile(fileName: string, filePath: string): void {
  //   const hash = c.createHash('md5').update(fs.readFileSync(filePath, 'utf8')).digest("hex");
  //   if (typeof this.db[fileName] !== 'undefined') {
  //     console.log(`2. ${fileName} already exists in storage.`);
  //     if (this.db[fileName].hash !== hash) {
  //       this.db[fileName].links = this.extractLinks(filePath);
  //       console.log(`  Updated $LINKS for ${fileName}.`);
  //       // } else {
  //       // console.log(`  Didn't update $LINKS for ${fileName} - hash hasn't changed:\n
  //       // old: ${this.db[fileName].hash}\n
  //       // new: ${hash}`);
  //     }
  //     if (this.db[fileName].path !== filePath) {
  //       this.db[fileName].path = filePath;
  //       console.log(`  Updated $PATH for ${fileName}.`);
  //       this.updateRefs(fileName);
  //       // } else {
  //       //   console.log(`  Didn't update $PATH for ${fileName} - path hasn't changed:\n
  //       //   old: ${this.db[fileName].path}\n
  //       //   new: ${filePath}`);
  //     }
  //   }
  // }

  //extract links that refer to other files from current file
  extractLinks(filePath: string): ILink {
    const fileData: string = fs.readFileSync(filePath, 'utf8');
    let match, matches: ILink = {};

    do {
      match = this._RE.exec(fileData);
      if (match !== null) {
        const fileName: string = p.basename(match[2]);
        // const path: string = p.relative(filePath, this.db[fileName].path);
        const linkInstance: { locationInFile: number, lengthOfLink: number } = {
          locationInFile: fileData.indexOf(match[2]),
          lengthOfLink: match[2].length
        };

        typeof matches[fileName] === 'undefined'
          ? matches[fileName] = { linkInstances: [linkInstance] }
          : matches[fileName].linkInstances.push(linkInstance);
      }
    } while (match);
    // for (let m in matches) { console.log(matches[m]); }
    return matches;
  }

  //update links to current file
  updateLinks(files: string[] = []): void {
    files = files.length > 0 ? files : Object.keys(this.db);
    files.forEach((fileName) => {
      if (!/^.+\.md$/.test(fileName)) { return; }
      const fileData: string = fs.readFileSync(this.db[fileName].path, 'utf8');
      const links: string[] = Object.keys(this.db[fileName].links);
      links.forEach((link) => {
        const relPath: string = p.relative(this.db[fileName].path.substring(
          0, this.db[fileName].path.length - fileName.length - 1), this.db[link].path);
        // console.log(`relative path from ${fileName} to ${link} is: ${relPath}`);
        const linkInstances = this.db[fileName].links[link].linkInstances;
        linkInstances.forEach((inst) => {
          console.log(fileData.slice(inst.locationInFile, inst.locationInFile + inst.lengthOfLink));


          // fs.open('/open/some/file.txt', 'r', (err, fd) => {
          //   if (err) throw err;
          //   fs.fstat(fd, (err, stat) => {
          //     if (err) throw err;
          //     // use stat

          //     // always close the file descriptor!
          //     fs.close(fd, (err) => {
          //       if (err) throw err;
          //     });
          //   });
          // });


          // fs.open(this.db[fileName].path, 'w', (err, fd) => {

          //   fs.close(fd, (err) => { console.error(err); });
          // });


          // const fd: number = fs.openSync(this.db[fileName].path, 'r');
          // console.log(fd);
          // fs.write();


          // fs.createWriteStream(this.db[fileName].path, 'r+');
        });
      });
    });
  }

  testLoop(num: number): void {
    for (let i = 0; i < num; i++) {
      console.log(i);
    }
  }


  updateRefs(fileName: string): any {
    // loop through db, for any file that has links to this file, update its relative path

    // if (fileName in this.db[file].links) {
    console.log(`------------${fileName}---------------`);
    console.log(this.db[fileName].links);
    console.log('-----------------------------------------------');
    // }
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
    // }
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

  printLinks = (): void => {
    let links: number = 0;
    setTimeout(() => {
      console.log('------------------------');
      for (let file in this.db) {
        links += Object.keys(this.db[file].links).length;
        let fileName: string = p.basename(this.db[file].path);
        console.log(`----${fileName}:`);
        console.log(this.db[file].links);
        //   const fileLinks: number = Object.keys(uMd.db[file].links).length;
        //   if (fileLinks > 0) { links += fileLinks; }
      }
      console.log(`${links} links found`);
      console.log('------------------------');
    }, 100);
  }
}

// const Umd = new UpMarkdown(__dirname);
// Umd.scanFiles(Umd.rootDirectory);

