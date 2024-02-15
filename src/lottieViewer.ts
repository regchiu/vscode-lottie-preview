import * as vscode from 'vscode'
import { posix } from 'path'
import { Animation } from '@lottiefiles/lottie-js'
import { getNonce } from './utils'
import { disposeAll } from './dispose'

export class LottieViewerPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel?: LottieViewerPanel

  public static readonly viewType = 'vscode-lottie-preview'
  private readonly _panel: vscode.WebviewPanel
  private readonly _extensionUri: vscode.Uri

  private _disposables: vscode.Disposable[] = []

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel
    this._extensionUri = extensionUri
    this._panel.iconPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'images', 'lottie-logo.png')

    // Set the webview's initial html content
    this._update()

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'alert':
            vscode.window.showErrorMessage(message.text)
            return
        }
      },
      null,
      this._disposables
    )

    vscode.window.onDidChangeActiveTextEditor((event?:vscode.TextEditor) => {
      if (isLottie(event)) {
        this._update()
      }
    },
    null,
    this._disposables
    )
  }

  public static show(extensionUri: vscode.Uri) {
    if (
      !vscode.window.activeTextEditor
    || !isLottie(vscode.window.activeTextEditor))
    {
      return vscode.window.showInformationMessage('Open a .json Lottie file first')
    }

    const column = vscode.window.activeTextEditor.viewColumn

    // If we already have a panel, show it.
    if (LottieViewerPanel.currentPanel) {
      LottieViewerPanel.currentPanel._panel.reveal(column)
      return
    }
    
    const panel = vscode.window.createWebviewPanel(
      LottieViewerPanel.viewType,
      'Lottie Viewer',
      vscode.ViewColumn.Beside,
      getWebviewOptions()
    )

    LottieViewerPanel.currentPanel = new LottieViewerPanel(panel, extensionUri)
  }

  public dispose() {
    LottieViewerPanel.currentPanel = undefined

    // Clean up our resources
    this._panel.dispose()

    disposeAll(this._disposables)
  }

  private async _update() {  
    const webview = this._panel.webview
    const jsonUri = vscode.window.activeTextEditor!.document.uri

    this._updateForFile(webview, jsonUri)
  }

  private _updateForFile(webview: vscode.Webview, jsonUri: vscode.Uri) {
    const fileName = posix.basename(jsonUri.path)

    this._panel.title = `VSCode Lottie Preview | ${fileName}`
    this._panel.webview.html = this._getHtmlForWebview(webview, jsonUri)
  }

  private _getHtmlForWebview(webview: vscode.Webview, jsonUri: vscode.Uri) {
    // Get resource paths
    const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css'))
    const dotlottiePlayerScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@dotlottie', 'player-component', 'dist', 'dotlottie-player.js'))
    const lottieFileUri = webview.asWebviewUri(jsonUri)

    const nonce = getNonce()

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">

        <!--
          Use a content security policy to only allow loading specific resources in the webview
        -->
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}'; connect-src ${webview.cspSource} https:; script-src-elem https:;">

        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lottie Viewer</title>

        <link href=${stylesUri} rel="stylesheet" />
      </head>
      <body>
        <dotlottie-player
          autoplay
          controls
          loop
          mode="normal"
          src="${lottieFileUri}"
        />
        <script nonce="${nonce}" src="${dotlottiePlayerScriptUri}"></script>
      </body>
      </html>`
  }
}

function getWebviewOptions(): vscode.WebviewOptions {
  return {
    // Enable javascript in the webview
    enableScripts: true
  }
}

function isJson(str: string): boolean {
  try {
    JSON.parse(str)
  } catch (error) {
    return false
  }
  return true
}

export function isLottie(activeTextEditor?: vscode.TextEditor): boolean {
  if (activeTextEditor) {
    const text = activeTextEditor.document.getText()
    if (activeTextEditor.document.languageId === 'json' && isJson(text)) {
      return Animation.isLottie(JSON.parse(text))
    }
    return false
  }
  return false
}
