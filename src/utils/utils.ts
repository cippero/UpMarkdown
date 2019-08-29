import * as vscode from 'vscode';
import { UpMarkdown, IPaths, IBlacklist } from '../UpMarkdown';

export class Utils {
  fs: string = '';

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
    // console.log(Object.keys(fileSystem));
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
}