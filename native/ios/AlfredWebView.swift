import SwiftUI
import UIKit
import WebKit
import EventKit

/// SwiftUI container that opens the hosted Alfred interface and exposes
/// a narrowly-scoped, read-only Apple Calendar bridge.
struct AlfredWebView: UIViewRepresentable {
    private let alfredURL = URL(string: "https://bm000001.github.io/Alfred/")!

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: "alfredCalendar")

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.load(URLRequest(url: alfredURL))
        context.coordinator.webView = webView
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "alfredCalendar")
        webView.navigationDelegate = nil
        coordinator.webView = nil
    }

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        weak var webView: WKWebView?
        private let calendarAccess = AlfredCalendarAccess()

        private func isTrustedAlfredURL(_ url: URL?) -> Bool {
            url?.scheme == "https" && url?.host == "bm000001.github.io"
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard isTrustedAlfredURL(webView.url) else { return }
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            decisionHandler(isTrustedAlfredURL(navigationAction.request.url) ? .allow : .cancel)
        }

        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard message.name == "alfredCalendar",
                  message.frameInfo.isMainFrame,
                  message.frameInfo.securityOrigin.protocol == "https",
                  message.frameInfo.securityOrigin.host == "bm000001.github.io",
                  let body = message.body as? [String: Any],
                  let action = body["action"] as? String,
                  let requestId = body["requestId"] as? String,
                  !requestId.isEmpty,
                  requestId.count <= 100 else { return }

            Task {
                do {
                    let events: [AlfredCalendarAccess.CalendarEvent]
                    switch action {
                    case "connect":
                        try await calendarAccess.requestPermission()
                        events = try calendarAccess.events()
                        send(["requestId": requestId, "status": "connected",
                              "events": events.map(Self.serialize)])
                    case "sync":
                        events = try calendarAccess.events()
                        send(["requestId": requestId, "status": "success",
                              "events": events.map(Self.serialize)])
                    default:
                        send(["requestId": requestId, "status": "error",
                              "message": "Ação de calendário desconhecida."])
                    }
                } catch {
                    send(["requestId": requestId, "status": "error",
                          "message": "Não foi possível acessar o Calendário Apple. Verifique a permissão do Alfred."])
                }
            }
        }

        private static func serialize(_ event: AlfredCalendarAccess.CalendarEvent) -> [String: Any] {
            [
                "id": event.id,
                "title": event.title,
                "startsAt": event.startsAt,
                "endsAt": event.endsAt,
                "isAllDay": event.isAllDay,
                "calendarTitle": event.calendarTitle,
                "location": event.location as Any? ?? NSNull()
            ]
        }

        private func send(_ payload: [String: Any]) {
            guard let data = try? JSONSerialization.data(withJSONObject: payload, options: [.fragmentsAllowed]),
                  let json = String(data: data, encoding: .utf8) else { return }
            webView?.evaluateJavaScript(
                "window.dispatchEvent(new CustomEvent('alfred-native-calendar', { detail: \(json) }));"
            )
        }
    }
}
