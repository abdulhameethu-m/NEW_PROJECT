import { Component } from 'react';
import { IOSWebViewProps, AndroidWebViewProps, WindowsWebViewProps } from 'react-native-webview/lib/WebViewTypes';

declare module 'react-native-webview' {
  export type WebViewProps = IOSWebViewProps & AndroidWebViewProps & WindowsWebViewProps;

  export class WebView<P = {}> extends Component<WebViewProps & P> {
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    stopLoading(): void;
    injectJavaScript: (script: string) => void;
    requestFocus: () => void;
    postMessage: (message: string) => void;
    clearFormData?: () => void;
    clearCache: (includeDiskFiles: boolean) => void;
    clearHistory?: () => void;
  }

  export default WebView;
}

