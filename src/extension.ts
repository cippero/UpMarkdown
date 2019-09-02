import * as vscode from 'vscode';
import * as p from 'path';
import { UpMarkdown, Watcher } from './UpMarkdown';
import { Utils } from './utils/utils';

export function activate(context: vscode.ExtensionContext) {
  // const val: string = context.globalState.get("test", "defaultValue");
  // context.globalState.update("test", "this is not test");
  const utils: Utils = new Utils();
  const umd = new UpMarkdown();
  let watcher: vscode.FileSystemWatcher;

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.toggleBlacklist', async ({ path }) => {
      const fileName: string = p.basename(path);
      const config: vscode.WorkspaceConfiguration = await vscode.workspace.getConfiguration('upMarkdown');
      const blacklistArr: string[] = await config.get('blacklist', []);

      umd.blacklist = await utils.toggleBlacklist(fileName, blacklistArr);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.updateLinks', ({ path }) => {
      utils.updateFileSystem(umd, path);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.startFsWatch', ({ path }) => {
      vscode.commands.executeCommand('setContext', 'FsWatcherOn', true);
      utils.checkFS(path); //turns off watcher if another exists and switches to this one
      utils.updateFileSystem(umd, path);
      //clean up file skip "if duplicate" in saveFile func based on timestamp or...

      const pattern = new vscode.RelativePattern(path, "{**/*.md,**/*.png}");
      watcher = vscode.workspace.createFileSystemWatcher(pattern); //glob search string
      const delayMS: number = 250;
      const runEvent = (action: Watcher, filePath: string, delay: number) => {
        umd.watcherEvents.push({ action, filePath });
        setTimeout(() => { umd.determineEvent(); }, delay);
      };

      watcher.onDidChange((e) => { umd.watchFiles(Watcher.Change, e.path); });
      watcher.onDidCreate((e) => { runEvent(Watcher.Create, e.path, delayMS); });
      watcher.onDidDelete((e) => { runEvent(Watcher.Delete, e.path, delayMS * 2); });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.stopFsWatch', () => {
      vscode.commands.executeCommand('setContext', 'FsWatcherOn', false);
      watcher.dispose();
      utils.fs = '';
    })
  );
}

export function deactivate() { }
