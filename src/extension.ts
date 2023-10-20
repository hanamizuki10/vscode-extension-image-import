import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  //==========================================================================
  // エディタに表示
  //==========================================================================
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewPanelMyLoveCat', () => {
      MyLoveCatViewPanel.createOrShow(context.extensionUri);
    })
  );
  //==========================================================================
  // explorer に表示
  //==========================================================================
  context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(MyLoveCatViewProvider.viewType, new MyLoveCatViewProvider(context.extensionUri))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewExplorerMyLoveCat', () => {
      // すでにエクスプローラーには情報を表示しているけど、フォーカスを当てる感じ
      // 隠れていたら展開して表示するしエクスプローラーを閉じていたら開く
      vscode.commands.executeCommand('viewExplorerMyLoveCat.focus');
    })
  );
  //==========================================================================
  // ランダムで表示
  //==========================================================================
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-image-import.viewMyLoveCatRandom', () => {
      // 描画されている猫をrandomで描画切り替え
      MyLoveCatViewPanel.randomUpdate();
      MyLoveCatViewProvider.randomUpdate();
    })
  );
}

function _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
  // ランダムに表示する画像を選択
  const images = ["MyLoveCat01.jpg","MyLoveCat02.jpg","MyLoveCat03.jpg"];
  let filename = images[Math.floor(Math.random() * images.length)];
  // ファイルパスを生成 
  const catImageUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', filename));
  // ファイルパスのURIを生成
  const catGifSrc = webview.asWebviewUri(catImageUri);
  return  `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>My Love Cat</title>
</head>
<body>
<p>${filename}</p>
<img src="${catGifSrc}"></img>
</body>
</html>`;
}

/**
 * エディタに表示するためのクラス
 */
class MyLoveCatViewPanel {
	public static currentPanel: MyLoveCatViewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	public static readonly viewType = 'viewTypePanel';
	private _disposables: vscode.Disposable[] = [];

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		MyLoveCatViewPanel.currentPanel = new MyLoveCatViewPanel(panel, extensionUri);
	}
  public static randomUpdate() {
    if (MyLoveCatViewPanel.currentPanel) {
			MyLoveCatViewPanel.currentPanel._update();
			return;
		}
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    // TODO:この引数の意味をしっかりと後で確認する
    const column = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;
    // すでにパネルがある場合はそれを見せる
		if (MyLoveCatViewPanel.currentPanel) {
			MyLoveCatViewPanel.currentPanel._panel.reveal(column);
			return;
		}
    const webviewType = 'viewTypePanel';
    const webviewTitle = 'My Love Cat';
    // TODO:何ができるのか後で確認する
    const webviewOptions:vscode.WebviewOptions = {
      // Webview で JavaScript を有効にする
      enableScripts: true,
    };
    const panel = vscode.window.createWebviewPanel(
      webviewType,
      webviewTitle,
      column || vscode.ViewColumn.One,
      webviewOptions,
    );
		MyLoveCatViewPanel.currentPanel = new MyLoveCatViewPanel(panel, extensionUri);
  }
  // コンストラクタ
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
		this._extensionUri = extensionUri;
    this._update();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);
  }
  public dispose() {
		MyLoveCatViewPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}
  // 画像をランダムで表示する
  private _update() {
		const webview = this._panel.webview;
		this._panel.webview.html = _getHtmlForWebview(webview, this._extensionUri);
  }
}

/**
 * エクスプローラーに表示するためのクラス
 */
class MyLoveCatViewProvider implements vscode.WebviewViewProvider {
	public static currentProvider: MyLoveCatViewProvider | undefined;
  public static readonly viewType = 'viewExplorerMyLoveCat';
	private _view?: vscode.WebviewView;
  public static randomUpdate() {
    if (MyLoveCatViewProvider.currentProvider) {
			MyLoveCatViewProvider.currentProvider._update();
			return;
		}
  }
  constructor(
		private readonly _extensionUri: vscode.Uri,
	) {
    MyLoveCatViewProvider.currentProvider = this;
  }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;
		webviewView.webview.options = {
			enableScripts: true
		};
    this._update();
	}

  private _update() {
    if (this._view) {
      const webview = this._view.webview;
      this._view.webview.html = _getHtmlForWebview(webview, this._extensionUri);
    }
  }
}
