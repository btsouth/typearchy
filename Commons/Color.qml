pragma Singleton
import QtQuick
QtObject {
  readonly property color background: Theme.palette.background || "#111c18"
  readonly property color foreground: Theme.palette.foreground || "#d7d7ad"
  readonly property color accent: Theme.palette.accent || "#56a47b"
  // Keep reading text legible even when a theme uses a very dark muted color.
  readonly property color muted: Qt.rgba(foreground.r * 0.7 + background.r * 0.3, foreground.g * 0.7 + background.g * 0.3, foreground.b * 0.7 + background.b * 0.3, 1)
  readonly property color urgent: Theme.palette.red || "#ff665c"
  readonly property QtObject popups: QtObject {
    readonly property color background: Color.background
    readonly property color border: Color.muted
  }
}
