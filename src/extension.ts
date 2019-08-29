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

      let watcherChanges: { filePath: string, action: Watcher }[] = [];
      const limit: number = 500;
      let elapsed: number = limit * 2;

      const determineAction = (action: Watcher, filePath: string) => {
        if (elapsed === limit * 2 || Date.now() - elapsed <= limit) {
          watcherChanges.push({ action, filePath });
          elapsed = Date.now();
        } else {
          umd.watchFiles(action, filePath);
        }
      };

      const executeAction = () => {
        let oldPathIndex: number = 0;
        const newPath = watcherChanges.find((e, i) => {
          oldPathIndex = i;
          return e.action === Watcher.Create;
        });
        if (watcherChanges.length === 2 && typeof newPath !== 'undefined') {
          if (p.dirname(watcherChanges[0].filePath) === p.dirname(watcherChanges[1].filePath)) {
            umd.watchFiles(Watcher.Rename, newPath.filePath, watcherChanges[1 - oldPathIndex].filePath);
          } else {
            umd.watchFiles(Watcher.Move, newPath.filePath);
          }
          // refactor ">=2" and "elapsed === limit * 2"
        } else if (watcherChanges.length >= 2) {
          watcherChanges.forEach(e => { umd.watchFiles(e.action, e.filePath); });
        } else if (watcherChanges.length === 1) {
          umd.watchFiles(watcherChanges[0].action, watcherChanges[0].filePath);
        }
        watcherChanges = [];
        elapsed = limit * 2;
      };

      watcher.onDidChange((e) => { umd.watchFiles(Watcher.Change, e.path); });
      watcher.onDidCreate((e) => {
        determineAction(Watcher.Create, e.path);
        setTimeout(_ => { executeAction(); }, limit);
      });
      watcher.onDidDelete((e) => {
        determineAction(Watcher.Delete, e.path);
        setTimeout(_ => { executeAction(); }, limit);
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.stopFsWatch', async ({ path }) => {
      vscode.commands.executeCommand('setContext', 'FsWatcherOn', false);
      watcher.dispose();
      utils.fs = '';
    })
  );
}

export function deactivate() { }
