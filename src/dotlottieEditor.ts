import * as vscode from 'vscode'
import { Disposable, disposeAll } from './dispose'
import { getNonce } from './utils'

interface DotlottieDocumentDelegate {
  getFileData(): Promise<Uint8Array>
}

/**
 * Define the document (the data model) used for .lottie files.
 */
class DotlottieDocument extends Disposable implements vscode.CustomDocument {
  static async create(
    uri: vscode.Uri,
    backupId: string | undefined,
    delegate: DotlottieDocumentDelegate,
  ): Promise<DotlottieDocument | PromiseLike<DotlottieDocument>> {
    // If we have a backup, read that. Otherwise read the resource from the workspace
    const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri
    const fileData = await DotlottieDocument.readFile(dataFile)
    return new DotlottieDocument(uri, fileData, delegate)
  }

  private static async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    if (uri.scheme === 'untitled') {
      return new Uint8Array()
    }
    return new Uint8Array(await vscode.workspace.fs.readFile(uri))
  }

  private readonly _uri: vscode.Uri

  private _documentData: Uint8Array

  private readonly _delegate: DotlottieDocumentDelegate

  private constructor(
    uri: vscode.Uri,
    initialContent: Uint8Array,
    delegate: DotlottieDocumentDelegate,
  ) {
    super()
    this._uri = uri
    this._documentData = initialContent
    this._delegate = delegate
  }

  public get uri() {
    return this._uri
  }

  public get documentData(): Uint8Array {
    return this._documentData
  }

  private readonly _onDidDispose = this._register(new vscode.EventEmitter<void>())
  /**
   * Fired when the document is disposed of.
   */
  public readonly onDidDispose = this._onDidDispose.event

  private readonly _onDidChangeDocument = this._register(
    new vscode.EventEmitter<{
      readonly content?: Uint8Array
      // readonly edits: readonly DotlottieEdit[];
    }>(),
  )
  /**
   * Fired to notify webviews that the document has changed.
   */
  public readonly onDidChangeContent = this._onDidChangeDocument.event

  private readonly _onDidChange = this._register(
    new vscode.EventEmitter<{
      readonly label: string
      undo(): void
      redo(): void
    }>(),
  )
  /**
   * Fired to tell VS Code that an edit has occurred in the document.
   *
   * This updates the document's dirty indicator.
   */
  public readonly onDidChange = this._onDidChange.event

  /**
   * Called by VS Code when there are no more references to the document.
   *
   * This happens when all editors for it have been closed.
   */
  dispose(): void {
    this._onDidDispose.fire()
    super.dispose()
  }
}

/**
 * Provider for dotlottie editors.
 *
 * Dotlottie editors are used for `.lottie` files.
 *
 * This provider demonstrates:
 *
 * - How to implement a custom editor for binary files.
 * - Setting up the initial webview for a custom editor.
 * - Loading scripts and styles in a custom editor.
 * - Communication between VS Code and the custom editor.
 * - Using CustomDocuments to store information that is shared between multiple custom editors.
 * - Implementing save, undo, redo, and revert.
 * - Backing up a custom editor.
 */
export class DotlottieEditorProvider implements vscode.CustomEditorProvider<DotlottieDocument> {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      DotlottieEditorProvider.viewType,
      new DotlottieEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: false,
        },
        supportsMultipleEditorsPerDocument: false,
      },
    )
  }

  private static readonly viewType = 'vscode-lottie-preview.dotlottie'

  /**
   * Tracks all known webviews
   */
  private readonly webviews = new WebviewCollection()

  constructor(private readonly _context: vscode.ExtensionContext) {}

  //#region CustomEditorProvider

  async openCustomDocument(
    uri: vscode.Uri,
    openContext: { backupId?: string },
    // _token: vscode.CancellationToken
  ): Promise<DotlottieDocument> {
    const document: DotlottieDocument = await DotlottieDocument.create(uri, openContext.backupId, {
      getFileData: async () => {
        const webviewsForDocument = Array.from(this.webviews.get(document.uri))
        if (!webviewsForDocument.length) {
          throw new Error('Could not find webview to save for')
        }
        const panel = webviewsForDocument[0]
        const response = await this.postMessageWithResponse<number[]>(panel, 'getFileData', {})
        return new Uint8Array(response)
      },
    })

    const listeners: vscode.Disposable[] = []

    listeners.push(
      document.onDidChange((e) => {
        // Tell VS Code that the document has been edited by the use.
        this._onDidChangeCustomDocument.fire({
          document,
          ...e,
        })
      }),
    )

    listeners.push(
      document.onDidChangeContent((e) => {
        // Update all webviews when the document changes
        for (const webviewPanel of this.webviews.get(document.uri)) {
          this.postMessage(webviewPanel, 'update', {
            content: e.content,
          })
        }
      }),
    )

    document.onDidDispose(() => disposeAll(listeners))

    return document
  }

  async resolveCustomEditor(
    document: DotlottieDocument,
    webviewPanel: vscode.WebviewPanel,
    // _token: vscode.CancellationToken
  ): Promise<void> {
    // Add the webview to our internal set of active webviews
    this.webviews.add(document.uri, webviewPanel)

    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
    }
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document.uri)

    webviewPanel.webview.onDidReceiveMessage((e) => this.onMessage(document, e))

    // Wait for the webview to be properly ready before we init
    webviewPanel.webview.onDidReceiveMessage((e) => {
      if (e.type === 'ready') {
        if (document.uri.scheme === 'untitled') {
          this.postMessage(webviewPanel, 'init', {
            untitled: true,
            editable: true,
          })
        } else {
          const editable = vscode.workspace.fs.isWritableFileSystem(document.uri.scheme)

          this.postMessage(webviewPanel, 'init', {
            value: document.documentData,
            editable,
          })
        }
      }
    })
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentEditEvent<DotlottieDocument>
  >()
  public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event

  public saveCustomDocument(): Thenable<void> {
    return Promise.resolve()
  }

  public saveCustomDocumentAs(): Thenable<void> {
    return Promise.resolve()
  }

  public revertCustomDocument(): Thenable<void> {
    return Promise.resolve()
  }

  public backupCustomDocument(): Thenable<vscode.CustomDocumentBackup> {
    return Promise.resolve({
      id: 0,
      delete: async () => {
        // void
      },
    }).then()
  }

  //#endregion

  /**
   * Get the static HTML used for in our editor's webviews.
   */
  private getHtmlForWebview(webview: vscode.Webview, dotlottieUri: vscode.Uri): string {
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'media', 'styles.css'),
    )
    const mainJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'media', 'main.js'),
    )
    const dotlottiePlayerScriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._context.extensionUri,
        'node_modules',
        '@dotlottie',
        'player-component',
        'dist',
        'dotlottie-player.js',
      ),
    )
    const dotlottieFileUri = webview.asWebviewUri(dotlottieUri)

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
        <title>Dotlottie Viewer</title>

        <link href=${stylesUri} rel="stylesheet" />
      </head>
      <body>
          <div class="lottie-viewer">
          <div>
            <div class="wrap">
              <div class="input-box">
                <label for="width">Width (px/%)</label>
                <input id="width" type="text" value="300px" />
              </div>
              <div class="input-box">
                <label for="height">Height (px/%)</label>
                <input id="height" type="text" value="300px" />
              </div>
            </div>
            <div class="wrap">
              <div class="input-box">
                <label for="background-color">Background color</label>
                <input id="background-color" type="color" value="#ffffff" />
              </div>
              <div class="input-box">
                <label for="animation-speed">Animation speed</label>
                <select id="animation-speed">
                  <option value="1">1x</option>
                  <option value="2">2x</option>
                  <option value="3">3x</option>
                </select>
              </div>
            </div>
            <div class="wrap">
              <fieldset>
                <legend>Direction</legend>
                <div>
                  <input type="radio" id="forward" name="direction" value="1" checked />
                  <label for="forward">Forward</label>
                </div>
                <div>
                  <input type="radio" id="backward" name="direction" value="-1" />
                  <label for="backward">Backward</label>
                </div>
              </fieldset>
            </div>
            <div class="wrap">
              <fieldset>
                <div>
                  <input type="checkbox" id="controls" name="controls" value="controls" checked />
                  <label for="controls">Controls</label>
                </div>
                <small>Display animation controls: Play, Pause & Slider</small>
              </fieldset>
              <fieldset>
                <div>
                  <input type="checkbox" id="loop" name="loop" value="true" checked />
                  <label for="loop">Loop</label>
                </div>
                <small>Set to repeat animation</small>
              </fieldset>
            </div>
          </div>
          <div>
            <dotlottie-player
              class="dotlottie-player"
              src="${dotlottieFileUri}"
              autoplay
              controls
              loop
              mode="normal"
              style="width: 300px; height: 300px"
            />
          </div>
        </div>
        <script nonce="${nonce}" src="${dotlottiePlayerScriptUri}"></script>
        <script nonce="${nonce}" src="${mainJsUri}"></script>
      </body>
      </html>`
  }

  private _requestId = 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly _callbacks = new Map<number, (response: any) => void>()

  private postMessageWithResponse<R = unknown>(
    panel: vscode.WebviewPanel,
    type: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any,
  ): Promise<R> {
    const requestId = this._requestId++
    const p = new Promise<R>((resolve) => this._callbacks.set(requestId, resolve))
    panel.webview.postMessage({ type, requestId, body })
    return p
  }

  private postMessage(
    panel: vscode.WebviewPanel,
    type: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any,
  ): void {
    panel.webview.postMessage({ type, body })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onMessage(document: DotlottieDocument, message: any) {
    switch (message.type) {
      case 'response': {
        const callback = this._callbacks.get(message.requestId)
        callback?.(message.body)
        return
      }
    }
  }
}

/**
 * Tracks all webviews.
 */
class WebviewCollection {
  private readonly _webviews = new Set<{
    readonly resource: string
    readonly webviewPanel: vscode.WebviewPanel
  }>()

  /**
   * Get all known webviews for a given uri.
   */
  public *get(uri: vscode.Uri): Iterable<vscode.WebviewPanel> {
    const key = uri.toString()
    for (const entry of this._webviews) {
      if (entry.resource === key) {
        yield entry.webviewPanel
      }
    }
  }

  /**
   * Add a new webview to the collection.
   */
  public add(uri: vscode.Uri, webviewPanel: vscode.WebviewPanel) {
    const entry = { resource: uri.toString(), webviewPanel }
    this._webviews.add(entry)

    webviewPanel.onDidDispose(() => {
      this._webviews.delete(entry)
    })
  }
}
