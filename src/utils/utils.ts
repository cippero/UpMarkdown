import * as vscode from 'vscode';
import * as p from 'path';
import { UpMarkdown, IPaths, IBlacklist, Watcher } from '../UpMarkdown';

export class Utils {
  fs: string = '';
  watcherEvents: { action: Watcher, filePath: string }[] = [];
  elapsed: number = 0;

  //checks if there's already an instance of FS watcher running
  checkFS(path: string) {
    if (this.fs !== '') {
      console.log(`Can only watch one directory at a time: switching from ${this.fs} to ${path}`);
      vscode.commands.executeCommand('extension.stopFsWatch', { path: this.fs }); // await?
    } else if (this.fs === path) {
      console.log(`Action cancelled: already watching ${path}`);
    } else {
      console.log(`Watching for file changes in ${path}`);
    }
    this.fs = path;
  }

  async updateFileSystem(
    umd: UpMarkdown,
    path: string
  ): Promise<IPaths> {
    umd.blacklist = await this.getBlacklist();
    const fileSystem: IPaths = umd.saveFiles(umd.getFilePaths(path));
    umd.findOutdatedLinks();
    // context.workspaceState.update('umdFileSystem', fileSystem);
    return Promise.resolve(fileSystem);
  }

  //adds/removes item from blacklist, returning the object
  async toggleBlacklist(
    fileName: string,
    blacklist: string[],
  ): Promise<IBlacklist> {
    let operation: string = '';

    if (!blacklist.includes(fileName)) {
      operation = 'added to';
      blacklist.push(fileName);
    }
    else {
      operation = 'removed from';
      blacklist = blacklist.filter((item: any) => { return item !== fileName; });
    }

    const message: string = blacklist.length > 0 ? `(${blacklist.join(', ')})` : '(blacklist is empty)';
    vscode.window.showInformationMessage(`'${fileName}' ${operation} the blacklist ${message}. See your local workspace settings to edit it manually.`);

    return Promise.resolve(await this.getBlacklist(blacklist));
  }

  //returns a blacklist object
  async getBlacklist(blacklistArr?: string[]): Promise<IBlacklist> {
    //add try/catch to await
    const config = await vscode.workspace.getConfiguration('upMarkdown');
    if (typeof blacklistArr === 'undefined') {
      blacklistArr = await config.get('blacklist', []);
    } else {
      try {
        await config.update('blacklist', blacklistArr);
      } catch (err) {
        throw new Error(`Error updating the blacklist, see your local workspace settings to edit it manually. \n${err}`);
      }
    }
    let blacklist = {} as IBlacklist;
    blacklistArr.forEach((item: any) => { blacklist[item] = null; });
    return Promise.resolve(blacklist);
  }

  queueAction(action: Watcher, filePath: string) {
    this.watcherEvents.push({ action, filePath });
    // console.log(this.watcherEvents);
    // console.log(`--------${Date.now()}--------`);
    // console.log(this.watcherEvents.length, Date.now());
    // setTimeout(() => {
    //   if (this.watcherEvents.length === 2) {
    //     console.log('rename/move');
    //   } else if (this.watcherEvents.length === 1) {
    //     console.log('create/delete');
    //   } else {
    //     console.log('forEach loop; how did it get here?');
    //   }
    // }, 500);
  }

  runActions(umd: UpMarkdown) {
    if (this.watcherEvents.length === 0) {
      // console.log('empty');
      return;
    }
    if (this.watcherEvents.length === 2) {
      const events = [this.watcherEvents[0].action, this.watcherEvents[1].action];
      if (events.includes(Watcher.Create) && events.includes(Watcher.Delete)) {
        let oldPathIndex: number = 0;
        const newPath = this.watcherEvents.find((e, i) => {
          oldPathIndex = i;
          return e.action === Watcher.Create;
        });
        if (p.dirname(this.watcherEvents[0].filePath) === p.dirname(this.watcherEvents[1].filePath)) {
          // console.log('rename');
          this.watcherEvents = [];
          umd.watchFiles(Watcher.Rename, newPath!.filePath, this.watcherEvents[1 - oldPathIndex].filePath);
        } else {
          // console.log('move');
          this.watcherEvents = [];
          umd.watchFiles(Watcher.Move, newPath!.filePath);
        }
      } else {
        // console.log('forEach');
        this.watcherEvents = [];
        this.watcherEvents.forEach(event => {
          umd.watchFiles(event.action, event.filePath);
        });
      }
    } else {
      // console.log('forEach');
      this.watcherEvents = [];
      this.watcherEvents.forEach(event => {
        umd.watchFiles(event.action, event.filePath);
      });
    }
    // this.watcherEvents = [];
  }

  addAction(action: Watcher, filePath: string, umd: UpMarkdown) {
    if (this.elapsed > 0) {
      if (this.watcherEvents.length === 1) {
        const events = [action, this.watcherEvents[0].action];
        if (events.includes(Watcher.Create) && events.includes(Watcher.Delete)) {
          console.log('run rename/move');
          let oldPathIndex: number = 0;
          const newPath = this.watcherEvents.find((e, i) => {
            oldPathIndex = i;
            return e.action === Watcher.Create;
          });
          if (p.dirname(this.watcherEvents[0].filePath) === p.dirname(filePath)) {
            console.log('rename');
            umd.watchFiles(Watcher.Rename, newPath!.filePath, this.watcherEvents[1 - oldPathIndex].filePath);
          } else {
            console.log('move');
            umd.watchFiles(Watcher.Move, newPath!.filePath);
          }
        } else {
          console.log('run stored event and new event separately');
          umd.watchFiles(action, filePath);
          umd.watchFiles(this.watcherEvents[0].action, this.watcherEvents[0].filePath);
        }
      } else if (this.watcherEvents.length > 1) {
        console.log('run ALL stored events and new event separately');
        umd.watchFiles(action, filePath);
        this.watcherEvents.forEach(event => {
          umd.watchFiles(event.action, event.filePath);
        });
      }
      this.elapsed = 0;
      this.watcherEvents = [];
    } else {
      this.watcherEvents.push({ action, filePath });
      this.elapsed = Date.now();
      setTimeout(_ => {
        if (this.watcherEvents.length === 1) {
          console.log('run single event');
          umd.watchFiles(action, filePath);
          this.elapsed = 0;
          this.watcherEvents = [];
        }
      }, 500);
    }
  }

  // determineAction (action: Watcher, filePath: string) {
  //   if (elapsed === limit * 2 || Date.now() - elapsed <= limit) {
  //     watcherEvents.push({ action, filePath });
  //     elapsed = Date.now();
  //   } else {
  //     umd.watchFiles(action, filePath);
  //   }
  // }

  // executeAction() {
  //   let oldPathIndex: number = 0;
  //   const newPath = watcherEvents.find((e, i) => {
  //     oldPathIndex = i;
  //     return e.action === Watcher.Create;
  //   });
  //   if (watcherEvents.length === 2 && typeof newPath !== 'undefined') {
  //     if (p.dirname(watcherEvents[0].filePath) === p.dirname(watcherEvents[1].filePath)) {
  //       umd.watchFiles(Watcher.Rename, newPath.filePath, watcherEvents[1 - oldPathIndex].filePath);
  //     } else {
  //       umd.watchFiles(Watcher.Move, newPath.filePath);
  //     }
  //     // refactor ">=2" and "elapsed === limit * 2"
  //   } else if (watcherEvents.length >= 2) {
  //     watcherEvents.forEach(e => { umd.watchFiles(e.action, e.filePath); });
  //   } else if (watcherEvents.length === 1) {
  //     umd.watchFiles(watcherEvents[0].action, watcherEvents[0].filePath);
  //   }
  //   watcherEvents = [];
  //   elapsed = limit * 2;
  // }

  /*
  class level 
  */
}