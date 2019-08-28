import * as vscode from 'vscode';
import { UpMarkdown, IPaths, IBlacklist } from '../UpMarkdown';

export class Utils {
  // private blacklist = {} as IBlacklist;
  fs: string = '';

  async getBlacklist(blacklistArr?: string[]): Promise<IBlacklist> {
    //add try/catch to await
    // if (Object.keys(this.blacklist).length > 0) { return Promise.resolve(this.blacklist); }
    if (typeof blacklistArr === 'undefined') {
      const config = await vscode.workspace.getConfiguration('upMarkdown');
      blacklistArr = await config.get('blacklist', []);
    }
    let blacklist = {} as IBlacklist;
    blacklistArr.forEach((item: any) => { blacklist[item] = null; });
    // this.blacklist = blacklist;
    return Promise.resolve(blacklist);
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

  async checkFS(path: string) {
    if (this.fs !== '') {
      console.log(`Can only watch one directory at a time: switching from ${this.fs} to ${path}`);
      await vscode.commands.executeCommand('extension.stopFsWatch', { path: this.fs });
    } else if (this.fs === path) {
      console.log(`Action cancelled: already watching ${path}`);
    } else {
      console.log(`Watching for file changes in ${path}`);
    }
    this.fs = path;
  }
}