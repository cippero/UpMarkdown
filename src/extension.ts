import * as vscode from 'vscode';
import { UpMarkdown, IPaths } from './UpMarkdown';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('extension.toggleBlacklist', _ => {

  }));

  context.subscriptions.push(vscode.commands.registerCommand('extension.updateLinks', async ({ path }) => {
    // const folderName = path.dirname(e.path);
    // const folderUrl = vscode.Uri.file(folderName);
    // vscode.commands.executeCommand('setContext', 'key', 'Remove');

    // const val: string = context.globalState.get("test", "defaultValue");
    // context.globalState.update("test", "this is not test");
    // vscode.window.showInformationMessage(val);
    // console.log(vscode.workspace.rootPath);

    let storage: IPaths | undefined = await context.workspaceState.get("umdStorage", undefined);
    // console.log('----------vscode storage:');
    // console.log(storage);
    const { blacklist: bl } = await vscode.workspace.getConfiguration('upMarkdown');
    let blacklist: { [file: string]: null } = {};
    bl.forEach((item: any) => { blacklist[item] = null; });

    const uMd = new UpMarkdown(path || '', storage, blacklist);
    storage = uMd.saveFiles(uMd.getFilePaths());
    context.workspaceState.update('umdStorage', storage);
    uMd.findOutdatedLinks();


    // storage = context.workspaceState.get("umdStorage", undefined);
    // console.log('----------vscode storage:');
    // console.log(storage);
  }));
}

export function deactivate() { }
