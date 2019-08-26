import * as vscode from 'vscode';
import * as p from 'path';
import { UpMarkdown, IPaths, IBlacklist } from './UpMarkdown';

class Utils {
  private blacklist = {} as IBlacklist;

  async getBlacklist(): Promise<IBlacklist> {
    if (Object.keys(this.blacklist).length > 0) { return this.blacklist; }
    const { blacklist: bl } = await vscode.workspace.getConfiguration('upMarkdown');
    let blacklist = {} as IBlacklist;
    bl.forEach((item: any) => { blacklist[item] = null; });
    this.blacklist = blacklist;
    return Promise.resolve(blacklist);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const utils: Utils = new Utils();
  // vscode.commands.executeCommand('setContext', 'blacklist', false);

  context.subscriptions.push(vscode.commands.registerCommand('extension.updateLinks', async ({ path }) => {
    // const folderName = path.dirname(e.path);
    // const folderUrl = vscode.Uri.file(folderName);
    // vscode.commands.executeCommand('setContext', 'key', 'Remove');
    // const val: string = context.globalState.get("test", "defaultValue");
    // context.globalState.update("test", "this is not test");

    const blacklist = await utils.getBlacklist();
    let fileSystem: IPaths | undefined = await context.workspaceState.get("umdFS", undefined);

    const umd = new UpMarkdown(path, fileSystem, blacklist);
    fileSystem = umd.saveFiles(umd.getFilePaths());
    umd.findOutdatedLinks();
    context.workspaceState.update('umdFS', fileSystem);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('extension.toggleBlacklist', async ({ path }) => {
    const fileName: string = p.basename(path);
    const config = await vscode.workspace.getConfiguration('upMarkdown');
    let blacklist: string[] = config.get('blacklist', []);
    let operation: string = '';

    if (!blacklist.includes(fileName)) {
      operation = 'added to';
      blacklist.push(fileName);
    }
    else {
      operation = 'removed from';
      blacklist = blacklist.filter((item: any) => { return item !== fileName; });
    }

    try {
      await config.update('blacklist', blacklist);
    } catch (err) { throw new Error(`Error updating the blacklist, see your Json settings to edit it manually. \n${err}`); }

    const message: string = blacklist.length > 0 ? `(${blacklist.join(', ')})` : '(blacklist is empty)';
    vscode.window.showInformationMessage(`'${fileName}' ${operation} the blacklist ${message}. See your local workspace settings to edit it manually.`);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('extension.watchDirectory', async ({ path }) => {
    let fileSystem: IPaths | undefined = await context.workspaceState.get("umdFS", undefined);
    let updateFileSystem: boolean = true;
    if (typeof fileSystem !== 'undefined') {
      const interval: number = 60000; // 1 minute
      const elapsed: number = new Date(Date.now()).getTime() - fileSystem!.updated.getTime();
      updateFileSystem = elapsed <= interval ? false : true;
    }

    const blacklist = await utils.getBlacklist();
    const umd = new UpMarkdown(path, undefined, blacklist);
    if (updateFileSystem) { fileSystem = umd.saveFiles(umd.getFilePaths()); }
    //clean up file skip "if duplicate" in saveFile func based on timestamp

    //watch for file changes
    // umd.findOutdatedLinks(['update a file that was changed']);
    // context.workspaceState.update('umdFS', fileSystem);
  }));
}

export function deactivate() { }
