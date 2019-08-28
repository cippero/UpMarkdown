import * as vscode from 'vscode';
import * as p from 'path';
import { UpMarkdown } from './UpMarkdown';
import { Utils } from './utils/utils';

export function activate(context: vscode.ExtensionContext) {
  // const val: string = context.globalState.get("test", "defaultValue");
  // context.globalState.update("test", "this is not test");
  const utils: Utils = new Utils();
  const umd = new UpMarkdown();

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.updateLinks', ({ path }) => {
      utils.updateFileSystem(umd, path);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.startFsWatch', ({ path }) => {
      utils.checkFS(path); //turns off watcher if another exists and switches to this one
      utils.updateFileSystem(umd, path);
      //clean up file skip "if duplicate" in saveFile func based on timestamp

      //watch for file changes
      // var watcher = vscode.workspace.createFileSystemWatcher("**/*.md"); //glob search string
      // watcher.ignoreChangeEvents = false;

      // watcher.onDidChange(() => {
      //   vscode.window.showInformationMessage("change applied!");
      // });
      // umd.findOutdatedLinks(['update a file that was changed']);
      vscode.commands.executeCommand('setContext', 'FsWatcherOn', true);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.stopFsWatch', async ({ path }) => {
      // turn off watcher
      vscode.commands.executeCommand('setContext', 'FsWatcherOn', false);
      utils.fs = '';
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.toggleBlacklist', async ({ path }) => {
      const fileName: string = p.basename(path);
      const config: vscode.WorkspaceConfiguration = await vscode.workspace.getConfiguration('upMarkdown');
      const blacklistArr: string[] = await config.get('blacklist', []);

      umd.blacklist = await utils.toggleBlacklist(fileName, blacklistArr);
    })
  );

}

export function deactivate() { }
