pragma Singleton
import QtQuick
QtObject {
  readonly property int cornerRadius: 0
  readonly property int normalBorderWidth: 1
  function space(value) { return value }
  readonly property QtObject font: QtObject {
    readonly property string family: Theme.palette.font || "monospace"
    readonly property int caption: 12
    readonly property int body: 16
    readonly property int bodySmall: 14
    readonly property int heading: 24
  }
}
