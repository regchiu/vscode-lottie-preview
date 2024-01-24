import * as vscode from 'vscode'
import { Animation } from '@lottiefiles/lottie-js'

export function isJson(str: string): boolean {
  try {
    JSON.parse(str)
  } catch (error) {
    return false
  }
  return true
}

export function isLottie(activeTextEditor?: vscode.TextEditor): boolean {
  if (activeTextEditor && activeTextEditor.document.languageId === 'json') {
    const text = activeTextEditor.document.getText()
    if (isJson(text)) {
      return Animation.isLottie(JSON.parse(text))
    }
    return false
  }
  return false
}

export function getNonce() {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}
