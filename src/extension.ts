import * as vscode from 'vscode';
import { UpMarkdown as UMD } from './UpMarkdown';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  // console.log('Congratulations, your extension "upmarkdown" is now active!');

  context.globalState.update("test", "this is not test");

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = [
    vscode.commands.registerCommand('extension.helloWorld', _ => {
      // const folderName = path.dirname(e.path);
      // const folderUrl = vscode.Uri.file(folderName);

      // Display a message box to the user
      const val: string = context.globalState.get("test", "defaultValue");
      vscode.window.showInformationMessage(val);
    }),
    vscode.commands.registerCommand('extension.updateLinks', _ => {
      // const dir: string = __dirname.slice(0, __dirname.lastIndexOf('/')) + '/src/_testFileStructureFunctionality';
      // console.log(`     __dirname: ${__dirname} \nWorkspace path: ${vscode.workspace.rootPath} \nWorkspace name: ${vscode.workspace.name}`);

      // console.log('root path:', vscode.workspace.rootPath);
      const uMd = new UMD(vscode.workspace.rootPath || '');
      uMd.scanFiles();
      setTimeout(() => { uMd.updateLinks(); }, 100);
    })
  ];

  disposable.forEach((command) => context.subscriptions.push(command));
  // context.subscriptions.push(disposable[0]);
}

// this method is called when your extension is deactivated
export function deactivate() { }
