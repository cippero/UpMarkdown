import * as vscode from 'vscode';
import * as p from 'path';
import { UpMarkdown, IPaths } from './UpMarkdown';

export function activate(context: vscode.ExtensionContext) {
  vscode.commands.executeCommand('setContext', 'blacklist', false);

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

    const uMd = new UpMarkdown(path || '', undefined, blacklist);
    storage = uMd.saveFiles(uMd.getFilePaths());
    context.workspaceState.update('umdStorage', storage);
    uMd.findOutdatedLinks();


    // storage = context.workspaceState.get("umdStorage", undefined);
    // console.log('----------vscode storage:');
    // console.log(storage);
  }));

  // context.subscriptions.push(vscode.commands.registerCommand('extension.addToBlacklist', async (path) => {
  //   const { blacklist } = await vscode.workspace.getConfiguration('upMarkdown');
  //   // const blacklist: string[] = ['/home/gilwein/code/projects/upmarkdown/src/azure-iot-mobility-services/articles/operators'];
  //   if (!blacklist.includes(p.basename(path))) { vscode.commands.executeCommand('setContext', 'blacklist', true); }
  //   else { vscode.commands.executeCommand('setContext', 'blacklist', false); }

  //   console.log('adding to blacklist');
  //   // add to blacklist settings
  // }));

  // context.subscriptions.push(vscode.commands.registerCommand('extension.removeFromBlacklist', async (path) => {
  //   const { blacklist } = await vscode.workspace.getConfiguration('upMarkdown');
  //   // const blacklist: string[] = ['/home/gilwein/code/projects/upmarkdown/src/azure-iot-mobility-services/articles/operators'];
  //   if (!blacklist.includes(p.basename(path))) { vscode.commands.executeCommand('setContext', 'blacklist', false); }
  //   else { vscode.commands.executeCommand('setContext', 'blacklist', false); }

  //   console.log('removing from blacklist');
  //   // remove from blacklist settings
  // }));

  context.subscriptions.push(vscode.commands.registerCommand('extension.toggleBlacklist', async ({ path }) => {
    // let { blacklist } = await vscode.workspace.getConfiguration('upMarkdown');
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

    const message: string = blacklist.length > 0 ? `includes: ${blacklist.join(', ')}` : 'is now empty';
    vscode.window.showInformationMessage(`'${fileName}' ${operation} the blacklist, which ${message}. See your Json settings to edit it manually.`);
  }));
}

export function deactivate() { }
