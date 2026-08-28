import QtQuick

Item {
  id: root

  property color color: "white"

  onColorChanged: canvas.requestPaint()

  Canvas {
    id: canvas
    anchors.fill: parent
    antialiasing: true

    onWidthChanged: requestPaint()
    onHeightChanged: requestPaint()

    onPaint: {
      var ctx = getContext("2d")
      ctx.clearRect(0, 0, width, height)

      var size = Math.min(width, height)
      var left = (width - size) / 2
      var top = (height - size) / 2
      function x(value) { return left + value * size / 18 }
      function y(value) { return top + value * size / 18 }

      ctx.strokeStyle = String(root.color)
      ctx.fillStyle = String(root.color)
      ctx.lineWidth = Math.max(1.15, size * 0.078)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      ctx.beginPath()
      ctx.moveTo(x(3.1), y(4.2))
      ctx.lineTo(x(14.9), y(4.2))
      ctx.quadraticCurveTo(x(16), y(4.2), x(16), y(5.3))
      ctx.lineTo(x(16), y(12.7))
      ctx.quadraticCurveTo(x(16), y(13.8), x(14.9), y(13.8))
      ctx.lineTo(x(3.1), y(13.8))
      ctx.quadraticCurveTo(x(2), y(13.8), x(2), y(12.7))
      ctx.lineTo(x(2), y(5.3))
      ctx.quadraticCurveTo(x(2), y(4.2), x(3.1), y(4.2))
      ctx.closePath()
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(x(4.3), y(7.1))
      ctx.lineTo(x(5.2), y(7.1))
      ctx.moveTo(x(4.3), y(10.2))
      ctx.lineTo(x(5.2), y(10.2))
      ctx.moveTo(x(6.9), y(10.2))
      ctx.lineTo(x(7.8), y(10.2))
      ctx.moveTo(x(4.3), y(12.1))
      ctx.lineTo(x(8), y(12.1))
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(x(10.7), y(5.4))
      ctx.lineTo(x(7.9), y(9.4))
      ctx.lineTo(x(10.3), y(9.4))
      ctx.lineTo(x(9.2), y(12.8))
      ctx.lineTo(x(13.4), y(8.1))
      ctx.lineTo(x(10.9), y(8.1))
      ctx.closePath()
      ctx.fill()
    }
  }
}
