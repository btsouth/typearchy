import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui
import "Content.js" as Content
import "TypearchyModel.js" as Model

Panel {
  id: root

  moduleName: "dev.typearchy.game"
  manageIpc: false

  readonly property string home: Quickshell.env("HOME")
  readonly property string stateDir: home + "/.local/state/typearchy"
  readonly property string shareDir: home + "/Pictures/Typearchy"
  readonly property string statePath: stateDir + "/stats.json"

  property var stats: Model.emptyState()
  property int cursorIndex: 0
  property string actionStatus: ""

  readonly property var latest: Model.latestRun(stats)
  readonly property real todayBest: Model.bestForDate(stats, Model.localDateKey(new Date()))
  readonly property var dailyResult: Model.dailyRun(stats, String(Content.dailyNumber(new Date())))
  readonly property color foreground: bar ? bar.foreground : Color.foreground
  readonly property color dim: Qt.rgba(foreground.r, foreground.g, foreground.b, 0.58)
  readonly property string fontFamily: bar ? bar.fontFamily : Style.font.family

  function loadStats(raw) {
    root.stats = Model.parseState(raw)
  }

  function launch(mode, duration, view) {
    root.close()
    var payload = JSON.stringify({ mode: mode, duration: duration, view: view || "test" })
    Quickshell.execDetached(["omarchy-shell", "shell", "summon", root.moduleName, payload])
  }

  function activate(index) {
    if (index === 0) root.launch("sprint", root.stats.settings.duration)
    else if (index === 1) root.launch("daily", 30)
    else if (index === 2) root.launch("drill", 30)
    else if (index === 3) root.launch(root.stats.settings.defaultMode, root.stats.settings.duration, "stats")
    else root.copyLatest()
  }

  function copyLatest() {
    if (!root.latest) {
      root.actionStatus = "Finish a test first"
      statusTimer.restart()
      return
    }
    var summary = Model.shareText(root.latest)
    copyProc.command = ["bash", "-c", "printf '%s' \"$1\" | wl-copy", "--", summary]
    copyProc.running = true
  }

  Component.onCompleted: initProc.running = true

  Process {
    id: initProc
    command: ["mkdir", "-p", root.stateDir, root.shareDir]
    onExited: statsFile.reload()
  }

  Process {
    id: copyProc
    onExited: function(exitCode) {
      root.actionStatus = exitCode === 0 ? "Result copied" : "Copy failed. Is wl-copy installed?"
      statusTimer.restart()
    }
  }

  Timer {
    id: statusTimer
    interval: 1800
    onTriggered: root.actionStatus = ""
  }

  FileView {
    id: statsFile
    path: root.statePath
    watchChanges: true
    printErrors: false
    onLoaded: root.loadStats(text())
    onLoadFailed: root.loadStats("")
    onFileChanged: reload()
  }

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    iconComponent: Component {
      TypearchyIcon {
        anchors.fill: parent
        color: button.foreground
      }
    }
    active: false
    useActiveColor: false
    tooltipText: root.todayBest > 0
      ? "Typearchy typing game · today's best " + Math.round(root.todayBest) + " WPM"
      : "Typearchy typing game"
    onPressed: function(buttonCode) {
      if (buttonCode === Qt.RightButton) root.launch("sprint", root.stats.settings.duration)
      else root.toggle()
    }
  }

  KeyboardPanel {
    id: panel
    anchorItem: button
    owner: root
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(340))
    contentHeight: panel.fittedContentHeight(content.implicitHeight, Style.space(620))

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onMoveRequested: function(dx, dy) {
        if (dy !== 0) root.cursorIndex = (root.cursorIndex + dy + 5) % 5
      }
      onActivateRequested: root.activate(root.cursorIndex)
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onTextKey: function(value) {
        if (value === "q") root.launch("sprint", root.stats.settings.duration)
        else if (value === "d") root.launch("daily", 30)
        else if (value === "f") root.launch("drill", 30)
        else if (value === "h") root.launch(root.stats.settings.defaultMode, root.stats.settings.duration, "stats")
        else if (value === "s") root.copyLatest()
      }

      Column {
        id: content
        width: parent.width
        spacing: Style.space(14)

        Column {
          width: parent.width
          spacing: Style.space(3)

          Text {
            text: "TYPEARCHY"
            color: root.foreground
            font.family: root.fontFamily
            font.pixelSize: Style.font.heading
            font.bold: true
            font.letterSpacing: 2
          }

          Text {
            text: "Your daily keyboard ritual"
            color: root.dim
            font.family: root.fontFamily
            font.pixelSize: Style.font.bodySmall
          }
        }

        Rectangle {
          width: parent.width
          height: Style.space(92)
          radius: Style.cornerRadius
          color: Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, 0.06)

          Row {
            anchors.fill: parent
            anchors.margins: Style.space(12)
            spacing: Style.space(10)

            Stat {
              width: (parent.width - parent.spacing * 2) / 3
              label: "TODAY"
              value: root.todayBest > 0 ? Math.round(root.todayBest) : "-"
              suffix: root.todayBest > 0 ? " WPM" : ""
            }
            Stat {
              width: (parent.width - parent.spacing * 2) / 3
              label: "BEST"
              value: root.stats.bestWpm > 0 ? Math.round(root.stats.bestWpm) : "-"
              suffix: root.stats.bestWpm > 0 ? " WPM" : ""
            }
            Stat {
              width: (parent.width - parent.spacing * 2) / 3
              label: "STREAK"
              value: root.stats.streak || 0
              suffix: root.stats.streak === 1 ? " DAY" : " DAYS"
            }
          }
        }

        Button {
          width: parent.width
          text: "Quick sprint  ·  " + root.stats.settings.duration + " seconds"
          bordered: true
          leftAlign: true
          hasCursor: root.cursorIndex === 0
          foreground: root.foreground
          onClicked: { root.cursorIndex = 0; root.launch("sprint", root.stats.settings.duration) }
          onHovered: function(value) { if (value) root.cursorIndex = 0 }
        }

        Button {
          width: parent.width
          text: root.dailyResult
            ? "Daily #" + Content.dailyNumber(new Date()) + "  ·  " + Math.round(root.dailyResult.wpm) + " WPM complete"
            : "Daily challenge  ·  #" + Content.dailyNumber(new Date())
          bordered: true
          leftAlign: true
          hasCursor: root.cursorIndex === 1
          foreground: root.foreground
          onClicked: { root.cursorIndex = 1; root.launch("daily", 30) }
          onHovered: function(value) { if (value) root.cursorIndex = 1 }
        }

        Button {
          width: parent.width
          text: Model.weakKeys(root.stats, 4).length
            ? "Drill practice  ·  " + Model.weakKeys(root.stats, 4).join(" ")
            : "Drill practice  ·  build accuracy"
          bordered: true
          leftAlign: true
          hasCursor: root.cursorIndex === 2
          foreground: root.foreground
          onClicked: { root.cursorIndex = 2; root.launch("drill", 30) }
          onHovered: function(value) { if (value) root.cursorIndex = 2 }
        }

        Button {
          width: parent.width
          text: "History and practice insights"
          bordered: true
          leftAlign: true
          hasCursor: root.cursorIndex === 3
          foreground: root.foreground
          onClicked: {
            root.cursorIndex = 3
            root.launch(root.stats.settings.defaultMode, root.stats.settings.duration, "stats")
          }
          onHovered: function(value) { if (value) root.cursorIndex = 3 }
        }

        Button {
          width: parent.width
          text: root.latest ? "Copy latest result" : "No result to share yet"
          bordered: true
          leftAlign: true
          enabled: !!root.latest
          hasCursor: root.cursorIndex === 4
          foreground: root.foreground
          onClicked: { root.cursorIndex = 4; root.copyLatest() }
          onHovered: function(value) { if (value) root.cursorIndex = 4 }
        }

        Text {
          width: parent.width
          text: root.actionStatus || (root.latest
            ? Math.round(Model.recentAverage(root.stats, "wpm", 10)) + " WPM avg  ·  "
              + Math.round(Model.recentAverage(root.stats, "accuracy", 10)) + "% acc  ·  " + root.stats.totalTests + " tests"
            : "Right-click the bar widget to jump into a sprint")
          color: root.actionStatus ? Color.accent : root.dim
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
          horizontalAlignment: Text.AlignHCenter
          wrapMode: Text.WordWrap
        }
      }
    }
  }

  component Stat: Item {
    property string label: ""
    property var value: "-"
    property string suffix: ""

    implicitHeight: statColumn.implicitHeight

    Column {
      id: statColumn
      anchors.centerIn: parent
      spacing: Style.space(3)

      Text {
        anchors.horizontalCenter: parent.horizontalCenter
        text: label
        color: root.dim
        font.family: root.fontFamily
        font.pixelSize: Style.font.caption
        font.letterSpacing: 1
      }

      Text {
        anchors.horizontalCenter: parent.horizontalCenter
        text: String(value) + suffix
        color: root.foreground
        font.family: root.fontFamily
        font.pixelSize: Style.font.body
        font.bold: true
      }
    }
  }
}
