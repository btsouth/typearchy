pragma Singleton
import QtQuick
import Quickshell
import Quickshell.Io
QtObject {
  id: root
  property var palette: ({})
  readonly property FileView file: FileView {
    path: (Quickshell.env("TYPEARCHY_STATE_DIR") || (Quickshell.env("HOME") + "/.local/state/typearchy")) + "/desktop/theme.json"
    printErrors: false
    onLoaded: { try { root.palette = JSON.parse(text()) } catch (error) {} }
  }
}
