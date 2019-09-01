import * as fs from 'fs';
import * as p from 'path';
// import * as c from 'crypto';
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
      if (!/^.+\.md$/.test(fileName)) { return; }
      const links: string[] = Object.keys(this.fileSystem[fileName].links);

      links.forEach((link) => {
        if (typeof this.fileSystem[link] === 'undefined') {
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
      this.updateLinks(fileName, fileChanges);
      fileChanges = [];
    });
    setTimeout(_ => { //why does this.changeLog require a setTimeout to print correctly?
      this.changeLog.length > 0 ? console.log(this.changeLog) : console.log('No links were updated.');
      this.changeLog = '';
    }, 1000);
  }

  //update links to current file
  async updateLinks(fileName: string, fileChanges: [string, number][]) {
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
      });

      // fs.writeFile(this.fileSystem[fileName].path, fileData, (err) => { if (err) { throwError('writing to', err); } });

      fs.close(fd, (err) => { if (err) { throwError('closing', err); } });

      this.changeLog += changeLog;
    });
  }

  ////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////

  // determine which event to trigger
  runActions() {
    console.log(this.watcherEvents);
    const runAction = (action?: Watcher, filePath?: string, oldFilePath?: string) => {
      if (typeof oldFilePath !== 'undefined') { this.watchFiles(action!, filePath!, oldFilePath); }
      else if (this.watcherEvents.length > 1) {
        this.watcherEvents.forEach(event => { this.watchFiles(event.action, event.filePath); });
      } else { this.watchFiles(action!, filePath!); }
      this.watcherEvents = [];
    };
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
          console.log('rename');
          runAction(Watcher.Rename, newPath!.filePath, this.watcherEvents[1 - oldPathIndex].filePath)
          // this.watcherEvents = [];
          // this.watchFiles(Watcher.Rename, newPath!.filePath, this.watcherEvents[1 - oldPathIndex].filePath);
        } else {
          console.log('move');
          runAction(Watcher.Move, newPath!.filePath);
          // this.watcherEvents = [];
          // this.watchFiles(Watcher.Move, newPath!.filePath);
        }
      } else {
        console.log('forEach');
        runAction();
        // this.watcherEvents.forEach(event => {
        //   this.watchFiles(event.action, event.filePath);
        // });
        // this.watcherEvents = [];
      }
    } else {
      console.log('forEach');
      runAction();
      // this.watcherEvents.forEach(event => {
      //   this.watchFiles(event.action, event.filePath);
      // });
      // this.watcherEvents = [];
    }
  }

  // watch for file events
  watchFiles(action: Watcher, filePath: string, oldFilePath?: string): void {
    console.log('triggered');
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
        this.findOutdatedLinks([filePath]);

        //check if in misfits obj, then update referring files

        break;

      case Watcher.Delete:
        console.log(`DELETE ${filePath}`);

        //filter filePath out of this.fileSystem
        this.fileSystem = ((file: string, { [file]: old, ...others }) => {
          return { ...others };
        })(fileName, this.fileSystem);

        //output log of broken links to this file

        break;

      case Watcher.Rename:
        console.log(`RENAME ${filePath} \nOld name: ${p.basename(oldFilePath!)}`);

        // check if fileName already exists in storage

        //update the file in storage
        this.fileSystem = ((oldFileName: string, newFileName: string, { [oldFileName]: old, ...others }) => {
          return { [newFileName]: old, ...others };
        })(p.basename(oldFilePath!), fileName, this.fileSystem);
        this.fileSystem[fileName].path = filePath;

        //update link to this file in referring files

        break;

      case Watcher.Move:
        console.log(`MOVE ${filePath}`);

        this.fileSystem[fileName].path = filePath;
        this.findOutdatedLinks([filePath]);

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
