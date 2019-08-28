import * as vscode from 'vscode';
import * as p from 'path';
import { UpMarkdown } from './UpMarkdown';
import { Utils } from './utils/utils';

export function activate(context: vscode.ExtensionContext) {
  // vscode.commands.executeCommand('setContext', 'blacklist', false);
  // const val: string = context.globalState.get("test", "defaultValue");
  // context.globalState.update("test", "this is not test");
  const utils: Utils = new Utils();
  const umd = new UpMarkdown();

  context.subscriptions.push(vscode.commands.registerCommand('extension.updateLinks', ({ path }) => {
    utils.updateFileSystem(umd, path);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('extension.startFsWatch', async ({ path }) => {
    await utils.checkFS(path); //turns off watcher if another exists and switches to this one
    const config = await vscode.workspace.getConfiguration('upMarkdown');
    let updateFileSystem: boolean = true;
    if (typeof umd.fileSystem !== 'undefined') {
      const interval: number = await config.get('scanInterval', 60) * 1000; // defaults to 1min
      const elapsed: number = new Date(Date.now()).getTime() - umd.fileSystem!.updated.getTime();
      if (elapsed <= interval) { updateFileSystem = false; }
    }

    if (updateFileSystem) { utils.updateFileSystem(umd, path); }
    //clean up file skip "if duplicate" in saveFile func based on timestamp

    //watch for file changes
    // var watcher = vscode.workspace.createFileSystemWatcher("**/*.md"); //glob search string
    // watcher.ignoreChangeEvents = false;

    // watcher.onDidChange(() => {
    //   vscode.window.showInformationMessage("change applied!"); //In my opinion this should be called
    // });
    // umd.findOutdatedLinks(['update a file that was changed']);
    // context.workspaceState.update('umdFileSystem', fileSystem);
    vscode.commands.executeCommand('setContext', 'FsWatcherOn', true);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('extension.stopFsWatch', async ({ path }) => {
    // turn off watcher
    vscode.commands.executeCommand('setContext', 'FsWatcherOn', false);
    utils.fs = '';
  }));

  context.subscriptions.push(vscode.commands.registerCommand('extension.toggleBlacklist', async ({ path }) => {
    const config = await vscode.workspace.getConfiguration('upMarkdown');
    const fileName: string = p.basename(path);
    let blacklist: string[] = await config.get('blacklist', []);
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
    umd.blacklist = await utils.getBlacklist(blacklist);
  }));

}

export function deactivate() { }
