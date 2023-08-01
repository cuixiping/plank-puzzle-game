// plank-puzzle solver
// http://www.clickmazes.com/planks/new-planks66.htm
// rollup plank-puzzle-solver.js --format es | terser --output plank-puzzle-solver.min.js --module --ecma 2017 --format ascii_only --toplevel --compress drop_console=true --mangle --mangle-props keep_quoted,reserved=[_foo,bar_] --enclose document,Array,Math:document,Array,Math

import { plank_puzzle_levels_6x6 } from "./plank-puzzle-levels.js";

class Point {
	/**
	 * Creates an instance of Point.
	 * @param {number} x
	 * @param {number} y
	 * @memberof Point
	 */
	constructor(x,y) {
		this.x = x;
		this.y = y;
	}
	/** @param {Point} p2 */
	distanceTo(p2) {
		return Math.sqrt((this.x - p2.x) ** 2 + (this.y - p2.y) ** 2);
	}
	/** @param {Point} p2 */
	equal(p2) {
		return this.x == p2.x && this.y == p2.y;
	}
	_toString() {
		return `${this.x},${this.y}`;
	}
}

class Edge {
	/**
	 * Creates an instance of Edge.
	 * @param {Point} p1
	 * @param {Point} p2
	 * @memberof Edge
	 */
	constructor(p1, p2) {
		this.p1 = p1;
		this.p2 = p2;
	}
	get isH() {
		return this.p1.y == this.p2.y;
	}
	get isV() {
		return this.p1.y == this.p2.y;
	}
	_toString() {
		let {p1, p2} = this;
		if (p1.x < p2.x || p1.y < p2.y) {
			return `${p1._toString()},${p2._toString()}`;
		} else {
			return `${p2._toString()},${p1._toString()}`;
		}
	}
	static fromString(str) {
		let ns = str.split(',').map(Number);
		let edge = new Edge(new Point(ns[0], ns[1]), new Point(ns[2], ns[3]));
		return edge;
	}
	/**
	 * @param {Edge} edge2
	 */
	equal(edge2) {
		let {p1, p2} = this;
		return edge2.containsPoint(p1) && edge2.containsPoint(p2);
	}
	/**
	 * @param {Point} point
	 */
	containsPoint(point) {
		return this.p1.equal(point) || this.p2.equal(point);
	}
	/**
	 * @param {Edge} edge2
	 */
	isConnectedWith(edge2) {
		let {p1, p2} = this;
		return edge2 != this && (edge2.containsPoint(p1) || edge2.containsPoint(p2));
	}
	get isH() {
		return this.p1.y == this.p2.y;
	}
	get isV() {
		return this.p1.x == this.p2.x;
	}
	get _size() {
		let {p1, p2} = this;
		return Math.abs(p1.x - p2.x + p1.y - p2.y);
	}
}

class Stick extends Edge {
	/**
	 * Creates an instance of Stick.
	 * @param {Point} p1
	 * @param {Point} p2
	 * @param {boolean} _active
	 * @memberof Stick
	 */
	constructor(p1, p2, _active = false) {
		super(p1, p2);
		this._active = _active;
		this._selected = false;
	}
	set p1(p) {
		super.p1 = p;
	}
	set p2(p) {
		super.p2 = p;
	}
	_toString() {
		return `${super._toString()},${+this._active}`;
	}
	static fromString(str) {
		let ns = str.split(',').map(Number);
		let stick = new Stick(new Point(ns[0], ns[1]), new Point(ns[2], ns[3]), ns[4] === 1);
		return stick;
	}
	/** @param {Edge} edge */
	static fromEdge(edge) {
		return new Stick(edge.p1, edge.p2);
	}
}

class MoveStep {
	/**
	 * Creates an instance of MoveStep.
	 * @param {Edge} oldPositionEdge
	 * @param {Edge} newPositionEdge
	 */
	constructor(oldPositionEdge, newPositionEdge) {
		this.oldPositionEdge = oldPositionEdge;
		this.newPositionEdge = newPositionEdge;
	}
	_toString() {
		return [this.oldPositionEdge, this.newPositionEdge].map(edge => {
			return [edge.p1.x, edge.p1.y, edge.p2.x, edge.p2.y];
		}).flat().map(Board.toChar).join('');
	}
	fromString(str) {
		let m = str.match(/^[0-9A-Z]{8}$/i);
		if (!m) {
			throw 'invalid step string';
		}
		let [x1, y1, x2, y2, x3, y3, x4, y4] = Array.from(str).map(Number);
		let oldPositionEdge = new Edge(new Point(x1, y1), new Point(x2, y2));
		let newPositionEdge = new Edge(new Point(x3, y3), new Point(x4, y4));
		return new MoveStep(oldPositionEdge, newPositionEdge);
	}
}

class Board {
	/**
	 * Creates an instance of Board.
	 * @param {number} width
	 * @param {number} height
	 * @param {Point[]} nodes
	 * @param {Point} start
	 * @param {Point} end
	 * @param {Edge[]} edges
	 * @param {Stick[]} sticks
	 * @memberof Board
	 */
	constructor(width, height, nodes, start, end, edges, sticks) {
		this.width = width;
		this.height = height;
		this.nodes = nodes;
		this.start = start;
		this.end = end;
		this.edges = edges;
		this.edgeFillState = {};
		this.sticks = sticks;
		this.setActiveStick(start);
	}
	/** @param {Point} p */
	setActiveStick(p) {
		for (const stick of this.sticks) {
			if (!stick._active && stick.containsPoint(p)) {
				stick._active = true;
				let p2 = p.equal(stick.p1) ? stick.p2 : stick.p1;
				this.setActiveStick(p2);
			}
		}
	}
	/** @param {Stick} stick */
	toggleStickSelected(stick) {
		if (stick._active) {
			this.sticks.forEach(s => {
				if (s != stick && s._selected) {
					s._selected = false;
				}
			});
			stick._selected = !stick._selected;
		}
	}
	hasStickAtEdge(edge) {
		for (const stick of this.sticks) {
			if (edge._size == stick._size && edge.equal(stick)) {
				return true;
			}
		}
		return false;
	}
	/**
	 * @param {Edge} edge1
	 * @param {Edge} edge2
	 */
	isEdgeCross(edge1, edge2) {
		if (edge1.isH === edge2.isH || edge1._size == 1 || edge2._size == 1) {
			return false;
		}
		let {p1, p2} = edge1;
		let {p1: p3, p2: p4} = edge2;
		if (edge1.isH) {
			return (p1.x - p3.x) * (p2.x - p3.x) < 0 && (p1.y - p3.y) * (p1.y - p4.y) < 0;
		}
		return (p1.y - p3.y) * (p2.y - p3.y) < 0 && (p1.x - p3.x) * (p1.x - p4.x) < 0;
	}
	isTargetOK() {
		return this.sticks.some(s => s.containsPoint(this.end));
	}
	/** @param {Edge[]} edges */
	tryMoveSelectedStickTo(edges) {
		let selectedStick = this.sticks.find(s => s._selected);
		if (!selectedStick) {
			return false;
		}
		edges = edges.filter(edge => edge._size == selectedStick._size && !this.hasStickAtEdge(edge));
		edges = edges.filter(edge => this.sticks.some(s => s._active && s.isConnectedWith(edge)));
		if (!edges.length) {
			return false;
		}
		for (const stick of this.sticks) {
			stick._active = false;
		}
		let edge = edges[0];
		selectedStick._selected = false;
		selectedStick.p1 = edge.p1;
		selectedStick.p2 = edge.p2;
		board.setActiveStick(edge.p1);
		return true;
	}
	getPossibleNextStates() {
		let activeSticks = this.sticks.filter(s => s._active);
		let states = [], statesMap = {};
		let actives = this.sticks.map(s => s._active);
		let restoreActive = () => this.sticks.forEach((s, i) => s._active = actives[i]);
		let clearActive = () => this.sticks.forEach(s => s._active = false);
		for (const stick of activeSticks) {
			let {p1, p2} = stick;
			let edges = this.edges.filter(e => e._size == stick._size && !this.hasStickAtEdge(e));
			edges = edges.filter(e => {
				for (const stick2 of activeSticks) {
					if (e.isConnectedWith(stick2)) {
						return true;
					}
				}
				return false;
			});
			edges = edges.filter(e => {
				for (const stick2 of this.sticks) {
					if (this.isEdgeCross(e, stick2)) {
						return false;
					}
				}
				return true;
			});
			if (edges.length > 0) {
				for (const edge of edges) {
					stick.p1 = edge.p1;
					stick.p2 = edge.p2;
					clearActive();
					board.setActiveStick(edge.p1);
					let st = board.getStateString();
					if (!statesMap[st]) {
						statesMap[st] = true;
						states.push(st);
					}
				}
				stick.p1 = p1;
				stick.p2 = p2;
				restoreActive();
			}
		}
		return states;
	}
	getStateString() {
		return this.sticks.sort((a, b) => {
			if (a._size != b._size) {
				return a._size - b._size;
			}
			return a._toString() < b._toString() ? -1 : 1;
		}).map(stick => stick._toString()).join('\n');
	}
	setStateString(stateString) {
		let sticks = stateString.split('\n').map(s => Stick.fromString(s));
		this.sticks = sticks;
	}
	/**
	 * 解析棍子
	 * @param {*} str 示例数据 "8600720030121363653454"
	 */
	static parsePositions(str) {
		let arr = Array.from(str).map(Board.toNum);
		let [width, height, sx, sy, ex, ey] = arr;
		let start = new Point(sx, sy), end = new Point(ex, ey);
		let sticks = [];
		for (let i = 6; i < arr.length - 3; i += 4) {
			let [x1, y1, x2, y2] = arr.slice(i, i + 4);
			sticks.push(new Stick(new Point(x1, y1), new Point(x2, y2), false));
		}
		return {width, height, start, end, sticks};
	}
	/**
	 * 解析节点
	 * @param {*} str 示例数据 "3036324541257314632353256"
	 */
	static parseNodes(str) {
		let nodes = [], i = 0, y = 0;
		let edges = [];
		let nodeCols = [];
		while (i < str.length - 1) {
			let n = Board.toNum(str[i]);
			for (let j = 0; j < n && i + 1 + j < str.length; j++) {
				let x = Board.toNum(str[i + 1 + j]);
				let node = new Point(x, y);
				nodes.push(node);
				if (!nodeCols[x]) {
					nodeCols[x] = [];
				}
				nodeCols[x].push(node);
				if (j > 0) {
					let edge = new Edge(nodes[nodes.length - 2], node);
					edges.push(edge);
				}
			}
			i += n + 1;
			y++;
		}
		for (const nodes2 of nodeCols) {
			if (nodes2 && nodes2.length > 1) {
				for (let i = 1; i < nodes2.length; i++) {
					let edge = new Edge(nodes2[i - 1], nodes2[i]);
					edges.push(edge);
				}
			}
		}
		return {nodes, edges};
	}
	static parseText2(strPositions, strNodes) {
		let {width, height, start, end, sticks} = Board.parsePositions(strPositions);
		let {nodes, edges} = Board.parseNodes(strNodes);
		return new Board(width, height, nodes, start, end, edges, sticks);
	}
	static CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	static toNum(char) {
		return Board.CHARS.indexOf(char);
	}
	static toChar(num) {
		return Board.CHARS[num];
	}
	static targetType = {Node: 'node', Stick: 'stick', Edge: 'edge'};
	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} x
	 * @param {number} y
	 * @param {number} width
	 * @param {number} height
	 * @memberof Board
	 */
	initRenderConfig(ctx, x, y, width, height) {
		let {width: w, height: h} = this;
		let cellSize = Math.floor(Math.min(width / w, height / h));
		let nodeR = cellSize * 0.15;
		let stickSize = cellSize * 0.15;
		let lineWidth = 1;
		let offsetX = Math.floor(cellSize / 2) - lineWidth / 2, offsetY = offsetX;
		this.ctxConfig = {ctx, x, y, width, height, cellSize, nodeR, stickSize, lineWidth, offsetX, offsetY};
	}
	render() {
		let {width: w, height: h, nodes, start, end, sticks} = this;
		let {ctx, x, y, width, height, cellSize, nodeR, stickSize, lineWidth, offsetX, offsetY} = this.ctxConfig;
		ctx.save();
		ctx.clearRect(x, y, width, height);
		ctx.translate(offsetX, offsetY);
		let drawLine = (p1, p2) => {
			ctx.moveTo(p1.x * cellSize, p1.y * cellSize);
			ctx.lineTo(p2.x * cellSize, p2.y * cellSize);
		};
		/** @param {Stick} stick */
		let drawStick = stick => {
			ctx.strokeStyle = stick._active ? (stick._selected ? `rgba(${[0xFF,0xCB,0x0D,.3]})` : '#FFCB0D') : '#960';
			ctx.beginPath();
			drawLine(stick.p1, stick.p2);
			ctx.stroke();
			if (stick._selected) {
				// let lineWidth = lineWidth * 2;
				ctx.lineWidth = lineWidth;
				ctx.strokeStyle = '#FFC800';
				ctx.beginPath();
				let {x: x1, y: y1} = stick.p1;
				let {x: x2, y: y2} = stick.p2;
				let dx = 0, dy = 0;
				if (stick.isH) {
					dy = (stickSize / 2 - lineWidth / 2) / cellSize;
				} else {
					dx = (stickSize / 2 - lineWidth / 2) / cellSize;
				}
				drawLine({x: x1 + dx, y: y1 + dy}, {x: x2 + dx, y: y2 + dy});
				drawLine({x: x1 - dx, y: y1 - dy}, {x: x2 - dx, y: y2 - dy});
				ctx.stroke();
				ctx.strokeStyle = '#666';
				ctx.lineWidth = lineWidth;
				ctx.beginPath();
				drawLine(stick.p1, stick.p2);
				ctx.stroke();
				ctx.lineWidth = stickSize; // 恢复线宽设置
			}
		};
		let drawNode = node => {
			ctx.beginPath();
			ctx.ellipse(cellSize * node.x, cellSize * node.y, nodeR, nodeR, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
		};

		ctx.strokeStyle = '#666';
		ctx.lineWidth = lineWidth;
		ctx.beginPath();
		for (let i = 1; i < w - 1; i++) {
			drawLine({x: i, y: 0}, {x: i, y: h - 1});
		}
		for (let i = 0; i < h; i++) {
			drawLine({x: 1, y: i}, {x: w - 2, y: i});
		}
		drawLine(start, {x: start.x + 1, y: start.y});
		drawLine(end, {x: end.x - 1, y: end.y});
		ctx.stroke();

		ctx.lineWidth = stickSize;
		for (const stick of sticks) {
			drawStick(stick);
		}

		ctx.strokeStyle = '#000';
		ctx.lineWidth = 2;
		ctx.fillStyle = '#03a9f4'; // #960
		for (const node of nodes) {
			if (!node.equal(start) && !node.equal(end)) {
				drawNode(node);
			}
		}
		ctx.fillStyle = '#f60';
		drawNode(start);
		ctx.fillStyle = '#6c6';
		drawNode(end);
		ctx.restore();
	}
	getTarget(ex, ey) {
		let {cellSize, nodeR, stickSize, offsetX, offsetY} = this.ctxConfig;
		let p = new Point(ex -= offsetX, ey -= offsetY);
		for (const node of this.nodes) {
			let p2 = new Point(node.x * cellSize, node.y * cellSize);
			if (p2.distanceTo(p) <= nodeR) {
				return {type: Board.targetType.Node, node};
			}
		}
		let isPintInEdgeArea = (point, edge, stickSize) => {
			let {p1, p2, isH} = edge;
			let minX = Math.min(p1.x, p2.x) * cellSize, minY = Math.min(p1.y, p2.y) * cellSize;
			let maxX = Math.max(p1.x, p2.x) * cellSize, maxY = Math.max(p1.y, p2.y) * cellSize;
			if (isH) {
				minY -= stickSize / 2;
				maxY += stickSize / 2;
			} else {
				minX -= stickSize / 2;
				maxX += stickSize / 2;
			}
			let {x, y} = point;
			return x >= minX && x <= maxX && y >= minY && y <= maxY;
		};
		for (const stick of this.sticks) {
			if (isPintInEdgeArea(p, stick, stickSize)) {
				return {type: Board.targetType.Stick, stick};
			}
		}
		let edges = [];
		for (const edge of this.edges) {
			if (isPintInEdgeArea(p, edge, stickSize * 2)) {
				edges.push(edge);
			}
		}
		if (edges.length) {
			return {type: Board.targetType.Edge, edges};
		}
		return null;
	}
}

/** @param {Board} board */
function solveBFS(board, initState) {
	initState = initState || board.getStateString();
	if (board.isTargetOK()) {
		return {solved: true, stateCount: 1, solution: [initState], steps: 0};
	}
	let stateMap = {[initState]: null}; // state: fromState
	let queue = [[initState, 0]]; // state, depth
	let solved = false;
	let solvedState = '';
	let stateCount = 0;
	let solutionCount = 0;
	let solvedStateArray = [];
	const stateCountMax = 1e7;
	while (queue.length > 0) {
		let [fromState, fromDepth] = queue.shift();
		stateCount++;
		board.setStateString(fromState);
		if (board.isTargetOK()) {
			solved = true;
			solvedStateArray.push(fromState);
			solutionCount++;
			if (solutionCount > 1) {
				continue;
			}
			solvedState = fromState;
			// break;
			continue;
		}
		if (solved) {
			continue;
		}
		if (stateCount >= stateCountMax) {
			break;
		}
		let nextStates = board.getPossibleNextStates();
		for (const state of nextStates) {
			if (!stateMap.hasOwnProperty(state)) {
				stateMap[state] = fromState;
				queue.push([state, fromDepth + 1]);
			}
		}
	}
	board.setStateString(initState);
	if (solved) {
		solvedState = solvedStateArray[solvedStateArray.length * Math.random() | 0];
		let state = solvedState;
		let solution = [state];
		while (state != initState) {
			state = stateMap[state];
			solution.unshift(state);
		}
		let steps = solution.length - 1;
		// console.log({solved, stateCount, solution, steps});
		return {solved, stateCount, solution, steps, solutionCount};
	} else {
		console.log({solved, stateCount});
		return {solved, stateCount};
	}
}

let $1 = (s, c) => (c||document).querySelector(s);

let strPositions = "8600720030121363653454";
let strNodes = "3036324541257314632353256";
let currLevelIndex = 18;

let timer = 0;
let canvas = $1('canvas#plank-canvas');
let ctx = canvas.getContext('2d');

/** @type {Board} */
let board;
let initState;

let clearTimer = () => {
	if (timer) {
		clearInterval(timer);
		timer = 0;
	}
};

let initBoard = (positions, nodes) => {
	clearTimer();
	strPositions = positions;
	strNodes = nodes;
	board = Board.parseText2(strPositions, strNodes);
	initState = board.getStateString();
	board.initRenderConfig(ctx, 0, 0, canvas.width, canvas.height);
	board.render();
};

let goLevel = (offset) => {
	currLevelIndex = (currLevelIndex + offset) % plank_puzzle_levels_6x6.length;
	let level = plank_puzzle_levels_6x6[currLevelIndex];
	initBoard(level.positions, level.nodes);
	$1('#level-number').textContent = (currLevelIndex + 1) + '/' + plank_puzzle_levels_6x6.length;
};
let prevLevel = () => goLevel(-1);
let nextLevel = () => goLevel(+1);

let showSuccess = () => setTimeout(()=>alert('You win!'),1);

canvas.addEventListener('click', e => {
	clearTimer();
	let ex = e.offsetX, ey = e.offsetY;
	let target = board.getTarget(ex, ey);
	console.log(target);
	if (!target) {
		return;
	}
	switch (target.type) {
		case Board.targetType.Stick: {
			let {stick} = target;
			if (stick._active) {
				board.toggleStickSelected(stick);
				board.render();
			}
			break;
		}
		case Board.targetType.Edge: {
			if (board.tryMoveSelectedStickTo(target.edges)) {
				board.render();
				if (board.isTargetOK()) {
					showSuccess();
				}
			}
			break;
		}
		default:
			break;
	}
});

$1('#btn-solve').addEventListener('click', e => {
	clearTimer();
	let re = solveBFS(board, initState);
	console.log(re);
	if (re.solved) {
		let i = 0;
		timer = setInterval(() => {
			if (i >= re.solution.length) {
				clearTimer();
				return;
			}
			let stateString = re.solution[i++];
			board.setStateString(stateString);
			board.render();
		}, 1000);
	}
});

$1('#btn-reset').addEventListener('click', e => {
	clearTimer();
	board.setStateString(initState);
	board.render();
});

$1('#btn-prev-level').addEventListener('click', prevLevel);
$1('#btn-next-level').addEventListener('click', nextLevel);

initBoard(strPositions, strNodes);
