import * as fs from 'fs';
import * as p from 'path';
import * as vscode from 'vscode';
// import * as c from 'crypto';

interface IPaths {
  [filePath: string]: {
    path: string;
    // hash: string;
    links: {
      [fileName: string]: {
        linkInstances: [{
          newLinkPath: string;
          oldLinkPath: string;
          locationInFile: number;
          lengthOfLink: number;
        }]
      }
    };
  };
}

// interface IPath {
//   path: string;
//   // hash: string;
//   links: {
//     [fileName: string]: {
//       linkInstances: [{
//         locationInFile: number;
//         lengthOfLink: number;
//       }]
//     }
//   };
// }

// interface ILink {
//   [fileName: string]: {
//     // path: string;
//     linkInstances: [{
//       locationInFile: number;
//       lengthOfLink: number;
//     }]
//     /* __for live updating__
//     outdated: boolean; 
//     flip when the referred file is moved, 
//     which marks that the link to this file
//     should be updated in the referring file */
//   };
// }


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
  private static readonly RE: RegExp = new RegExp(/\[.+?\](\(|:\s)(?!https?|www|ftps?)([^\)|\s]+)/, 'g');
  private readonly DIR: string;
  private changeLog: string = '';
  db: IPaths;

  constructor(dirInput: string, dbInput?: IPaths) {
    this.DIR = dirInput;
    this.db = dbInput || {};
  }

  //scan to store file structure snapshot in storage
  scanFiles(directory: string = this.DIR): void {
    if (directory === '') { throw console.error('No input directory specified.'); }
    fs.readdir(directory, (err, files): void => {
      if (err) { throw console.error(`Error reading directory ${directory}: \n${err}`); }
      files.forEach((fileName) => {
        const filePath = directory + '/' + fileName;
        // console.log(vscode.files
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
  extractLinks(filePath: string): IPaths["filePath"]["links"] {
    const fileData: string = fs.readFileSync(filePath, 'utf8');
    let prevInstance: number = -1,
      match,
      matches: IPaths['filePath']['links'] = {};

    do {
      match = UpMarkdown.RE.exec(fileData);
      if (match !== null) {
        const fileName: string = p.basename(match[2]);
        // const path: string = p.relative(filePath, this.db[fileName].path);
        const linkInstance: IPaths['filePath']['links']['fileName']['linkInstances'][0] = {
          newLinkPath: '',
          oldLinkPath: match[2],
          locationInFile: fileData.indexOf(match[2], prevInstance + 1),
          lengthOfLink: match[2].length
        };
        prevInstance = linkInstance.locationInFile;

        typeof matches[fileName] === 'undefined'
          ? matches[fileName] = { linkInstances: [linkInstance] }
          : matches[fileName].linkInstances.push(linkInstance);
      }
    } while (match);
    // for (let m in matches) { console.log(matches[m]); }
    return matches;
  }

  //update links to current file
  findOutdatedLinks(files: string[] = []): void {
    let fileChangeLog: string = '', fileChanges: [string, number][] = [];
    files = files.length > 0 ? files : Object.keys(this.db);
    // files.forEach((fileName) => { this.printLinks2(fileName); });
    files.forEach((fileName) => {
      if (!/^.+\.md$/.test(fileName)) { return; }
      // console.log(`processing ${fileName}...`);

      let linkChanges: string = '';
      const links: string[] = Object.keys(this.db[fileName].links);

      links.forEach((link) => {
        // console.log(`processing ${fileName}'s ${link} link...`);

        const newLinkPath: string = p.relative(this.db[fileName].path.substring(
          0, this.db[fileName].path.length - fileName.length - 1), this.db[link].path);
        // console.log(`relative path from ${fileName} to ${link} is: ${relPath}`);
        const linkInstances = this.db[fileName].links[link].linkInstances;

        linkInstances.forEach((inst, i) => {
          // console.log(`processing ${fileName}'s ${link} link instance at location ${inst.locationInFile}`);
          // const oldLinkPath: string = fileData.slice(inst.locationInFile, inst.locationInFile + inst.lengthOfLink);

          if (inst.oldLinkPath !== newLinkPath) {
            this.db[fileName].links[link].linkInstances[i].newLinkPath = newLinkPath;
            fileChanges.push([link, i]);

            linkChanges += `  @${inst.locationInFile}: '${inst.oldLinkPath}' --> '${newLinkPath}'\n`;
            // console.log(`link has changed, adding to list of linkChanges: \n${linkChanges}`);
          }

        });
        if (linkChanges !== '') { fileChangeLog += `File '${fileName}' link to file '${link}':\n` + linkChanges; linkChanges = ''; }
        // console.log(`fileChangeLog: \n${fileChangeLog}`);
      });
      //
      //
      //
      //
      // [ToDo: 
      //  - merge fileChangeLog & fileChanges in functionality, atm redundant
      //  - output to log at same operation as editting the link, 
      //    to avoid log saying one thing but in actuality getting a different result
      // ]
      //
      //
      //
      //
      if (fileChangeLog !== '') {
        this.changeLog += fileChangeLog;
        fileChangeLog = '';
        this.updateLinks(fileName, fileChanges);
      }
    });
    this.changeLog.length > 0 ? console.log(this.changeLog) : console.log('All links up to date.');
  }

  updateLinks = (fileName: string, fileChanges: [string, number][]): void => {
    const throwError = (op: string, err: NodeJS.ErrnoException) => {
      throw console.error(`Error ${op} ${fileName}: \n${err}`);
    };

    let fileData: string = fs.readFileSync(this.db[fileName].path, 'utf8');

    fs.open(this.db[fileName].path, 'r+', (err, fd) => {
      if (err) { throwError('opening', err); }

      let offset: number = 0;
      fileChanges.forEach(linkInstance => {
        const inst = this.db[fileName].links[linkInstance[0]].linkInstances[linkInstance[1]];
        fileData = [fileData.slice(0, inst.locationInFile + offset), inst.newLinkPath,
        fileData.slice(inst.locationInFile + offset + inst.oldLinkPath.length)].join('');
        offset += inst.newLinkPath.length - inst.oldLinkPath.length;
      });

      fs.writeFile(this.db[fileName].path, fileData, (err) => {
        if (err) { throwError('writing to', err); }
      });

      fs.close(fd, (err) => {
        if (err) { throwError('closing', err); }
        console.log(`Wrote to file ${fileName} successfully.`);
      });
    });
  }

  /*
  forEach linkInstance, need:
  locationInFile
  newLinkPath
  oldLinkPath.length === lengthOfLink
  */

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

  printLinks2(fileName: string): void {
    console.log(`------------${fileName}---------------`);
    console.log(this.db[fileName].links);
    console.log('-----------------------------------------------');
  }
}

// const Umd = new UpMarkdown(__dirname);
// Umd.scanFiles(Umd.rootDirectory);

