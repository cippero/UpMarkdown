import * as vscode from 'vscode';
import * as p from 'path';
import { UpMarkdown, IPaths } from './UpMarkdown';

export function activate(context: vscode.ExtensionContext) {
  // vscode.commands.executeCommand('setContext', 'blacklist', false);

  context.subscriptions.push(vscode.commands.registerCommand('extension.updateLinks', async ({ path }) => {
    // const folderName = path.dirname(e.path);
    // const folderUrl = vscode.Uri.file(folderName);
    // vscode.commands.executeCommand('setContext', 'key', 'Remove');
    // const val: string = context.globalState.get("test", "defaultValue");
    // context.globalState.update("test", "this is not test");

    let storage: IPaths | undefined = await context.workspaceState.get("umdStorage", undefined);
    const { blacklist: bl } = await vscode.workspace.getConfiguration('upMarkdown');
    let blacklist: { [file: string]: null } = {};
    bl.forEach((item: any) => { blacklist[item] = null; });
    // const uMd = new UpMarkdown(path || '', undefined, blacklist);
    const uMd = new UpMarkdown(path || '', storage, blacklist);
    storage = uMd.saveFiles(uMd.getFilePaths());
    uMd.findOutdatedLinks();
    context.workspaceState.update('umdStorage', storage);
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
    const { blacklist: bl } = await vscode.workspace.getConfiguration('upMarkdown');
    let blacklist: { [file: string]: null } = {};
    bl.forEach((item: any) => { blacklist[item] = null; });

    let storage: IPaths | undefined = await context.workspaceState.get("umdStorage", undefined);
    let updateStorage: boolean = true;
    if (typeof storage !== 'undefined') {
      const interval: number = 60000; // 1 minute
      const elapsed: number = new Date(Date.now()).getTime() - storage!.updated.getTime();
      updateStorage = elapsed <= interval ? false : true;
    }

    const uMd = new UpMarkdown(path || '', storage, blacklist);
    if (updateStorage) { storage = uMd.saveFiles(uMd.getFilePaths()); }
    // add update storage class function and clean up file skip "if duplicate" in saveFile func based on timestamp

    // watch for file changes
    uMd.findOutdatedLinks(['update a file that was changed']);
    context.workspaceState.update('umdStorage', storage);
  }));
}

export function deactivate() { }
