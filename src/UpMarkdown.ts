import * as fs from 'fs';
import * as p from 'path';
import * as vscode from 'vscode';
// import * as c from 'crypto';

interface IPaths {
  [filePath: string]: {
    path: string;
    // directory: string;
    // hash: string;
    links: {
      [fileName: string]: {
        linkInstances: [{
          newLinkPath: string;
          oldLinkPath: string;
          locationInFile: number;
          lengthOfLink: number;
        }];
      };
    };
  };
}

export class UpMarkdown {
  private static readonly RE: RegExp = new RegExp(/\[.+?\](\(|:\s)(?!https?|www|ftps?)([^\)|\s|#]+\.(md|png))/, 'g');
  private readonly DIR: string;
  private changeLog: string = '';
  db: IPaths;
  blacklist: { [filePath: string]: null };

  constructor(dirInput: string, dbInput?: IPaths, blacklistInput?: { [filePath: string]: null }) {
    this.DIR = dirInput;
    this.db = dbInput || {};
    this.blacklist = blacklistInput || {};
  }

  //scan to store file structure snapshot in storage
  scanFiles(directory: string = this.DIR): void {
    if (directory === '') { throw console.error('No input directory specified.'); }
    if (typeof this.blacklist[directory] !== 'undefined') { throw console.error('Can\'t blacklist the main directory to be processed. Please remove the main directory from the blacklist and try again.'); }
    fs.readdir(directory, (err, files): void => {
      if (err) { throw console.error(`Error reading directory ${directory}: \n${err}`); }
      files.forEach((fileName) => {
        const filePath = directory + '/' + fileName;

        if (fs.existsSync(filePath) && typeof this.blacklist[fileName] === 'undefined') {
          const stats = fs.lstatSync(filePath);
          if (stats.isDirectory()) { this.scanFiles(filePath); }
          else if (stats.isFile()) {
            this.saveFile(fileName, filePath);
          }
        } else {
          console.log(`'${fileName}' in blacklist, skipping.`);
        }
      });
    });
  }

  //save the file's data in storage
  saveFile(fileName: string, filePath: string): void {
    if (typeof this.db[fileName] !== 'undefined') {
      // if (this.db[fileName].directory === directory) {
      return console.error(`Duplicate '${fileName}' already exists in storage. Please rename the file to have a unique name.`);
      // console.log(` - Current directory: ${directory}`);
      // this.updateFile(fileName, filePath);
      // }
    }
    // console.log('**************************');
    // console.log(`2. Adding ${fileName}.`);
    this.db[fileName] = {
      // hash,
      path: filePath,
      // directory,
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

  //find outdated links to all files or specified files
  findOutdatedLinks(files: string[] = []): void {
    let fileChanges: [string, number][] = [];
    files = files.length > 0 ? files : Object.keys(this.db);
    files.forEach((fileName) => {
      if (!/^.+\.md$/.test(fileName)) { return; }
      const links: string[] = Object.keys(this.db[fileName].links);

      links.forEach((link) => {
        if (typeof this.db[link] === 'undefined') {
          return console.error(`'${fileName}': Skipping the link to '${link}': a file with that name doesn't exist in storage.`);
        }
        const newLinkPath: string = p.relative(this.db[fileName].path.substring(
          0, this.db[fileName].path.length - fileName.length - 1), this.db[link].path);
        // console.log(newLinkPath);
        const linkInstances = this.db[fileName].links[link].linkInstances;

        linkInstances.forEach((inst, i) => {
          if (inst.oldLinkPath !== newLinkPath) {
            this.db[fileName].links[link].linkInstances[i].newLinkPath = newLinkPath;
            fileChanges.push([link, i]);
          }
        });
      });
      this.updateLinks(fileName, fileChanges);
      fileChanges = [];
    });
    setTimeout(_ => {
      this.changeLog.length > 0 ? console.log(this.changeLog) : console.log('All links up to date.');
      this.changeLog = '';
    }, 1000);
  }

  //update links to current file
  updateLinks(fileName: string, fileChanges: [string, number][]) {
    if (fileChanges.length === 0) { return; }
    let changeLog: string = `- File '${fileName}' link changes:\n`;

    const throwError = (operation: string, err: NodeJS.ErrnoException) => {
      throw console.error(`Error ${operation} ${fileName}: \n${err}`);
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

        changeLog += `  Link to '${linkInstance[0]}' @${inst.locationInFile}:\n    '${inst.oldLinkPath}' --> '${inst.newLinkPath}'\n`;
      });

      // fs.writeFile(this.db[fileName].path, fileData, (err) => { if (err) { throwError('writing to', err); } });

      fs.close(fd, (err) => { if (err) { throwError('closing', err); } });

      this.changeLog += changeLog;
    });
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

  printLinks(): void {
    Object.keys(this.db).forEach(fileName => {
      console.log(`------------${fileName}---------------`);
      console.log(this.db[fileName].links);
      console.log('-----------------------------------------------');
    });
  }
}

/* [ToDo:]
1. VScode API: Persistent storage.
2. VScode API: Blacklist context option in file explorer.
3. VScode API: FS watcher for file rename/moved/deleted/edited(?).
4. Replace placeholder SetTimeout occurrences with logical code.
5. Fix bug: all files must have unique names.
*/
