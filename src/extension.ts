import * as vscode from 'vscode'
import { isLottie, LottieViewerPanel } from './lottieViewer'
import { DotlottieEditorProvider } from './dotlottieEditor'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(DotlottieEditorProvider.register(context))

  vscode.commands.executeCommand('setContext', 'isLottie', isLottie(vscode.window.activeTextEditor))

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-lottie-preview.openJson', () => {
      LottieViewerPanel.show(context.extensionUri)
    }),
  )

  vscode.window.onDidChangeActiveTextEditor((event?: vscode.TextEditor) => {
    vscode.commands.executeCommand('setContext', 'isLottie', isLottie(event))
  })
}
