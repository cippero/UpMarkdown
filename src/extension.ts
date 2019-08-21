import * as vscode from 'vscode';
import { UpMarkdown as UMD } from './UpMarkdown';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('extension.toggleBlacklist', _ => {

  }));

  context.subscriptions.push(vscode.commands.registerCommand('extension.updateLinks', async ({ path }) => {
    // const folderName = path.dirname(e.path);
    // const folderUrl = vscode.Uri.file(folderName);

    // context.globalState.update("test", "this is not test");
    // const val: string = context.globalState.get("test", "defaultValue");
    // vscode.window.showInformationMessage(val);

    const { blacklist } = await vscode.workspace.getConfiguration('upMarkdown');

    let bl: { [file: string]: null } = {};
    blacklist.forEach((item: any) => { bl[item] = null; });
    // const blacklistSample: { [filePath: string]: null } = { 'archive': null, 'developers': null, 'pk': null };

    const uMd = new UMD(path || vscode.workspace.rootPath, undefined, bl);
    uMd.scanFiles();
    // setTimeout(() => { uMd.printLinks(); }, 100);
    // setTimeout(() => { uMd.findOutdatedLinks(); }, 100);

    // setTimeout(() => {
    //   vscode.commands.executeCommand('setContext', 'key', 'Remove');
    // }, 5000);
  }));
}

export function deactivate() { }
