export function virtualRender({
  canvas,
  fn,
  throttle = 120,
  fadeIn = 120,
  fadeStrength = 0.4,
}) {
  const overdraw = 0.6

  const ctx = canvas.getContext('2d', { alpha: true })

  // offscreen and smoothing canvases will swap back and forth for performance
  // only adding this now because I think it's going to help a lot
  let canvas1 = new OffscreenCanvas(100, 100)
  let canvas2 = new OffscreenCanvas(100, 100)
  // store everything related in an object so it's easy to swap together
  let offscreen = {
    canvas: canvas1,
    ctx: canvas1.getContext('2d', { alpha: false }),
    info: null,
  }
  let smoothing = {
    canvas: canvas2,
    ctx: canvas2.getContext('2d', { alpha: false }),
    info: null,
  }

  const smoothingCurve = value =>
    thru.clamp([0, 1], thru.line([0, fadeIn], [fadeStrength, 0], value))

  let lastXRange
  let lastYRange

  const updateOffscreenCanvas = _throttle(
    throttle,
    function updateOffscreenCanvas(frameState) {
      // swap
      let tmp = offscreen
      offscreen = smoothing
      smoothing = tmp

      // this also clears, which allows the artist to use transparency and not have artifacts
      offscreen.canvas.width = Math.round(canvas.width * (1 + overdraw))
      offscreen.canvas.height = Math.round(canvas.height * (1 + overdraw))

      // The drawn area has lots of extra around the edges so as a  user
      // drags or zooms there's something already waiting to fill in the new space
      const xRange = thru.scale(overdraw, 0.5, frameState.xRange)
      const yRange = thru.scale(overdraw, 0.5, frameState.yRange)

      const xPxRange = [0, offscreen.canvas.width]
      const yPxRange = [0, offscreen.canvas.height]

      const xToPx = thru.line(xRange, xPxRange)
      const yToPx = thru.line(yRange, yPxRange)

      // this is just a helper so artist doesn't have to convert all the x/y values for a line
      const loop = points => {
        const [moveTo, ...lineTos] = points.map(([x, y]) => [
          xToPx(x),
          yToPx(y),
        ])
        offscreen.ctx.beginPath()
        offscreen.ctx.moveTo(...moveTo)
        lineTos.forEach(coord => offscreen.ctx.lineTo(...coord))
        offscreen.ctx.closePath()
      }

      // artist's turn to draw on the canvas:
      fn(offscreen.ctx, {
        loop,
        xToPx,
        yToPx,
        xRange,
        yRange,
        xPxRange,
        yPxRange,
        xy: (x, y) => [xToPx(x), yToPx(y)],
      })

      offscreen.info = {
        ...frameState,
        // overwrite frameState's ranges with new expanded ones
        xRange,
        yRange,
        xPxRange,
        yPxRange,
        timestamp: Date.now(),
      }
      draw(frameState)
    },
  )

  const draw = _throttle(30, function draw() {
    // rebuilding these here may not be needed
    const xRange = lastXRange
    const yRange = lastYRange
    const xToPx = x => thru.line(xRange, [0, canvas.width], x)
    const yToPx = y => thru.line(yRange, [0, canvas.height], y)

    if (!offscreen.info) {
      ctx.fillStyle = 'hsla(30, 80%, 60%, 0.9)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const smooth = smoothingCurve(Date.now() - offscreen.info.timestamp)
    if (smoothing.info && smooth > 0) {
      ctx.globalAlpha = 1
      ctx.filter = 'blur(4px)'
      copyCanvas(smoothing)
    }
    ctx.globalAlpha = 1 - smooth
    ctx.filter = 'none'
    copyCanvas(offscreen)

    function copyCanvas({ info, canvas: sourceCanvas }) {
      const renderingVisibleXRange = info.xRange.map(thru.clamp(xRange))
      const renderingVisibleYRange = info.yRange.map(thru.clamp(yRange))

      const viewportXPxRange = renderingVisibleXRange.map(xToPx)
      const viewportYPxRange = renderingVisibleYRange.map(yToPx)
      const renderingXPxRange = renderingVisibleXRange.map(
        thru.line(info.xRange, info.xPxRange),
      )
      const renderingYPxRange = renderingVisibleYRange.map(
        thru.line(info.yRange, info.yPxRange),
      )

      const args = [
        sourceCanvas,
        renderingXPxRange[0],
        renderingYPxRange[0],
        thru.duration(renderingXPxRange),
        thru.duration(renderingYPxRange),
        viewportXPxRange[0],
        viewportYPxRange[0],
        thru.duration(viewportXPxRange),
        thru.duration(viewportYPxRange),
      ]
      ctx.drawImage(...args)
    }
  })

  function _draw() {
    let xRange = lastXRange
    let yRange = lastYRange
    const frameState = {
      xRange,
      yRange,
      xToPx: x => thru.line(xRange, [0, canvas.width], x),
      xToX: x => thru.line([0, canvas.width], xRange, x),
      yToPx: y => thru.line(yRange, [0, canvas.height], y),
      pxToY: y => thru.line([0, canvas.height], yRange, y),
    }
    draw(frameState)
  }

  // i'm not proud of this, but one debouncer each is just easier
  const postUpdate1 = _debounce(40, _draw)
  const postUpdate2 = _debounce(80, _draw)
  const postUpdate3 = _debounce(110, _draw)
  const postUpdate4 = _debounce(130, _draw)
  const postUpdate5 = _debounce(150, _draw)
  const postUpdate6 = _debounce(200, _draw)
  const postUpdate7 = _debounce(280, _draw)
  const postUpdate8 = _debounce(600, _draw)
  const postUpdate9 = _debounce(1200, _draw)

  return function update(xRange, yRange, redraw = true) {
    lastXRange = xRange
    lastYRange = yRange
    const frameState = {
      xRange,
      yRange,
      xToPx: x => thru.line(xRange, [0, canvas.width], x),
      xToX: x => thru.line([0, canvas.width], xRange, x),
      yToPx: y => thru.line(yRange, [0, canvas.height], y),
      pxToY: y => thru.line([0, canvas.height], yRange, y),
    }
    draw(frameState)
    updateOffscreenCanvas(frameState)
    postUpdate1()
    postUpdate2()
    postUpdate3()
    postUpdate4()
    postUpdate5()
    postUpdate6()
    postUpdate7()
    postUpdate8()
    postUpdate9()
  }
}

function _throttle(cooldown = 120, fn) {
  let nextRunTime = 0
  // most recent args are used so the fn isn't called with old info
  let lastArgs = null
  return function run(...args) {
    let now = Date.now()
    if (now - nextRunTime > cooldown) {
      // cooldown is over, call as normal
      nextRunTime = now
      fn(...args)
    } else if (now - nextRunTime > 0) {
      // cooldown in progress, schedule call
      nextRunTime = nextRunTime + cooldown
      lastArgs = args
      setTimeout(() => fn(...lastArgs), nextRunTime - now)
    } else {
      lastArgs = args
      // call already scheduled, do nothing
    }
  }
}

function _debounce(cooldown = 120, fn) {
  let lastTimer
  return (...args) => {
    if (lastTimer) {
      clearTimeout(lastTimer)
      lastTimer = null
    }

    lastTimer = setTimeout(fn.bind(null, ...args), cooldown)
  }
}

export const thru = (() => {
  const from = curry((range, value) => (value - range[0]) / duration(range))

  const to = curry((range, value) => value * duration(range) + range[0])

  const line = curry((a, b, value) => to(b, from(a, value)))

  const toFixedString = range => range.map(n => n.toFixed(2))

  const duration = ([start, end]) => end - start

  const grow = curry((amount, origin, range) => {
    return add(range, [-amount * origin, amount * (1 - origin)])
  })

  const scale = curry((amount, origin, range) => {
    return grow(duration(range) * amount, origin, range)
  })

  const add = curry((a, b) => [a[0] + b[0], a[1] + b[1]])
  const sub = curry((a, b) => [a[0] - b[0], a[1] - b[1]])

  const multiply = curry((amount, range) => [
    amount * range[0],
    amount * range[1],
  ])

  const contains = curry((range, value) => {
    // If clamping didn't change it then it's in the range
    return value === clamp(range, value)
  })

  const containsRange = curry((container, range) => {
    return (
      contains(container, range[0]) ||
      contains(container, range[0]) ||
      contains(range, container[0])
    )
  })

  const valueIn = curry((value, range) => contains(range, value))

  const clamp = curry((range, value) => {
    // ranges could be inverted so the max
    // and min must be calculated, I think..
    const max = Math.max(...range)
    const min = Math.min(...range)
    return Math.min(max, Math.max(min, value))
  })

  function curry(fn, namer) {
    // chef will execute the function or wait for more args with a new function
    function chef(args = []) {
      if (args.length >= fn.length) {
        return fn(...args)
      } else {
        const argsGetter = function(...newArgs) {
          return chef(args.concat(newArgs))
        }
        // custom names to make debugging easier
        Object.defineProperty(argsGetter, 'name', {
          value: namer
            ? namer(args)
            : `Give me ${fn.length - args.length} args`,
          writable: false,
        })
        argsGetter.args = args
        argsGetter.fn = fn
        return argsGetter
      }
    }
    return chef()
  }

  return {
    from,
    to,
    line,
    toFixedString,
    duration,
    grow,
    scale,
    add,
    sub,
    multiply,
    contains,
    containsRange,
    valueIn,
    clamp,
    curry,
  }
})()
