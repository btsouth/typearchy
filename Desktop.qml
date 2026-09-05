//@ pragma AppId dev.typearchy.App
import QtQuick
import Quickshell
import Quickshell.Io

ShellRoot {
  Component.onCompleted: Quickshell.watchFiles = false
  Overlay {
    id: game
    standalone: true
    onQuitRequested: Qt.quit()
  }
  IpcHandler {
    target: "typearchy"
    function open(payload: string): string { game.open(payload); return "ok" }
    function status(): string { return JSON.stringify({opened: game.opened, phase: game.phase, challenge: game.competitionOpen}) }
    function close(): string { game.requestClose(); return "ok" }
  }
  Timer {
    interval: 1; running: true
    onTriggered: game.open(Quickshell.env("TYPEARCHY_LAUNCH_PAYLOAD") || "{}")
  }
}
