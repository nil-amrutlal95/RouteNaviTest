import alpha from 'color-alpha';
import Base from '../components/Base';
import { clamp, almost, len, parseUnit, toPx, isObj } from '../mumath';
import gridStyle from '../gridStyle';
import Axis from './Axis';

//constructor
class Grid extends Base {
  constructor(canvas, opts) {
    super(opts);
    this.canvas = canvas;
    this.context = this.canvas.getContext('2d');
    this.state = {};
    this.setDefaults();
    this.update(opts);
    this.draw();
  }
  render() {
    // this.draw();
    return this;
  }
  //re-evaluate lines, calc options for renderer
  update(opts) {
    if (!opts) opts = {};
    console.log(opts);
    let shape = [this.canvas.width, this.canvas.height];

    //recalc state
    this.state.x = this.calcCoordinate(this.axisX, shape, this);
    this.state.y = this.calcCoordinate(this.axisY, shape, this);
    this.state.x.opposite = this.state.y;
    this.state.y.opposite = this.state.x;
    this.emit('update', opts);
    return this;
  }

  //re-evaluate lines, calc options for renderer
  update2(center) {
    if (!center) return;
    let shape = [this.canvas.width, this.canvas.height];
    Object.assign(this.center, center);
    //recalc state
    this.state.x = this.calcCoordinate(this.axisX, shape, this);
    this.state.y = this.calcCoordinate(this.axisY, shape, this);
    this.state.x.opposite = this.state.y;
    this.state.y.opposite = this.state.x;
    this.emit('update', center);

    this.axisX.offset = center.x;
    this.axisX.zoom = center.zoom;

    this.axisY.offset = center.y;
    this.axisY.zoom = center.zoom;
    return this;
  }
  //get state object with calculated params, ready for rendering
  calcCoordinate(coord, shape) {
    let state = {
      coordinate: coord,
      shape: shape,
      grid: this
    };
    //calculate real offset/range
    state.range = coord.getRange(state);
    state.offset = clamp(
      coord.offset - state.range * clamp(0.5, 0, 1),
      Math.max(coord.min, -Number.MAX_VALUE + 1),
      Math.min(coord.max, Number.MAX_VALUE) - state.range
    );
    state.zoom = coord.zoom;
    //calc style
    state.axisColor =
      typeof coord.axisColor === 'number'
        ? alpha(coord.color, coord.axisColor)
        : coord.axisColor || coord.color;
    state.axisWidth = coord.axisWidth || coord.lineWidth;
    state.lineWidth = coord.lineWidth;
    state.tickAlign = coord.tickAlign;
    state.labelColor = state.color;
    //get padding
    if (typeof coord.padding === 'number') {
      state.padding = Array(4).fill(coord.padding);
    } else if (coord.padding instanceof Function) {
      state.padding = coord.padding(state);
    } else {
      state.padding = coord.padding;
    }
    //calc font
    if (typeof coord.fontSize === 'number') {
      state.fontSize = coord.fontSize;
    } else {
      let units = parseUnit(coord.fontSize);
      state.fontSize = units[0] * toPx(units[1]);
    }
    state.fontFamily = coord.fontFamily || 'sans-serif';
    //get lines stops, including joined list of values
    let lines;
    if (coord.lines instanceof Function) {
      lines = coord.lines(state);
    } else {
      lines = coord.lines || [];
    }
    state.lines = lines;
    //calc colors
    if (coord.lineColor instanceof Function) {
      state.lineColors = coord.lineColor(state);
    } else if (Array.isArray(coord.lineColor)) {
      state.lineColors = coord.lineColor;
    } else {
      let color =
        typeof coord.lineColor === 'number'
          ? alpha(coord.color, coord.lineColor)
          : coord.lineColor === false || coord.lineColor == null
          ? null
          : coord.color;
      state.lineColors = Array(lines.length).fill(color);
    }
    //calc ticks
    let ticks;
    if (coord.ticks instanceof Function) {
      ticks = coord.ticks(state);
    } else if (Array.isArray(coord.ticks)) {
      ticks = coord.ticks;
    } else {
      let tick =
        coord.ticks === true || coord.ticks === true ? state.axisWidth * 2 : coord.ticks || 0;
      ticks = Array(lines.length).fill(tick);
    }
    state.ticks = ticks;
    //calc labels
    let labels;
    if (coord.labels === true) labels = state.lines.concat(Array(sublines.length).fill(null));
    else if (coord.labels instanceof Function) {
      labels = coord.labels(state);
    } else if (Array.isArray(coord.labels)) {
      labels = coord.labels;
    } else if (isObj(coord.labels)) {
      labels = coord.labels;
    } else {
      labels = Array(state.lines.length).fill(null);
    }
    state.labels = labels;
    //convert hashmap ticks/labels to lines + colors
    if (isObj(ticks)) {
      state.ticks = Array(lines.length).fill(0);
    }
    if (isObj(labels)) {
      state.labels = Array(lines.length).fill(null);
    }
    if (isObj(ticks)) {
      for (let value in ticks) {
        state.ticks.push(ticks[value]);
        state.lines.push(parseFloat(value));
        state.lineColors.push(null);
        state.labels.push(null);
      }
    }
    if (isObj(labels)) {
      for (let value in labels) {
        state.labels.push(labels[value]);
        state.lines.push(parseFloat(value));
        state.lineColors.push(null);
        state.ticks.push(null);
      }
    }
    return state;
  }

  setDefaults() {
    this.pixelRatio = window.devicePixelRatio;
    this.autostart = true;
    this.interactions = true;

    this.defaults = Object.assign(
      {
        type: 'linear',
        name: '',
        units: '',
        state: {},

        //visible range params
        minZoom: -Infinity,
        maxZoom: Infinity,
        min: -Infinity,
        max: Infinity,
        offset: 0,
        origin: 0.5,
        center: {
          x: 0,
          y: 0,
          zoom: 1
        },
        zoom: 1,
        zoomEnabled: true,
        panEnabled: true,

        //labels
        labels: true,
        fontSize: '11pt',
        fontFamily: 'sans-serif',
        padding: 0,
        color: 'rgb(0,0,0,1)',

        //lines params
        lines: true,
        tick: 8,
        tickAlign: 0.5,
        lineWidth: 1,
        distance: 13,
        style: 'lines',
        lineColor: 0.4,

        //axis params
        axis: true,
        axisOrigin: 0,
        axisWidth: 1.5,
        axisColor: 0.8,

        //stub methods
        //return coords for the values, redefined by axes
        getCoords: (values, state) => [0, 0, 0, 0],

        //return 0..1 ratio based on value/offset/range, redefined by axes
        getRatio: (value, state) => 0,

        //default label formatter
        format: v => v
      },
      gridStyle,
      this.options
    );

    this.axisX = new Axis('x', this.defaults);
    this.axisY = new Axis('y', this.defaults);

    this.axisX = Object.assign({}, this.defaults, {
      orientation: 'x',
      getCoords: (values, state) => {
        let coords = [];
        if (!values) return coords;
        for (let i = 0; i < values.length; i++) {
          let t = state.coordinate.getRatio(values[i], state);
          coords.push(t);
          coords.push(0);
          coords.push(t);
          coords.push(1);
        }
        return coords;
      },
      getRange: state => {
        return state.shape[0] * state.coordinate.zoom;
      },
      //FIXME: handle infinity case here
      getRatio: (value, state) => {
        return (value - state.offset) / state.range;
      }
    });
    this.axisY = Object.assign({}, this.defaults, {
      orientation: 'y',
      getCoords: (values, state) => {
        let coords = [];
        if (!values) return coords;
        for (let i = 0; i < values.length; i++) {
          let t = state.coordinate.getRatio(values[i], state);
          coords.push(0);
          coords.push(t);
          coords.push(1);
          coords.push(t);
        }
        return coords;
      },
      getRange: state => {
        return state.shape[1] * state.coordinate.zoom;
      },
      getRatio: (value, state) => {
        return 1 - (value - state.offset) / state.range;
      }
    });

    Object.assign(this, this.defaults);
    Object.assign(this, this.options);
  }

  //draw grid to the canvas
  draw() {
    let objects = this.canvas.getObjects();
    console.log(objects);
    objects.forEach(obj => {
      if (obj.class === 'grid') {
        this.canvas.remove(obj);
      }
    });

    this.drawLines(this.state.x);
    this.drawLines(this.state.y);
    return this;
  }
  //lines instance draw
  drawLines(state) {
    //draw lines and sublines
    if (!state || !state.coordinate) return;

    const ctx = this.canvas;
    let [width, height] = state.shape;
    let left = 0;
    let top = 0;
    let [pt, pr, pb, pl] = state.padding;

    let axisRatio = state.opposite.coordinate.getRatio(state.coordinate.axisOrigin, state.opposite);
    axisRatio = clamp(axisRatio, 0, 1);
    let coords = state.coordinate.getCoords(state.lines, state);
    //draw state.lines
    // ctx.lineWidth = 1;//state.lineWidth/2.;
    for (let i = 0, j = 0; i < coords.length; i += 4, j++) {
      let color = state.lineColors[j];
      if (!color) continue;
      let line = new fabric.Path('M 0 0', {
        stroke: color,
        fill: false,
        strokeWidth: 1,
        class: 'grid',
        selectable: false,
        evented: false,
				objectCaching: true,
				lockUniScaling:true
      });
      // ctx.strokeStyle = color;
      // ctx.beginPath();
      let x1 = left + pl + coords[i] * (width - pr - pl),
        y1 = top + pt + coords[i + 1] * (height - pb - pt);
      let x2 = left + pl + coords[i + 2] * (width - pr - pl),
        y2 = top + pt + coords[i + 3] * (height - pb - pt);
      // ctx.moveTo(x1, y1);
      // ctx.lineTo(x2, y2);
      // ctx.stroke();
      // ctx.closePath();
      line.path[0] = ['M', x1, y1];
      line.path[1] = ['L', x2, y2];
      ctx.add(line);
    }
    let normals = [];
    for (let i = 0; i < coords.length; i += 4) {
      let x1 = coords[i],
        y1 = coords[i + 1],
        x2 = coords[i + 2],
        y2 = coords[i + 3];
      let xDif = x2 - x1,
        yDif = y2 - y1;
      let dist = len(xDif, yDif);
      normals.push(xDif / dist);
      normals.push(yDif / dist);
    }
    //calc state.labels/tick coords
    let tickCoords = [];
    state.labelCoords = [];
    let ticks = state.ticks;
    for (let i = 0, j = 0, k = 0; i < normals.length; k++, i += 2, j += 4) {
      let x1 = coords[j],
        y1 = coords[j + 1],
        x2 = coords[j + 2],
        y2 = coords[j + 3];
      let xDif = (x2 - x1) * axisRatio,
        yDif = (y2 - y1) * axisRatio;
      let tick = [
        (normals[i] * ticks[k]) / (width - pl - pr),
        (normals[i + 1] * ticks[k]) / (height - pt - pb)
      ];
      tickCoords.push(normals[i] * (xDif + tick[0] * state.tickAlign) + x1);
      tickCoords.push(normals[i + 1] * (yDif + tick[1] * state.tickAlign) + y1);
      tickCoords.push(normals[i] * (xDif - tick[0] * (1 - state.tickAlign)) + x1);
      tickCoords.push(normals[i + 1] * (yDif - tick[1] * (1 - state.tickAlign)) + y1);
      state.labelCoords.push(normals[i] * xDif + x1);
      state.labelCoords.push(normals[i + 1] * yDif + y1);
    }
    //draw ticks
    if (ticks.length) {
      // ctx.lineWidth = state.axisWidth/2.;
      // ctx.beginPath();
      for (let i = 0, j = 0; i < tickCoords.length; i += 4, j++) {
        if (almost(state.lines[j], state.opposite.coordinate.axisOrigin)) continue;
        let x1 = left + pl + tickCoords[i] * (width - pl - pr),
          y1 = top + pt + tickCoords[i + 1] * (height - pt - pb);
        let x2 = left + pl + tickCoords[i + 2] * (width - pl - pr),
          y2 = top + pt + tickCoords[i + 3] * (height - pt - pb);

        let line = new fabric.Path('M 0 0', {
          stroke: state.axisColor,
          fill: false,
          strokeWidth: 0.5,
          class: 'grid',
          selectable: false,
          evented: false,
					objectCaching: true,
					lockUniScaling:true
        });
        line.path[0] = ['M', x1, y1];
        line.path[1] = ['L', x2, y2];
        ctx.add(line);
      }
      // ctx.strokeStyle = state.axisColor;
      // ctx.stroke();
      // ctx.closePath();
    }
    //draw axis
    if (state.coordinate.axis && state.axisColor) {
      let axisCoords = state.opposite.coordinate.getCoords(
        [state.coordinate.axisOrigin],
        state.opposite
      );
      //ctx.lineWidth = state.axisWidth/2.;
      let x1 = left + pl + clamp(axisCoords[0], 0, 1) * (width - pr - pl);
      let y1 = top + pt + clamp(axisCoords[1], 0, 1) * (height - pt - pb);
      let x2 = left + pl + clamp(axisCoords[2], 0, 1) * (width - pr - pl);
      let y2 = top + pt + clamp(axisCoords[3], 0, 1) * (height - pt - pb);

      let line = new fabric.Path('M 0 0', {
        stroke: state.axisColor,
        fill: false,
        strokeWidth: 0.5,
        class: 'grid'
      });
      line.path[0] = ['M', x1, y1];
      line.path[1] = ['L', x2, y2];
      ctx.add(line);
    }
    //draw state.labels
    // this.drawLabels(state);
    // console.log('draw');
  }

  drawLabels(state) {
    if (state.labels) {
      const ctx = this.context;
      let [width, height] = state.shape;
      let [pt, pr, pb, pl] = state.padding;

      ctx.font = '300 ' + state.fontSize + 'px ' + state.fontFamily;
      ctx.fillStyle = state.labelColor;
      ctx.textBaseline = 'top';
      let textHeight = state.fontSize;
      let indent = state.axisWidth + 1.5;
      let textOffset =
        state.tickAlign < 0.5 ? -textHeight - state.axisWidth * 2 : state.axisWidth * 2;
      let isOpp = state.coordinate.orientation === 'y' && !state.opposite.disabled;
      for (let i = 0; i < state.labels.length; i++) {
        let label = state.labels[i];
        if (label == null) continue;

        if (isOpp && almost(state.lines[i], state.opposite.coordinate.axisOrigin)) continue;

        let textWidth = ctx.measureText(label).width;

        let textLeft = state.labelCoords[i * 2] * (width - pl - pr) + indent + pl;

        if (state.coordinate.orientation === 'y') {
          textLeft = clamp(textLeft, indent, width - textWidth - 1 - state.axisWidth);
        }

        let textTop = state.labelCoords[i * 2 + 1] * (height - pt - pb) + textOffset + pt;
        if (state.coordinate.orientation === 'x') {
          textTop = clamp(textTop, 0, height - textHeight - textOffset);
        }
        ctx.fillText(label, textLeft, textTop);
      }
    }
  }
}

export default Grid;