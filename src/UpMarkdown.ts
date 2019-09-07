import * as fs from 'fs';
import * as p from 'path';
// import * as c from 'crypto';
import { replaceKey, removeKey } from './utils/utils';
const partition = require('lodash.partition');

export interface IPaths {
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

export type IBlacklist = { [filePath: string]: null };

export enum Watcher {
  Create = 0,
  Change = 1,
  Delete = 2,
  Rename = 3,
  Move = 4
}

export class UpMarkdown {
  private static readonly RE: RegExp = new RegExp(/\[.+?\](\(|:\s)(?!https?|www|ftps?)([^\)|\s|#]+\.(md|png))/, 'g');
  private changeLog: string = '';
  fileSystem: IPaths;
  blacklist: IBlacklist;
  watcherEvents: { action: Watcher, filePath: string }[] = [];

  constructor(fileSystemInput?: IPaths, blacklistInput?: IBlacklist) {
    this.blacklist = typeof blacklistInput !== 'undefined' ? blacklistInput : {} as IBlacklist;
    this.fileSystem = typeof fileSystemInput !== 'undefined' ? fileSystemInput : {} as IPaths;
  }

  //gets a list of all files in the directory
  getFilePaths(filePath: string = ''): any {
    if (filePath === '') { throw console.error('No input directory specified.'); }
    // if (typeof this.blacklist[this.dir] !== 'undefined') { throw console.error('Can\'t blacklist the main directory to be processed. Please remove the main directory from the blacklist and try again.'); }
    let entryPaths: string[] = [];

    try {
      // adds full path to each file name in current directory
      entryPaths = fs.readdirSync(filePath).reduce((result: string[], entry: string) => {
        if (typeof this.blacklist[entry] !== 'undefined') {
          console.log(`'${entry}' in blacklist, skipping.`);
        } else { result.push(p.join(filePath, entry)); }
        return result;
      }, []);
    } catch (err) { console.error(`Error reading directory ${filePath}, skipping. Error: \n${err}`); }

    // filters all the full paths and separates into an array of files and an array of directories
    const [filePaths, dirPaths]: [string[], string[]] = partition(entryPaths, (entryPath: string) => {
      return fs.statSync(entryPath).isFile();
    });

    // recursively adds files in current directory to files in all other directories
    const dirFiles: string[] = dirPaths.reduce((prev, curr) => prev.concat(this.getFilePaths(curr)), []);
    return [...filePaths, ...dirFiles];
  }

  //save the file's data in storage
  saveFiles(files: string[]): IPaths {
    const saveFile = (
      name: string,
      path: string,
      // directory: string,
      // hash: string
    ): void => {
      this.fileSystem[name] = {
        // hash,
        // directory,
        path,
        links: /^.+\.md$/.test(name) ? this.extractLinks(path) : {}
      };
    };
    files.forEach((filePath: string) => {
      const fileName = p.basename(filePath);
      // const hash = c.createHash('md5').update(fs.readFileSync(filePath, 'utf8')).digest("hex");
      // const directory = p.dirname(filePath);
      // if (typeof this.fileSystem[fileName] !== 'undefined') {
      //   if (this.fileSystem[fileName].hash !== hash) {
      //     if (this.fileSystem[fileName].directory !== p.dirname(filePath)) {
      //       // same name
      //       return console.error(`Duplicate '${fileName}' already exists in storage. Please rename the file to have a unique name.`);
      //       // refactor to save to array if multiple file names are the same
      //     } else {
      //       // same file
      //       return saveFile(fileName, filePath, directory, hash);
      //     }
      //   }
      // }
      saveFile(fileName, filePath);
    });
    return this.fileSystem;
  }

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

  ////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////

  //find outdated links to all files or specified files
  findOutdatedLinks(files: string[] = []) {
    let fileChanges: [string, number][] = [];
    files = files.length > 0 ? files : Object.keys(this.fileSystem);
    files.forEach((fileName) => {
      const links: string[] = Object.keys(this.fileSystem[fileName].links);
      if (!/^.+\.md$/.test(fileName) || links.length === 0) { return; }

      links.forEach((link) => {
        if (typeof this.fileSystem[link] === 'undefined') {
          //add to misfits obj
          return console.error(`'${fileName}': Skipping the link to '${link}': a file with that name doesn't exist in storage.`);
        }
        const newLinkPath: string = p.relative(this.fileSystem[fileName].path.substring(
          0, this.fileSystem[fileName].path.length - fileName.length - 1), this.fileSystem[link].path);
        // console.log(newLinkPath);
        const linkInstances = this.fileSystem[fileName].links[link].linkInstances;

        linkInstances.forEach((inst, i) => {
          if (inst.oldLinkPath !== newLinkPath) {
            this.fileSystem[fileName].links[link].linkInstances[i].newLinkPath = newLinkPath;
            fileChanges.push([link, i]);
          }
        });
      });
      // console.log('about to update links');
      this.updateLinks(fileName, fileChanges);
      fileChanges = [];
    });
    this.outputFileChanges();
  }

  outputFileChanges() {
    setTimeout(_ => { //why does this.changeLog require a setTimeout to print correctly?
      this.changeLog.length > 0 ? console.log(this.changeLog) : console.log('No links were updated.');
      this.changeLog = '';
    }, 1000);
  }

  //update links to current file
  async updateLinks(fileName: string, fileChanges: [string, number][]) {
    // console.log('updating links. fileChanges =', fileChanges.length);
    if (fileChanges.length === 0) { return; }
    let changeLog: string = `- File '${fileName}' link changes:\n`;

    const throwError = (operation: string, err: NodeJS.ErrnoException) => {
      throw console.error(`Error ${operation} ${fileName}: \n${err}`);
    };

    let fileData: string = await fs.readFileSync(this.fileSystem[fileName].path, 'utf8');

    fs.open(this.fileSystem[fileName].path, 'r+', (err, fd) => {
      if (err) { throwError('opening', err); }

      let offset: number = 0;

      fileChanges.forEach(linkInstance => {
        const inst = this.fileSystem[fileName].links[linkInstance[0]].linkInstances[linkInstance[1]];

        fileData = [fileData.slice(0, inst.locationInFile + offset), inst.newLinkPath,
        fileData.slice(inst.locationInFile + offset + inst.oldLinkPath.length)].join('');

        offset += inst.newLinkPath.length - inst.oldLinkPath.length;

        changeLog += `  Link to '${linkInstance[0]}' @${inst.locationInFile}:\n    '${inst.oldLinkPath}' --> '${inst.newLinkPath}'\n`;

        // inst.oldLinkPath = inst.newLinkPath;
        // inst.newLinkPath = '';
      });

      // fs.writeFile(this.fileSystem[fileName].path, fileData, (err) => { if (err) { throwError('writing to', err); } });

      fs.close(fd, (err) => { if (err) { throwError('closing', err); } });

      this.changeLog += changeLog;
    });
  }

  // updateReferringFiles(filePath: string, oldFileName: string) {
  //   /*
  //   - find all files that refer to the old fileName
  //   - update the link in fs to reflect the new fileName
  //   - update the link in each file
  //   */
  //   console.log('updating referring files');
  //   const fileName: string = p.basename(filePath);
  //   let filesToUpdate: IPaths['filePath']['links'] = {};
  //   // let fileChanges: [string, number][] = [];

  //   // forEach file, if file has referring link to this file, add to fileChanges
  //   const files: string[] = Object.keys(this.fileSystem).filter((file: string) => {
  //     return typeof this.fileSystem[file].links[oldFileName] !== 'undefined';
  //   });

  //   files.forEach((file: string) => {
  //     filesToUpdate[file] = this.fileSystem[file].links[oldFileName];
  //   });

  //   for (let file in filesToUpdate) {
  //     console.log(`fileName: ${file}. Links:`);
  //     console.log(this.fileSystem[file]);
  //     console.log('----------------');
  //   }

  //   this.updateLinks();
  //   this.outputFileChanges();
  // }

  ////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////

  // determine which event to trigger
  determineEvent() {
    if (this.watcherEvents.length === 0) { return; }
    if (this.watcherEvents.length === 2) {
      const events = [this.watcherEvents[0].action, this.watcherEvents[1].action];
      if (events.includes(Watcher.Create) && events.includes(Watcher.Delete)) {
        let oldPathIndex: number = 0;
        const newPath = this.watcherEvents.find((e, i) => {
          oldPathIndex = i;
          return e.action === Watcher.Create;
        });
        if (p.dirname(this.watcherEvents[0].filePath) === p.dirname(this.watcherEvents[1].filePath)) {
          this.watchFiles(Watcher.Rename, newPath!.filePath, this.watcherEvents[1 - oldPathIndex].filePath);
        } else {
          this.watchFiles(Watcher.Move, newPath!.filePath);
        }
      } else {
        this.watcherEvents.forEach(event => { this.watchFiles(event.action, event.filePath); });
      }
    } else {
      this.watcherEvents.forEach(event => { this.watchFiles(event.action, event.filePath); });
    }
    this.watcherEvents = [];
  }

  // watch for file events
  watchFiles(action: Watcher, filePath: string, oldFilePath?: string): void {
    console.log('triggered', Watcher[action]);
    const fileName = p.basename(filePath);
    switch (action) {
      case Watcher.Change:
        console.log(`EDIT ${filePath}`);

        this.saveFiles([filePath]);
        this.findOutdatedLinks([filePath]);
        break;

      case Watcher.Create:
        console.log(`CREATE ${filePath}`);

        this.saveFiles([filePath]);
        this.findOutdatedLinks([fileName]);
        console.log('finished CREATE func');
        //check if in misfits obj, then update referring files

        break;

      case Watcher.Delete:
        console.log(`DELETE ${filePath}`);

        //filter filePath out of this.fileSystem
        // this.fileSystem = ((file: string, { [file]: old, ...others }) => {
        //   return { ...others };
        // })(fileName, this.fileSystem);
        this.fileSystem = removeKey(fileName, this.fileSystem);

        //output log of broken links to this file

        break;

      case Watcher.Rename:
        const oldFileName = p.basename(oldFilePath!);
        console.log(`RENAME ${filePath} \nOld name: ${oldFileName}`);

        if (typeof this.fileSystem[fileName] !== 'undefined') {
          console.error(`All files should have unique names. A file by the name of '${fileName}' already exists in storage, it will be overwritten.`);
        }

        //update the file in storage
        // this.fileSystem = ((oldFileName: string, newFileName: string, { [oldFileName]: old, ...others }) => {
        //   return { [newFileName]: old, ...others };
        // })(oldFileName, fileName, this.fileSystem);
        this.fileSystem = replaceKey(oldFileName, fileName, this.fileSystem);
        this.fileSystem[fileName].path = filePath;

        //update link to this file in referring files
        // this.updateReferringFiles(filePath, oldFileName);

        // let filesToUpdate: IPaths['filePath']['links'] = {};

        // forEach file, if file has referring link to this file, add to fileChanges
        const files: string[] = Object.keys(this.fileSystem).filter((file: string) => {
          return typeof this.fileSystem[file].links[oldFileName] !== 'undefined';
        });

        let fileChanges: [string, number][] = [];

        files.forEach((fileToUpdate: string) => {
          // filesToUpdate[file] = this.fileSystem[file].links[oldFileName];

          console.log(this.fileSystem[fileToUpdate]);

          // this.fileSystem[fileToUpdate].links = ((file: string, { [file]: old, ...others }) => {
          //   return { [fileName]: old, ...others };
          // })(oldFileName, this.fileSystem[fileToUpdate].links);
          let links = this.fileSystem[fileToUpdate].links;
          links = replaceKey(oldFileName, fileName, links);

          this.fileSystem[fileToUpdate].links[fileName].linkInstances.map((inst, i) => {
            let index: number = inst.newLinkPath.lastIndexOf('/') + 1;
            inst.newLinkPath = inst.newLinkPath.substring(0, index) + fileName;
            fileChanges.push([fileName, i]);
          });

          this.updateLinks(fileName, fileChanges);
          fileChanges = [];


          console.log(this.fileSystem[fileToUpdate]);

          // this.fileSystem = ((file: string, { [file]: old, ...others }) => {
          //   // old.links = ((file: string, { [file]: old, ...others }) => {
          //   //   return { ...others };
          //   // })(oldFileName, old);
          //   return { , ...others };
          // })(fileToUpdate, this.fileSystem);
        });
        this.outputFileChanges();

        break;

      case Watcher.Move:
        console.log(`MOVE ${filePath}`);

        this.fileSystem[fileName].path = filePath;
        this.findOutdatedLinks([fileName]);

        //update link to this file in referring files

        break;

      default:
        break;
    }
  }

  // printLinks(): void {
  //   Object.keys(this.fileSystem).forEach(fileName => {
  //     console.log(`------------${fileName}---------------`);
  //     console.log(this.fileSystem[fileName].links);
  //     console.log('-----------------------------------------------');
  //   });
  // }
}


/* [ToDo:]

_Bugs_
- Fix bug: all files must have unique names.

_UI_
- Add UI to blacklist functionality? And then store blacklisted items by path instead of file name.
  - change storage to global if using full paths instead of file names
  - figure out how to add icon to blacklisted items in ui
  - figure out how to change blacklist toggle to add/remove based on blacklist contents

_Extension Process_
- Update Links:
  - FS scan to derive storage
  - Update all outdated links

- Watch Directory:
  - Update Links functionality
  - Watch for file changes:
    - rename: change key of file in storage if doesn't already exist, otherwise notify user of duplicate
    - moved: change path of file in storage, update links of referred files and referring files
    - deleted: delete from storage
    - edited: scan file and update links if necessary
*/
