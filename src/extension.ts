import * as vscode from 'vscode';
// import * as path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "upmarkdown" is now active!');
	context.globalState.update("test", undefined);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
		const val: string = context.globalState.get("test", "defaultValue");

		// const folderName = path.dirname(e.path);
		// const folderUrl = vscode.Uri.file(folderName);

		// Display a message box to the user
		vscode.window.showInformationMessage(val);
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
