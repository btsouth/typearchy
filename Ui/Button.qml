import QtQuick
import QtQuick.Controls as Controls
import qs.Commons

Controls.Button {
  id: control
  property color foreground: Color.foreground
  property bool active: false
  property bool selected: false
  property bool bordered: false
  property int fontSize: 14
  horizontalPadding: 12
  verticalPadding: 8
  hoverEnabled: true
  // Mouse clicks must not take keyboard focus away from the game, or every shortcut
  // (Escape, Ctrl+R, typing itself) dies until the player clicks the background.
  focusPolicy: Qt.TabFocus
  leftPadding: horizontalPadding; rightPadding: horizontalPadding
  topPadding: verticalPadding; bottomPadding: verticalPadding
  font.family: Style.font.family
  font.pixelSize: fontSize
  contentItem: Text {
    text: control.text; font: control.font
    color: control.enabled ? control.foreground : Color.muted
    horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter
  }
  background: Rectangle {
    color: control.down || control.active || control.selected ? Qt.rgba(Color.accent.r, Color.accent.g, Color.accent.b, .2)
      : control.hovered ? Qt.rgba(Color.accent.r, Color.accent.g, Color.accent.b, .08) : "transparent"
    border.width: control.bordered || control.activeFocus || control.active || control.selected ? 1 : 0
    border.color: control.activeFocus || control.active || control.selected ? Color.accent : Color.muted
  }
}
