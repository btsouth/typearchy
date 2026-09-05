import QtQuick
Rectangle {
  property string text: ""
  property color foreground: "#d7d7ad"
  property bool active: false
  property bool selected: false
  property bool bordered: false
  property int fontSize: 14
  property real horizontalPadding: 8
  property real verticalPadding: 6
  signal clicked()
  color: "transparent"
  implicitWidth: label.implicitWidth + horizontalPadding * 2
  implicitHeight: label.implicitHeight + verticalPadding * 2
  Text { id: label; anchors.centerIn: parent; text: parent.text; color: parent.foreground; font.pixelSize: parent.fontSize }
  MouseArea { anchors.fill: parent; onClicked: parent.clicked() }
}
