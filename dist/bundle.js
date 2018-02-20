(function () {
'use strict';

function noop() {}

function assign(target) {
	var k,
		source,
		i = 1,
		len = arguments.length;
	for (; i < len; i++) {
		source = arguments[i];
		for (k in source) target[k] = source[k];
	}

	return target;
}

function appendNode(node, target) {
	target.appendChild(node);
}

function insertNode(node, target, anchor) {
	target.insertBefore(node, anchor);
}

function detachNode(node) {
	node.parentNode.removeChild(node);
}

function destroyEach(iterations) {
	for (var i = 0; i < iterations.length; i += 1) {
		if (iterations[i]) iterations[i].d();
	}
}

function createElement(name) {
	return document.createElement(name);
}

function createText(data) {
	return document.createTextNode(data);
}

function createComment() {
	return document.createComment('');
}

function addListener(node, event, handler) {
	node.addEventListener(event, handler, false);
}

function removeListener(node, event, handler) {
	node.removeEventListener(event, handler, false);
}

function setAttribute(node, attribute, value) {
	node.setAttribute(attribute, value);
}

function toNumber(value) {
	return value === '' ? undefined : +value;
}

function setStyle(node, key, value) {
	node.style.setProperty(key, value);
}

function blankObject() {
	return Object.create(null);
}

function destroy(detach) {
	this.destroy = noop;
	this.fire('destroy');
	this.set = this.get = noop;

	if (detach !== false) this._fragment.u();
	this._fragment.d();
	this._fragment = this._state = null;
}

function differs(a, b) {
	return a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

function dispatchObservers(component, group, changed, newState, oldState) {
	for (var key in group) {
		if (!changed[key]) continue;

		var newValue = newState[key];
		var oldValue = oldState[key];

		var callbacks = group[key];
		if (!callbacks) continue;

		for (var i = 0; i < callbacks.length; i += 1) {
			var callback = callbacks[i];
			if (callback.__calling) continue;

			callback.__calling = true;
			callback.call(component, newValue, oldValue);
			callback.__calling = false;
		}
	}
}

function fire(eventName, data) {
	var handlers =
		eventName in this._handlers && this._handlers[eventName].slice();
	if (!handlers) return;

	for (var i = 0; i < handlers.length; i += 1) {
		handlers[i].call(this, data);
	}
}

function get(key) {
	return key ? this._state[key] : this._state;
}

function init(component, options) {
	component._observers = { pre: blankObject(), post: blankObject() };
	component._handlers = blankObject();
	component._bind = options._bind;

	component.options = options;
	component.root = options.root || component;
	component.store = component.root.store || options.store;
}

function observe(key, callback, options) {
	var group = options && options.defer
		? this._observers.post
		: this._observers.pre;

	(group[key] || (group[key] = [])).push(callback);

	if (!options || options.init !== false) {
		callback.__calling = true;
		callback.call(this, this._state[key]);
		callback.__calling = false;
	}

	return {
		cancel: function() {
			var index = group[key].indexOf(callback);
			if (~index) group[key].splice(index, 1);
		}
	};
}

function on(eventName, handler) {
	if (eventName === 'teardown') return this.on('destroy', handler);

	var handlers = this._handlers[eventName] || (this._handlers[eventName] = []);
	handlers.push(handler);

	return {
		cancel: function() {
			var index = handlers.indexOf(handler);
			if (~index) handlers.splice(index, 1);
		}
	};
}

function set(newState) {
	this._set(assign({}, newState));
	if (this.root._lock) return;
	this.root._lock = true;
	callAll(this.root._beforecreate);
	callAll(this.root._oncreate);
	callAll(this.root._aftercreate);
	this.root._lock = false;
}

function _set(newState) {
	var oldState = this._state,
		changed = {},
		dirty = false;

	for (var key in newState) {
		if (differs(newState[key], oldState[key])) changed[key] = dirty = true;
	}
	if (!dirty) return;

	this._state = assign({}, oldState, newState);
	this._recompute(changed, this._state);
	if (this._bind) this._bind(changed, this._state);

	if (this._fragment) {
		dispatchObservers(this, this._observers.pre, changed, this._state, oldState);
		this._fragment.p(changed, this._state);
		dispatchObservers(this, this._observers.post, changed, this._state, oldState);
	}
}

function callAll(fns) {
	while (fns && fns.length) fns.shift()();
}

function _mount(target, anchor) {
	this._fragment.m(target, anchor);
}

function _unmount() {
	if (this._fragment) this._fragment.u();
}

var proto = {
	destroy: destroy,
	get: get,
	fire: fire,
	observe: observe,
	on: on,
	set: set,
	teardown: destroy,
	_recompute: noop,
	_set: _set,
	_mount: _mount,
	_unmount: _unmount
};

function flatten(arrOfArrs) {
  const flatArr = [];
  arrOfArrs.forEach(arrs => {
    arrs.forEach(arr => {
      flatArr.push(arr);
    });
  });
  return flatArr;
}

function ascending(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

function bisector(compare) {
  if (compare.length === 1) compare = ascendingComparator(compare);
  return {
    left: function(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      while (lo < hi) {
        var mid = lo + hi >>> 1;
        if (compare(a[mid], x) < 0) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    },
    right: function(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      while (lo < hi) {
        var mid = lo + hi >>> 1;
        if (compare(a[mid], x) > 0) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    }
  };
}

function ascendingComparator(f) {
  return function(d, x) {
    return ascending(f(d), x);
  };
}

var ascendingBisect = bisector(ascending);

function range(start, stop, step) {
  start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

  var i = -1,
      n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
      range = new Array(n);

  while (++i < n) {
    range[i] = start + i * step;
  }

  return range;
}

function polygonize(path, numPoints, scale, translateX, translateY) {
  //Thank you Noah!! http://bl.ocks.org/veltman/fc96dddae1711b3d756e0a13e7f09f24

  const length = path.getTotalLength();

  return range(numPoints).map(function (i) {
    const point = path.getPointAtLength(length * i / numPoints);
    return [point.x * scale + translateX, point.y * scale + translateY];
  });
}

function getTotalLengthAllPaths(paths) {
  let totalLengthAllPaths = 0;
  for (let i = 0; i < paths.length; i++) {
    totalLengthAllPaths += paths[i].getTotalLength();
  }
  return totalLengthAllPaths;
}

function pathsToCoords(paths, scale, numPoints, translateX, translateY) {
  const totalLengthAllPaths = getTotalLengthAllPaths(paths);

  let separatePathsCoordsCollection = [];
  let individualPathPoints;

  let pointsForPath;
  let runningPointsTotal = 0;
  for (let i = 0; i < paths.length; i++) {

    if (i + 1 === paths.length) {
      //ensures that the total number of points = the actual requested number (because using rounding)
      pointsForPath = numPoints - runningPointsTotal;
    } else {
      pointsForPath = Math.round(numPoints * paths[i].getTotalLength() / totalLengthAllPaths);
      runningPointsTotal += pointsForPath;
    }
    individualPathPoints = polygonize(paths[i], pointsForPath, scale, translateX, translateY);
    separatePathsCoordsCollection.push(individualPathPoints);
  }
  return flatten(separatePathsCoordsCollection);
}

function getCoordsMax(coords, index) {
  const max = coords.map(x => {
    return x[index];
  }).reduce(function (a, b) {
    return Math.max(a, b);
  });
  return max;
}

function inside(point, vs) {
  // algorithm via https://github.com/substack/point-in-polygon
  // ray-casting algorithm based on
  // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
  const x = point[0],
        y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0],
          yi = vs[i][1];
    const xj = vs[j][0],
          yj = vs[j][1];
    const intersect = yi > y != yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

function getFillCoords(flatCoords, numPoints) {
  const pointsInShape = [];
  let insidePoints;

  const xMax = getCoordsMax(flatCoords, 0);
  const yMax = getCoordsMax(flatCoords, 1);

  while (pointsInShape.length < numPoints) {
    let points = [Math.random() * xMax, Math.random() * yMax];
    insidePoints = inside(points, flatCoords);
    if (insidePoints) {
      pointsInShape.push(points);
    }
  }
  return pointsInShape;
}

/* src/components/Nav.html generated by Svelte v1.54.1 */
function encapsulateStyles$1(node) {
	setAttribute(node, "svelte-3664911970", "");
}

function add_css$1() {
	var style = createElement("style");
	style.id = 'svelte-3664911970-style';
	style.textContent = "[svelte-3664911970].nav-panel,[svelte-3664911970] .nav-panel{width:300px;background-color:#F037A5;overflow:scroll;height:100%}[svelte-3664911970].side-bar-text,[svelte-3664911970] .side-bar-text{padding:20px}[svelte-3664911970].selected-step,[svelte-3664911970] .selected-step{background-color:#FAE62D}[svelte-3664911970].non-selected-step,[svelte-3664911970] .non-selected-step{background-color:#F037A5}[svelte-3664911970].non-selected-step:hover,[svelte-3664911970] .non-selected-step:hover{color:white}[svelte-3664911970].credits-placer,[svelte-3664911970] .credits-placer{position:absolute;bottom:0;left:0;width:300px;margin:0}[svelte-3664911970].credits,[svelte-3664911970] .credits{list-style:none;font-weight:normal;font-size:14px;padding-left:30px}";
	appendNode(style, document.head);
}

function create_main_fragment$1(state, component) {
	var div, div_1, text_8, ol, li, li_class_value, li_1, li_1_class_value, li_2, li_2_class_value, text_12, ol_1, li_3, li_3_class_value;

	function click_handler(event) {
		component.set({ step: 1 });
	}

	function click_handler_1(event) {
		component.set({ step: 2 });
	}

	function click_handler_2(event) {
		component.set({ step: 3 });
	}

	function click_handler_3(event) {
		component.set({ step: 4 });
	}

	return {
		c: function create() {
			div = createElement("div");
			div_1 = createElement("div");
			div_1.innerHTML = "<h1>coördinator</h1>\n    <p>Turn an SVG into XY coördinates.\n    <br> Made by <a href=\"https://twitter.com/alizauf\">Aliza Aufrichtig</a> @ <a href=\"https://www.spotify.com\">Spotify</a></p>";
			text_8 = createText("\n  ");
			ol = createElement("ol");
			li = createElement("li");
			li.textContent = "Import SVG";
			li_1 = createElement("li");
			li_1.textContent = "Refine Dots";
			li_2 = createElement("li");
			li_2.textContent = "Get Coördinates";
			text_12 = createText("\n\n  ");
			ol_1 = createElement("ol");
			li_3 = createElement("li");
			li_3.textContent = "why this exists, thanks & credits";
			this.h();
		},

		h: function hydrate() {
			encapsulateStyles$1(div);
			div_1.className = "side-bar-text";
			li.className = li_class_value = state.step === 1 ? "selected-step" : "non-selected-step";
			addListener(li, "click", click_handler);
			li_1.className = li_1_class_value = state.step === 2 ? "selected-step" : "non-selected-step";
			addListener(li_1, "click", click_handler_1);
			li_2.className = li_2_class_value = state.step === 3 ? "selected-step" : "non-selected-step";
			addListener(li_2, "click", click_handler_2);
			li_3.className = li_3_class_value = "credits " + (state.step === 4 ? "selected-step" : "non-selected-step");
			addListener(li_3, "click", click_handler_3);
			ol_1.className = "credits-placer";
			div.className = "nav-panel";
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			appendNode(div_1, div);
			appendNode(text_8, div);
			appendNode(ol, div);
			appendNode(li, ol);
			appendNode(li_1, ol);
			appendNode(li_2, ol);
			appendNode(text_12, div);
			appendNode(ol_1, div);
			appendNode(li_3, ol_1);
		},

		p: function update(changed, state) {
			if (changed.step && li_class_value !== (li_class_value = state.step === 1 ? "selected-step" : "non-selected-step")) {
				li.className = li_class_value;
			}

			if (changed.step && li_1_class_value !== (li_1_class_value = state.step === 2 ? "selected-step" : "non-selected-step")) {
				li_1.className = li_1_class_value;
			}

			if (changed.step && li_2_class_value !== (li_2_class_value = state.step === 3 ? "selected-step" : "non-selected-step")) {
				li_2.className = li_2_class_value;
			}

			if (changed.step && li_3_class_value !== (li_3_class_value = "credits " + (state.step === 4 ? "selected-step" : "non-selected-step"))) {
				li_3.className = li_3_class_value;
			}
		},

		u: function unmount() {
			detachNode(div);
		},

		d: function destroy$$1() {
			removeListener(li, "click", click_handler);
			removeListener(li_1, "click", click_handler_1);
			removeListener(li_2, "click", click_handler_2);
			removeListener(li_3, "click", click_handler_3);
		}
	};
}

function Nav(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!document.getElementById("svelte-3664911970-style")) add_css$1();

	this._fragment = create_main_fragment$1(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(Nav.prototype, proto);

function getLocator ( source ) {
	var originalLines = source.split( '\n' );

	var start = 0;
	var lineRanges = originalLines.map( function ( line, i ) {
		var end = start + line.length + 1;
		var range = { start: start, end: end, line: i };

		start = end;
		return range;
	});

	var i = 0;

	function rangeContains ( range, index ) {
		return range.start <= index && index < range.end;
	}

	function getLocation ( range, index ) {
		return { line: range.line, column: index - range.start, character: index };
	}

	return function locate ( search, startIndex ) {
		if ( typeof search === 'string' ) {
			search = source.indexOf( search, startIndex || 0 );
		}

		var range = lineRanges[i];

		var d = search >= range.end ? 1 : -1;

		while ( range ) {
			if ( rangeContains( range, search ) ) return getLocation( range, search );

			i += d;
			range = lineRanges[i];
		}
	};
}

function locate ( source, search, startIndex ) {
	return getLocator( source )( search, startIndex );
}

var validNameCharacters = /[a-zA-Z0-9:-]/;
var whitespace = /[\s\t\r\n]/;
var quotemark = /['"]/;

function repeat ( str, i ) {
	var result = '';
	while ( i-- ) result += str;
	return result;
}

function parse$1 ( source ) {
	var match = /^<\?.+?\?>/.exec( source );
	var metadata = match ? match[0] : '';

	var stack = [];

	var state = neutral;
	var currentElement = null;
	var root = null;

	function error ( message ) {
		var ref = locate( source, i );
		var line = ref.line;
		var column = ref.column;
		var before = source.slice( 0, i ).replace( /^\t+/, function (match) { return repeat( '  ', match.length ); } );
		var beforeLine = /(^|\n).*$/.exec( before )[0];
		var after = source.slice( i );
		var afterLine = /.*(\n|$)/.exec( after )[0];

		var snippet = "" + beforeLine + afterLine + "\n" + (repeat( ' ', beforeLine.length )) + "^";

		throw new Error( (message + " (" + line + ":" + column + "). If this is valid SVG, it's probably a bug in svg-parser. Please raise an issue at https://gitlab.com/Rich-Harris/svg-parser/issues – thanks!\n\n" + snippet) );
	}

	function neutral () {
		var text = '';
		while ( i < source.length && source[i] !== '<' ) text += source[ i++ ];

		if ( /\S/.test( text ) ) {
			currentElement.children.push( text );
		}

		if ( source[i] === '<' ) {
			return tag;
		}

		return neutral;
	}

	function tag () {
		if ( source[i] === '!' ) {
			return comment;
		}

		if ( source[i] === '/' ) {
			return closingTag;
		}

		var name = getName();

		var element = {
			name: name,
			attributes: {},
			children: []
		};

		if ( currentElement ) {
			currentElement.children.push( element );
		} else {
			root = element;
		}

		var attribute;
		while ( i < source.length && ( attribute = getAttribute() ) ) {
			element.attributes[ attribute.name ] = attribute.value;
		}

		var selfClosing = false;

		if ( source[i] === '/' ) {
			i += 1;
			selfClosing = true;
		}

		if ( source[i] !== '>' ) {
			error( 'Expected >' );
		}

		if ( !selfClosing ) {
			currentElement = element;
			stack.push( element );
		}

		return neutral;
	}

	function comment () {
		var index = source.indexOf( '-->', i );
		if ( !~index ) error( 'expected -->' );

		i = index + 3;
		return neutral;
	}

	function closingTag () {
		var name = getName();

		if ( !name ) error( 'Expected tag name' );

		if ( name !== currentElement.name ) {
			error( ("Expected closing tag </" + name + "> to match opening tag <" + (currentElement.name) + ">") );
		}

		if ( source[i] !== '>' ) {
			error( 'Expected >' );
		}

		stack.pop();
		currentElement = stack[ stack.length - 1 ];

		return neutral;
	}

	function getName () {
		var name = '';
		while ( i < source.length && validNameCharacters.test( source[i] ) ) name += source[ i++ ];

		return name;
	}

	function getAttribute () {
		if ( !whitespace.test( source[i] ) ) return null;
		allowSpaces();

		var name = getName();
		if ( !name ) return null;

		var value = true;

		allowSpaces();
		if ( source[i] === '=' ) {
			i += 1;
			allowSpaces();

			value = getAttributeValue();
			if ( !isNaN( value ) ) value = +value; // TODO whitelist numeric attributes?
		}

		return { name: name, value: value };
	}

	function getAttributeValue () {
		return quotemark.test( source[i] ) ?
			getQuotedAttributeValue() :
			getUnquotedAttributeValue();
	}

	function getUnquotedAttributeValue () {
		var value = '';
		do {
			var char = source[i];
			if ( char === ' ' || char === '>' || char === '/' ) {
				return value;
			}

			value += char;
			i += 1;
		} while ( i < source.length );

		return value;
	}

	function getQuotedAttributeValue () {
		var quotemark = source[ i++ ];

		var value = '';
		var escaped = false;

		while ( i < source.length ) {
			var char = source[ i++ ];
			if ( char === quotemark && !escaped ) {
				return value;
			}

			if ( char === '\\' && !escaped ) {
				escaped = true;
			}

			value += escaped ? ("\\" + char) : char;
			escaped = false;
		}
	}

	function allowSpaces () {
		while ( i < source.length && whitespace.test( source[i] ) ) i += 1;
	}

	var i = metadata.length;
	while ( i < source.length ) {
		if ( !state ) error( 'Unexpected character' );
		state = state();
		i += 1;
	}

	if ( state !== neutral ) {
		error( 'Unexpected end of input' );
	}

	if ( root.name === 'svg' ) root.metadata = metadata;
	return root;
}

var assign$1 = Object.assign || function assign ( source ) {
	var targets = [], len = arguments.length - 1;
	while ( len-- > 0 ) targets[ len ] = arguments[ len + 1 ];

	targets.forEach( function (target) {
		Object.keys( target ).forEach( function (key) {
			source[ key ] = target[ key ];
		});
	});
};

function cloneExcept ( obj, props ) {
	var clone = {};
	Object.keys( obj ).forEach( function (prop) {
		if ( !~props.indexOf( prop ) ) clone[ prop ] = obj[ prop ];
	});
	return clone;
}

function line ( points ) {
	var path = '';
	var prefix = 'M';

	for ( var i = 0; i < points.length; i += 2 ) {
		path += "" + prefix + (points[i]) + "," + (points[i+1]);
		prefix = ' ';
	}

	return path;
}

var converters = {
	ellipse: function (attributes) {
		var cx = attributes.cx || 0;
		var cy = attributes.cy || 0;
		var rx = attributes.rx || 0;
		var ry = attributes.ry || 0;

		var path = cloneExcept( attributes, [ 'cx', 'cy', 'rx', 'ry' ] );
		path.d = "M" + (cx - rx) + "," + cy + "a" + rx + "," + ry + " 0 1,0 " + (rx * 2) + ",0a" + rx + "," + ry + " 0 1,0 " + (rx * -2) + ",0";

		return path;
	},

	circle: function (attributes) {
		var cx = attributes.cx || 0;
		var cy = attributes.cy || 0;
		var r = attributes.r || 0;

		var path = cloneExcept( attributes, [ 'cx', 'cy', 'r' ] );
		path.d = "M" + (cx - r) + "," + cy + "a" + r + "," + r + " 0 1,0 " + (r * 2) + ",0a" + r + "," + r + " 0 1,0 " + (r * -2) + ",0";

		return path;
	},

	polygon: function (attributes) {
		var path = converters.polyline( attributes );
		path.d += 'Z';

		return path;
	},

	polyline: function (attributes) {
		var path = cloneExcept( attributes, 'points' );
		path.d = line( attributes.points.trim().split( /[\s,]+/ ) );

		return path;
	},

	rect: function (attributes) {
		var x = +attributes.x || 0;
		var y = +attributes.y || 0;
		var width = +attributes.width || 0;
		var height = +attributes.height || 0;
		// const rx = +attributes.rx || 0; // TODO handle...
		// const ry = +attributes.ry || 0; // TODO handle...

		var path = cloneExcept( attributes, [ 'x', 'y', 'width', 'height', 'rx', 'ry' ] );

		// TODO handle rx and ry
		path.d = "m" + x + "," + y + " " + width + ",0 0," + height + " " + (-width) + ",0Z";

		return path;
	},

	line: function (attributes) {
		var path = cloneExcept( attributes, [ 'x1', 'y1', 'x2', 'y2' ]);
		path.d = line([ attributes.x1 || 0, attributes.y1 || 0, attributes.x2 || 0, attributes.y2 || 0 ]);

		return path;
	}

	// TODO others...
};

function convert ( node ) {
	var converter = converters[ node.name ];
	if ( converter ) {
		var attributes = converter( node.attributes );

		return {
			name: 'path',
			attributes: attributes
		};
	}

	throw new Error( ("TODO <" + (node.name) + ">") );
}

function applyAttributes ( node, attributes ) {
	node.attributes = assign$1( attributes, node.attributes );
}

function applyClasses ( node, classes ) {
	if ( node.attributes.class ) {
		classes = assign$1( {}, classes );

		node.attributes.class.split( ' ' )
			.filter( Boolean )
			.forEach( function (className) { return classes[ className ] = true; } );
	}

	var classList = Object.keys( classes ).join( ' ' );

	if ( classList ) {
		node.attributes.class = classList;
	}
}

function interopDefault(ex) {
	return ex && typeof ex === 'object' && 'default' in ex ? ex['default'] : ex;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var path_parse = createCommonjsModule(function (module) {
var paramCounts = { a: 7, c: 6, h: 1, l: 2, m: 2, r: 4, q: 4, s: 4, t: 2, v: 1, z: 0 };

var SPECIAL_SPACES = [
  0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
  0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF
];

function isSpace(ch) {
  return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029) || // Line terminators
    // White spaces
    (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
    (ch >= 0x1680 && SPECIAL_SPACES.indexOf(ch) >= 0);
}

function isCommand(code) {
  /*eslint-disable no-bitwise*/
  switch (code | 0x20) {
    case 0x6D/* m */:
    case 0x7A/* z */:
    case 0x6C/* l */:
    case 0x68/* h */:
    case 0x76/* v */:
    case 0x63/* c */:
    case 0x73/* s */:
    case 0x71/* q */:
    case 0x74/* t */:
    case 0x61/* a */:
    case 0x72/* r */:
      return true;
  }
  return false;
}

function isDigit(code) {
  return (code >= 48 && code <= 57);   // 0..9
}

function isDigitStart(code) {
  return (code >= 48 && code <= 57) || /* 0..9 */
          code === 0x2B || /* + */
          code === 0x2D || /* - */
          code === 0x2E;   /* . */
}


function State(path) {
  this.index  = 0;
  this.path   = path;
  this.max    = path.length;
  this.result = [];
  this.param  = 0.0;
  this.err    = '';
  this.segmentStart = 0;
  this.data   = [];
}

function skipSpaces(state) {
  while (state.index < state.max && isSpace(state.path.charCodeAt(state.index))) {
    state.index++;
  }
}


function scanParam(state) {
  var start = state.index,
      index = start,
      max = state.max,
      zeroFirst = false,
      hasCeiling = false,
      hasDecimal = false,
      hasDot = false,
      ch;

  if (index >= max) {
    state.err = 'SvgPath: missed param (at pos ' + index + ')';
    return;
  }
  ch = state.path.charCodeAt(index);

  if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
    index++;
    ch = (index < max) ? state.path.charCodeAt(index) : 0;
  }

  // This logic is shamelessly borrowed from Esprima
  // https://github.com/ariya/esprimas
  //
  if (!isDigit(ch) && ch !== 0x2E/* . */) {
    state.err = 'SvgPath: param should start with 0..9 or `.` (at pos ' + index + ')';
    return;
  }

  if (ch !== 0x2E/* . */) {
    zeroFirst = (ch === 0x30/* 0 */);
    index++;

    ch = (index < max) ? state.path.charCodeAt(index) : 0;

    if (zeroFirst && index < max) {
      // decimal number starts with '0' such as '09' is illegal.
      if (ch && isDigit(ch)) {
        state.err = 'SvgPath: numbers started with `0` such as `09` are ilegal (at pos ' + start + ')';
        return;
      }
    }

    while (index < max && isDigit(state.path.charCodeAt(index))) {
      index++;
      hasCeiling = true;
    }
    ch = (index < max) ? state.path.charCodeAt(index) : 0;
  }

  if (ch === 0x2E/* . */) {
    hasDot = true;
    index++;
    while (isDigit(state.path.charCodeAt(index))) {
      index++;
      hasDecimal = true;
    }
    ch = (index < max) ? state.path.charCodeAt(index) : 0;
  }

  if (ch === 0x65/* e */ || ch === 0x45/* E */) {
    if (hasDot && !hasCeiling && !hasDecimal) {
      state.err = 'SvgPath: invalid float exponent (at pos ' + index + ')';
      return;
    }

    index++;

    ch = (index < max) ? state.path.charCodeAt(index) : 0;
    if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
      index++;
    }
    if (index < max && isDigit(state.path.charCodeAt(index))) {
      while (index < max && isDigit(state.path.charCodeAt(index))) {
        index++;
      }
    } else {
      state.err = 'SvgPath: invalid float exponent (at pos ' + index + ')';
      return;
    }
  }

  state.index = index;
  state.param = parseFloat(state.path.slice(start, index)) + 0.0;
}


function finalizeSegment(state) {
  var cmd, cmdLC;

  // Process duplicated commands (without comand name)

  // This logic is shamelessly borrowed from Raphael
  // https://github.com/DmitryBaranovskiy/raphael/
  //
  cmd   = state.path[state.segmentStart];
  cmdLC = cmd.toLowerCase();

  var params = state.data;

  if (cmdLC === 'm' && params.length > 2) {
    state.result.push([ cmd, params[0], params[1] ]);
    params = params.slice(2);
    cmdLC = 'l';
    cmd = (cmd === 'm') ? 'l' : 'L';
  }

  if (cmdLC === 'r') {
    state.result.push([ cmd ].concat(params));
  } else {

    while (params.length >= paramCounts[cmdLC]) {
      state.result.push([ cmd ].concat(params.splice(0, paramCounts[cmdLC])));
      if (!paramCounts[cmdLC]) {
        break;
      }
    }
  }
}


function scanSegment(state) {
  var max = state.max, cmdCode, comma_found,
            need_params, i;

  state.segmentStart = state.index;
  cmdCode = state.path.charCodeAt(state.index);

  if (!isCommand(cmdCode)) {
    state.err = 'SvgPath: bad command ' + state.path[state.index] + ' (at pos ' + state.index + ')';
    return;
  }

  need_params = paramCounts[state.path[state.index].toLowerCase()];

  state.index++;
  skipSpaces(state);

  state.data = [];

  if (!need_params) {
    // Z
    finalizeSegment(state);
    return;
  }

  comma_found = false;

  for (;;) {
    for (i = need_params; i > 0; i--) {
      scanParam(state);
      if (state.err.length) {
        return;
      }
      state.data.push(state.param);

      skipSpaces(state);
      comma_found = false;

      if (state.index < max && state.path.charCodeAt(state.index) === 0x2C/* , */) {
        state.index++;
        skipSpaces(state);
        comma_found = true;
      }
    }

    // after ',' param is mandatory
    if (comma_found) {
      continue;
    }

    if (state.index >= state.max) {
      break;
    }

    // Stop on next segment
    if (!isDigitStart(state.path.charCodeAt(state.index))) {
      break;
    }
  }

  finalizeSegment(state);
}


/* Returns array of segments:
 *
 * [
 *   [ command, coord1, coord2, ... ]
 * ]
 */
module.exports = function pathParse(svgPath) {
  var state = new State(svgPath);
  var max = state.max;

  skipSpaces(state);

  while (state.index < max && !state.err.length) {
    scanSegment(state);
  }

  if (state.err.length) {
    state.result = [];

  } else if (state.result.length) {

    if ('mM'.indexOf(state.result[0][0]) < 0) {
      state.err = 'SvgPath: string should start with `M` or `m`';
      state.result = [];
    } else {
      state.result[0][0] = 'M';
    }
  }

  return {
    err: state.err,
    segments: state.result
  };
};
});

var path_parse$1 = interopDefault(path_parse);


var require$$4 = Object.freeze({
  default: path_parse$1
});

var matrix = createCommonjsModule(function (module) {
function combine(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
  ];
}


function Matrix() {
  if (!(this instanceof Matrix)) { return new Matrix(); }
  this.queue = [];   // list of matrixes to apply
  this.cache = null; // combined matrix cache
}


Matrix.prototype.matrix = function (m) {
  if (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0) {
    return this;
  }
  this.cache = null;
  this.queue.push(m);
  return this;
};


Matrix.prototype.translate = function (tx, ty) {
  if (tx !== 0 || ty !== 0) {
    this.cache = null;
    this.queue.push([ 1, 0, 0, 1, tx, ty ]);
  }
  return this;
};


Matrix.prototype.scale = function (sx, sy) {
  if (sx !== 1 || sy !== 1) {
    this.cache = null;
    this.queue.push([ sx, 0, 0, sy, 0, 0 ]);
  }
  return this;
};


Matrix.prototype.rotate = function (angle, rx, ry) {
  var rad, cos, sin;

  if (angle !== 0) {
    this.translate(rx, ry);

    rad = angle * Math.PI / 180;
    cos = Math.cos(rad);
    sin = Math.sin(rad);

    this.queue.push([ cos, sin, -sin, cos, 0, 0 ]);
    this.cache = null;

    this.translate(-rx, -ry);
  }
  return this;
};


Matrix.prototype.skewX = function (angle) {
  if (angle !== 0) {
    this.cache = null;
    this.queue.push([ 1, 0, Math.tan(angle * Math.PI / 180), 1, 0, 0 ]);
  }
  return this;
};


Matrix.prototype.skewY = function (angle) {
  if (angle !== 0) {
    this.cache = null;
    this.queue.push([ 1, Math.tan(angle * Math.PI / 180), 0, 1, 0, 0 ]);
  }
  return this;
};


// Flatten queue
//
Matrix.prototype.toArray = function () {
  var this$1 = this;

  if (this.cache) {
    return this.cache;
  }

  if (!this.queue.length) {
    this.cache = [ 1, 0, 0, 1, 0, 0 ];
    return this.cache;
  }

  this.cache = this.queue[0];

  if (this.queue.length === 1) {
    return this.cache;
  }

  for (var i = 1; i < this.queue.length; i++) {
    this$1.cache = combine(this$1.cache, this$1.queue[i]);
  }

  return this.cache;
};


// Apply list of matrixes to (x,y) point.
// If `isRelative` set, `translate` component of matrix will be skipped
//
Matrix.prototype.calc = function (x, y, isRelative) {
  var m;

  // Don't change point on empty transforms queue
  if (!this.queue.length) { return [ x, y ]; }

  // Calculate final matrix, if not exists
  //
  // NB. if you deside to apply transforms to point one-by-one,
  // they should be taken in reverse order

  if (!this.cache) {
    this.cache = this.toArray();
  }

  m = this.cache;

  // Apply matrix to point
  return [
    x * m[0] + y * m[2] + (isRelative ? 0 : m[4]),
    x * m[1] + y * m[3] + (isRelative ? 0 : m[5])
  ];
};


module.exports = Matrix;
});

var matrix$1 = interopDefault(matrix);


var require$$0$1 = Object.freeze({
  default: matrix$1
});

var transform_parse = createCommonjsModule(function (module) {
var Matrix = interopDefault(require$$0$1);

var operations = {
  matrix: true,
  scale: true,
  rotate: true,
  translate: true,
  skewX: true,
  skewY: true
};

var CMD_SPLIT_RE    = /\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(\s*(.+?)\s*\)[\s,]*/;
var PARAMS_SPLIT_RE = /[\s,]+/;


module.exports = function transformParse(transformString) {
  var matrix = new Matrix();
  var cmd, params;

  // Split value into ['', 'translate', '10 50', '', 'scale', '2', '', 'rotate',  '-45', '']
  transformString.split(CMD_SPLIT_RE).forEach(function (item) {

    // Skip empty elements
    if (!item.length) { return; }

    // remember operation
    if (typeof operations[item] !== 'undefined') {
      cmd = item;
      return;
    }

    // extract params & att operation to matrix
    params = item.split(PARAMS_SPLIT_RE).map(function (i) {
      return +i || 0;
    });

    // If params count is not correct - ignore command
    switch (cmd) {
      case 'matrix':
        if (params.length === 6) {
          matrix.matrix(params);
        }
        return;

      case 'scale':
        if (params.length === 1) {
          matrix.scale(params[0], params[0]);
        } else if (params.length === 2) {
          matrix.scale(params[0], params[1]);
        }
        return;

      case 'rotate':
        if (params.length === 1) {
          matrix.rotate(params[0], 0, 0);
        } else if (params.length === 3) {
          matrix.rotate(params[0], params[1], params[2]);
        }
        return;

      case 'translate':
        if (params.length === 1) {
          matrix.translate(params[0], 0);
        } else if (params.length === 2) {
          matrix.translate(params[0], params[1]);
        }
        return;

      case 'skewX':
        if (params.length === 1) {
          matrix.skewX(params[0]);
        }
        return;

      case 'skewY':
        if (params.length === 1) {
          matrix.skewY(params[0]);
        }
        return;
    }
  });

  return matrix;
};
});

var transform_parse$1 = interopDefault(transform_parse);


var require$$3 = Object.freeze({
  default: transform_parse$1
});

var a2c = createCommonjsModule(function (module) {
// Convert an arc to a sequence of cubic bézier curves
//
var TAU = Math.PI * 2;


/* eslint-disable space-infix-ops */

// Calculate an angle between two vectors
//
function vector_angle(ux, uy, vx, vy) {
  var sign = (ux * vy - uy * vx < 0) ? -1 : 1;
  var umag = Math.sqrt(ux * ux + uy * uy);
  var vmag = Math.sqrt(ux * ux + uy * uy);
  var dot  = ux * vx + uy * vy;
  var div  = dot / (umag * vmag);

  // rounding errors, e.g. -1.0000000000000002 can screw up this
  if (div >  1.0) { div =  1.0; }
  if (div < -1.0) { div = -1.0; }

  return sign * Math.acos(div);
}


// Convert from endpoint to center parameterization,
// see http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
//
// Return [cx, cy, θ1, Δθ]
//
function get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_φ, cos_φ) {
  // Step 1.
  //
  // Moving an ellipse so origin will be the middlepoint between our two
  // points. After that, rotate it to line up ellipse axes with coordinate
  // axes.
  //
  var x1p =  cos_φ*(x1-x2)/2 + sin_φ*(y1-y2)/2;
  var y1p = -sin_φ*(x1-x2)/2 + cos_φ*(y1-y2)/2;

  var rx_sq  =  rx * rx;
  var ry_sq  =  ry * ry;
  var x1p_sq = x1p * x1p;
  var y1p_sq = y1p * y1p;

  // Step 2.
  //
  // Compute coordinates of the centre of this ellipse (cx', cy')
  // in the new coordinate system.
  //
  var radicant = (rx_sq * ry_sq) - (rx_sq * y1p_sq) - (ry_sq * x1p_sq);

  if (radicant < 0) {
    // due to rounding errors it might be e.g. -1.3877787807814457e-17
    radicant = 0;
  }

  radicant /=   (rx_sq * y1p_sq) + (ry_sq * x1p_sq);
  radicant = Math.sqrt(radicant) * (fa === fs ? -1 : 1);

  var cxp = radicant *  rx/ry * y1p;
  var cyp = radicant * -ry/rx * x1p;

  // Step 3.
  //
  // Transform back to get centre coordinates (cx, cy) in the original
  // coordinate system.
  //
  var cx = cos_φ*cxp - sin_φ*cyp + (x1+x2)/2;
  var cy = sin_φ*cxp + cos_φ*cyp + (y1+y2)/2;

  // Step 4.
  //
  // Compute angles (θ1, Δθ).
  //
  var v1x =  (x1p - cxp) / rx;
  var v1y =  (y1p - cyp) / ry;
  var v2x = (-x1p - cxp) / rx;
  var v2y = (-y1p - cyp) / ry;

  var θ1 = vector_angle(1, 0, v1x, v1y);
  var Δθ = vector_angle(v1x, v1y, v2x, v2y);

  if (fs === 0 && Δθ > 0) {
    Δθ -= TAU;
  }
  if (fs === 1 && Δθ < 0) {
    Δθ += TAU;
  }

  return [ cx, cy, θ1, Δθ ];
}

//
// Approximate one unit arc segment with bézier curves,
// see http://math.stackexchange.com/questions/873224
//
function approximate_unit_arc(θ1, Δθ) {
  var α = 4/3 * Math.tan(Δθ/4);

  var x1 = Math.cos(θ1);
  var y1 = Math.sin(θ1);
  var x2 = Math.cos(θ1 + Δθ);
  var y2 = Math.sin(θ1 + Δθ);

  return [ x1, y1, x1 - y1*α, y1 + x1*α, x2 + y2*α, y2 - x2*α, x2, y2 ];
}

module.exports = function a2c(x1, y1, x2, y2, fa, fs, rx, ry, φ) {
  var sin_φ = Math.sin(φ * TAU / 360);
  var cos_φ = Math.cos(φ * TAU / 360);

  // Make sure radii are valid
  //
  var x1p =  cos_φ*(x1-x2)/2 + sin_φ*(y1-y2)/2;
  var y1p = -sin_φ*(x1-x2)/2 + cos_φ*(y1-y2)/2;

  if (x1p === 0 && y1p === 0) {
    // we're asked to draw line to itself
    return [];
  }

  if (rx === 0 || ry === 0) {
    // one of the radii is zero
    return [];
  }


  // Compensate out-of-range radii
  //
  rx = Math.abs(rx);
  ry = Math.abs(ry);

  var Λ = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (Λ > 1) {
    rx *= Math.sqrt(Λ);
    ry *= Math.sqrt(Λ);
  }


  // Get center parameters (cx, cy, θ1, Δθ)
  //
  var cc = get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_φ, cos_φ);

  var result = [];
  var θ1 = cc[2];
  var Δθ = cc[3];

  // Split an arc to multiple segments, so each segment
  // will be less than τ/4 (= 90°)
  //
  var segments = Math.max(Math.ceil(Math.abs(Δθ) / (TAU / 4)), 1);
  Δθ /= segments;

  for (var i = 0; i < segments; i++) {
    result.push(approximate_unit_arc(θ1, Δθ));
    θ1 += Δθ;
  }

  // We have a bezier approximation of a unit circle,
  // now need to transform back to the original ellipse
  //
  return result.map(function (curve) {
    for (var i = 0; i < curve.length; i += 2) {
      var x = curve[i + 0];
      var y = curve[i + 1];

      // scale
      x *= rx;
      y *= ry;

      // rotate
      var xp = cos_φ*x - sin_φ*y;
      var yp = sin_φ*x + cos_φ*y;

      // translate
      curve[i + 0] = xp + cc[0];
      curve[i + 1] = yp + cc[1];
    }

    return curve;
  });
};
});

var a2c$1 = interopDefault(a2c);


var require$$1 = Object.freeze({
  default: a2c$1
});

var ellipse = createCommonjsModule(function (module) {
var epsilon = 0.0000000001;

// To convert degree in radians
//
var torad = Math.PI / 180;

// Class constructor :
//  an ellipse centred at 0 with radii rx,ry and x - axis - angle ax.
//
function Ellipse(rx, ry, ax) {
  if (!(this instanceof Ellipse)) { return new Ellipse(rx, ry, ax); }
  this.rx = rx;
  this.ry = ry;
  this.ax = ax;
}

// Apply a linear transform m to the ellipse
// m is an array representing a matrix :
//    -         -
//   | m[0] m[2] |
//   | m[1] m[3] |
//    -         -
//
Ellipse.prototype.transform = function (m) {
  // We consider the current ellipse as image of the unit circle
  // by first scale(rx,ry) and then rotate(ax) ...
  // So we apply ma =  m x rotate(ax) x scale(rx,ry) to the unit circle.
  var c = Math.cos(this.ax * torad), s = Math.sin(this.ax * torad);
  var ma = [ this.rx * (m[0]*c + m[2]*s),
             this.rx * (m[1]*c + m[3]*s),
             this.ry * (-m[0]*s + m[2]*c),
             this.ry * (-m[1]*s + m[3]*c) ];

  // ma * transpose(ma) = [ J L ]
  //                      [ L K ]
  // L is calculated later (if the image is not a circle)
  var J = ma[0]*ma[0] + ma[2]*ma[2],
      K = ma[1]*ma[1] + ma[3]*ma[3];

  // the discriminant of the characteristic polynomial of ma * transpose(ma)
  var D = ((ma[0]-ma[3])*(ma[0]-ma[3]) + (ma[2]+ma[1])*(ma[2]+ma[1])) *
          ((ma[0]+ma[3])*(ma[0]+ma[3]) + (ma[2]-ma[1])*(ma[2]-ma[1]));

  // the "mean eigenvalue"
  var JK = (J + K) / 2;

  // check if the image is (almost) a circle
  if (D < epsilon * JK) {
    // if it is
    this.rx = this.ry = Math.sqrt(JK);
    this.ax = 0;
    return this;
  }

  // if it is not a circle
  var L = ma[0]*ma[1] + ma[2]*ma[3];

  D = Math.sqrt(D);

  // {l1,l2} = the two eigen values of ma * transpose(ma)
  var l1 = JK + D/2,
      l2 = JK - D/2;
  // the x - axis - rotation angle is the argument of the l1 - eigenvector
  this.ax = (Math.abs(L) < epsilon && Math.abs(l1 - K) < epsilon) ?
    90
  :
    Math.atan(Math.abs(L) > Math.abs(l1 - K) ?
      (l1 - J) / L
    :
      L / (l1 - K)
    ) * 180 / Math.PI;

  // if ax > 0 => rx = sqrt(l1), ry = sqrt(l2), else exchange axes and ax += 90
  if (this.ax >= 0) {
    // if ax in [0,90]
    this.rx = Math.sqrt(l1);
    this.ry = Math.sqrt(l2);
  } else {
    // if ax in ]-90,0[ => exchange axes
    this.ax += 90;
    this.rx = Math.sqrt(l2);
    this.ry = Math.sqrt(l1);
  }

  return this;
};

// Check if the ellipse is (almost) degenerate, i.e. rx = 0 or ry = 0
//
Ellipse.prototype.isDegenerate = function () {
  return (this.rx < epsilon * this.ry || this.ry < epsilon * this.rx);
};

module.exports = Ellipse;
});

var ellipse$1 = interopDefault(ellipse);


var require$$0$2 = Object.freeze({
  default: ellipse$1
});

var svgpath$1 = createCommonjsModule(function (module) {
// SVG Path transformations library
//
// Usage:
//
//    SvgPath('...')
//      .translate(-150, -100)
//      .scale(0.5)
//      .translate(-150, -100)
//      .toFixed(1)
//      .toString()
//

var pathParse      = interopDefault(require$$4);
var transformParse = interopDefault(require$$3);
var matrix         = interopDefault(require$$0$1);
var a2c            = interopDefault(require$$1);
var ellipse        = interopDefault(require$$0$2);


// Class constructor
//
function SvgPath(path) {
  if (!(this instanceof SvgPath)) { return new SvgPath(path); }

  var pstate = pathParse(path);

  // Array of path segments.
  // Each segment is array [command, param1, param2, ...]
  this.segments = pstate.segments;

  // Error message on parse error.
  this.err      = pstate.err;

  // Transforms stack for lazy evaluation
  this.__stack    = [];
}


SvgPath.prototype.__matrix = function (m) {
  var self = this,
      ma, sx, sy, angle, arc2line, i;

  // Quick leave for empty matrix
  if (!m.queue.length) { return; }

  this.iterate(function (s, index, x, y) {
    var p, result, name, isRelative;

    switch (s[0]) {

      // Process 'assymetric' commands separately
      case 'v':
        p      = m.calc(0, s[1], true);
        result = (p[0] === 0) ? [ 'v', p[1] ] : [ 'l', p[0], p[1] ];
        break;

      case 'V':
        p      = m.calc(x, s[1], false);
        result = (p[0] === m.calc(x, y, false)[0]) ? [ 'V', p[1] ] : [ 'L', p[0], p[1] ];
        break;

      case 'h':
        p      = m.calc(s[1], 0, true);
        result = (p[1] === 0) ? [ 'h', p[0] ] : [ 'l', p[0], p[1] ];
        break;

      case 'H':
        p      = m.calc(s[1], y, false);
        result = (p[1] === m.calc(x, y, false)[1]) ? [ 'H', p[0] ] : [ 'L', p[0], p[1] ];
        break;

      case 'a':
      case 'A':
        // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]

        // Drop segment if arc is empty (end point === start point)
        /*if ((s[0] === 'A' && s[6] === x && s[7] === y) ||
            (s[0] === 'a' && s[6] === 0 && s[7] === 0)) {
          return [];
        }*/

        // Transform rx, ry and the x-axis-rotation
        var ma = m.toArray();
        var e = ellipse(s[1], s[2], s[3]).transform(ma);

        // flip sweep-flag if matrix is not orientation-preserving
        if (ma[0] * ma[3] - ma[1] * ma[2] < 0) {
          s[5] = s[5] ? '0' : '1';
        }

        // Transform end point as usual (without translation for relative notation)
        p = m.calc(s[6], s[7], s[0] === 'a');

        // Empty arcs can be ignored by renderer, but should not be dropped
        // to avoid collisions with `S A S` and so on. Replace with empty line.
        if ((s[0] === 'A' && s[6] === x && s[7] === y) ||
            (s[0] === 'a' && s[6] === 0 && s[7] === 0)) {
          result = [ s[0] === 'a' ? 'l' : 'L', p[0], p[1] ];
          break;
        }

        // if the resulting ellipse is (almost) a segment ...
        if (e.isDegenerate()) {
          // replace the arc by a line
          result = [ s[0] === 'a' ? 'l' : 'L', p[0], p[1] ];
        } else {
          // if it is a real ellipse
          // s[0], s[4] and s[5] are not modified
          result = [ s[0], e.rx, e.ry, e.ax, s[4], s[5], p[0], p[1] ];
        }

        break;

      case 'm':
        // Edge case. The very first `m` should be processed as absolute, if happens.
        // Make sense for coord shift transforms.
        isRelative = index > 0;

        p = m.calc(s[1], s[2], isRelative);
        result = [ 'm', p[0], p[1] ];
        break;

      default:
        name       = s[0];
        result     = [ name ];
        isRelative = (name.toLowerCase() === name);

        // Apply transformations to the segment
        for (i = 1; i < s.length; i += 2) {
          p = m.calc(s[i], s[i + 1], isRelative);
          result.push(p[0], p[1]);
        }
    }

    self.segments[index] = result;
  }, true);
};


// Apply stacked commands
//
SvgPath.prototype.__evaluateStack = function () {
  var this$1 = this;

  var m, i;

  if (!this.__stack.length) { return; }

  if (this.__stack.length === 1) {
    this.__matrix(this.__stack[0]);
    this.__stack = [];
    return;
  }

  m = matrix();
  i = this.__stack.length;

  while (--i >= 0) {
    m.matrix(this$1.__stack[i].toArray());
  }

  this.__matrix(m);
  this.__stack = [];
};


// Convert processed SVG Path back to string
//
SvgPath.prototype.toString = function () {
  var this$1 = this;

  var elements = [], skipCmd, cmd;

  this.__evaluateStack();

  for (var i = 0; i < this.segments.length; i++) {
    // remove repeating commands names
    cmd = this$1.segments[i][0];
    skipCmd = i > 0 && cmd !== 'm' && cmd !== 'M' && cmd === this$1.segments[i - 1][0];
    elements = elements.concat(skipCmd ? this$1.segments[i].slice(1) : this$1.segments[i]);
  }

  return elements.join(' ')
            // Optimizations: remove spaces around commands & before `-`
            //
            // We could also remove leading zeros for `0.5`-like values,
            // but their count is too small to spend time for.
            .replace(/ ?([achlmqrstvz]) ?/gi, '$1')
            .replace(/ \-/g, '-')
            // workaround for FontForge SVG importing bug
            .replace(/zm/g, 'z m');
};


// Translate path to (x [, y])
//
SvgPath.prototype.translate = function (x, y) {
  this.__stack.push(matrix().translate(x, y || 0));
  return this;
};


// Scale path to (sx [, sy])
// sy = sx if not defined
//
SvgPath.prototype.scale = function (sx, sy) {
  this.__stack.push(matrix().scale(sx, (!sy && (sy !== 0)) ? sx : sy));
  return this;
};


// Rotate path around point (sx [, sy])
// sy = sx if not defined
//
SvgPath.prototype.rotate = function (angle, rx, ry) {
  this.__stack.push(matrix().rotate(angle, rx || 0, ry || 0));
  return this;
};


// Apply matrix transform (array of 6 elements)
//
SvgPath.prototype.matrix = function (m) {
  this.__stack.push(matrix().matrix(m));
  return this;
};


// Transform path according to "transform" attr of SVG spec
//
SvgPath.prototype.transform = function (transformString) {
  if (!transformString.trim()) {
    return this;
  }
  this.__stack.push(transformParse(transformString));
  return this;
};


// Round coords with given decimal precition.
// 0 by default (to integers)
//
SvgPath.prototype.round = function (d) {
  var contourStartDeltaX = 0, contourStartDeltaY = 0, deltaX = 0, deltaY = 0, l;

  d = d || 0;

  this.__evaluateStack();

  this.segments.forEach(function (s) {
    var isRelative = (s[0].toLowerCase() === s[0]);

    switch (s[0]) {
      case 'H':
      case 'h':
        if (isRelative) { s[1] += deltaX; }
        deltaX = s[1] - s[1].toFixed(d);
        s[1] = +s[1].toFixed(d);
        return;

      case 'V':
      case 'v':
        if (isRelative) { s[1] += deltaY; }
        deltaY = s[1] - s[1].toFixed(d);
        s[1] = +s[1].toFixed(d);
        return;

      case 'Z':
      case 'z':
        deltaX = contourStartDeltaX;
        deltaY = contourStartDeltaY;
        return;

      case 'M':
      case 'm':
        if (isRelative) {
          s[1] += deltaX;
          s[2] += deltaY;
        }

        deltaX = s[1] - s[1].toFixed(d);
        deltaY = s[2] - s[2].toFixed(d);

        contourStartDeltaX = deltaX;
        contourStartDeltaY = deltaY;

        s[1] = +s[1].toFixed(d);
        s[2] = +s[2].toFixed(d);
        return;

      case 'A':
      case 'a':
        // [cmd, rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
        if (isRelative) {
          s[6] += deltaX;
          s[7] += deltaY;
        }

        deltaX = s[6] - s[6].toFixed(d);
        deltaY = s[7] - s[7].toFixed(d);

        s[1] = +s[1].toFixed(d);
        s[2] = +s[2].toFixed(d);
        s[3] = +s[3].toFixed(d + 2); // better precision for rotation
        s[6] = +s[6].toFixed(d);
        s[7] = +s[7].toFixed(d);
        return;

      default:
        // a c l q s t
        l = s.length;

        if (isRelative) {
          s[l - 2] += deltaX;
          s[l - 1] += deltaY;
        }

        deltaX = s[l - 2] - s[l - 2].toFixed(d);
        deltaY = s[l - 1] - s[l - 1].toFixed(d);

        s.forEach(function (val, i) {
          if (!i) { return; }
          s[i] = +s[i].toFixed(d);
        });
        return;
    }
  });

  return this;
};


// Apply iterator function to all segments. If function returns result,
// current segment will be replaced to array of returned segments.
// If empty array is returned, current regment will be deleted.
//
SvgPath.prototype.iterate = function (iterator, keepLazyStack) {
  var segments = this.segments,
      replacements = {},
      needReplace = false,
      lastX = 0,
      lastY = 0,
      countourStartX = 0,
      countourStartY = 0;
  var i, j, isRelative, newSegments;

  if (!keepLazyStack) {
    this.__evaluateStack();
  }

  segments.forEach(function (s, index) {

    var res = iterator(s, index, lastX, lastY);

    if (Array.isArray(res)) {
      replacements[index] = res;
      needReplace = true;
    }

    var isRelative = (s[0] === s[0].toLowerCase());

    // calculate absolute X and Y
    switch (s[0]) {
      case 'm':
      case 'M':
        lastX = s[1] + (isRelative ? lastX : 0);
        lastY = s[2] + (isRelative ? lastY : 0);
        countourStartX = lastX;
        countourStartY = lastY;
        return;

      case 'h':
      case 'H':
        lastX = s[1] + (isRelative ? lastX : 0);
        return;

      case 'v':
      case 'V':
        lastY = s[1] + (isRelative ? lastY : 0);
        return;

      case 'z':
      case 'Z':
        // That make sence for multiple contours
        lastX = countourStartX;
        lastY = countourStartY;
        return;

      default:
        lastX = s[s.length - 2] + (isRelative ? lastX : 0);
        lastY = s[s.length - 1] + (isRelative ? lastY : 0);
    }
  });

  // Replace segments if iterator return results

  if (!needReplace) { return this; }

  newSegments = [];

  for (i = 0; i < segments.length; i++) {
    if (typeof replacements[i] !== 'undefined') {
      for (j = 0; j < replacements[i].length; j++) {
        newSegments.push(replacements[i][j]);
      }
    } else {
      newSegments.push(segments[i]);
    }
  }

  this.segments = newSegments;

  return this;
};


// Converts segments from relative to absolute
//
SvgPath.prototype.abs = function () {

  this.iterate(function (s, index, x, y) {
    var name = s[0],
        nameUC = name.toUpperCase(),
        i;

    // Skip absolute commands
    if (name === nameUC) { return; }

    s[0] = nameUC;

    switch (name) {
      case 'v':
        // v has shifted coords parity
        s[1] += y;
        return;

      case 'a':
        // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
        // touch x, y only
        s[6] += x;
        s[7] += y;
        return;

      default:
        for (i = 1; i < s.length; i++) {
          s[i] += i % 2 ? x : y; // odd values are X, even - Y
        }
    }
  }, true);

  return this;
};


// Converts segments from absolute to relative
//
SvgPath.prototype.rel = function () {

  this.iterate(function (s, index, x, y) {
    var name = s[0],
        nameLC = name.toLowerCase(),
        i;

    // Skip relative commands
    if (name === nameLC) { return; }

    // Don't touch the first M to avoid potential confusions.
    if (index === 0 && name === 'M') { return; }

    s[0] = nameLC;

    switch (name) {
      case 'V':
        // V has shifted coords parity
        s[1] -= y;
        return;

      case 'A':
        // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
        // touch x, y only
        s[6] -= x;
        s[7] -= y;
        return;

      default:
        for (i = 1; i < s.length; i++) {
          s[i] -= i % 2 ? x : y; // odd values are X, even - Y
        }
    }
  }, true);

  return this;
};


// Converts arcs to cubic bézier curves
//
SvgPath.prototype.unarc = function () {
  this.iterate(function (s, index, x, y) {
    var i, new_segments, nextX, nextY, result = [], name = s[0];

    // Skip anything except arcs
    if (name !== 'A' && name !== 'a') { return null; }

    if (name === 'a') {
      // convert relative arc coordinates to absolute
      nextX = x + s[6];
      nextY = y + s[7];
    } else {
      nextX = s[6];
      nextY = s[7];
    }

    new_segments = a2c(x, y, nextX, nextY, s[4], s[5], s[1], s[2], s[3]);

    // Degenerated arcs can be ignored by renderer, but should not be dropped
    // to avoid collisions with `S A S` and so on. Replace with empty line.
    if (new_segments.length === 0) {
      return [ [ s[0] === 'a' ? 'l' : 'L', s[6], s[7] ] ];
    }

    new_segments.forEach(function (s) {
      result.push([ 'C', s[2], s[3], s[4], s[5], s[6], s[7] ]);
    });

    return result;
  });

  return this;
};


// Converts smooth curves (with missed control point) to generic curves
//
SvgPath.prototype.unshort = function () {
  var segments = this.segments;
  var prevControlX, prevControlY, prevSegment;
  var curControlX, curControlY;

  // TODO: add lazy evaluation flag when relative commands supported

  this.iterate(function (s, idx, x, y) {
    var name = s[0], nameUC = name.toUpperCase(), isRelative;

    // First command MUST be M|m, it's safe to skip.
    // Protect from access to [-1] for sure.
    if (!idx) { return; }

    if (nameUC === 'T') { // quadratic curve
      isRelative = (name === 't');

      prevSegment = segments[idx - 1];

      if (prevSegment[0] === 'Q') {
        prevControlX = prevSegment[1] - x;
        prevControlY = prevSegment[2] - y;
      } else if (prevSegment[0] === 'q') {
        prevControlX = prevSegment[1] - prevSegment[3];
        prevControlY = prevSegment[2] - prevSegment[4];
      } else {
        prevControlX = 0;
        prevControlY = 0;
      }

      curControlX = -prevControlX;
      curControlY = -prevControlY;

      if (!isRelative) {
        curControlX += x;
        curControlY += y;
      }

      segments[idx] = [
        isRelative ? 'q' : 'Q',
        curControlX, curControlY,
        s[1], s[2]
      ];

    } else if (nameUC === 'S') { // cubic curve
      isRelative = (name === 's');

      prevSegment = segments[idx - 1];

      if (prevSegment[0] === 'C') {
        prevControlX = prevSegment[3] - x;
        prevControlY = prevSegment[4] - y;
      } else if (prevSegment[0] === 'c') {
        prevControlX = prevSegment[3] - prevSegment[5];
        prevControlY = prevSegment[4] - prevSegment[6];
      } else {
        prevControlX = 0;
        prevControlY = 0;
      }

      curControlX = -prevControlX;
      curControlY = -prevControlY;

      if (!isRelative) {
        curControlX += x;
        curControlY += y;
      }

      segments[idx] = [
        isRelative ? 'c' : 'C',
        curControlX, curControlY,
        s[1], s[2], s[3], s[4]
      ];
    }
  });

  return this;
};


module.exports = SvgPath;
});

var svgpath$2 = interopDefault(svgpath$1);


var require$$0 = Object.freeze({
  default: svgpath$2
});

var index = createCommonjsModule(function (module) {
module.exports = interopDefault(require$$0);
});

var svgpath = interopDefault(index);

function applyTransforms ( node, transforms ) {
	if ( node.attributes.transform ) {
		transforms = transforms.concat( node.attributes.transform );
		delete node.attributes.transform;
	}

	var transformString = transforms.join( ' ' );

	if ( node.name === 'path' ) {
		node.attributes.d = svgpath( node.attributes.d )
			.transform( transformString )
			.round( 10 )
			.toString();
	} else if ( transformString ) {
		node.attributes.transform = transformString;
	}
}

var ignore = [ 'defs', 'title' ];
var noninheritable = [ 'id', 'class', 'style', 'transform' ];

function walk ( node, paths, transforms, classes, attributes ) {
	if ( node.name === 'svg' ) {
		var _transforms = transforms.slice();
		node.children.forEach( function (child) {
			walk( child, paths, _transforms, assign$1( {}, classes ), assign$1( {}, attributes ) );
		});
	}

	else if ( node.name === 'g' ) {
		transforms = node.attributes.transform ? transforms.concat( node.attributes.transform ) : transforms;

		if ( node.attributes.class ) {
			node.attributes.class.split( ' ' )
				.filter( Boolean )
				.forEach( function (className) { return classes[ className ] = true; } );
		}

		node.children.forEach( function (child) {
			var _classes = assign$1( {}, classes );

			var _attributes = assign$1(
				cloneExcept( attributes, noninheritable ),
				cloneExcept( node.attributes, noninheritable )
			);

			walk( child, paths, transforms, _classes, _attributes );
		});
	}

	else if ( ~ignore.indexOf( node.name ) ) {
		applyAttributes( node, attributes );
		applyClasses( node, classes );
		applyTransforms( node, transforms );
		paths.push( node );
	}

	else {
		applyAttributes( node, attributes );
		applyClasses( node, classes );

		if ( node.name !== 'path' ) {
			node = convert( node );
		}

		applyTransforms( node, transforms );
		paths.push( node );
	}
}

function stringifyAttributes ( attributes ) {
	return Object.keys( attributes ).map( function (key) { return (" " + key + "=\"" + (attributes[key]) + "\""); } ).join( '' );
}

function stringify ( node, indent ) {
	if ( typeof node === 'string' ) return node;

	var attributes = stringifyAttributes( node.attributes );

	var str = indent + "<" + (node.name) + attributes;

	if ( node.children && node.children.length ) {
		str += '>';
		var prefix = '\n';

		for ( var i = 0, list = node.children; i < list.length; i += 1 ) {
			var child = list[i];

			if ( typeof child === 'string' ) {
				str += child;
				prefix = '';
			} else {
				str += prefix + stringify( child, indent + '\t' );
				prefix = '\n';
			}
		}

		if ( prefix ) prefix += indent;

		str += prefix + "</" + (node.name) + ">";
	} else if ( node.val ) {
		str += ">" + (node.val) + "</" + (node.name) + ">";
	} else {
		str += '/>';
	}

	return str;
}

var Pathologist = function Pathologist ( source ) {
	this.source = parse$1( source );

	this.target = {
		name: this.source.name,
		attributes: Object.assign( {}, this.source.attributes ),
		children: []
	};

	walk( this.source, this.target.children, [], {}, {} );
};

Pathologist.prototype.toString = function toString () {
	return stringify( this.target, '' );
};

function transform ( source ) {
	return new Pathologist( source ).toString();
}

//Thank you Rich!! https://pathologist.surge.sh/
function pathologize(original) {

  //handles issues with pathologist not parsing text and style elements
  const reText = /<text[\s\S]*?<\/text>/g;
  const reStyle = /<style[\s\S]*?<\/style>/g;
  const removedText = original.replace(reText, '');
  const removedStyle = removedText.replace(reStyle, '');

  try {
    const pathologized = transform(removedStyle);
    return pathologized;
  } catch (e) {
    return original;
  }
}

function createCommonjsModule$1(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var codemirror = createCommonjsModule$1(function (module, exports) {
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// This is CodeMirror (http://codemirror.net), a code editor
// implemented in JavaScript on top of the browser's DOM.
//
// You can find some technical background for some of the code below
// at http://marijnhaverbeke.nl/blog/#cm-internals .

(function (global, factory) {
	module.exports = factory();
}(this, (function () { var userAgent = navigator.userAgent;
var platform = navigator.platform;

var gecko = /gecko\/\d/i.test(userAgent);
var ie_upto10 = /MSIE \d/.test(userAgent);
var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(userAgent);
var edge = /Edge\/(\d+)/.exec(userAgent);
var ie = ie_upto10 || ie_11up || edge;
var ie_version = ie && (ie_upto10 ? document.documentMode || 6 : +(edge || ie_11up)[1]);
var webkit = !edge && /WebKit\//.test(userAgent);
var qtwebkit = webkit && /Qt\/\d+\.\d+/.test(userAgent);
var chrome = !edge && /Chrome\//.test(userAgent);
var presto = /Opera\//.test(userAgent);
var safari = /Apple Computer/.test(navigator.vendor);
var mac_geMountainLion = /Mac OS X 1\d\D([8-9]|\d\d)\D/.test(userAgent);
var phantom = /PhantomJS/.test(userAgent);

var ios = !edge && /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent);
var android = /Android/.test(userAgent);
// This is woefully incomplete. Suggestions for alternative methods welcome.
var mobile = ios || android || /webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(userAgent);
var mac = ios || /Mac/.test(platform);
var chromeOS = /\bCrOS\b/.test(userAgent);
var windows = /win/i.test(platform);

var presto_version = presto && userAgent.match(/Version\/(\d*\.\d*)/);
if (presto_version) { presto_version = Number(presto_version[1]); }
if (presto_version && presto_version >= 15) { presto = false; webkit = true; }
// Some browsers use the wrong event properties to signal cmd/ctrl on OS X
var flipCtrlCmd = mac && (qtwebkit || presto && (presto_version == null || presto_version < 12.11));
var captureRightClick = gecko || (ie && ie_version >= 9);

function classTest(cls) { return new RegExp("(^|\\s)" + cls + "(?:$|\\s)\\s*") }

var rmClass = function(node, cls) {
  var current = node.className;
  var match = classTest(cls).exec(current);
  if (match) {
    var after = current.slice(match.index + match[0].length);
    node.className = current.slice(0, match.index) + (after ? match[1] + after : "");
  }
};

function removeChildren(e) {
  for (var count = e.childNodes.length; count > 0; --count)
    { e.removeChild(e.firstChild); }
  return e
}

function removeChildrenAndAdd(parent, e) {
  return removeChildren(parent).appendChild(e)
}

function elt(tag, content, className, style) {
  var e = document.createElement(tag);
  if (className) { e.className = className; }
  if (style) { e.style.cssText = style; }
  if (typeof content == "string") { e.appendChild(document.createTextNode(content)); }
  else if (content) { for (var i = 0; i < content.length; ++i) { e.appendChild(content[i]); } }
  return e
}
// wrapper for elt, which removes the elt from the accessibility tree
function eltP(tag, content, className, style) {
  var e = elt(tag, content, className, style);
  e.setAttribute("role", "presentation");
  return e
}

var range;
if (document.createRange) { range = function(node, start, end, endNode) {
  var r = document.createRange();
  r.setEnd(endNode || node, end);
  r.setStart(node, start);
  return r
}; }
else { range = function(node, start, end) {
  var r = document.body.createTextRange();
  try { r.moveToElementText(node.parentNode); }
  catch(e) { return r }
  r.collapse(true);
  r.moveEnd("character", end);
  r.moveStart("character", start);
  return r
}; }

function contains(parent, child) {
  if (child.nodeType == 3) // Android browser always returns false when child is a textnode
    { child = child.parentNode; }
  if (parent.contains)
    { return parent.contains(child) }
  do {
    if (child.nodeType == 11) { child = child.host; }
    if (child == parent) { return true }
  } while (child = child.parentNode)
}

function activeElt() {
  // IE and Edge may throw an "Unspecified Error" when accessing document.activeElement.
  // IE < 10 will throw when accessed while the page is loading or in an iframe.
  // IE > 9 and Edge will throw when accessed in an iframe if document.body is unavailable.
  var activeElement;
  try {
    activeElement = document.activeElement;
  } catch(e) {
    activeElement = document.body || null;
  }
  while (activeElement && activeElement.shadowRoot && activeElement.shadowRoot.activeElement)
    { activeElement = activeElement.shadowRoot.activeElement; }
  return activeElement
}

function addClass(node, cls) {
  var current = node.className;
  if (!classTest(cls).test(current)) { node.className += (current ? " " : "") + cls; }
}
function joinClasses(a, b) {
  var as = a.split(" ");
  for (var i = 0; i < as.length; i++)
    { if (as[i] && !classTest(as[i]).test(b)) { b += " " + as[i]; } }
  return b
}

var selectInput = function(node) { node.select(); };
if (ios) // Mobile Safari apparently has a bug where select() is broken.
  { selectInput = function(node) { node.selectionStart = 0; node.selectionEnd = node.value.length; }; }
else if (ie) // Suppress mysterious IE10 errors
  { selectInput = function(node) { try { node.select(); } catch(_e) {} }; }

function bind(f) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function(){return f.apply(null, args)}
}

function copyObj(obj, target, overwrite) {
  if (!target) { target = {}; }
  for (var prop in obj)
    { if (obj.hasOwnProperty(prop) && (overwrite !== false || !target.hasOwnProperty(prop)))
      { target[prop] = obj[prop]; } }
  return target
}

// Counts the column offset in a string, taking tabs into account.
// Used mostly to find indentation.
function countColumn(string, end, tabSize, startIndex, startValue) {
  if (end == null) {
    end = string.search(/[^\s\u00a0]/);
    if (end == -1) { end = string.length; }
  }
  for (var i = startIndex || 0, n = startValue || 0;;) {
    var nextTab = string.indexOf("\t", i);
    if (nextTab < 0 || nextTab >= end)
      { return n + (end - i) }
    n += nextTab - i;
    n += tabSize - (n % tabSize);
    i = nextTab + 1;
  }
}

var Delayed = function() {this.id = null;};
Delayed.prototype.set = function (ms, f) {
  clearTimeout(this.id);
  this.id = setTimeout(f, ms);
};

function indexOf(array, elt) {
  for (var i = 0; i < array.length; ++i)
    { if (array[i] == elt) { return i } }
  return -1
}

// Number of pixels added to scroller and sizer to hide scrollbar
var scrollerGap = 30;

// Returned or thrown by various protocols to signal 'I'm not
// handling this'.
var Pass = {toString: function(){return "CodeMirror.Pass"}};

// Reused option objects for setSelection & friends
var sel_dontScroll = {scroll: false};
var sel_mouse = {origin: "*mouse"};
var sel_move = {origin: "+move"};

// The inverse of countColumn -- find the offset that corresponds to
// a particular column.
function findColumn(string, goal, tabSize) {
  for (var pos = 0, col = 0;;) {
    var nextTab = string.indexOf("\t", pos);
    if (nextTab == -1) { nextTab = string.length; }
    var skipped = nextTab - pos;
    if (nextTab == string.length || col + skipped >= goal)
      { return pos + Math.min(skipped, goal - col) }
    col += nextTab - pos;
    col += tabSize - (col % tabSize);
    pos = nextTab + 1;
    if (col >= goal) { return pos }
  }
}

var spaceStrs = [""];
function spaceStr(n) {
  while (spaceStrs.length <= n)
    { spaceStrs.push(lst(spaceStrs) + " "); }
  return spaceStrs[n]
}

function lst(arr) { return arr[arr.length-1] }

function map(array, f) {
  var out = [];
  for (var i = 0; i < array.length; i++) { out[i] = f(array[i], i); }
  return out
}

function insertSorted(array, value, score) {
  var pos = 0, priority = score(value);
  while (pos < array.length && score(array[pos]) <= priority) { pos++; }
  array.splice(pos, 0, value);
}

function nothing() {}

function createObj(base, props) {
  var inst;
  if (Object.create) {
    inst = Object.create(base);
  } else {
    nothing.prototype = base;
    inst = new nothing();
  }
  if (props) { copyObj(props, inst); }
  return inst
}

var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
function isWordCharBasic(ch) {
  return /\w/.test(ch) || ch > "\x80" &&
    (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch))
}
function isWordChar(ch, helper) {
  if (!helper) { return isWordCharBasic(ch) }
  if (helper.source.indexOf("\\w") > -1 && isWordCharBasic(ch)) { return true }
  return helper.test(ch)
}

function isEmpty(obj) {
  for (var n in obj) { if (obj.hasOwnProperty(n) && obj[n]) { return false } }
  return true
}

// Extending unicode characters. A series of a non-extending char +
// any number of extending chars is treated as a single unit as far
// as editing and measuring is concerned. This is not fully correct,
// since some scripts/fonts/browsers also treat other configurations
// of code points as a group.
var extendingChars = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/;
function isExtendingChar(ch) { return ch.charCodeAt(0) >= 768 && extendingChars.test(ch) }

// Returns a number from the range [`0`; `str.length`] unless `pos` is outside that range.
function skipExtendingChars(str, pos, dir) {
  while ((dir < 0 ? pos > 0 : pos < str.length) && isExtendingChar(str.charAt(pos))) { pos += dir; }
  return pos
}

// Returns the value from the range [`from`; `to`] that satisfies
// `pred` and is closest to `from`. Assumes that at least `to`
// satisfies `pred`. Supports `from` being greater than `to`.
function findFirst(pred, from, to) {
  // At any point we are certain `to` satisfies `pred`, don't know
  // whether `from` does.
  var dir = from > to ? -1 : 1;
  for (;;) {
    if (from == to) { return from }
    var midF = (from + to) / 2, mid = dir < 0 ? Math.ceil(midF) : Math.floor(midF);
    if (mid == from) { return pred(mid) ? from : to }
    if (pred(mid)) { to = mid; }
    else { from = mid + dir; }
  }
}

// The display handles the DOM integration, both for input reading
// and content drawing. It holds references to DOM nodes and
// display-related state.

function Display(place, doc, input) {
  var d = this;
  this.input = input;

  // Covers bottom-right square when both scrollbars are present.
  d.scrollbarFiller = elt("div", null, "CodeMirror-scrollbar-filler");
  d.scrollbarFiller.setAttribute("cm-not-content", "true");
  // Covers bottom of gutter when coverGutterNextToScrollbar is on
  // and h scrollbar is present.
  d.gutterFiller = elt("div", null, "CodeMirror-gutter-filler");
  d.gutterFiller.setAttribute("cm-not-content", "true");
  // Will contain the actual code, positioned to cover the viewport.
  d.lineDiv = eltP("div", null, "CodeMirror-code");
  // Elements are added to these to represent selection and cursors.
  d.selectionDiv = elt("div", null, null, "position: relative; z-index: 1");
  d.cursorDiv = elt("div", null, "CodeMirror-cursors");
  // A visibility: hidden element used to find the size of things.
  d.measure = elt("div", null, "CodeMirror-measure");
  // When lines outside of the viewport are measured, they are drawn in this.
  d.lineMeasure = elt("div", null, "CodeMirror-measure");
  // Wraps everything that needs to exist inside the vertically-padded coordinate system
  d.lineSpace = eltP("div", [d.measure, d.lineMeasure, d.selectionDiv, d.cursorDiv, d.lineDiv],
                    null, "position: relative; outline: none");
  var lines = eltP("div", [d.lineSpace], "CodeMirror-lines");
  // Moved around its parent to cover visible view.
  d.mover = elt("div", [lines], null, "position: relative");
  // Set to the height of the document, allowing scrolling.
  d.sizer = elt("div", [d.mover], "CodeMirror-sizer");
  d.sizerWidth = null;
  // Behavior of elts with overflow: auto and padding is
  // inconsistent across browsers. This is used to ensure the
  // scrollable area is big enough.
  d.heightForcer = elt("div", null, null, "position: absolute; height: " + scrollerGap + "px; width: 1px;");
  // Will contain the gutters, if any.
  d.gutters = elt("div", null, "CodeMirror-gutters");
  d.lineGutter = null;
  // Actual scrollable element.
  d.scroller = elt("div", [d.sizer, d.heightForcer, d.gutters], "CodeMirror-scroll");
  d.scroller.setAttribute("tabIndex", "-1");
  // The element in which the editor lives.
  d.wrapper = elt("div", [d.scrollbarFiller, d.gutterFiller, d.scroller], "CodeMirror");

  // Work around IE7 z-index bug (not perfect, hence IE7 not really being supported)
  if (ie && ie_version < 8) { d.gutters.style.zIndex = -1; d.scroller.style.paddingRight = 0; }
  if (!webkit && !(gecko && mobile)) { d.scroller.draggable = true; }

  if (place) {
    if (place.appendChild) { place.appendChild(d.wrapper); }
    else { place(d.wrapper); }
  }

  // Current rendered range (may be bigger than the view window).
  d.viewFrom = d.viewTo = doc.first;
  d.reportedViewFrom = d.reportedViewTo = doc.first;
  // Information about the rendered lines.
  d.view = [];
  d.renderedView = null;
  // Holds info about a single rendered line when it was rendered
  // for measurement, while not in view.
  d.externalMeasured = null;
  // Empty space (in pixels) above the view
  d.viewOffset = 0;
  d.lastWrapHeight = d.lastWrapWidth = 0;
  d.updateLineNumbers = null;

  d.nativeBarWidth = d.barHeight = d.barWidth = 0;
  d.scrollbarsClipped = false;

  // Used to only resize the line number gutter when necessary (when
  // the amount of lines crosses a boundary that makes its width change)
  d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null;
  // Set to true when a non-horizontal-scrolling line widget is
  // added. As an optimization, line widget aligning is skipped when
  // this is false.
  d.alignWidgets = false;

  d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;

  // Tracks the maximum line length so that the horizontal scrollbar
  // can be kept static when scrolling.
  d.maxLine = null;
  d.maxLineLength = 0;
  d.maxLineChanged = false;

  // Used for measuring wheel scrolling granularity
  d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null;

  // True when shift is held down.
  d.shift = false;

  // Used to track whether anything happened since the context menu
  // was opened.
  d.selForContextMenu = null;

  d.activeTouch = null;

  input.init(d);
}

// Find the line object corresponding to the given line number.
function getLine(doc, n) {
  n -= doc.first;
  if (n < 0 || n >= doc.size) { throw new Error("There is no line " + (n + doc.first) + " in the document.") }
  var chunk = doc;
  while (!chunk.lines) {
    for (var i = 0;; ++i) {
      var child = chunk.children[i], sz = child.chunkSize();
      if (n < sz) { chunk = child; break }
      n -= sz;
    }
  }
  return chunk.lines[n]
}

// Get the part of a document between two positions, as an array of
// strings.
function getBetween(doc, start, end) {
  var out = [], n = start.line;
  doc.iter(start.line, end.line + 1, function (line) {
    var text = line.text;
    if (n == end.line) { text = text.slice(0, end.ch); }
    if (n == start.line) { text = text.slice(start.ch); }
    out.push(text);
    ++n;
  });
  return out
}
// Get the lines between from and to, as array of strings.
function getLines(doc, from, to) {
  var out = [];
  doc.iter(from, to, function (line) { out.push(line.text); }); // iter aborts when callback returns truthy value
  return out
}

// Update the height of a line, propagating the height change
// upwards to parent nodes.
function updateLineHeight(line, height) {
  var diff = height - line.height;
  if (diff) { for (var n = line; n; n = n.parent) { n.height += diff; } }
}

// Given a line object, find its line number by walking up through
// its parent links.
function lineNo(line) {
  if (line.parent == null) { return null }
  var cur = line.parent, no = indexOf(cur.lines, line);
  for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
    for (var i = 0;; ++i) {
      if (chunk.children[i] == cur) { break }
      no += chunk.children[i].chunkSize();
    }
  }
  return no + cur.first
}

// Find the line at the given vertical position, using the height
// information in the document tree.
function lineAtHeight(chunk, h) {
  var n = chunk.first;
  outer: do {
    for (var i$1 = 0; i$1 < chunk.children.length; ++i$1) {
      var child = chunk.children[i$1], ch = child.height;
      if (h < ch) { chunk = child; continue outer }
      h -= ch;
      n += child.chunkSize();
    }
    return n
  } while (!chunk.lines)
  var i = 0;
  for (; i < chunk.lines.length; ++i) {
    var line = chunk.lines[i], lh = line.height;
    if (h < lh) { break }
    h -= lh;
  }
  return n + i
}

function isLine(doc, l) {return l >= doc.first && l < doc.first + doc.size}

function lineNumberFor(options, i) {
  return String(options.lineNumberFormatter(i + options.firstLineNumber))
}

// A Pos instance represents a position within the text.
function Pos(line, ch, sticky) {
  if ( sticky === void 0 ) sticky = null;

  if (!(this instanceof Pos)) { return new Pos(line, ch, sticky) }
  this.line = line;
  this.ch = ch;
  this.sticky = sticky;
}

// Compare two positions, return 0 if they are the same, a negative
// number when a is less, and a positive number otherwise.
function cmp(a, b) { return a.line - b.line || a.ch - b.ch }

function equalCursorPos(a, b) { return a.sticky == b.sticky && cmp(a, b) == 0 }

function copyPos(x) {return Pos(x.line, x.ch)}
function maxPos(a, b) { return cmp(a, b) < 0 ? b : a }
function minPos(a, b) { return cmp(a, b) < 0 ? a : b }

// Most of the external API clips given positions to make sure they
// actually exist within the document.
function clipLine(doc, n) {return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1))}
function clipPos(doc, pos) {
  if (pos.line < doc.first) { return Pos(doc.first, 0) }
  var last = doc.first + doc.size - 1;
  if (pos.line > last) { return Pos(last, getLine(doc, last).text.length) }
  return clipToLen(pos, getLine(doc, pos.line).text.length)
}
function clipToLen(pos, linelen) {
  var ch = pos.ch;
  if (ch == null || ch > linelen) { return Pos(pos.line, linelen) }
  else if (ch < 0) { return Pos(pos.line, 0) }
  else { return pos }
}
function clipPosArray(doc, array) {
  var out = [];
  for (var i = 0; i < array.length; i++) { out[i] = clipPos(doc, array[i]); }
  return out
}

// Optimize some code when these features are not used.
var sawReadOnlySpans = false;
var sawCollapsedSpans = false;

function seeReadOnlySpans() {
  sawReadOnlySpans = true;
}

function seeCollapsedSpans() {
  sawCollapsedSpans = true;
}

// TEXTMARKER SPANS

function MarkedSpan(marker, from, to) {
  this.marker = marker;
  this.from = from; this.to = to;
}

// Search an array of spans for a span matching the given marker.
function getMarkedSpanFor(spans, marker) {
  if (spans) { for (var i = 0; i < spans.length; ++i) {
    var span = spans[i];
    if (span.marker == marker) { return span }
  } }
}
// Remove a span from an array, returning undefined if no spans are
// left (we don't store arrays for lines without spans).
function removeMarkedSpan(spans, span) {
  var r;
  for (var i = 0; i < spans.length; ++i)
    { if (spans[i] != span) { (r || (r = [])).push(spans[i]); } }
  return r
}
// Add a span to a line.
function addMarkedSpan(line, span) {
  line.markedSpans = line.markedSpans ? line.markedSpans.concat([span]) : [span];
  span.marker.attachLine(line);
}

// Used for the algorithm that adjusts markers for a change in the
// document. These functions cut an array of spans at a given
// character position, returning an array of remaining chunks (or
// undefined if nothing remains).
function markedSpansBefore(old, startCh, isInsert) {
  var nw;
  if (old) { for (var i = 0; i < old.length; ++i) {
    var span = old[i], marker = span.marker;
    var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= startCh : span.from < startCh);
    if (startsBefore || span.from == startCh && marker.type == "bookmark" && (!isInsert || !span.marker.insertLeft)) {
      var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= startCh : span.to > startCh);(nw || (nw = [])).push(new MarkedSpan(marker, span.from, endsAfter ? null : span.to));
    }
  } }
  return nw
}
function markedSpansAfter(old, endCh, isInsert) {
  var nw;
  if (old) { for (var i = 0; i < old.length; ++i) {
    var span = old[i], marker = span.marker;
    var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= endCh : span.to > endCh);
    if (endsAfter || span.from == endCh && marker.type == "bookmark" && (!isInsert || span.marker.insertLeft)) {
      var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= endCh : span.from < endCh);(nw || (nw = [])).push(new MarkedSpan(marker, startsBefore ? null : span.from - endCh,
                                            span.to == null ? null : span.to - endCh));
    }
  } }
  return nw
}

// Given a change object, compute the new set of marker spans that
// cover the line in which the change took place. Removes spans
// entirely within the change, reconnects spans belonging to the
// same marker that appear on both sides of the change, and cuts off
// spans partially within the change. Returns an array of span
// arrays with one element for each line in (after) the change.
function stretchSpansOverChange(doc, change) {
  if (change.full) { return null }
  var oldFirst = isLine(doc, change.from.line) && getLine(doc, change.from.line).markedSpans;
  var oldLast = isLine(doc, change.to.line) && getLine(doc, change.to.line).markedSpans;
  if (!oldFirst && !oldLast) { return null }

  var startCh = change.from.ch, endCh = change.to.ch, isInsert = cmp(change.from, change.to) == 0;
  // Get the spans that 'stick out' on both sides
  var first = markedSpansBefore(oldFirst, startCh, isInsert);
  var last = markedSpansAfter(oldLast, endCh, isInsert);

  // Next, merge those two ends
  var sameLine = change.text.length == 1, offset = lst(change.text).length + (sameLine ? startCh : 0);
  if (first) {
    // Fix up .to properties of first
    for (var i = 0; i < first.length; ++i) {
      var span = first[i];
      if (span.to == null) {
        var found = getMarkedSpanFor(last, span.marker);
        if (!found) { span.to = startCh; }
        else if (sameLine) { span.to = found.to == null ? null : found.to + offset; }
      }
    }
  }
  if (last) {
    // Fix up .from in last (or move them into first in case of sameLine)
    for (var i$1 = 0; i$1 < last.length; ++i$1) {
      var span$1 = last[i$1];
      if (span$1.to != null) { span$1.to += offset; }
      if (span$1.from == null) {
        var found$1 = getMarkedSpanFor(first, span$1.marker);
        if (!found$1) {
          span$1.from = offset;
          if (sameLine) { (first || (first = [])).push(span$1); }
        }
      } else {
        span$1.from += offset;
        if (sameLine) { (first || (first = [])).push(span$1); }
      }
    }
  }
  // Make sure we didn't create any zero-length spans
  if (first) { first = clearEmptySpans(first); }
  if (last && last != first) { last = clearEmptySpans(last); }

  var newMarkers = [first];
  if (!sameLine) {
    // Fill gap with whole-line-spans
    var gap = change.text.length - 2, gapMarkers;
    if (gap > 0 && first)
      { for (var i$2 = 0; i$2 < first.length; ++i$2)
        { if (first[i$2].to == null)
          { (gapMarkers || (gapMarkers = [])).push(new MarkedSpan(first[i$2].marker, null, null)); } } }
    for (var i$3 = 0; i$3 < gap; ++i$3)
      { newMarkers.push(gapMarkers); }
    newMarkers.push(last);
  }
  return newMarkers
}

// Remove spans that are empty and don't have a clearWhenEmpty
// option of false.
function clearEmptySpans(spans) {
  for (var i = 0; i < spans.length; ++i) {
    var span = spans[i];
    if (span.from != null && span.from == span.to && span.marker.clearWhenEmpty !== false)
      { spans.splice(i--, 1); }
  }
  if (!spans.length) { return null }
  return spans
}

// Used to 'clip' out readOnly ranges when making a change.
function removeReadOnlyRanges(doc, from, to) {
  var markers = null;
  doc.iter(from.line, to.line + 1, function (line) {
    if (line.markedSpans) { for (var i = 0; i < line.markedSpans.length; ++i) {
      var mark = line.markedSpans[i].marker;
      if (mark.readOnly && (!markers || indexOf(markers, mark) == -1))
        { (markers || (markers = [])).push(mark); }
    } }
  });
  if (!markers) { return null }
  var parts = [{from: from, to: to}];
  for (var i = 0; i < markers.length; ++i) {
    var mk = markers[i], m = mk.find(0);
    for (var j = 0; j < parts.length; ++j) {
      var p = parts[j];
      if (cmp(p.to, m.from) < 0 || cmp(p.from, m.to) > 0) { continue }
      var newParts = [j, 1], dfrom = cmp(p.from, m.from), dto = cmp(p.to, m.to);
      if (dfrom < 0 || !mk.inclusiveLeft && !dfrom)
        { newParts.push({from: p.from, to: m.from}); }
      if (dto > 0 || !mk.inclusiveRight && !dto)
        { newParts.push({from: m.to, to: p.to}); }
      parts.splice.apply(parts, newParts);
      j += newParts.length - 3;
    }
  }
  return parts
}

// Connect or disconnect spans from a line.
function detachMarkedSpans(line) {
  var spans = line.markedSpans;
  if (!spans) { return }
  for (var i = 0; i < spans.length; ++i)
    { spans[i].marker.detachLine(line); }
  line.markedSpans = null;
}
function attachMarkedSpans(line, spans) {
  if (!spans) { return }
  for (var i = 0; i < spans.length; ++i)
    { spans[i].marker.attachLine(line); }
  line.markedSpans = spans;
}

// Helpers used when computing which overlapping collapsed span
// counts as the larger one.
function extraLeft(marker) { return marker.inclusiveLeft ? -1 : 0 }
function extraRight(marker) { return marker.inclusiveRight ? 1 : 0 }

// Returns a number indicating which of two overlapping collapsed
// spans is larger (and thus includes the other). Falls back to
// comparing ids when the spans cover exactly the same range.
function compareCollapsedMarkers(a, b) {
  var lenDiff = a.lines.length - b.lines.length;
  if (lenDiff != 0) { return lenDiff }
  var aPos = a.find(), bPos = b.find();
  var fromCmp = cmp(aPos.from, bPos.from) || extraLeft(a) - extraLeft(b);
  if (fromCmp) { return -fromCmp }
  var toCmp = cmp(aPos.to, bPos.to) || extraRight(a) - extraRight(b);
  if (toCmp) { return toCmp }
  return b.id - a.id
}

// Find out whether a line ends or starts in a collapsed span. If
// so, return the marker for that span.
function collapsedSpanAtSide(line, start) {
  var sps = sawCollapsedSpans && line.markedSpans, found;
  if (sps) { for (var sp = (void 0), i = 0; i < sps.length; ++i) {
    sp = sps[i];
    if (sp.marker.collapsed && (start ? sp.from : sp.to) == null &&
        (!found || compareCollapsedMarkers(found, sp.marker) < 0))
      { found = sp.marker; }
  } }
  return found
}
function collapsedSpanAtStart(line) { return collapsedSpanAtSide(line, true) }
function collapsedSpanAtEnd(line) { return collapsedSpanAtSide(line, false) }

// Test whether there exists a collapsed span that partially
// overlaps (covers the start or end, but not both) of a new span.
// Such overlap is not allowed.
function conflictingCollapsedRange(doc, lineNo$$1, from, to, marker) {
  var line = getLine(doc, lineNo$$1);
  var sps = sawCollapsedSpans && line.markedSpans;
  if (sps) { for (var i = 0; i < sps.length; ++i) {
    var sp = sps[i];
    if (!sp.marker.collapsed) { continue }
    var found = sp.marker.find(0);
    var fromCmp = cmp(found.from, from) || extraLeft(sp.marker) - extraLeft(marker);
    var toCmp = cmp(found.to, to) || extraRight(sp.marker) - extraRight(marker);
    if (fromCmp >= 0 && toCmp <= 0 || fromCmp <= 0 && toCmp >= 0) { continue }
    if (fromCmp <= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.to, from) >= 0 : cmp(found.to, from) > 0) ||
        fromCmp >= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.from, to) <= 0 : cmp(found.from, to) < 0))
      { return true }
  } }
}

// A visual line is a line as drawn on the screen. Folding, for
// example, can cause multiple logical lines to appear on the same
// visual line. This finds the start of the visual line that the
// given line is part of (usually that is the line itself).
function visualLine(line) {
  var merged;
  while (merged = collapsedSpanAtStart(line))
    { line = merged.find(-1, true).line; }
  return line
}

function visualLineEnd(line) {
  var merged;
  while (merged = collapsedSpanAtEnd(line))
    { line = merged.find(1, true).line; }
  return line
}

// Returns an array of logical lines that continue the visual line
// started by the argument, or undefined if there are no such lines.
function visualLineContinued(line) {
  var merged, lines;
  while (merged = collapsedSpanAtEnd(line)) {
    line = merged.find(1, true).line
    ;(lines || (lines = [])).push(line);
  }
  return lines
}

// Get the line number of the start of the visual line that the
// given line number is part of.
function visualLineNo(doc, lineN) {
  var line = getLine(doc, lineN), vis = visualLine(line);
  if (line == vis) { return lineN }
  return lineNo(vis)
}

// Get the line number of the start of the next visual line after
// the given line.
function visualLineEndNo(doc, lineN) {
  if (lineN > doc.lastLine()) { return lineN }
  var line = getLine(doc, lineN), merged;
  if (!lineIsHidden(doc, line)) { return lineN }
  while (merged = collapsedSpanAtEnd(line))
    { line = merged.find(1, true).line; }
  return lineNo(line) + 1
}

// Compute whether a line is hidden. Lines count as hidden when they
// are part of a visual line that starts with another line, or when
// they are entirely covered by collapsed, non-widget span.
function lineIsHidden(doc, line) {
  var sps = sawCollapsedSpans && line.markedSpans;
  if (sps) { for (var sp = (void 0), i = 0; i < sps.length; ++i) {
    sp = sps[i];
    if (!sp.marker.collapsed) { continue }
    if (sp.from == null) { return true }
    if (sp.marker.widgetNode) { continue }
    if (sp.from == 0 && sp.marker.inclusiveLeft && lineIsHiddenInner(doc, line, sp))
      { return true }
  } }
}
function lineIsHiddenInner(doc, line, span) {
  if (span.to == null) {
    var end = span.marker.find(1, true);
    return lineIsHiddenInner(doc, end.line, getMarkedSpanFor(end.line.markedSpans, span.marker))
  }
  if (span.marker.inclusiveRight && span.to == line.text.length)
    { return true }
  for (var sp = (void 0), i = 0; i < line.markedSpans.length; ++i) {
    sp = line.markedSpans[i];
    if (sp.marker.collapsed && !sp.marker.widgetNode && sp.from == span.to &&
        (sp.to == null || sp.to != span.from) &&
        (sp.marker.inclusiveLeft || span.marker.inclusiveRight) &&
        lineIsHiddenInner(doc, line, sp)) { return true }
  }
}

// Find the height above the given line.
function heightAtLine(lineObj) {
  lineObj = visualLine(lineObj);

  var h = 0, chunk = lineObj.parent;
  for (var i = 0; i < chunk.lines.length; ++i) {
    var line = chunk.lines[i];
    if (line == lineObj) { break }
    else { h += line.height; }
  }
  for (var p = chunk.parent; p; chunk = p, p = chunk.parent) {
    for (var i$1 = 0; i$1 < p.children.length; ++i$1) {
      var cur = p.children[i$1];
      if (cur == chunk) { break }
      else { h += cur.height; }
    }
  }
  return h
}

// Compute the character length of a line, taking into account
// collapsed ranges (see markText) that might hide parts, and join
// other lines onto it.
function lineLength(line) {
  if (line.height == 0) { return 0 }
  var len = line.text.length, merged, cur = line;
  while (merged = collapsedSpanAtStart(cur)) {
    var found = merged.find(0, true);
    cur = found.from.line;
    len += found.from.ch - found.to.ch;
  }
  cur = line;
  while (merged = collapsedSpanAtEnd(cur)) {
    var found$1 = merged.find(0, true);
    len -= cur.text.length - found$1.from.ch;
    cur = found$1.to.line;
    len += cur.text.length - found$1.to.ch;
  }
  return len
}

// Find the longest line in the document.
function findMaxLine(cm) {
  var d = cm.display, doc = cm.doc;
  d.maxLine = getLine(doc, doc.first);
  d.maxLineLength = lineLength(d.maxLine);
  d.maxLineChanged = true;
  doc.iter(function (line) {
    var len = lineLength(line);
    if (len > d.maxLineLength) {
      d.maxLineLength = len;
      d.maxLine = line;
    }
  });
}

// BIDI HELPERS

function iterateBidiSections(order, from, to, f) {
  if (!order) { return f(from, to, "ltr", 0) }
  var found = false;
  for (var i = 0; i < order.length; ++i) {
    var part = order[i];
    if (part.from < to && part.to > from || from == to && part.to == from) {
      f(Math.max(part.from, from), Math.min(part.to, to), part.level == 1 ? "rtl" : "ltr", i);
      found = true;
    }
  }
  if (!found) { f(from, to, "ltr"); }
}

var bidiOther = null;
function getBidiPartAt(order, ch, sticky) {
  var found;
  bidiOther = null;
  for (var i = 0; i < order.length; ++i) {
    var cur = order[i];
    if (cur.from < ch && cur.to > ch) { return i }
    if (cur.to == ch) {
      if (cur.from != cur.to && sticky == "before") { found = i; }
      else { bidiOther = i; }
    }
    if (cur.from == ch) {
      if (cur.from != cur.to && sticky != "before") { found = i; }
      else { bidiOther = i; }
    }
  }
  return found != null ? found : bidiOther
}

// Bidirectional ordering algorithm
// See http://unicode.org/reports/tr9/tr9-13.html for the algorithm
// that this (partially) implements.

// One-char codes used for character types:
// L (L):   Left-to-Right
// R (R):   Right-to-Left
// r (AL):  Right-to-Left Arabic
// 1 (EN):  European Number
// + (ES):  European Number Separator
// % (ET):  European Number Terminator
// n (AN):  Arabic Number
// , (CS):  Common Number Separator
// m (NSM): Non-Spacing Mark
// b (BN):  Boundary Neutral
// s (B):   Paragraph Separator
// t (S):   Segment Separator
// w (WS):  Whitespace
// N (ON):  Other Neutrals

// Returns null if characters are ordered as they appear
// (left-to-right), or an array of sections ({from, to, level}
// objects) in the order in which they occur visually.
var bidiOrdering = (function() {
  // Character types for codepoints 0 to 0xff
  var lowTypes = "bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLN";
  // Character types for codepoints 0x600 to 0x6f9
  var arabicTypes = "nnnnnnNNr%%r,rNNmmmmmmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmmmnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmnNmmmmmmrrmmNmmmmrr1111111111";
  function charType(code) {
    if (code <= 0xf7) { return lowTypes.charAt(code) }
    else if (0x590 <= code && code <= 0x5f4) { return "R" }
    else if (0x600 <= code && code <= 0x6f9) { return arabicTypes.charAt(code - 0x600) }
    else if (0x6ee <= code && code <= 0x8ac) { return "r" }
    else if (0x2000 <= code && code <= 0x200b) { return "w" }
    else if (code == 0x200c) { return "b" }
    else { return "L" }
  }

  var bidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
  var isNeutral = /[stwN]/, isStrong = /[LRr]/, countsAsLeft = /[Lb1n]/, countsAsNum = /[1n]/;

  function BidiSpan(level, from, to) {
    this.level = level;
    this.from = from; this.to = to;
  }

  return function(str, direction) {
    var outerType = direction == "ltr" ? "L" : "R";

    if (str.length == 0 || direction == "ltr" && !bidiRE.test(str)) { return false }
    var len = str.length, types = [];
    for (var i = 0; i < len; ++i)
      { types.push(charType(str.charCodeAt(i))); }

    // W1. Examine each non-spacing mark (NSM) in the level run, and
    // change the type of the NSM to the type of the previous
    // character. If the NSM is at the start of the level run, it will
    // get the type of sor.
    for (var i$1 = 0, prev = outerType; i$1 < len; ++i$1) {
      var type = types[i$1];
      if (type == "m") { types[i$1] = prev; }
      else { prev = type; }
    }

    // W2. Search backwards from each instance of a European number
    // until the first strong type (R, L, AL, or sor) is found. If an
    // AL is found, change the type of the European number to Arabic
    // number.
    // W3. Change all ALs to R.
    for (var i$2 = 0, cur = outerType; i$2 < len; ++i$2) {
      var type$1 = types[i$2];
      if (type$1 == "1" && cur == "r") { types[i$2] = "n"; }
      else if (isStrong.test(type$1)) { cur = type$1; if (type$1 == "r") { types[i$2] = "R"; } }
    }

    // W4. A single European separator between two European numbers
    // changes to a European number. A single common separator between
    // two numbers of the same type changes to that type.
    for (var i$3 = 1, prev$1 = types[0]; i$3 < len - 1; ++i$3) {
      var type$2 = types[i$3];
      if (type$2 == "+" && prev$1 == "1" && types[i$3+1] == "1") { types[i$3] = "1"; }
      else if (type$2 == "," && prev$1 == types[i$3+1] &&
               (prev$1 == "1" || prev$1 == "n")) { types[i$3] = prev$1; }
      prev$1 = type$2;
    }

    // W5. A sequence of European terminators adjacent to European
    // numbers changes to all European numbers.
    // W6. Otherwise, separators and terminators change to Other
    // Neutral.
    for (var i$4 = 0; i$4 < len; ++i$4) {
      var type$3 = types[i$4];
      if (type$3 == ",") { types[i$4] = "N"; }
      else if (type$3 == "%") {
        var end = (void 0);
        for (end = i$4 + 1; end < len && types[end] == "%"; ++end) {}
        var replace = (i$4 && types[i$4-1] == "!") || (end < len && types[end] == "1") ? "1" : "N";
        for (var j = i$4; j < end; ++j) { types[j] = replace; }
        i$4 = end - 1;
      }
    }

    // W7. Search backwards from each instance of a European number
    // until the first strong type (R, L, or sor) is found. If an L is
    // found, then change the type of the European number to L.
    for (var i$5 = 0, cur$1 = outerType; i$5 < len; ++i$5) {
      var type$4 = types[i$5];
      if (cur$1 == "L" && type$4 == "1") { types[i$5] = "L"; }
      else if (isStrong.test(type$4)) { cur$1 = type$4; }
    }

    // N1. A sequence of neutrals takes the direction of the
    // surrounding strong text if the text on both sides has the same
    // direction. European and Arabic numbers act as if they were R in
    // terms of their influence on neutrals. Start-of-level-run (sor)
    // and end-of-level-run (eor) are used at level run boundaries.
    // N2. Any remaining neutrals take the embedding direction.
    for (var i$6 = 0; i$6 < len; ++i$6) {
      if (isNeutral.test(types[i$6])) {
        var end$1 = (void 0);
        for (end$1 = i$6 + 1; end$1 < len && isNeutral.test(types[end$1]); ++end$1) {}
        var before = (i$6 ? types[i$6-1] : outerType) == "L";
        var after = (end$1 < len ? types[end$1] : outerType) == "L";
        var replace$1 = before == after ? (before ? "L" : "R") : outerType;
        for (var j$1 = i$6; j$1 < end$1; ++j$1) { types[j$1] = replace$1; }
        i$6 = end$1 - 1;
      }
    }

    // Here we depart from the documented algorithm, in order to avoid
    // building up an actual levels array. Since there are only three
    // levels (0, 1, 2) in an implementation that doesn't take
    // explicit embedding into account, we can build up the order on
    // the fly, without following the level-based algorithm.
    var order = [], m;
    for (var i$7 = 0; i$7 < len;) {
      if (countsAsLeft.test(types[i$7])) {
        var start = i$7;
        for (++i$7; i$7 < len && countsAsLeft.test(types[i$7]); ++i$7) {}
        order.push(new BidiSpan(0, start, i$7));
      } else {
        var pos = i$7, at = order.length;
        for (++i$7; i$7 < len && types[i$7] != "L"; ++i$7) {}
        for (var j$2 = pos; j$2 < i$7;) {
          if (countsAsNum.test(types[j$2])) {
            if (pos < j$2) { order.splice(at, 0, new BidiSpan(1, pos, j$2)); }
            var nstart = j$2;
            for (++j$2; j$2 < i$7 && countsAsNum.test(types[j$2]); ++j$2) {}
            order.splice(at, 0, new BidiSpan(2, nstart, j$2));
            pos = j$2;
          } else { ++j$2; }
        }
        if (pos < i$7) { order.splice(at, 0, new BidiSpan(1, pos, i$7)); }
      }
    }
    if (direction == "ltr") {
      if (order[0].level == 1 && (m = str.match(/^\s+/))) {
        order[0].from = m[0].length;
        order.unshift(new BidiSpan(0, 0, m[0].length));
      }
      if (lst(order).level == 1 && (m = str.match(/\s+$/))) {
        lst(order).to -= m[0].length;
        order.push(new BidiSpan(0, len - m[0].length, len));
      }
    }

    return direction == "rtl" ? order.reverse() : order
  }
})();

// Get the bidi ordering for the given line (and cache it). Returns
// false for lines that are fully left-to-right, and an array of
// BidiSpan objects otherwise.
function getOrder(line, direction) {
  var order = line.order;
  if (order == null) { order = line.order = bidiOrdering(line.text, direction); }
  return order
}

// EVENT HANDLING

// Lightweight event framework. on/off also work on DOM nodes,
// registering native DOM handlers.

var noHandlers = [];

var on = function(emitter, type, f) {
  if (emitter.addEventListener) {
    emitter.addEventListener(type, f, false);
  } else if (emitter.attachEvent) {
    emitter.attachEvent("on" + type, f);
  } else {
    var map$$1 = emitter._handlers || (emitter._handlers = {});
    map$$1[type] = (map$$1[type] || noHandlers).concat(f);
  }
};

function getHandlers(emitter, type) {
  return emitter._handlers && emitter._handlers[type] || noHandlers
}

function off(emitter, type, f) {
  if (emitter.removeEventListener) {
    emitter.removeEventListener(type, f, false);
  } else if (emitter.detachEvent) {
    emitter.detachEvent("on" + type, f);
  } else {
    var map$$1 = emitter._handlers, arr = map$$1 && map$$1[type];
    if (arr) {
      var index = indexOf(arr, f);
      if (index > -1)
        { map$$1[type] = arr.slice(0, index).concat(arr.slice(index + 1)); }
    }
  }
}

function signal(emitter, type /*, values...*/) {
  var handlers = getHandlers(emitter, type);
  if (!handlers.length) { return }
  var args = Array.prototype.slice.call(arguments, 2);
  for (var i = 0; i < handlers.length; ++i) { handlers[i].apply(null, args); }
}

// The DOM events that CodeMirror handles can be overridden by
// registering a (non-DOM) handler on the editor for the event name,
// and preventDefault-ing the event in that handler.
function signalDOMEvent(cm, e, override) {
  if (typeof e == "string")
    { e = {type: e, preventDefault: function() { this.defaultPrevented = true; }}; }
  signal(cm, override || e.type, cm, e);
  return e_defaultPrevented(e) || e.codemirrorIgnore
}

function signalCursorActivity(cm) {
  var arr = cm._handlers && cm._handlers.cursorActivity;
  if (!arr) { return }
  var set = cm.curOp.cursorActivityHandlers || (cm.curOp.cursorActivityHandlers = []);
  for (var i = 0; i < arr.length; ++i) { if (indexOf(set, arr[i]) == -1)
    { set.push(arr[i]); } }
}

function hasHandler(emitter, type) {
  return getHandlers(emitter, type).length > 0
}

// Add on and off methods to a constructor's prototype, to make
// registering events on such objects more convenient.
function eventMixin(ctor) {
  ctor.prototype.on = function(type, f) {on(this, type, f);};
  ctor.prototype.off = function(type, f) {off(this, type, f);};
}

// Due to the fact that we still support jurassic IE versions, some
// compatibility wrappers are needed.

function e_preventDefault(e) {
  if (e.preventDefault) { e.preventDefault(); }
  else { e.returnValue = false; }
}
function e_stopPropagation(e) {
  if (e.stopPropagation) { e.stopPropagation(); }
  else { e.cancelBubble = true; }
}
function e_defaultPrevented(e) {
  return e.defaultPrevented != null ? e.defaultPrevented : e.returnValue == false
}
function e_stop(e) {e_preventDefault(e); e_stopPropagation(e);}

function e_target(e) {return e.target || e.srcElement}
function e_button(e) {
  var b = e.which;
  if (b == null) {
    if (e.button & 1) { b = 1; }
    else if (e.button & 2) { b = 3; }
    else if (e.button & 4) { b = 2; }
  }
  if (mac && e.ctrlKey && b == 1) { b = 3; }
  return b
}

// Detect drag-and-drop
var dragAndDrop = function() {
  // There is *some* kind of drag-and-drop support in IE6-8, but I
  // couldn't get it to work yet.
  if (ie && ie_version < 9) { return false }
  var div = elt('div');
  return "draggable" in div || "dragDrop" in div
}();

var zwspSupported;
function zeroWidthElement(measure) {
  if (zwspSupported == null) {
    var test = elt("span", "\u200b");
    removeChildrenAndAdd(measure, elt("span", [test, document.createTextNode("x")]));
    if (measure.firstChild.offsetHeight != 0)
      { zwspSupported = test.offsetWidth <= 1 && test.offsetHeight > 2 && !(ie && ie_version < 8); }
  }
  var node = zwspSupported ? elt("span", "\u200b") :
    elt("span", "\u00a0", null, "display: inline-block; width: 1px; margin-right: -1px");
  node.setAttribute("cm-text", "");
  return node
}

// Feature-detect IE's crummy client rect reporting for bidi text
var badBidiRects;
function hasBadBidiRects(measure) {
  if (badBidiRects != null) { return badBidiRects }
  var txt = removeChildrenAndAdd(measure, document.createTextNode("A\u062eA"));
  var r0 = range(txt, 0, 1).getBoundingClientRect();
  var r1 = range(txt, 1, 2).getBoundingClientRect();
  removeChildren(measure);
  if (!r0 || r0.left == r0.right) { return false } // Safari returns null in some cases (#2780)
  return badBidiRects = (r1.right - r0.right < 3)
}

// See if "".split is the broken IE version, if so, provide an
// alternative way to split lines.
var splitLinesAuto = "\n\nb".split(/\n/).length != 3 ? function (string) {
  var pos = 0, result = [], l = string.length;
  while (pos <= l) {
    var nl = string.indexOf("\n", pos);
    if (nl == -1) { nl = string.length; }
    var line = string.slice(pos, string.charAt(nl - 1) == "\r" ? nl - 1 : nl);
    var rt = line.indexOf("\r");
    if (rt != -1) {
      result.push(line.slice(0, rt));
      pos += rt + 1;
    } else {
      result.push(line);
      pos = nl + 1;
    }
  }
  return result
} : function (string) { return string.split(/\r\n?|\n/); };

var hasSelection = window.getSelection ? function (te) {
  try { return te.selectionStart != te.selectionEnd }
  catch(e) { return false }
} : function (te) {
  var range$$1;
  try {range$$1 = te.ownerDocument.selection.createRange();}
  catch(e) {}
  if (!range$$1 || range$$1.parentElement() != te) { return false }
  return range$$1.compareEndPoints("StartToEnd", range$$1) != 0
};

var hasCopyEvent = (function () {
  var e = elt("div");
  if ("oncopy" in e) { return true }
  e.setAttribute("oncopy", "return;");
  return typeof e.oncopy == "function"
})();

var badZoomedRects = null;
function hasBadZoomedRects(measure) {
  if (badZoomedRects != null) { return badZoomedRects }
  var node = removeChildrenAndAdd(measure, elt("span", "x"));
  var normal = node.getBoundingClientRect();
  var fromRange = range(node, 0, 1).getBoundingClientRect();
  return badZoomedRects = Math.abs(normal.left - fromRange.left) > 1
}

// Known modes, by name and by MIME
var modes = {};
var mimeModes = {};

// Extra arguments are stored as the mode's dependencies, which is
// used by (legacy) mechanisms like loadmode.js to automatically
// load a mode. (Preferred mechanism is the require/define calls.)
function defineMode(name, mode) {
  if (arguments.length > 2)
    { mode.dependencies = Array.prototype.slice.call(arguments, 2); }
  modes[name] = mode;
}

function defineMIME(mime, spec) {
  mimeModes[mime] = spec;
}

// Given a MIME type, a {name, ...options} config object, or a name
// string, return a mode config object.
function resolveMode(spec) {
  if (typeof spec == "string" && mimeModes.hasOwnProperty(spec)) {
    spec = mimeModes[spec];
  } else if (spec && typeof spec.name == "string" && mimeModes.hasOwnProperty(spec.name)) {
    var found = mimeModes[spec.name];
    if (typeof found == "string") { found = {name: found}; }
    spec = createObj(found, spec);
    spec.name = found.name;
  } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec)) {
    return resolveMode("application/xml")
  } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+json$/.test(spec)) {
    return resolveMode("application/json")
  }
  if (typeof spec == "string") { return {name: spec} }
  else { return spec || {name: "null"} }
}

// Given a mode spec (anything that resolveMode accepts), find and
// initialize an actual mode object.
function getMode(options, spec) {
  spec = resolveMode(spec);
  var mfactory = modes[spec.name];
  if (!mfactory) { return getMode(options, "text/plain") }
  var modeObj = mfactory(options, spec);
  if (modeExtensions.hasOwnProperty(spec.name)) {
    var exts = modeExtensions[spec.name];
    for (var prop in exts) {
      if (!exts.hasOwnProperty(prop)) { continue }
      if (modeObj.hasOwnProperty(prop)) { modeObj["_" + prop] = modeObj[prop]; }
      modeObj[prop] = exts[prop];
    }
  }
  modeObj.name = spec.name;
  if (spec.helperType) { modeObj.helperType = spec.helperType; }
  if (spec.modeProps) { for (var prop$1 in spec.modeProps)
    { modeObj[prop$1] = spec.modeProps[prop$1]; } }

  return modeObj
}

// This can be used to attach properties to mode objects from
// outside the actual mode definition.
var modeExtensions = {};
function extendMode(mode, properties) {
  var exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : (modeExtensions[mode] = {});
  copyObj(properties, exts);
}

function copyState(mode, state) {
  if (state === true) { return state }
  if (mode.copyState) { return mode.copyState(state) }
  var nstate = {};
  for (var n in state) {
    var val = state[n];
    if (val instanceof Array) { val = val.concat([]); }
    nstate[n] = val;
  }
  return nstate
}

// Given a mode and a state (for that mode), find the inner mode and
// state at the position that the state refers to.
function innerMode(mode, state) {
  var info;
  while (mode.innerMode) {
    info = mode.innerMode(state);
    if (!info || info.mode == mode) { break }
    state = info.state;
    mode = info.mode;
  }
  return info || {mode: mode, state: state}
}

function startState(mode, a1, a2) {
  return mode.startState ? mode.startState(a1, a2) : true
}

// STRING STREAM

// Fed to the mode parsers, provides helper functions to make
// parsers more succinct.

var StringStream = function(string, tabSize, lineOracle) {
  this.pos = this.start = 0;
  this.string = string;
  this.tabSize = tabSize || 8;
  this.lastColumnPos = this.lastColumnValue = 0;
  this.lineStart = 0;
  this.lineOracle = lineOracle;
};

StringStream.prototype.eol = function () {return this.pos >= this.string.length};
StringStream.prototype.sol = function () {return this.pos == this.lineStart};
StringStream.prototype.peek = function () {return this.string.charAt(this.pos) || undefined};
StringStream.prototype.next = function () {
  if (this.pos < this.string.length)
    { return this.string.charAt(this.pos++) }
};
StringStream.prototype.eat = function (match) {
  var ch = this.string.charAt(this.pos);
  var ok;
  if (typeof match == "string") { ok = ch == match; }
  else { ok = ch && (match.test ? match.test(ch) : match(ch)); }
  if (ok) {++this.pos; return ch}
};
StringStream.prototype.eatWhile = function (match) {
  var start = this.pos;
  while (this.eat(match)){}
  return this.pos > start
};
StringStream.prototype.eatSpace = function () {
    var this$1 = this;

  var start = this.pos;
  while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) { ++this$1.pos; }
  return this.pos > start
};
StringStream.prototype.skipToEnd = function () {this.pos = this.string.length;};
StringStream.prototype.skipTo = function (ch) {
  var found = this.string.indexOf(ch, this.pos);
  if (found > -1) {this.pos = found; return true}
};
StringStream.prototype.backUp = function (n) {this.pos -= n;};
StringStream.prototype.column = function () {
  if (this.lastColumnPos < this.start) {
    this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
    this.lastColumnPos = this.start;
  }
  return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0)
};
StringStream.prototype.indentation = function () {
  return countColumn(this.string, null, this.tabSize) -
    (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0)
};
StringStream.prototype.match = function (pattern, consume, caseInsensitive) {
  if (typeof pattern == "string") {
    var cased = function (str) { return caseInsensitive ? str.toLowerCase() : str; };
    var substr = this.string.substr(this.pos, pattern.length);
    if (cased(substr) == cased(pattern)) {
      if (consume !== false) { this.pos += pattern.length; }
      return true
    }
  } else {
    var match = this.string.slice(this.pos).match(pattern);
    if (match && match.index > 0) { return null }
    if (match && consume !== false) { this.pos += match[0].length; }
    return match
  }
};
StringStream.prototype.current = function (){return this.string.slice(this.start, this.pos)};
StringStream.prototype.hideFirstChars = function (n, inner) {
  this.lineStart += n;
  try { return inner() }
  finally { this.lineStart -= n; }
};
StringStream.prototype.lookAhead = function (n) {
  var oracle = this.lineOracle;
  return oracle && oracle.lookAhead(n)
};
StringStream.prototype.baseToken = function () {
  var oracle = this.lineOracle;
  return oracle && oracle.baseToken(this.pos)
};

var SavedContext = function(state, lookAhead) {
  this.state = state;
  this.lookAhead = lookAhead;
};

var Context = function(doc, state, line, lookAhead) {
  this.state = state;
  this.doc = doc;
  this.line = line;
  this.maxLookAhead = lookAhead || 0;
  this.baseTokens = null;
  this.baseTokenPos = 1;
};

Context.prototype.lookAhead = function (n) {
  var line = this.doc.getLine(this.line + n);
  if (line != null && n > this.maxLookAhead) { this.maxLookAhead = n; }
  return line
};

Context.prototype.baseToken = function (n) {
    var this$1 = this;

  if (!this.baseTokens) { return null }
  while (this.baseTokens[this.baseTokenPos] <= n)
    { this$1.baseTokenPos += 2; }
  var type = this.baseTokens[this.baseTokenPos + 1];
  return {type: type && type.replace(/( |^)overlay .*/, ""),
          size: this.baseTokens[this.baseTokenPos] - n}
};

Context.prototype.nextLine = function () {
  this.line++;
  if (this.maxLookAhead > 0) { this.maxLookAhead--; }
};

Context.fromSaved = function (doc, saved, line) {
  if (saved instanceof SavedContext)
    { return new Context(doc, copyState(doc.mode, saved.state), line, saved.lookAhead) }
  else
    { return new Context(doc, copyState(doc.mode, saved), line) }
};

Context.prototype.save = function (copy) {
  var state = copy !== false ? copyState(this.doc.mode, this.state) : this.state;
  return this.maxLookAhead > 0 ? new SavedContext(state, this.maxLookAhead) : state
};


// Compute a style array (an array starting with a mode generation
// -- for invalidation -- followed by pairs of end positions and
// style strings), which is used to highlight the tokens on the
// line.
function highlightLine(cm, line, context, forceToEnd) {
  // A styles array always starts with a number identifying the
  // mode/overlays that it is based on (for easy invalidation).
  var st = [cm.state.modeGen], lineClasses = {};
  // Compute the base array of styles
  runMode(cm, line.text, cm.doc.mode, context, function (end, style) { return st.push(end, style); },
          lineClasses, forceToEnd);
  var state = context.state;

  // Run overlays, adjust style array.
  var loop = function ( o ) {
    context.baseTokens = st;
    var overlay = cm.state.overlays[o], i = 1, at = 0;
    context.state = true;
    runMode(cm, line.text, overlay.mode, context, function (end, style) {
      var start = i;
      // Ensure there's a token end at the current position, and that i points at it
      while (at < end) {
        var i_end = st[i];
        if (i_end > end)
          { st.splice(i, 1, end, st[i+1], i_end); }
        i += 2;
        at = Math.min(end, i_end);
      }
      if (!style) { return }
      if (overlay.opaque) {
        st.splice(start, i - start, end, "overlay " + style);
        i = start + 2;
      } else {
        for (; start < i; start += 2) {
          var cur = st[start+1];
          st[start+1] = (cur ? cur + " " : "") + "overlay " + style;
        }
      }
    }, lineClasses);
    context.state = state;
    context.baseTokens = null;
    context.baseTokenPos = 1;
  };

  for (var o = 0; o < cm.state.overlays.length; ++o) loop( o );

  return {styles: st, classes: lineClasses.bgClass || lineClasses.textClass ? lineClasses : null}
}

function getLineStyles(cm, line, updateFrontier) {
  if (!line.styles || line.styles[0] != cm.state.modeGen) {
    var context = getContextBefore(cm, lineNo(line));
    var resetState = line.text.length > cm.options.maxHighlightLength && copyState(cm.doc.mode, context.state);
    var result = highlightLine(cm, line, context);
    if (resetState) { context.state = resetState; }
    line.stateAfter = context.save(!resetState);
    line.styles = result.styles;
    if (result.classes) { line.styleClasses = result.classes; }
    else if (line.styleClasses) { line.styleClasses = null; }
    if (updateFrontier === cm.doc.highlightFrontier)
      { cm.doc.modeFrontier = Math.max(cm.doc.modeFrontier, ++cm.doc.highlightFrontier); }
  }
  return line.styles
}

function getContextBefore(cm, n, precise) {
  var doc = cm.doc, display = cm.display;
  if (!doc.mode.startState) { return new Context(doc, true, n) }
  var start = findStartLine(cm, n, precise);
  var saved = start > doc.first && getLine(doc, start - 1).stateAfter;
  var context = saved ? Context.fromSaved(doc, saved, start) : new Context(doc, startState(doc.mode), start);

  doc.iter(start, n, function (line) {
    processLine(cm, line.text, context);
    var pos = context.line;
    line.stateAfter = pos == n - 1 || pos % 5 == 0 || pos >= display.viewFrom && pos < display.viewTo ? context.save() : null;
    context.nextLine();
  });
  if (precise) { doc.modeFrontier = context.line; }
  return context
}

// Lightweight form of highlight -- proceed over this line and
// update state, but don't save a style array. Used for lines that
// aren't currently visible.
function processLine(cm, text, context, startAt) {
  var mode = cm.doc.mode;
  var stream = new StringStream(text, cm.options.tabSize, context);
  stream.start = stream.pos = startAt || 0;
  if (text == "") { callBlankLine(mode, context.state); }
  while (!stream.eol()) {
    readToken(mode, stream, context.state);
    stream.start = stream.pos;
  }
}

function callBlankLine(mode, state) {
  if (mode.blankLine) { return mode.blankLine(state) }
  if (!mode.innerMode) { return }
  var inner = innerMode(mode, state);
  if (inner.mode.blankLine) { return inner.mode.blankLine(inner.state) }
}

function readToken(mode, stream, state, inner) {
  for (var i = 0; i < 10; i++) {
    if (inner) { inner[0] = innerMode(mode, state).mode; }
    var style = mode.token(stream, state);
    if (stream.pos > stream.start) { return style }
  }
  throw new Error("Mode " + mode.name + " failed to advance stream.")
}

var Token = function(stream, type, state) {
  this.start = stream.start; this.end = stream.pos;
  this.string = stream.current();
  this.type = type || null;
  this.state = state;
};

// Utility for getTokenAt and getLineTokens
function takeToken(cm, pos, precise, asArray) {
  var doc = cm.doc, mode = doc.mode, style;
  pos = clipPos(doc, pos);
  var line = getLine(doc, pos.line), context = getContextBefore(cm, pos.line, precise);
  var stream = new StringStream(line.text, cm.options.tabSize, context), tokens;
  if (asArray) { tokens = []; }
  while ((asArray || stream.pos < pos.ch) && !stream.eol()) {
    stream.start = stream.pos;
    style = readToken(mode, stream, context.state);
    if (asArray) { tokens.push(new Token(stream, style, copyState(doc.mode, context.state))); }
  }
  return asArray ? tokens : new Token(stream, style, context.state)
}

function extractLineClasses(type, output) {
  if (type) { for (;;) {
    var lineClass = type.match(/(?:^|\s+)line-(background-)?(\S+)/);
    if (!lineClass) { break }
    type = type.slice(0, lineClass.index) + type.slice(lineClass.index + lineClass[0].length);
    var prop = lineClass[1] ? "bgClass" : "textClass";
    if (output[prop] == null)
      { output[prop] = lineClass[2]; }
    else if (!(new RegExp("(?:^|\s)" + lineClass[2] + "(?:$|\s)")).test(output[prop]))
      { output[prop] += " " + lineClass[2]; }
  } }
  return type
}

// Run the given mode's parser over a line, calling f for each token.
function runMode(cm, text, mode, context, f, lineClasses, forceToEnd) {
  var flattenSpans = mode.flattenSpans;
  if (flattenSpans == null) { flattenSpans = cm.options.flattenSpans; }
  var curStart = 0, curStyle = null;
  var stream = new StringStream(text, cm.options.tabSize, context), style;
  var inner = cm.options.addModeClass && [null];
  if (text == "") { extractLineClasses(callBlankLine(mode, context.state), lineClasses); }
  while (!stream.eol()) {
    if (stream.pos > cm.options.maxHighlightLength) {
      flattenSpans = false;
      if (forceToEnd) { processLine(cm, text, context, stream.pos); }
      stream.pos = text.length;
      style = null;
    } else {
      style = extractLineClasses(readToken(mode, stream, context.state, inner), lineClasses);
    }
    if (inner) {
      var mName = inner[0].name;
      if (mName) { style = "m-" + (style ? mName + " " + style : mName); }
    }
    if (!flattenSpans || curStyle != style) {
      while (curStart < stream.start) {
        curStart = Math.min(stream.start, curStart + 5000);
        f(curStart, curStyle);
      }
      curStyle = style;
    }
    stream.start = stream.pos;
  }
  while (curStart < stream.pos) {
    // Webkit seems to refuse to render text nodes longer than 57444
    // characters, and returns inaccurate measurements in nodes
    // starting around 5000 chars.
    var pos = Math.min(stream.pos, curStart + 5000);
    f(pos, curStyle);
    curStart = pos;
  }
}

// Finds the line to start with when starting a parse. Tries to
// find a line with a stateAfter, so that it can start with a
// valid state. If that fails, it returns the line with the
// smallest indentation, which tends to need the least context to
// parse correctly.
function findStartLine(cm, n, precise) {
  var minindent, minline, doc = cm.doc;
  var lim = precise ? -1 : n - (cm.doc.mode.innerMode ? 1000 : 100);
  for (var search = n; search > lim; --search) {
    if (search <= doc.first) { return doc.first }
    var line = getLine(doc, search - 1), after = line.stateAfter;
    if (after && (!precise || search + (after instanceof SavedContext ? after.lookAhead : 0) <= doc.modeFrontier))
      { return search }
    var indented = countColumn(line.text, null, cm.options.tabSize);
    if (minline == null || minindent > indented) {
      minline = search - 1;
      minindent = indented;
    }
  }
  return minline
}

function retreatFrontier(doc, n) {
  doc.modeFrontier = Math.min(doc.modeFrontier, n);
  if (doc.highlightFrontier < n - 10) { return }
  var start = doc.first;
  for (var line = n - 1; line > start; line--) {
    var saved = getLine(doc, line).stateAfter;
    // change is on 3
    // state on line 1 looked ahead 2 -- so saw 3
    // test 1 + 2 < 3 should cover this
    if (saved && (!(saved instanceof SavedContext) || line + saved.lookAhead < n)) {
      start = line + 1;
      break
    }
  }
  doc.highlightFrontier = Math.min(doc.highlightFrontier, start);
}

// LINE DATA STRUCTURE

// Line objects. These hold state related to a line, including
// highlighting info (the styles array).
var Line = function(text, markedSpans, estimateHeight) {
  this.text = text;
  attachMarkedSpans(this, markedSpans);
  this.height = estimateHeight ? estimateHeight(this) : 1;
};

Line.prototype.lineNo = function () { return lineNo(this) };
eventMixin(Line);

// Change the content (text, markers) of a line. Automatically
// invalidates cached information and tries to re-estimate the
// line's height.
function updateLine(line, text, markedSpans, estimateHeight) {
  line.text = text;
  if (line.stateAfter) { line.stateAfter = null; }
  if (line.styles) { line.styles = null; }
  if (line.order != null) { line.order = null; }
  detachMarkedSpans(line);
  attachMarkedSpans(line, markedSpans);
  var estHeight = estimateHeight ? estimateHeight(line) : 1;
  if (estHeight != line.height) { updateLineHeight(line, estHeight); }
}

// Detach a line from the document tree and its markers.
function cleanUpLine(line) {
  line.parent = null;
  detachMarkedSpans(line);
}

// Convert a style as returned by a mode (either null, or a string
// containing one or more styles) to a CSS style. This is cached,
// and also looks for line-wide styles.
var styleToClassCache = {};
var styleToClassCacheWithMode = {};
function interpretTokenStyle(style, options) {
  if (!style || /^\s*$/.test(style)) { return null }
  var cache = options.addModeClass ? styleToClassCacheWithMode : styleToClassCache;
  return cache[style] ||
    (cache[style] = style.replace(/\S+/g, "cm-$&"))
}

// Render the DOM representation of the text of a line. Also builds
// up a 'line map', which points at the DOM nodes that represent
// specific stretches of text, and is used by the measuring code.
// The returned object contains the DOM node, this map, and
// information about line-wide styles that were set by the mode.
function buildLineContent(cm, lineView) {
  // The padding-right forces the element to have a 'border', which
  // is needed on Webkit to be able to get line-level bounding
  // rectangles for it (in measureChar).
  var content = eltP("span", null, null, webkit ? "padding-right: .1px" : null);
  var builder = {pre: eltP("pre", [content], "CodeMirror-line"), content: content,
                 col: 0, pos: 0, cm: cm,
                 trailingSpace: false,
                 splitSpaces: (ie || webkit) && cm.getOption("lineWrapping")};
  lineView.measure = {};

  // Iterate over the logical lines that make up this visual line.
  for (var i = 0; i <= (lineView.rest ? lineView.rest.length : 0); i++) {
    var line = i ? lineView.rest[i - 1] : lineView.line, order = (void 0);
    builder.pos = 0;
    builder.addToken = buildToken;
    // Optionally wire in some hacks into the token-rendering
    // algorithm, to deal with browser quirks.
    if (hasBadBidiRects(cm.display.measure) && (order = getOrder(line, cm.doc.direction)))
      { builder.addToken = buildTokenBadBidi(builder.addToken, order); }
    builder.map = [];
    var allowFrontierUpdate = lineView != cm.display.externalMeasured && lineNo(line);
    insertLineContent(line, builder, getLineStyles(cm, line, allowFrontierUpdate));
    if (line.styleClasses) {
      if (line.styleClasses.bgClass)
        { builder.bgClass = joinClasses(line.styleClasses.bgClass, builder.bgClass || ""); }
      if (line.styleClasses.textClass)
        { builder.textClass = joinClasses(line.styleClasses.textClass, builder.textClass || ""); }
    }

    // Ensure at least a single node is present, for measuring.
    if (builder.map.length == 0)
      { builder.map.push(0, 0, builder.content.appendChild(zeroWidthElement(cm.display.measure))); }

    // Store the map and a cache object for the current logical line
    if (i == 0) {
      lineView.measure.map = builder.map;
      lineView.measure.cache = {};
    } else {
      (lineView.measure.maps || (lineView.measure.maps = [])).push(builder.map)
      ;(lineView.measure.caches || (lineView.measure.caches = [])).push({});
    }
  }

  // See issue #2901
  if (webkit) {
    var last = builder.content.lastChild;
    if (/\bcm-tab\b/.test(last.className) || (last.querySelector && last.querySelector(".cm-tab")))
      { builder.content.className = "cm-tab-wrap-hack"; }
  }

  signal(cm, "renderLine", cm, lineView.line, builder.pre);
  if (builder.pre.className)
    { builder.textClass = joinClasses(builder.pre.className, builder.textClass || ""); }

  return builder
}

function defaultSpecialCharPlaceholder(ch) {
  var token = elt("span", "\u2022", "cm-invalidchar");
  token.title = "\\u" + ch.charCodeAt(0).toString(16);
  token.setAttribute("aria-label", token.title);
  return token
}

// Build up the DOM representation for a single token, and add it to
// the line map. Takes care to render special characters separately.
function buildToken(builder, text, style, startStyle, endStyle, title, css) {
  if (!text) { return }
  var displayText = builder.splitSpaces ? splitSpaces(text, builder.trailingSpace) : text;
  var special = builder.cm.state.specialChars, mustWrap = false;
  var content;
  if (!special.test(text)) {
    builder.col += text.length;
    content = document.createTextNode(displayText);
    builder.map.push(builder.pos, builder.pos + text.length, content);
    if (ie && ie_version < 9) { mustWrap = true; }
    builder.pos += text.length;
  } else {
    content = document.createDocumentFragment();
    var pos = 0;
    while (true) {
      special.lastIndex = pos;
      var m = special.exec(text);
      var skipped = m ? m.index - pos : text.length - pos;
      if (skipped) {
        var txt = document.createTextNode(displayText.slice(pos, pos + skipped));
        if (ie && ie_version < 9) { content.appendChild(elt("span", [txt])); }
        else { content.appendChild(txt); }
        builder.map.push(builder.pos, builder.pos + skipped, txt);
        builder.col += skipped;
        builder.pos += skipped;
      }
      if (!m) { break }
      pos += skipped + 1;
      var txt$1 = (void 0);
      if (m[0] == "\t") {
        var tabSize = builder.cm.options.tabSize, tabWidth = tabSize - builder.col % tabSize;
        txt$1 = content.appendChild(elt("span", spaceStr(tabWidth), "cm-tab"));
        txt$1.setAttribute("role", "presentation");
        txt$1.setAttribute("cm-text", "\t");
        builder.col += tabWidth;
      } else if (m[0] == "\r" || m[0] == "\n") {
        txt$1 = content.appendChild(elt("span", m[0] == "\r" ? "\u240d" : "\u2424", "cm-invalidchar"));
        txt$1.setAttribute("cm-text", m[0]);
        builder.col += 1;
      } else {
        txt$1 = builder.cm.options.specialCharPlaceholder(m[0]);
        txt$1.setAttribute("cm-text", m[0]);
        if (ie && ie_version < 9) { content.appendChild(elt("span", [txt$1])); }
        else { content.appendChild(txt$1); }
        builder.col += 1;
      }
      builder.map.push(builder.pos, builder.pos + 1, txt$1);
      builder.pos++;
    }
  }
  builder.trailingSpace = displayText.charCodeAt(text.length - 1) == 32;
  if (style || startStyle || endStyle || mustWrap || css) {
    var fullStyle = style || "";
    if (startStyle) { fullStyle += startStyle; }
    if (endStyle) { fullStyle += endStyle; }
    var token = elt("span", [content], fullStyle, css);
    if (title) { token.title = title; }
    return builder.content.appendChild(token)
  }
  builder.content.appendChild(content);
}

function splitSpaces(text, trailingBefore) {
  if (text.length > 1 && !/  /.test(text)) { return text }
  var spaceBefore = trailingBefore, result = "";
  for (var i = 0; i < text.length; i++) {
    var ch = text.charAt(i);
    if (ch == " " && spaceBefore && (i == text.length - 1 || text.charCodeAt(i + 1) == 32))
      { ch = "\u00a0"; }
    result += ch;
    spaceBefore = ch == " ";
  }
  return result
}

// Work around nonsense dimensions being reported for stretches of
// right-to-left text.
function buildTokenBadBidi(inner, order) {
  return function (builder, text, style, startStyle, endStyle, title, css) {
    style = style ? style + " cm-force-border" : "cm-force-border";
    var start = builder.pos, end = start + text.length;
    for (;;) {
      // Find the part that overlaps with the start of this text
      var part = (void 0);
      for (var i = 0; i < order.length; i++) {
        part = order[i];
        if (part.to > start && part.from <= start) { break }
      }
      if (part.to >= end) { return inner(builder, text, style, startStyle, endStyle, title, css) }
      inner(builder, text.slice(0, part.to - start), style, startStyle, null, title, css);
      startStyle = null;
      text = text.slice(part.to - start);
      start = part.to;
    }
  }
}

function buildCollapsedSpan(builder, size, marker, ignoreWidget) {
  var widget = !ignoreWidget && marker.widgetNode;
  if (widget) { builder.map.push(builder.pos, builder.pos + size, widget); }
  if (!ignoreWidget && builder.cm.display.input.needsContentAttribute) {
    if (!widget)
      { widget = builder.content.appendChild(document.createElement("span")); }
    widget.setAttribute("cm-marker", marker.id);
  }
  if (widget) {
    builder.cm.display.input.setUneditable(widget);
    builder.content.appendChild(widget);
  }
  builder.pos += size;
  builder.trailingSpace = false;
}

// Outputs a number of spans to make up a line, taking highlighting
// and marked text into account.
function insertLineContent(line, builder, styles) {
  var spans = line.markedSpans, allText = line.text, at = 0;
  if (!spans) {
    for (var i$1 = 1; i$1 < styles.length; i$1+=2)
      { builder.addToken(builder, allText.slice(at, at = styles[i$1]), interpretTokenStyle(styles[i$1+1], builder.cm.options)); }
    return
  }

  var len = allText.length, pos = 0, i = 1, text = "", style, css;
  var nextChange = 0, spanStyle, spanEndStyle, spanStartStyle, title, collapsed;
  for (;;) {
    if (nextChange == pos) { // Update current marker set
      spanStyle = spanEndStyle = spanStartStyle = title = css = "";
      collapsed = null; nextChange = Infinity;
      var foundBookmarks = [], endStyles = (void 0);
      for (var j = 0; j < spans.length; ++j) {
        var sp = spans[j], m = sp.marker;
        if (m.type == "bookmark" && sp.from == pos && m.widgetNode) {
          foundBookmarks.push(m);
        } else if (sp.from <= pos && (sp.to == null || sp.to > pos || m.collapsed && sp.to == pos && sp.from == pos)) {
          if (sp.to != null && sp.to != pos && nextChange > sp.to) {
            nextChange = sp.to;
            spanEndStyle = "";
          }
          if (m.className) { spanStyle += " " + m.className; }
          if (m.css) { css = (css ? css + ";" : "") + m.css; }
          if (m.startStyle && sp.from == pos) { spanStartStyle += " " + m.startStyle; }
          if (m.endStyle && sp.to == nextChange) { (endStyles || (endStyles = [])).push(m.endStyle, sp.to); }
          if (m.title && !title) { title = m.title; }
          if (m.collapsed && (!collapsed || compareCollapsedMarkers(collapsed.marker, m) < 0))
            { collapsed = sp; }
        } else if (sp.from > pos && nextChange > sp.from) {
          nextChange = sp.from;
        }
      }
      if (endStyles) { for (var j$1 = 0; j$1 < endStyles.length; j$1 += 2)
        { if (endStyles[j$1 + 1] == nextChange) { spanEndStyle += " " + endStyles[j$1]; } } }

      if (!collapsed || collapsed.from == pos) { for (var j$2 = 0; j$2 < foundBookmarks.length; ++j$2)
        { buildCollapsedSpan(builder, 0, foundBookmarks[j$2]); } }
      if (collapsed && (collapsed.from || 0) == pos) {
        buildCollapsedSpan(builder, (collapsed.to == null ? len + 1 : collapsed.to) - pos,
                           collapsed.marker, collapsed.from == null);
        if (collapsed.to == null) { return }
        if (collapsed.to == pos) { collapsed = false; }
      }
    }
    if (pos >= len) { break }

    var upto = Math.min(len, nextChange);
    while (true) {
      if (text) {
        var end = pos + text.length;
        if (!collapsed) {
          var tokenText = end > upto ? text.slice(0, upto - pos) : text;
          builder.addToken(builder, tokenText, style ? style + spanStyle : spanStyle,
                           spanStartStyle, pos + tokenText.length == nextChange ? spanEndStyle : "", title, css);
        }
        if (end >= upto) {text = text.slice(upto - pos); pos = upto; break}
        pos = end;
        spanStartStyle = "";
      }
      text = allText.slice(at, at = styles[i++]);
      style = interpretTokenStyle(styles[i++], builder.cm.options);
    }
  }
}


// These objects are used to represent the visible (currently drawn)
// part of the document. A LineView may correspond to multiple
// logical lines, if those are connected by collapsed ranges.
function LineView(doc, line, lineN) {
  // The starting line
  this.line = line;
  // Continuing lines, if any
  this.rest = visualLineContinued(line);
  // Number of logical lines in this visual line
  this.size = this.rest ? lineNo(lst(this.rest)) - lineN + 1 : 1;
  this.node = this.text = null;
  this.hidden = lineIsHidden(doc, line);
}

// Create a range of LineView objects for the given lines.
function buildViewArray(cm, from, to) {
  var array = [], nextPos;
  for (var pos = from; pos < to; pos = nextPos) {
    var view = new LineView(cm.doc, getLine(cm.doc, pos), pos);
    nextPos = pos + view.size;
    array.push(view);
  }
  return array
}

var operationGroup = null;

function pushOperation(op) {
  if (operationGroup) {
    operationGroup.ops.push(op);
  } else {
    op.ownsGroup = operationGroup = {
      ops: [op],
      delayedCallbacks: []
    };
  }
}

function fireCallbacksForOps(group) {
  // Calls delayed callbacks and cursorActivity handlers until no
  // new ones appear
  var callbacks = group.delayedCallbacks, i = 0;
  do {
    for (; i < callbacks.length; i++)
      { callbacks[i].call(null); }
    for (var j = 0; j < group.ops.length; j++) {
      var op = group.ops[j];
      if (op.cursorActivityHandlers)
        { while (op.cursorActivityCalled < op.cursorActivityHandlers.length)
          { op.cursorActivityHandlers[op.cursorActivityCalled++].call(null, op.cm); } }
    }
  } while (i < callbacks.length)
}

function finishOperation(op, endCb) {
  var group = op.ownsGroup;
  if (!group) { return }

  try { fireCallbacksForOps(group); }
  finally {
    operationGroup = null;
    endCb(group);
  }
}

var orphanDelayedCallbacks = null;

// Often, we want to signal events at a point where we are in the
// middle of some work, but don't want the handler to start calling
// other methods on the editor, which might be in an inconsistent
// state or simply not expect any other events to happen.
// signalLater looks whether there are any handlers, and schedules
// them to be executed when the last operation ends, or, if no
// operation is active, when a timeout fires.
function signalLater(emitter, type /*, values...*/) {
  var arr = getHandlers(emitter, type);
  if (!arr.length) { return }
  var args = Array.prototype.slice.call(arguments, 2), list;
  if (operationGroup) {
    list = operationGroup.delayedCallbacks;
  } else if (orphanDelayedCallbacks) {
    list = orphanDelayedCallbacks;
  } else {
    list = orphanDelayedCallbacks = [];
    setTimeout(fireOrphanDelayed, 0);
  }
  var loop = function ( i ) {
    list.push(function () { return arr[i].apply(null, args); });
  };

  for (var i = 0; i < arr.length; ++i)
    loop( i );
}

function fireOrphanDelayed() {
  var delayed = orphanDelayedCallbacks;
  orphanDelayedCallbacks = null;
  for (var i = 0; i < delayed.length; ++i) { delayed[i](); }
}

// When an aspect of a line changes, a string is added to
// lineView.changes. This updates the relevant part of the line's
// DOM structure.
function updateLineForChanges(cm, lineView, lineN, dims) {
  for (var j = 0; j < lineView.changes.length; j++) {
    var type = lineView.changes[j];
    if (type == "text") { updateLineText(cm, lineView); }
    else if (type == "gutter") { updateLineGutter(cm, lineView, lineN, dims); }
    else if (type == "class") { updateLineClasses(cm, lineView); }
    else if (type == "widget") { updateLineWidgets(cm, lineView, dims); }
  }
  lineView.changes = null;
}

// Lines with gutter elements, widgets or a background class need to
// be wrapped, and have the extra elements added to the wrapper div
function ensureLineWrapped(lineView) {
  if (lineView.node == lineView.text) {
    lineView.node = elt("div", null, null, "position: relative");
    if (lineView.text.parentNode)
      { lineView.text.parentNode.replaceChild(lineView.node, lineView.text); }
    lineView.node.appendChild(lineView.text);
    if (ie && ie_version < 8) { lineView.node.style.zIndex = 2; }
  }
  return lineView.node
}

function updateLineBackground(cm, lineView) {
  var cls = lineView.bgClass ? lineView.bgClass + " " + (lineView.line.bgClass || "") : lineView.line.bgClass;
  if (cls) { cls += " CodeMirror-linebackground"; }
  if (lineView.background) {
    if (cls) { lineView.background.className = cls; }
    else { lineView.background.parentNode.removeChild(lineView.background); lineView.background = null; }
  } else if (cls) {
    var wrap = ensureLineWrapped(lineView);
    lineView.background = wrap.insertBefore(elt("div", null, cls), wrap.firstChild);
    cm.display.input.setUneditable(lineView.background);
  }
}

// Wrapper around buildLineContent which will reuse the structure
// in display.externalMeasured when possible.
function getLineContent(cm, lineView) {
  var ext = cm.display.externalMeasured;
  if (ext && ext.line == lineView.line) {
    cm.display.externalMeasured = null;
    lineView.measure = ext.measure;
    return ext.built
  }
  return buildLineContent(cm, lineView)
}

// Redraw the line's text. Interacts with the background and text
// classes because the mode may output tokens that influence these
// classes.
function updateLineText(cm, lineView) {
  var cls = lineView.text.className;
  var built = getLineContent(cm, lineView);
  if (lineView.text == lineView.node) { lineView.node = built.pre; }
  lineView.text.parentNode.replaceChild(built.pre, lineView.text);
  lineView.text = built.pre;
  if (built.bgClass != lineView.bgClass || built.textClass != lineView.textClass) {
    lineView.bgClass = built.bgClass;
    lineView.textClass = built.textClass;
    updateLineClasses(cm, lineView);
  } else if (cls) {
    lineView.text.className = cls;
  }
}

function updateLineClasses(cm, lineView) {
  updateLineBackground(cm, lineView);
  if (lineView.line.wrapClass)
    { ensureLineWrapped(lineView).className = lineView.line.wrapClass; }
  else if (lineView.node != lineView.text)
    { lineView.node.className = ""; }
  var textClass = lineView.textClass ? lineView.textClass + " " + (lineView.line.textClass || "") : lineView.line.textClass;
  lineView.text.className = textClass || "";
}

function updateLineGutter(cm, lineView, lineN, dims) {
  if (lineView.gutter) {
    lineView.node.removeChild(lineView.gutter);
    lineView.gutter = null;
  }
  if (lineView.gutterBackground) {
    lineView.node.removeChild(lineView.gutterBackground);
    lineView.gutterBackground = null;
  }
  if (lineView.line.gutterClass) {
    var wrap = ensureLineWrapped(lineView);
    lineView.gutterBackground = elt("div", null, "CodeMirror-gutter-background " + lineView.line.gutterClass,
                                    ("left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px; width: " + (dims.gutterTotalWidth) + "px"));
    cm.display.input.setUneditable(lineView.gutterBackground);
    wrap.insertBefore(lineView.gutterBackground, lineView.text);
  }
  var markers = lineView.line.gutterMarkers;
  if (cm.options.lineNumbers || markers) {
    var wrap$1 = ensureLineWrapped(lineView);
    var gutterWrap = lineView.gutter = elt("div", null, "CodeMirror-gutter-wrapper", ("left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px"));
    cm.display.input.setUneditable(gutterWrap);
    wrap$1.insertBefore(gutterWrap, lineView.text);
    if (lineView.line.gutterClass)
      { gutterWrap.className += " " + lineView.line.gutterClass; }
    if (cm.options.lineNumbers && (!markers || !markers["CodeMirror-linenumbers"]))
      { lineView.lineNumber = gutterWrap.appendChild(
        elt("div", lineNumberFor(cm.options, lineN),
            "CodeMirror-linenumber CodeMirror-gutter-elt",
            ("left: " + (dims.gutterLeft["CodeMirror-linenumbers"]) + "px; width: " + (cm.display.lineNumInnerWidth) + "px"))); }
    if (markers) { for (var k = 0; k < cm.options.gutters.length; ++k) {
      var id = cm.options.gutters[k], found = markers.hasOwnProperty(id) && markers[id];
      if (found)
        { gutterWrap.appendChild(elt("div", [found], "CodeMirror-gutter-elt",
                                   ("left: " + (dims.gutterLeft[id]) + "px; width: " + (dims.gutterWidth[id]) + "px"))); }
    } }
  }
}

function updateLineWidgets(cm, lineView, dims) {
  if (lineView.alignable) { lineView.alignable = null; }
  for (var node = lineView.node.firstChild, next = (void 0); node; node = next) {
    next = node.nextSibling;
    if (node.className == "CodeMirror-linewidget")
      { lineView.node.removeChild(node); }
  }
  insertLineWidgets(cm, lineView, dims);
}

// Build a line's DOM representation from scratch
function buildLineElement(cm, lineView, lineN, dims) {
  var built = getLineContent(cm, lineView);
  lineView.text = lineView.node = built.pre;
  if (built.bgClass) { lineView.bgClass = built.bgClass; }
  if (built.textClass) { lineView.textClass = built.textClass; }

  updateLineClasses(cm, lineView);
  updateLineGutter(cm, lineView, lineN, dims);
  insertLineWidgets(cm, lineView, dims);
  return lineView.node
}

// A lineView may contain multiple logical lines (when merged by
// collapsed spans). The widgets for all of them need to be drawn.
function insertLineWidgets(cm, lineView, dims) {
  insertLineWidgetsFor(cm, lineView.line, lineView, dims, true);
  if (lineView.rest) { for (var i = 0; i < lineView.rest.length; i++)
    { insertLineWidgetsFor(cm, lineView.rest[i], lineView, dims, false); } }
}

function insertLineWidgetsFor(cm, line, lineView, dims, allowAbove) {
  if (!line.widgets) { return }
  var wrap = ensureLineWrapped(lineView);
  for (var i = 0, ws = line.widgets; i < ws.length; ++i) {
    var widget = ws[i], node = elt("div", [widget.node], "CodeMirror-linewidget");
    if (!widget.handleMouseEvents) { node.setAttribute("cm-ignore-events", "true"); }
    positionLineWidget(widget, node, lineView, dims);
    cm.display.input.setUneditable(node);
    if (allowAbove && widget.above)
      { wrap.insertBefore(node, lineView.gutter || lineView.text); }
    else
      { wrap.appendChild(node); }
    signalLater(widget, "redraw");
  }
}

function positionLineWidget(widget, node, lineView, dims) {
  if (widget.noHScroll) {
    (lineView.alignable || (lineView.alignable = [])).push(node);
    var width = dims.wrapperWidth;
    node.style.left = dims.fixedPos + "px";
    if (!widget.coverGutter) {
      width -= dims.gutterTotalWidth;
      node.style.paddingLeft = dims.gutterTotalWidth + "px";
    }
    node.style.width = width + "px";
  }
  if (widget.coverGutter) {
    node.style.zIndex = 5;
    node.style.position = "relative";
    if (!widget.noHScroll) { node.style.marginLeft = -dims.gutterTotalWidth + "px"; }
  }
}

function widgetHeight(widget) {
  if (widget.height != null) { return widget.height }
  var cm = widget.doc.cm;
  if (!cm) { return 0 }
  if (!contains(document.body, widget.node)) {
    var parentStyle = "position: relative;";
    if (widget.coverGutter)
      { parentStyle += "margin-left: -" + cm.display.gutters.offsetWidth + "px;"; }
    if (widget.noHScroll)
      { parentStyle += "width: " + cm.display.wrapper.clientWidth + "px;"; }
    removeChildrenAndAdd(cm.display.measure, elt("div", [widget.node], null, parentStyle));
  }
  return widget.height = widget.node.parentNode.offsetHeight
}

// Return true when the given mouse event happened in a widget
function eventInWidget(display, e) {
  for (var n = e_target(e); n != display.wrapper; n = n.parentNode) {
    if (!n || (n.nodeType == 1 && n.getAttribute("cm-ignore-events") == "true") ||
        (n.parentNode == display.sizer && n != display.mover))
      { return true }
  }
}

// POSITION MEASUREMENT

function paddingTop(display) {return display.lineSpace.offsetTop}
function paddingVert(display) {return display.mover.offsetHeight - display.lineSpace.offsetHeight}
function paddingH(display) {
  if (display.cachedPaddingH) { return display.cachedPaddingH }
  var e = removeChildrenAndAdd(display.measure, elt("pre", "x"));
  var style = window.getComputedStyle ? window.getComputedStyle(e) : e.currentStyle;
  var data = {left: parseInt(style.paddingLeft), right: parseInt(style.paddingRight)};
  if (!isNaN(data.left) && !isNaN(data.right)) { display.cachedPaddingH = data; }
  return data
}

function scrollGap(cm) { return scrollerGap - cm.display.nativeBarWidth }
function displayWidth(cm) {
  return cm.display.scroller.clientWidth - scrollGap(cm) - cm.display.barWidth
}
function displayHeight(cm) {
  return cm.display.scroller.clientHeight - scrollGap(cm) - cm.display.barHeight
}

// Ensure the lineView.wrapping.heights array is populated. This is
// an array of bottom offsets for the lines that make up a drawn
// line. When lineWrapping is on, there might be more than one
// height.
function ensureLineHeights(cm, lineView, rect) {
  var wrapping = cm.options.lineWrapping;
  var curWidth = wrapping && displayWidth(cm);
  if (!lineView.measure.heights || wrapping && lineView.measure.width != curWidth) {
    var heights = lineView.measure.heights = [];
    if (wrapping) {
      lineView.measure.width = curWidth;
      var rects = lineView.text.firstChild.getClientRects();
      for (var i = 0; i < rects.length - 1; i++) {
        var cur = rects[i], next = rects[i + 1];
        if (Math.abs(cur.bottom - next.bottom) > 2)
          { heights.push((cur.bottom + next.top) / 2 - rect.top); }
      }
    }
    heights.push(rect.bottom - rect.top);
  }
}

// Find a line map (mapping character offsets to text nodes) and a
// measurement cache for the given line number. (A line view might
// contain multiple lines when collapsed ranges are present.)
function mapFromLineView(lineView, line, lineN) {
  if (lineView.line == line)
    { return {map: lineView.measure.map, cache: lineView.measure.cache} }
  for (var i = 0; i < lineView.rest.length; i++)
    { if (lineView.rest[i] == line)
      { return {map: lineView.measure.maps[i], cache: lineView.measure.caches[i]} } }
  for (var i$1 = 0; i$1 < lineView.rest.length; i$1++)
    { if (lineNo(lineView.rest[i$1]) > lineN)
      { return {map: lineView.measure.maps[i$1], cache: lineView.measure.caches[i$1], before: true} } }
}

// Render a line into the hidden node display.externalMeasured. Used
// when measurement is needed for a line that's not in the viewport.
function updateExternalMeasurement(cm, line) {
  line = visualLine(line);
  var lineN = lineNo(line);
  var view = cm.display.externalMeasured = new LineView(cm.doc, line, lineN);
  view.lineN = lineN;
  var built = view.built = buildLineContent(cm, view);
  view.text = built.pre;
  removeChildrenAndAdd(cm.display.lineMeasure, built.pre);
  return view
}

// Get a {top, bottom, left, right} box (in line-local coordinates)
// for a given character.
function measureChar(cm, line, ch, bias) {
  return measureCharPrepared(cm, prepareMeasureForLine(cm, line), ch, bias)
}

// Find a line view that corresponds to the given line number.
function findViewForLine(cm, lineN) {
  if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo)
    { return cm.display.view[findViewIndex(cm, lineN)] }
  var ext = cm.display.externalMeasured;
  if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size)
    { return ext }
}

// Measurement can be split in two steps, the set-up work that
// applies to the whole line, and the measurement of the actual
// character. Functions like coordsChar, that need to do a lot of
// measurements in a row, can thus ensure that the set-up work is
// only done once.
function prepareMeasureForLine(cm, line) {
  var lineN = lineNo(line);
  var view = findViewForLine(cm, lineN);
  if (view && !view.text) {
    view = null;
  } else if (view && view.changes) {
    updateLineForChanges(cm, view, lineN, getDimensions(cm));
    cm.curOp.forceUpdate = true;
  }
  if (!view)
    { view = updateExternalMeasurement(cm, line); }

  var info = mapFromLineView(view, line, lineN);
  return {
    line: line, view: view, rect: null,
    map: info.map, cache: info.cache, before: info.before,
    hasHeights: false
  }
}

// Given a prepared measurement object, measures the position of an
// actual character (or fetches it from the cache).
function measureCharPrepared(cm, prepared, ch, bias, varHeight) {
  if (prepared.before) { ch = -1; }
  var key = ch + (bias || ""), found;
  if (prepared.cache.hasOwnProperty(key)) {
    found = prepared.cache[key];
  } else {
    if (!prepared.rect)
      { prepared.rect = prepared.view.text.getBoundingClientRect(); }
    if (!prepared.hasHeights) {
      ensureLineHeights(cm, prepared.view, prepared.rect);
      prepared.hasHeights = true;
    }
    found = measureCharInner(cm, prepared, ch, bias);
    if (!found.bogus) { prepared.cache[key] = found; }
  }
  return {left: found.left, right: found.right,
          top: varHeight ? found.rtop : found.top,
          bottom: varHeight ? found.rbottom : found.bottom}
}

var nullRect = {left: 0, right: 0, top: 0, bottom: 0};

function nodeAndOffsetInLineMap(map$$1, ch, bias) {
  var node, start, end, collapse, mStart, mEnd;
  // First, search the line map for the text node corresponding to,
  // or closest to, the target character.
  for (var i = 0; i < map$$1.length; i += 3) {
    mStart = map$$1[i];
    mEnd = map$$1[i + 1];
    if (ch < mStart) {
      start = 0; end = 1;
      collapse = "left";
    } else if (ch < mEnd) {
      start = ch - mStart;
      end = start + 1;
    } else if (i == map$$1.length - 3 || ch == mEnd && map$$1[i + 3] > ch) {
      end = mEnd - mStart;
      start = end - 1;
      if (ch >= mEnd) { collapse = "right"; }
    }
    if (start != null) {
      node = map$$1[i + 2];
      if (mStart == mEnd && bias == (node.insertLeft ? "left" : "right"))
        { collapse = bias; }
      if (bias == "left" && start == 0)
        { while (i && map$$1[i - 2] == map$$1[i - 3] && map$$1[i - 1].insertLeft) {
          node = map$$1[(i -= 3) + 2];
          collapse = "left";
        } }
      if (bias == "right" && start == mEnd - mStart)
        { while (i < map$$1.length - 3 && map$$1[i + 3] == map$$1[i + 4] && !map$$1[i + 5].insertLeft) {
          node = map$$1[(i += 3) + 2];
          collapse = "right";
        } }
      break
    }
  }
  return {node: node, start: start, end: end, collapse: collapse, coverStart: mStart, coverEnd: mEnd}
}

function getUsefulRect(rects, bias) {
  var rect = nullRect;
  if (bias == "left") { for (var i = 0; i < rects.length; i++) {
    if ((rect = rects[i]).left != rect.right) { break }
  } } else { for (var i$1 = rects.length - 1; i$1 >= 0; i$1--) {
    if ((rect = rects[i$1]).left != rect.right) { break }
  } }
  return rect
}

function measureCharInner(cm, prepared, ch, bias) {
  var place = nodeAndOffsetInLineMap(prepared.map, ch, bias);
  var node = place.node, start = place.start, end = place.end, collapse = place.collapse;

  var rect;
  if (node.nodeType == 3) { // If it is a text node, use a range to retrieve the coordinates.
    for (var i$1 = 0; i$1 < 4; i$1++) { // Retry a maximum of 4 times when nonsense rectangles are returned
      while (start && isExtendingChar(prepared.line.text.charAt(place.coverStart + start))) { --start; }
      while (place.coverStart + end < place.coverEnd && isExtendingChar(prepared.line.text.charAt(place.coverStart + end))) { ++end; }
      if (ie && ie_version < 9 && start == 0 && end == place.coverEnd - place.coverStart)
        { rect = node.parentNode.getBoundingClientRect(); }
      else
        { rect = getUsefulRect(range(node, start, end).getClientRects(), bias); }
      if (rect.left || rect.right || start == 0) { break }
      end = start;
      start = start - 1;
      collapse = "right";
    }
    if (ie && ie_version < 11) { rect = maybeUpdateRectForZooming(cm.display.measure, rect); }
  } else { // If it is a widget, simply get the box for the whole widget.
    if (start > 0) { collapse = bias = "right"; }
    var rects;
    if (cm.options.lineWrapping && (rects = node.getClientRects()).length > 1)
      { rect = rects[bias == "right" ? rects.length - 1 : 0]; }
    else
      { rect = node.getBoundingClientRect(); }
  }
  if (ie && ie_version < 9 && !start && (!rect || !rect.left && !rect.right)) {
    var rSpan = node.parentNode.getClientRects()[0];
    if (rSpan)
      { rect = {left: rSpan.left, right: rSpan.left + charWidth(cm.display), top: rSpan.top, bottom: rSpan.bottom}; }
    else
      { rect = nullRect; }
  }

  var rtop = rect.top - prepared.rect.top, rbot = rect.bottom - prepared.rect.top;
  var mid = (rtop + rbot) / 2;
  var heights = prepared.view.measure.heights;
  var i = 0;
  for (; i < heights.length - 1; i++)
    { if (mid < heights[i]) { break } }
  var top = i ? heights[i - 1] : 0, bot = heights[i];
  var result = {left: (collapse == "right" ? rect.right : rect.left) - prepared.rect.left,
                right: (collapse == "left" ? rect.left : rect.right) - prepared.rect.left,
                top: top, bottom: bot};
  if (!rect.left && !rect.right) { result.bogus = true; }
  if (!cm.options.singleCursorHeightPerLine) { result.rtop = rtop; result.rbottom = rbot; }

  return result
}

// Work around problem with bounding client rects on ranges being
// returned incorrectly when zoomed on IE10 and below.
function maybeUpdateRectForZooming(measure, rect) {
  if (!window.screen || screen.logicalXDPI == null ||
      screen.logicalXDPI == screen.deviceXDPI || !hasBadZoomedRects(measure))
    { return rect }
  var scaleX = screen.logicalXDPI / screen.deviceXDPI;
  var scaleY = screen.logicalYDPI / screen.deviceYDPI;
  return {left: rect.left * scaleX, right: rect.right * scaleX,
          top: rect.top * scaleY, bottom: rect.bottom * scaleY}
}

function clearLineMeasurementCacheFor(lineView) {
  if (lineView.measure) {
    lineView.measure.cache = {};
    lineView.measure.heights = null;
    if (lineView.rest) { for (var i = 0; i < lineView.rest.length; i++)
      { lineView.measure.caches[i] = {}; } }
  }
}

function clearLineMeasurementCache(cm) {
  cm.display.externalMeasure = null;
  removeChildren(cm.display.lineMeasure);
  for (var i = 0; i < cm.display.view.length; i++)
    { clearLineMeasurementCacheFor(cm.display.view[i]); }
}

function clearCaches(cm) {
  clearLineMeasurementCache(cm);
  cm.display.cachedCharWidth = cm.display.cachedTextHeight = cm.display.cachedPaddingH = null;
  if (!cm.options.lineWrapping) { cm.display.maxLineChanged = true; }
  cm.display.lineNumChars = null;
}

function pageScrollX() {
  // Work around https://bugs.chromium.org/p/chromium/issues/detail?id=489206
  // which causes page_Offset and bounding client rects to use
  // different reference viewports and invalidate our calculations.
  if (chrome && android) { return -(document.body.getBoundingClientRect().left - parseInt(getComputedStyle(document.body).marginLeft)) }
  return window.pageXOffset || (document.documentElement || document.body).scrollLeft
}
function pageScrollY() {
  if (chrome && android) { return -(document.body.getBoundingClientRect().top - parseInt(getComputedStyle(document.body).marginTop)) }
  return window.pageYOffset || (document.documentElement || document.body).scrollTop
}

function widgetTopHeight(lineObj) {
  var height = 0;
  if (lineObj.widgets) { for (var i = 0; i < lineObj.widgets.length; ++i) { if (lineObj.widgets[i].above)
    { height += widgetHeight(lineObj.widgets[i]); } } }
  return height
}

// Converts a {top, bottom, left, right} box from line-local
// coordinates into another coordinate system. Context may be one of
// "line", "div" (display.lineDiv), "local"./null (editor), "window",
// or "page".
function intoCoordSystem(cm, lineObj, rect, context, includeWidgets) {
  if (!includeWidgets) {
    var height = widgetTopHeight(lineObj);
    rect.top += height; rect.bottom += height;
  }
  if (context == "line") { return rect }
  if (!context) { context = "local"; }
  var yOff = heightAtLine(lineObj);
  if (context == "local") { yOff += paddingTop(cm.display); }
  else { yOff -= cm.display.viewOffset; }
  if (context == "page" || context == "window") {
    var lOff = cm.display.lineSpace.getBoundingClientRect();
    yOff += lOff.top + (context == "window" ? 0 : pageScrollY());
    var xOff = lOff.left + (context == "window" ? 0 : pageScrollX());
    rect.left += xOff; rect.right += xOff;
  }
  rect.top += yOff; rect.bottom += yOff;
  return rect
}

// Coverts a box from "div" coords to another coordinate system.
// Context may be "window", "page", "div", or "local"./null.
function fromCoordSystem(cm, coords, context) {
  if (context == "div") { return coords }
  var left = coords.left, top = coords.top;
  // First move into "page" coordinate system
  if (context == "page") {
    left -= pageScrollX();
    top -= pageScrollY();
  } else if (context == "local" || !context) {
    var localBox = cm.display.sizer.getBoundingClientRect();
    left += localBox.left;
    top += localBox.top;
  }

  var lineSpaceBox = cm.display.lineSpace.getBoundingClientRect();
  return {left: left - lineSpaceBox.left, top: top - lineSpaceBox.top}
}

function charCoords(cm, pos, context, lineObj, bias) {
  if (!lineObj) { lineObj = getLine(cm.doc, pos.line); }
  return intoCoordSystem(cm, lineObj, measureChar(cm, lineObj, pos.ch, bias), context)
}

// Returns a box for a given cursor position, which may have an
// 'other' property containing the position of the secondary cursor
// on a bidi boundary.
// A cursor Pos(line, char, "before") is on the same visual line as `char - 1`
// and after `char - 1` in writing order of `char - 1`
// A cursor Pos(line, char, "after") is on the same visual line as `char`
// and before `char` in writing order of `char`
// Examples (upper-case letters are RTL, lower-case are LTR):
//     Pos(0, 1, ...)
//     before   after
// ab     a|b     a|b
// aB     a|B     aB|
// Ab     |Ab     A|b
// AB     B|A     B|A
// Every position after the last character on a line is considered to stick
// to the last character on the line.
function cursorCoords(cm, pos, context, lineObj, preparedMeasure, varHeight) {
  lineObj = lineObj || getLine(cm.doc, pos.line);
  if (!preparedMeasure) { preparedMeasure = prepareMeasureForLine(cm, lineObj); }
  function get(ch, right) {
    var m = measureCharPrepared(cm, preparedMeasure, ch, right ? "right" : "left", varHeight);
    if (right) { m.left = m.right; } else { m.right = m.left; }
    return intoCoordSystem(cm, lineObj, m, context)
  }
  var order = getOrder(lineObj, cm.doc.direction), ch = pos.ch, sticky = pos.sticky;
  if (ch >= lineObj.text.length) {
    ch = lineObj.text.length;
    sticky = "before";
  } else if (ch <= 0) {
    ch = 0;
    sticky = "after";
  }
  if (!order) { return get(sticky == "before" ? ch - 1 : ch, sticky == "before") }

  function getBidi(ch, partPos, invert) {
    var part = order[partPos], right = part.level == 1;
    return get(invert ? ch - 1 : ch, right != invert)
  }
  var partPos = getBidiPartAt(order, ch, sticky);
  var other = bidiOther;
  var val = getBidi(ch, partPos, sticky == "before");
  if (other != null) { val.other = getBidi(ch, other, sticky != "before"); }
  return val
}

// Used to cheaply estimate the coordinates for a position. Used for
// intermediate scroll updates.
function estimateCoords(cm, pos) {
  var left = 0;
  pos = clipPos(cm.doc, pos);
  if (!cm.options.lineWrapping) { left = charWidth(cm.display) * pos.ch; }
  var lineObj = getLine(cm.doc, pos.line);
  var top = heightAtLine(lineObj) + paddingTop(cm.display);
  return {left: left, right: left, top: top, bottom: top + lineObj.height}
}

// Positions returned by coordsChar contain some extra information.
// xRel is the relative x position of the input coordinates compared
// to the found position (so xRel > 0 means the coordinates are to
// the right of the character position, for example). When outside
// is true, that means the coordinates lie outside the line's
// vertical range.
function PosWithInfo(line, ch, sticky, outside, xRel) {
  var pos = Pos(line, ch, sticky);
  pos.xRel = xRel;
  if (outside) { pos.outside = true; }
  return pos
}

// Compute the character position closest to the given coordinates.
// Input must be lineSpace-local ("div" coordinate system).
function coordsChar(cm, x, y) {
  var doc = cm.doc;
  y += cm.display.viewOffset;
  if (y < 0) { return PosWithInfo(doc.first, 0, null, true, -1) }
  var lineN = lineAtHeight(doc, y), last = doc.first + doc.size - 1;
  if (lineN > last)
    { return PosWithInfo(doc.first + doc.size - 1, getLine(doc, last).text.length, null, true, 1) }
  if (x < 0) { x = 0; }

  var lineObj = getLine(doc, lineN);
  for (;;) {
    var found = coordsCharInner(cm, lineObj, lineN, x, y);
    var merged = collapsedSpanAtEnd(lineObj);
    var mergedPos = merged && merged.find(0, true);
    if (merged && (found.ch > mergedPos.from.ch || found.ch == mergedPos.from.ch && found.xRel > 0))
      { lineN = lineNo(lineObj = mergedPos.to.line); }
    else
      { return found }
  }
}

function wrappedLineExtent(cm, lineObj, preparedMeasure, y) {
  y -= widgetTopHeight(lineObj);
  var end = lineObj.text.length;
  var begin = findFirst(function (ch) { return measureCharPrepared(cm, preparedMeasure, ch - 1).bottom <= y; }, end, 0);
  end = findFirst(function (ch) { return measureCharPrepared(cm, preparedMeasure, ch).top > y; }, begin, end);
  return {begin: begin, end: end}
}

function wrappedLineExtentChar(cm, lineObj, preparedMeasure, target) {
  if (!preparedMeasure) { preparedMeasure = prepareMeasureForLine(cm, lineObj); }
  var targetTop = intoCoordSystem(cm, lineObj, measureCharPrepared(cm, preparedMeasure, target), "line").top;
  return wrappedLineExtent(cm, lineObj, preparedMeasure, targetTop)
}

// Returns true if the given side of a box is after the given
// coordinates, in top-to-bottom, left-to-right order.
function boxIsAfter(box, x, y, left) {
  return box.bottom <= y ? false : box.top > y ? true : (left ? box.left : box.right) > x
}

function coordsCharInner(cm, lineObj, lineNo$$1, x, y) {
  // Move y into line-local coordinate space
  y -= heightAtLine(lineObj);
  var preparedMeasure = prepareMeasureForLine(cm, lineObj);
  // When directly calling `measureCharPrepared`, we have to adjust
  // for the widgets at this line.
  var widgetHeight$$1 = widgetTopHeight(lineObj);
  var begin = 0, end = lineObj.text.length, ltr = true;

  var order = getOrder(lineObj, cm.doc.direction);
  // If the line isn't plain left-to-right text, first figure out
  // which bidi section the coordinates fall into.
  if (order) {
    var part = (cm.options.lineWrapping ? coordsBidiPartWrapped : coordsBidiPart)
                 (cm, lineObj, lineNo$$1, preparedMeasure, order, x, y);
    ltr = part.level != 1;
    // The awkward -1 offsets are needed because findFirst (called
    // on these below) will treat its first bound as inclusive,
    // second as exclusive, but we want to actually address the
    // characters in the part's range
    begin = ltr ? part.from : part.to - 1;
    end = ltr ? part.to : part.from - 1;
  }

  // A binary search to find the first character whose bounding box
  // starts after the coordinates. If we run across any whose box wrap
  // the coordinates, store that.
  var chAround = null, boxAround = null;
  var ch = findFirst(function (ch) {
    var box = measureCharPrepared(cm, preparedMeasure, ch);
    box.top += widgetHeight$$1; box.bottom += widgetHeight$$1;
    if (!boxIsAfter(box, x, y, false)) { return false }
    if (box.top <= y && box.left <= x) {
      chAround = ch;
      boxAround = box;
    }
    return true
  }, begin, end);

  var baseX, sticky, outside = false;
  // If a box around the coordinates was found, use that
  if (boxAround) {
    // Distinguish coordinates nearer to the left or right side of the box
    var atLeft = x - boxAround.left < boxAround.right - x, atStart = atLeft == ltr;
    ch = chAround + (atStart ? 0 : 1);
    sticky = atStart ? "after" : "before";
    baseX = atLeft ? boxAround.left : boxAround.right;
  } else {
    // (Adjust for extended bound, if necessary.)
    if (!ltr && (ch == end || ch == begin)) { ch++; }
    // To determine which side to associate with, get the box to the
    // left of the character and compare it's vertical position to the
    // coordinates
    sticky = ch == 0 ? "after" : ch == lineObj.text.length ? "before" :
      (measureCharPrepared(cm, preparedMeasure, ch - (ltr ? 1 : 0)).bottom + widgetHeight$$1 <= y) == ltr ?
      "after" : "before";
    // Now get accurate coordinates for this place, in order to get a
    // base X position
    var coords = cursorCoords(cm, Pos(lineNo$$1, ch, sticky), "line", lineObj, preparedMeasure);
    baseX = coords.left;
    outside = y < coords.top || y >= coords.bottom;
  }

  ch = skipExtendingChars(lineObj.text, ch, 1);
  return PosWithInfo(lineNo$$1, ch, sticky, outside, x - baseX)
}

function coordsBidiPart(cm, lineObj, lineNo$$1, preparedMeasure, order, x, y) {
  // Bidi parts are sorted left-to-right, and in a non-line-wrapping
  // situation, we can take this ordering to correspond to the visual
  // ordering. This finds the first part whose end is after the given
  // coordinates.
  var index = findFirst(function (i) {
    var part = order[i], ltr = part.level != 1;
    return boxIsAfter(cursorCoords(cm, Pos(lineNo$$1, ltr ? part.to : part.from, ltr ? "before" : "after"),
                                   "line", lineObj, preparedMeasure), x, y, true)
  }, 0, order.length - 1);
  var part = order[index];
  // If this isn't the first part, the part's start is also after
  // the coordinates, and the coordinates aren't on the same line as
  // that start, move one part back.
  if (index > 0) {
    var ltr = part.level != 1;
    var start = cursorCoords(cm, Pos(lineNo$$1, ltr ? part.from : part.to, ltr ? "after" : "before"),
                             "line", lineObj, preparedMeasure);
    if (boxIsAfter(start, x, y, true) && start.top > y)
      { part = order[index - 1]; }
  }
  return part
}

function coordsBidiPartWrapped(cm, lineObj, _lineNo, preparedMeasure, order, x, y) {
  // In a wrapped line, rtl text on wrapping boundaries can do things
  // that don't correspond to the ordering in our `order` array at
  // all, so a binary search doesn't work, and we want to return a
  // part that only spans one line so that the binary search in
  // coordsCharInner is safe. As such, we first find the extent of the
  // wrapped line, and then do a flat search in which we discard any
  // spans that aren't on the line.
  var ref = wrappedLineExtent(cm, lineObj, preparedMeasure, y);
  var begin = ref.begin;
  var end = ref.end;
  if (/\s/.test(lineObj.text.charAt(end - 1))) { end--; }
  var part = null, closestDist = null;
  for (var i = 0; i < order.length; i++) {
    var p = order[i];
    if (p.from >= end || p.to <= begin) { continue }
    var ltr = p.level != 1;
    var endX = measureCharPrepared(cm, preparedMeasure, ltr ? Math.min(end, p.to) - 1 : Math.max(begin, p.from)).right;
    // Weigh against spans ending before this, so that they are only
    // picked if nothing ends after
    var dist = endX < x ? x - endX + 1e9 : endX - x;
    if (!part || closestDist > dist) {
      part = p;
      closestDist = dist;
    }
  }
  if (!part) { part = order[order.length - 1]; }
  // Clip the part to the wrapped line.
  if (part.from < begin) { part = {from: begin, to: part.to, level: part.level}; }
  if (part.to > end) { part = {from: part.from, to: end, level: part.level}; }
  return part
}

var measureText;
// Compute the default text height.
function textHeight(display) {
  if (display.cachedTextHeight != null) { return display.cachedTextHeight }
  if (measureText == null) {
    measureText = elt("pre");
    // Measure a bunch of lines, for browsers that compute
    // fractional heights.
    for (var i = 0; i < 49; ++i) {
      measureText.appendChild(document.createTextNode("x"));
      measureText.appendChild(elt("br"));
    }
    measureText.appendChild(document.createTextNode("x"));
  }
  removeChildrenAndAdd(display.measure, measureText);
  var height = measureText.offsetHeight / 50;
  if (height > 3) { display.cachedTextHeight = height; }
  removeChildren(display.measure);
  return height || 1
}

// Compute the default character width.
function charWidth(display) {
  if (display.cachedCharWidth != null) { return display.cachedCharWidth }
  var anchor = elt("span", "xxxxxxxxxx");
  var pre = elt("pre", [anchor]);
  removeChildrenAndAdd(display.measure, pre);
  var rect = anchor.getBoundingClientRect(), width = (rect.right - rect.left) / 10;
  if (width > 2) { display.cachedCharWidth = width; }
  return width || 10
}

// Do a bulk-read of the DOM positions and sizes needed to draw the
// view, so that we don't interleave reading and writing to the DOM.
function getDimensions(cm) {
  var d = cm.display, left = {}, width = {};
  var gutterLeft = d.gutters.clientLeft;
  for (var n = d.gutters.firstChild, i = 0; n; n = n.nextSibling, ++i) {
    left[cm.options.gutters[i]] = n.offsetLeft + n.clientLeft + gutterLeft;
    width[cm.options.gutters[i]] = n.clientWidth;
  }
  return {fixedPos: compensateForHScroll(d),
          gutterTotalWidth: d.gutters.offsetWidth,
          gutterLeft: left,
          gutterWidth: width,
          wrapperWidth: d.wrapper.clientWidth}
}

// Computes display.scroller.scrollLeft + display.gutters.offsetWidth,
// but using getBoundingClientRect to get a sub-pixel-accurate
// result.
function compensateForHScroll(display) {
  return display.scroller.getBoundingClientRect().left - display.sizer.getBoundingClientRect().left
}

// Returns a function that estimates the height of a line, to use as
// first approximation until the line becomes visible (and is thus
// properly measurable).
function estimateHeight(cm) {
  var th = textHeight(cm.display), wrapping = cm.options.lineWrapping;
  var perLine = wrapping && Math.max(5, cm.display.scroller.clientWidth / charWidth(cm.display) - 3);
  return function (line) {
    if (lineIsHidden(cm.doc, line)) { return 0 }

    var widgetsHeight = 0;
    if (line.widgets) { for (var i = 0; i < line.widgets.length; i++) {
      if (line.widgets[i].height) { widgetsHeight += line.widgets[i].height; }
    } }

    if (wrapping)
      { return widgetsHeight + (Math.ceil(line.text.length / perLine) || 1) * th }
    else
      { return widgetsHeight + th }
  }
}

function estimateLineHeights(cm) {
  var doc = cm.doc, est = estimateHeight(cm);
  doc.iter(function (line) {
    var estHeight = est(line);
    if (estHeight != line.height) { updateLineHeight(line, estHeight); }
  });
}

// Given a mouse event, find the corresponding position. If liberal
// is false, it checks whether a gutter or scrollbar was clicked,
// and returns null if it was. forRect is used by rectangular
// selections, and tries to estimate a character position even for
// coordinates beyond the right of the text.
function posFromMouse(cm, e, liberal, forRect) {
  var display = cm.display;
  if (!liberal && e_target(e).getAttribute("cm-not-content") == "true") { return null }

  var x, y, space = display.lineSpace.getBoundingClientRect();
  // Fails unpredictably on IE[67] when mouse is dragged around quickly.
  try { x = e.clientX - space.left; y = e.clientY - space.top; }
  catch (e) { return null }
  var coords = coordsChar(cm, x, y), line;
  if (forRect && coords.xRel == 1 && (line = getLine(cm.doc, coords.line).text).length == coords.ch) {
    var colDiff = countColumn(line, line.length, cm.options.tabSize) - line.length;
    coords = Pos(coords.line, Math.max(0, Math.round((x - paddingH(cm.display).left) / charWidth(cm.display)) - colDiff));
  }
  return coords
}

// Find the view element corresponding to a given line. Return null
// when the line isn't visible.
function findViewIndex(cm, n) {
  if (n >= cm.display.viewTo) { return null }
  n -= cm.display.viewFrom;
  if (n < 0) { return null }
  var view = cm.display.view;
  for (var i = 0; i < view.length; i++) {
    n -= view[i].size;
    if (n < 0) { return i }
  }
}

function updateSelection(cm) {
  cm.display.input.showSelection(cm.display.input.prepareSelection());
}

function prepareSelection(cm, primary) {
  if ( primary === void 0 ) primary = true;

  var doc = cm.doc, result = {};
  var curFragment = result.cursors = document.createDocumentFragment();
  var selFragment = result.selection = document.createDocumentFragment();

  for (var i = 0; i < doc.sel.ranges.length; i++) {
    if (!primary && i == doc.sel.primIndex) { continue }
    var range$$1 = doc.sel.ranges[i];
    if (range$$1.from().line >= cm.display.viewTo || range$$1.to().line < cm.display.viewFrom) { continue }
    var collapsed = range$$1.empty();
    if (collapsed || cm.options.showCursorWhenSelecting)
      { drawSelectionCursor(cm, range$$1.head, curFragment); }
    if (!collapsed)
      { drawSelectionRange(cm, range$$1, selFragment); }
  }
  return result
}

// Draws a cursor for the given range
function drawSelectionCursor(cm, head, output) {
  var pos = cursorCoords(cm, head, "div", null, null, !cm.options.singleCursorHeightPerLine);

  var cursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor"));
  cursor.style.left = pos.left + "px";
  cursor.style.top = pos.top + "px";
  cursor.style.height = Math.max(0, pos.bottom - pos.top) * cm.options.cursorHeight + "px";

  if (pos.other) {
    // Secondary cursor, shown when on a 'jump' in bi-directional text
    var otherCursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor CodeMirror-secondarycursor"));
    otherCursor.style.display = "";
    otherCursor.style.left = pos.other.left + "px";
    otherCursor.style.top = pos.other.top + "px";
    otherCursor.style.height = (pos.other.bottom - pos.other.top) * .85 + "px";
  }
}

function cmpCoords(a, b) { return a.top - b.top || a.left - b.left }

// Draws the given range as a highlighted selection
function drawSelectionRange(cm, range$$1, output) {
  var display = cm.display, doc = cm.doc;
  var fragment = document.createDocumentFragment();
  var padding = paddingH(cm.display), leftSide = padding.left;
  var rightSide = Math.max(display.sizerWidth, displayWidth(cm) - display.sizer.offsetLeft) - padding.right;
  var docLTR = doc.direction == "ltr";

  function add(left, top, width, bottom) {
    if (top < 0) { top = 0; }
    top = Math.round(top);
    bottom = Math.round(bottom);
    fragment.appendChild(elt("div", null, "CodeMirror-selected", ("position: absolute; left: " + left + "px;\n                             top: " + top + "px; width: " + (width == null ? rightSide - left : width) + "px;\n                             height: " + (bottom - top) + "px")));
  }

  function drawForLine(line, fromArg, toArg) {
    var lineObj = getLine(doc, line);
    var lineLen = lineObj.text.length;
    var start, end;
    function coords(ch, bias) {
      return charCoords(cm, Pos(line, ch), "div", lineObj, bias)
    }

    function wrapX(pos, dir, side) {
      var extent = wrappedLineExtentChar(cm, lineObj, null, pos);
      var prop = (dir == "ltr") == (side == "after") ? "left" : "right";
      var ch = side == "after" ? extent.begin : extent.end - (/\s/.test(lineObj.text.charAt(extent.end - 1)) ? 2 : 1);
      return coords(ch, prop)[prop]
    }

    var order = getOrder(lineObj, doc.direction);
    iterateBidiSections(order, fromArg || 0, toArg == null ? lineLen : toArg, function (from, to, dir, i) {
      var ltr = dir == "ltr";
      var fromPos = coords(from, ltr ? "left" : "right");
      var toPos = coords(to - 1, ltr ? "right" : "left");

      var openStart = fromArg == null && from == 0, openEnd = toArg == null && to == lineLen;
      var first = i == 0, last = !order || i == order.length - 1;
      if (toPos.top - fromPos.top <= 3) { // Single line
        var openLeft = (docLTR ? openStart : openEnd) && first;
        var openRight = (docLTR ? openEnd : openStart) && last;
        var left = openLeft ? leftSide : (ltr ? fromPos : toPos).left;
        var right = openRight ? rightSide : (ltr ? toPos : fromPos).right;
        add(left, fromPos.top, right - left, fromPos.bottom);
      } else { // Multiple lines
        var topLeft, topRight, botLeft, botRight;
        if (ltr) {
          topLeft = docLTR && openStart && first ? leftSide : fromPos.left;
          topRight = docLTR ? rightSide : wrapX(from, dir, "before");
          botLeft = docLTR ? leftSide : wrapX(to, dir, "after");
          botRight = docLTR && openEnd && last ? rightSide : toPos.right;
        } else {
          topLeft = !docLTR ? leftSide : wrapX(from, dir, "before");
          topRight = !docLTR && openStart && first ? rightSide : fromPos.right;
          botLeft = !docLTR && openEnd && last ? leftSide : toPos.left;
          botRight = !docLTR ? rightSide : wrapX(to, dir, "after");
        }
        add(topLeft, fromPos.top, topRight - topLeft, fromPos.bottom);
        if (fromPos.bottom < toPos.top) { add(leftSide, fromPos.bottom, null, toPos.top); }
        add(botLeft, toPos.top, botRight - botLeft, toPos.bottom);
      }

      if (!start || cmpCoords(fromPos, start) < 0) { start = fromPos; }
      if (cmpCoords(toPos, start) < 0) { start = toPos; }
      if (!end || cmpCoords(fromPos, end) < 0) { end = fromPos; }
      if (cmpCoords(toPos, end) < 0) { end = toPos; }
    });
    return {start: start, end: end}
  }

  var sFrom = range$$1.from(), sTo = range$$1.to();
  if (sFrom.line == sTo.line) {
    drawForLine(sFrom.line, sFrom.ch, sTo.ch);
  } else {
    var fromLine = getLine(doc, sFrom.line), toLine = getLine(doc, sTo.line);
    var singleVLine = visualLine(fromLine) == visualLine(toLine);
    var leftEnd = drawForLine(sFrom.line, sFrom.ch, singleVLine ? fromLine.text.length + 1 : null).end;
    var rightStart = drawForLine(sTo.line, singleVLine ? 0 : null, sTo.ch).start;
    if (singleVLine) {
      if (leftEnd.top < rightStart.top - 2) {
        add(leftEnd.right, leftEnd.top, null, leftEnd.bottom);
        add(leftSide, rightStart.top, rightStart.left, rightStart.bottom);
      } else {
        add(leftEnd.right, leftEnd.top, rightStart.left - leftEnd.right, leftEnd.bottom);
      }
    }
    if (leftEnd.bottom < rightStart.top)
      { add(leftSide, leftEnd.bottom, null, rightStart.top); }
  }

  output.appendChild(fragment);
}

// Cursor-blinking
function restartBlink(cm) {
  if (!cm.state.focused) { return }
  var display = cm.display;
  clearInterval(display.blinker);
  var on = true;
  display.cursorDiv.style.visibility = "";
  if (cm.options.cursorBlinkRate > 0)
    { display.blinker = setInterval(function () { return display.cursorDiv.style.visibility = (on = !on) ? "" : "hidden"; },
      cm.options.cursorBlinkRate); }
  else if (cm.options.cursorBlinkRate < 0)
    { display.cursorDiv.style.visibility = "hidden"; }
}

function ensureFocus(cm) {
  if (!cm.state.focused) { cm.display.input.focus(); onFocus(cm); }
}

function delayBlurEvent(cm) {
  cm.state.delayingBlurEvent = true;
  setTimeout(function () { if (cm.state.delayingBlurEvent) {
    cm.state.delayingBlurEvent = false;
    onBlur(cm);
  } }, 100);
}

function onFocus(cm, e) {
  if (cm.state.delayingBlurEvent) { cm.state.delayingBlurEvent = false; }

  if (cm.options.readOnly == "nocursor") { return }
  if (!cm.state.focused) {
    signal(cm, "focus", cm, e);
    cm.state.focused = true;
    addClass(cm.display.wrapper, "CodeMirror-focused");
    // This test prevents this from firing when a context
    // menu is closed (since the input reset would kill the
    // select-all detection hack)
    if (!cm.curOp && cm.display.selForContextMenu != cm.doc.sel) {
      cm.display.input.reset();
      if (webkit) { setTimeout(function () { return cm.display.input.reset(true); }, 20); } // Issue #1730
    }
    cm.display.input.receivedFocus();
  }
  restartBlink(cm);
}
function onBlur(cm, e) {
  if (cm.state.delayingBlurEvent) { return }

  if (cm.state.focused) {
    signal(cm, "blur", cm, e);
    cm.state.focused = false;
    rmClass(cm.display.wrapper, "CodeMirror-focused");
  }
  clearInterval(cm.display.blinker);
  setTimeout(function () { if (!cm.state.focused) { cm.display.shift = false; } }, 150);
}

// Read the actual heights of the rendered lines, and update their
// stored heights to match.
function updateHeightsInViewport(cm) {
  var display = cm.display;
  var prevBottom = display.lineDiv.offsetTop;
  for (var i = 0; i < display.view.length; i++) {
    var cur = display.view[i], height = (void 0);
    if (cur.hidden) { continue }
    if (ie && ie_version < 8) {
      var bot = cur.node.offsetTop + cur.node.offsetHeight;
      height = bot - prevBottom;
      prevBottom = bot;
    } else {
      var box = cur.node.getBoundingClientRect();
      height = box.bottom - box.top;
    }
    var diff = cur.line.height - height;
    if (height < 2) { height = textHeight(display); }
    if (diff > .005 || diff < -.005) {
      updateLineHeight(cur.line, height);
      updateWidgetHeight(cur.line);
      if (cur.rest) { for (var j = 0; j < cur.rest.length; j++)
        { updateWidgetHeight(cur.rest[j]); } }
    }
  }
}

// Read and store the height of line widgets associated with the
// given line.
function updateWidgetHeight(line) {
  if (line.widgets) { for (var i = 0; i < line.widgets.length; ++i) {
    var w = line.widgets[i], parent = w.node.parentNode;
    if (parent) { w.height = parent.offsetHeight; }
  } }
}

// Compute the lines that are visible in a given viewport (defaults
// the the current scroll position). viewport may contain top,
// height, and ensure (see op.scrollToPos) properties.
function visibleLines(display, doc, viewport) {
  var top = viewport && viewport.top != null ? Math.max(0, viewport.top) : display.scroller.scrollTop;
  top = Math.floor(top - paddingTop(display));
  var bottom = viewport && viewport.bottom != null ? viewport.bottom : top + display.wrapper.clientHeight;

  var from = lineAtHeight(doc, top), to = lineAtHeight(doc, bottom);
  // Ensure is a {from: {line, ch}, to: {line, ch}} object, and
  // forces those lines into the viewport (if possible).
  if (viewport && viewport.ensure) {
    var ensureFrom = viewport.ensure.from.line, ensureTo = viewport.ensure.to.line;
    if (ensureFrom < from) {
      from = ensureFrom;
      to = lineAtHeight(doc, heightAtLine(getLine(doc, ensureFrom)) + display.wrapper.clientHeight);
    } else if (Math.min(ensureTo, doc.lastLine()) >= to) {
      from = lineAtHeight(doc, heightAtLine(getLine(doc, ensureTo)) - display.wrapper.clientHeight);
      to = ensureTo;
    }
  }
  return {from: from, to: Math.max(to, from + 1)}
}

// Re-align line numbers and gutter marks to compensate for
// horizontal scrolling.
function alignHorizontally(cm) {
  var display = cm.display, view = display.view;
  if (!display.alignWidgets && (!display.gutters.firstChild || !cm.options.fixedGutter)) { return }
  var comp = compensateForHScroll(display) - display.scroller.scrollLeft + cm.doc.scrollLeft;
  var gutterW = display.gutters.offsetWidth, left = comp + "px";
  for (var i = 0; i < view.length; i++) { if (!view[i].hidden) {
    if (cm.options.fixedGutter) {
      if (view[i].gutter)
        { view[i].gutter.style.left = left; }
      if (view[i].gutterBackground)
        { view[i].gutterBackground.style.left = left; }
    }
    var align = view[i].alignable;
    if (align) { for (var j = 0; j < align.length; j++)
      { align[j].style.left = left; } }
  } }
  if (cm.options.fixedGutter)
    { display.gutters.style.left = (comp + gutterW) + "px"; }
}

// Used to ensure that the line number gutter is still the right
// size for the current document size. Returns true when an update
// is needed.
function maybeUpdateLineNumberWidth(cm) {
  if (!cm.options.lineNumbers) { return false }
  var doc = cm.doc, last = lineNumberFor(cm.options, doc.first + doc.size - 1), display = cm.display;
  if (last.length != display.lineNumChars) {
    var test = display.measure.appendChild(elt("div", [elt("div", last)],
                                               "CodeMirror-linenumber CodeMirror-gutter-elt"));
    var innerW = test.firstChild.offsetWidth, padding = test.offsetWidth - innerW;
    display.lineGutter.style.width = "";
    display.lineNumInnerWidth = Math.max(innerW, display.lineGutter.offsetWidth - padding) + 1;
    display.lineNumWidth = display.lineNumInnerWidth + padding;
    display.lineNumChars = display.lineNumInnerWidth ? last.length : -1;
    display.lineGutter.style.width = display.lineNumWidth + "px";
    updateGutterSpace(cm);
    return true
  }
  return false
}

// SCROLLING THINGS INTO VIEW

// If an editor sits on the top or bottom of the window, partially
// scrolled out of view, this ensures that the cursor is visible.
function maybeScrollWindow(cm, rect) {
  if (signalDOMEvent(cm, "scrollCursorIntoView")) { return }

  var display = cm.display, box = display.sizer.getBoundingClientRect(), doScroll = null;
  if (rect.top + box.top < 0) { doScroll = true; }
  else if (rect.bottom + box.top > (window.innerHeight || document.documentElement.clientHeight)) { doScroll = false; }
  if (doScroll != null && !phantom) {
    var scrollNode = elt("div", "\u200b", null, ("position: absolute;\n                         top: " + (rect.top - display.viewOffset - paddingTop(cm.display)) + "px;\n                         height: " + (rect.bottom - rect.top + scrollGap(cm) + display.barHeight) + "px;\n                         left: " + (rect.left) + "px; width: " + (Math.max(2, rect.right - rect.left)) + "px;"));
    cm.display.lineSpace.appendChild(scrollNode);
    scrollNode.scrollIntoView(doScroll);
    cm.display.lineSpace.removeChild(scrollNode);
  }
}

// Scroll a given position into view (immediately), verifying that
// it actually became visible (as line heights are accurately
// measured, the position of something may 'drift' during drawing).
function scrollPosIntoView(cm, pos, end, margin) {
  if (margin == null) { margin = 0; }
  var rect;
  if (!cm.options.lineWrapping && pos == end) {
    // Set pos and end to the cursor positions around the character pos sticks to
    // If pos.sticky == "before", that is around pos.ch - 1, otherwise around pos.ch
    // If pos == Pos(_, 0, "before"), pos and end are unchanged
    pos = pos.ch ? Pos(pos.line, pos.sticky == "before" ? pos.ch - 1 : pos.ch, "after") : pos;
    end = pos.sticky == "before" ? Pos(pos.line, pos.ch + 1, "before") : pos;
  }
  for (var limit = 0; limit < 5; limit++) {
    var changed = false;
    var coords = cursorCoords(cm, pos);
    var endCoords = !end || end == pos ? coords : cursorCoords(cm, end);
    rect = {left: Math.min(coords.left, endCoords.left),
            top: Math.min(coords.top, endCoords.top) - margin,
            right: Math.max(coords.left, endCoords.left),
            bottom: Math.max(coords.bottom, endCoords.bottom) + margin};
    var scrollPos = calculateScrollPos(cm, rect);
    var startTop = cm.doc.scrollTop, startLeft = cm.doc.scrollLeft;
    if (scrollPos.scrollTop != null) {
      updateScrollTop(cm, scrollPos.scrollTop);
      if (Math.abs(cm.doc.scrollTop - startTop) > 1) { changed = true; }
    }
    if (scrollPos.scrollLeft != null) {
      setScrollLeft(cm, scrollPos.scrollLeft);
      if (Math.abs(cm.doc.scrollLeft - startLeft) > 1) { changed = true; }
    }
    if (!changed) { break }
  }
  return rect
}

// Scroll a given set of coordinates into view (immediately).
function scrollIntoView(cm, rect) {
  var scrollPos = calculateScrollPos(cm, rect);
  if (scrollPos.scrollTop != null) { updateScrollTop(cm, scrollPos.scrollTop); }
  if (scrollPos.scrollLeft != null) { setScrollLeft(cm, scrollPos.scrollLeft); }
}

// Calculate a new scroll position needed to scroll the given
// rectangle into view. Returns an object with scrollTop and
// scrollLeft properties. When these are undefined, the
// vertical/horizontal position does not need to be adjusted.
function calculateScrollPos(cm, rect) {
  var display = cm.display, snapMargin = textHeight(cm.display);
  if (rect.top < 0) { rect.top = 0; }
  var screentop = cm.curOp && cm.curOp.scrollTop != null ? cm.curOp.scrollTop : display.scroller.scrollTop;
  var screen = displayHeight(cm), result = {};
  if (rect.bottom - rect.top > screen) { rect.bottom = rect.top + screen; }
  var docBottom = cm.doc.height + paddingVert(display);
  var atTop = rect.top < snapMargin, atBottom = rect.bottom > docBottom - snapMargin;
  if (rect.top < screentop) {
    result.scrollTop = atTop ? 0 : rect.top;
  } else if (rect.bottom > screentop + screen) {
    var newTop = Math.min(rect.top, (atBottom ? docBottom : rect.bottom) - screen);
    if (newTop != screentop) { result.scrollTop = newTop; }
  }

  var screenleft = cm.curOp && cm.curOp.scrollLeft != null ? cm.curOp.scrollLeft : display.scroller.scrollLeft;
  var screenw = displayWidth(cm) - (cm.options.fixedGutter ? display.gutters.offsetWidth : 0);
  var tooWide = rect.right - rect.left > screenw;
  if (tooWide) { rect.right = rect.left + screenw; }
  if (rect.left < 10)
    { result.scrollLeft = 0; }
  else if (rect.left < screenleft)
    { result.scrollLeft = Math.max(0, rect.left - (tooWide ? 0 : 10)); }
  else if (rect.right > screenw + screenleft - 3)
    { result.scrollLeft = rect.right + (tooWide ? 0 : 10) - screenw; }
  return result
}

// Store a relative adjustment to the scroll position in the current
// operation (to be applied when the operation finishes).
function addToScrollTop(cm, top) {
  if (top == null) { return }
  resolveScrollToPos(cm);
  cm.curOp.scrollTop = (cm.curOp.scrollTop == null ? cm.doc.scrollTop : cm.curOp.scrollTop) + top;
}

// Make sure that at the end of the operation the current cursor is
// shown.
function ensureCursorVisible(cm) {
  resolveScrollToPos(cm);
  var cur = cm.getCursor();
  cm.curOp.scrollToPos = {from: cur, to: cur, margin: cm.options.cursorScrollMargin};
}

function scrollToCoords(cm, x, y) {
  if (x != null || y != null) { resolveScrollToPos(cm); }
  if (x != null) { cm.curOp.scrollLeft = x; }
  if (y != null) { cm.curOp.scrollTop = y; }
}

function scrollToRange(cm, range$$1) {
  resolveScrollToPos(cm);
  cm.curOp.scrollToPos = range$$1;
}

// When an operation has its scrollToPos property set, and another
// scroll action is applied before the end of the operation, this
// 'simulates' scrolling that position into view in a cheap way, so
// that the effect of intermediate scroll commands is not ignored.
function resolveScrollToPos(cm) {
  var range$$1 = cm.curOp.scrollToPos;
  if (range$$1) {
    cm.curOp.scrollToPos = null;
    var from = estimateCoords(cm, range$$1.from), to = estimateCoords(cm, range$$1.to);
    scrollToCoordsRange(cm, from, to, range$$1.margin);
  }
}

function scrollToCoordsRange(cm, from, to, margin) {
  var sPos = calculateScrollPos(cm, {
    left: Math.min(from.left, to.left),
    top: Math.min(from.top, to.top) - margin,
    right: Math.max(from.right, to.right),
    bottom: Math.max(from.bottom, to.bottom) + margin
  });
  scrollToCoords(cm, sPos.scrollLeft, sPos.scrollTop);
}

// Sync the scrollable area and scrollbars, ensure the viewport
// covers the visible area.
function updateScrollTop(cm, val) {
  if (Math.abs(cm.doc.scrollTop - val) < 2) { return }
  if (!gecko) { updateDisplaySimple(cm, {top: val}); }
  setScrollTop(cm, val, true);
  if (gecko) { updateDisplaySimple(cm); }
  startWorker(cm, 100);
}

function setScrollTop(cm, val, forceScroll) {
  val = Math.min(cm.display.scroller.scrollHeight - cm.display.scroller.clientHeight, val);
  if (cm.display.scroller.scrollTop == val && !forceScroll) { return }
  cm.doc.scrollTop = val;
  cm.display.scrollbars.setScrollTop(val);
  if (cm.display.scroller.scrollTop != val) { cm.display.scroller.scrollTop = val; }
}

// Sync scroller and scrollbar, ensure the gutter elements are
// aligned.
function setScrollLeft(cm, val, isScroller, forceScroll) {
  val = Math.min(val, cm.display.scroller.scrollWidth - cm.display.scroller.clientWidth);
  if ((isScroller ? val == cm.doc.scrollLeft : Math.abs(cm.doc.scrollLeft - val) < 2) && !forceScroll) { return }
  cm.doc.scrollLeft = val;
  alignHorizontally(cm);
  if (cm.display.scroller.scrollLeft != val) { cm.display.scroller.scrollLeft = val; }
  cm.display.scrollbars.setScrollLeft(val);
}

// SCROLLBARS

// Prepare DOM reads needed to update the scrollbars. Done in one
// shot to minimize update/measure roundtrips.
function measureForScrollbars(cm) {
  var d = cm.display, gutterW = d.gutters.offsetWidth;
  var docH = Math.round(cm.doc.height + paddingVert(cm.display));
  return {
    clientHeight: d.scroller.clientHeight,
    viewHeight: d.wrapper.clientHeight,
    scrollWidth: d.scroller.scrollWidth, clientWidth: d.scroller.clientWidth,
    viewWidth: d.wrapper.clientWidth,
    barLeft: cm.options.fixedGutter ? gutterW : 0,
    docHeight: docH,
    scrollHeight: docH + scrollGap(cm) + d.barHeight,
    nativeBarWidth: d.nativeBarWidth,
    gutterWidth: gutterW
  }
}

var NativeScrollbars = function(place, scroll, cm) {
  this.cm = cm;
  var vert = this.vert = elt("div", [elt("div", null, null, "min-width: 1px")], "CodeMirror-vscrollbar");
  var horiz = this.horiz = elt("div", [elt("div", null, null, "height: 100%; min-height: 1px")], "CodeMirror-hscrollbar");
  place(vert); place(horiz);

  on(vert, "scroll", function () {
    if (vert.clientHeight) { scroll(vert.scrollTop, "vertical"); }
  });
  on(horiz, "scroll", function () {
    if (horiz.clientWidth) { scroll(horiz.scrollLeft, "horizontal"); }
  });

  this.checkedZeroWidth = false;
  // Need to set a minimum width to see the scrollbar on IE7 (but must not set it on IE8).
  if (ie && ie_version < 8) { this.horiz.style.minHeight = this.vert.style.minWidth = "18px"; }
};

NativeScrollbars.prototype.update = function (measure) {
  var needsH = measure.scrollWidth > measure.clientWidth + 1;
  var needsV = measure.scrollHeight > measure.clientHeight + 1;
  var sWidth = measure.nativeBarWidth;

  if (needsV) {
    this.vert.style.display = "block";
    this.vert.style.bottom = needsH ? sWidth + "px" : "0";
    var totalHeight = measure.viewHeight - (needsH ? sWidth : 0);
    // A bug in IE8 can cause this value to be negative, so guard it.
    this.vert.firstChild.style.height =
      Math.max(0, measure.scrollHeight - measure.clientHeight + totalHeight) + "px";
  } else {
    this.vert.style.display = "";
    this.vert.firstChild.style.height = "0";
  }

  if (needsH) {
    this.horiz.style.display = "block";
    this.horiz.style.right = needsV ? sWidth + "px" : "0";
    this.horiz.style.left = measure.barLeft + "px";
    var totalWidth = measure.viewWidth - measure.barLeft - (needsV ? sWidth : 0);
    this.horiz.firstChild.style.width =
      Math.max(0, measure.scrollWidth - measure.clientWidth + totalWidth) + "px";
  } else {
    this.horiz.style.display = "";
    this.horiz.firstChild.style.width = "0";
  }

  if (!this.checkedZeroWidth && measure.clientHeight > 0) {
    if (sWidth == 0) { this.zeroWidthHack(); }
    this.checkedZeroWidth = true;
  }

  return {right: needsV ? sWidth : 0, bottom: needsH ? sWidth : 0}
};

NativeScrollbars.prototype.setScrollLeft = function (pos) {
  if (this.horiz.scrollLeft != pos) { this.horiz.scrollLeft = pos; }
  if (this.disableHoriz) { this.enableZeroWidthBar(this.horiz, this.disableHoriz, "horiz"); }
};

NativeScrollbars.prototype.setScrollTop = function (pos) {
  if (this.vert.scrollTop != pos) { this.vert.scrollTop = pos; }
  if (this.disableVert) { this.enableZeroWidthBar(this.vert, this.disableVert, "vert"); }
};

NativeScrollbars.prototype.zeroWidthHack = function () {
  var w = mac && !mac_geMountainLion ? "12px" : "18px";
  this.horiz.style.height = this.vert.style.width = w;
  this.horiz.style.pointerEvents = this.vert.style.pointerEvents = "none";
  this.disableHoriz = new Delayed;
  this.disableVert = new Delayed;
};

NativeScrollbars.prototype.enableZeroWidthBar = function (bar, delay, type) {
  bar.style.pointerEvents = "auto";
  function maybeDisable() {
    // To find out whether the scrollbar is still visible, we
    // check whether the element under the pixel in the bottom
    // right corner of the scrollbar box is the scrollbar box
    // itself (when the bar is still visible) or its filler child
    // (when the bar is hidden). If it is still visible, we keep
    // it enabled, if it's hidden, we disable pointer events.
    var box = bar.getBoundingClientRect();
    var elt$$1 = type == "vert" ? document.elementFromPoint(box.right - 1, (box.top + box.bottom) / 2)
        : document.elementFromPoint((box.right + box.left) / 2, box.bottom - 1);
    if (elt$$1 != bar) { bar.style.pointerEvents = "none"; }
    else { delay.set(1000, maybeDisable); }
  }
  delay.set(1000, maybeDisable);
};

NativeScrollbars.prototype.clear = function () {
  var parent = this.horiz.parentNode;
  parent.removeChild(this.horiz);
  parent.removeChild(this.vert);
};

var NullScrollbars = function () {};

NullScrollbars.prototype.update = function () { return {bottom: 0, right: 0} };
NullScrollbars.prototype.setScrollLeft = function () {};
NullScrollbars.prototype.setScrollTop = function () {};
NullScrollbars.prototype.clear = function () {};

function updateScrollbars(cm, measure) {
  if (!measure) { measure = measureForScrollbars(cm); }
  var startWidth = cm.display.barWidth, startHeight = cm.display.barHeight;
  updateScrollbarsInner(cm, measure);
  for (var i = 0; i < 4 && startWidth != cm.display.barWidth || startHeight != cm.display.barHeight; i++) {
    if (startWidth != cm.display.barWidth && cm.options.lineWrapping)
      { updateHeightsInViewport(cm); }
    updateScrollbarsInner(cm, measureForScrollbars(cm));
    startWidth = cm.display.barWidth; startHeight = cm.display.barHeight;
  }
}

// Re-synchronize the fake scrollbars with the actual size of the
// content.
function updateScrollbarsInner(cm, measure) {
  var d = cm.display;
  var sizes = d.scrollbars.update(measure);

  d.sizer.style.paddingRight = (d.barWidth = sizes.right) + "px";
  d.sizer.style.paddingBottom = (d.barHeight = sizes.bottom) + "px";
  d.heightForcer.style.borderBottom = sizes.bottom + "px solid transparent";

  if (sizes.right && sizes.bottom) {
    d.scrollbarFiller.style.display = "block";
    d.scrollbarFiller.style.height = sizes.bottom + "px";
    d.scrollbarFiller.style.width = sizes.right + "px";
  } else { d.scrollbarFiller.style.display = ""; }
  if (sizes.bottom && cm.options.coverGutterNextToScrollbar && cm.options.fixedGutter) {
    d.gutterFiller.style.display = "block";
    d.gutterFiller.style.height = sizes.bottom + "px";
    d.gutterFiller.style.width = measure.gutterWidth + "px";
  } else { d.gutterFiller.style.display = ""; }
}

var scrollbarModel = {"native": NativeScrollbars, "null": NullScrollbars};

function initScrollbars(cm) {
  if (cm.display.scrollbars) {
    cm.display.scrollbars.clear();
    if (cm.display.scrollbars.addClass)
      { rmClass(cm.display.wrapper, cm.display.scrollbars.addClass); }
  }

  cm.display.scrollbars = new scrollbarModel[cm.options.scrollbarStyle](function (node) {
    cm.display.wrapper.insertBefore(node, cm.display.scrollbarFiller);
    // Prevent clicks in the scrollbars from killing focus
    on(node, "mousedown", function () {
      if (cm.state.focused) { setTimeout(function () { return cm.display.input.focus(); }, 0); }
    });
    node.setAttribute("cm-not-content", "true");
  }, function (pos, axis) {
    if (axis == "horizontal") { setScrollLeft(cm, pos); }
    else { updateScrollTop(cm, pos); }
  }, cm);
  if (cm.display.scrollbars.addClass)
    { addClass(cm.display.wrapper, cm.display.scrollbars.addClass); }
}

// Operations are used to wrap a series of changes to the editor
// state in such a way that each change won't have to update the
// cursor and display (which would be awkward, slow, and
// error-prone). Instead, display updates are batched and then all
// combined and executed at once.

var nextOpId = 0;
// Start a new operation.
function startOperation(cm) {
  cm.curOp = {
    cm: cm,
    viewChanged: false,      // Flag that indicates that lines might need to be redrawn
    startHeight: cm.doc.height, // Used to detect need to update scrollbar
    forceUpdate: false,      // Used to force a redraw
    updateInput: null,       // Whether to reset the input textarea
    typing: false,           // Whether this reset should be careful to leave existing text (for compositing)
    changeObjs: null,        // Accumulated changes, for firing change events
    cursorActivityHandlers: null, // Set of handlers to fire cursorActivity on
    cursorActivityCalled: 0, // Tracks which cursorActivity handlers have been called already
    selectionChanged: false, // Whether the selection needs to be redrawn
    updateMaxLine: false,    // Set when the widest line needs to be determined anew
    scrollLeft: null, scrollTop: null, // Intermediate scroll position, not pushed to DOM yet
    scrollToPos: null,       // Used to scroll to a specific position
    focus: false,
    id: ++nextOpId           // Unique ID
  };
  pushOperation(cm.curOp);
}

// Finish an operation, updating the display and signalling delayed events
function endOperation(cm) {
  var op = cm.curOp;
  finishOperation(op, function (group) {
    for (var i = 0; i < group.ops.length; i++)
      { group.ops[i].cm.curOp = null; }
    endOperations(group);
  });
}

// The DOM updates done when an operation finishes are batched so
// that the minimum number of relayouts are required.
function endOperations(group) {
  var ops = group.ops;
  for (var i = 0; i < ops.length; i++) // Read DOM
    { endOperation_R1(ops[i]); }
  for (var i$1 = 0; i$1 < ops.length; i$1++) // Write DOM (maybe)
    { endOperation_W1(ops[i$1]); }
  for (var i$2 = 0; i$2 < ops.length; i$2++) // Read DOM
    { endOperation_R2(ops[i$2]); }
  for (var i$3 = 0; i$3 < ops.length; i$3++) // Write DOM (maybe)
    { endOperation_W2(ops[i$3]); }
  for (var i$4 = 0; i$4 < ops.length; i$4++) // Read DOM
    { endOperation_finish(ops[i$4]); }
}

function endOperation_R1(op) {
  var cm = op.cm, display = cm.display;
  maybeClipScrollbars(cm);
  if (op.updateMaxLine) { findMaxLine(cm); }

  op.mustUpdate = op.viewChanged || op.forceUpdate || op.scrollTop != null ||
    op.scrollToPos && (op.scrollToPos.from.line < display.viewFrom ||
                       op.scrollToPos.to.line >= display.viewTo) ||
    display.maxLineChanged && cm.options.lineWrapping;
  op.update = op.mustUpdate &&
    new DisplayUpdate(cm, op.mustUpdate && {top: op.scrollTop, ensure: op.scrollToPos}, op.forceUpdate);
}

function endOperation_W1(op) {
  op.updatedDisplay = op.mustUpdate && updateDisplayIfNeeded(op.cm, op.update);
}

function endOperation_R2(op) {
  var cm = op.cm, display = cm.display;
  if (op.updatedDisplay) { updateHeightsInViewport(cm); }

  op.barMeasure = measureForScrollbars(cm);

  // If the max line changed since it was last measured, measure it,
  // and ensure the document's width matches it.
  // updateDisplay_W2 will use these properties to do the actual resizing
  if (display.maxLineChanged && !cm.options.lineWrapping) {
    op.adjustWidthTo = measureChar(cm, display.maxLine, display.maxLine.text.length).left + 3;
    cm.display.sizerWidth = op.adjustWidthTo;
    op.barMeasure.scrollWidth =
      Math.max(display.scroller.clientWidth, display.sizer.offsetLeft + op.adjustWidthTo + scrollGap(cm) + cm.display.barWidth);
    op.maxScrollLeft = Math.max(0, display.sizer.offsetLeft + op.adjustWidthTo - displayWidth(cm));
  }

  if (op.updatedDisplay || op.selectionChanged)
    { op.preparedSelection = display.input.prepareSelection(); }
}

function endOperation_W2(op) {
  var cm = op.cm;

  if (op.adjustWidthTo != null) {
    cm.display.sizer.style.minWidth = op.adjustWidthTo + "px";
    if (op.maxScrollLeft < cm.doc.scrollLeft)
      { setScrollLeft(cm, Math.min(cm.display.scroller.scrollLeft, op.maxScrollLeft), true); }
    cm.display.maxLineChanged = false;
  }

  var takeFocus = op.focus && op.focus == activeElt();
  if (op.preparedSelection)
    { cm.display.input.showSelection(op.preparedSelection, takeFocus); }
  if (op.updatedDisplay || op.startHeight != cm.doc.height)
    { updateScrollbars(cm, op.barMeasure); }
  if (op.updatedDisplay)
    { setDocumentHeight(cm, op.barMeasure); }

  if (op.selectionChanged) { restartBlink(cm); }

  if (cm.state.focused && op.updateInput)
    { cm.display.input.reset(op.typing); }
  if (takeFocus) { ensureFocus(op.cm); }
}

function endOperation_finish(op) {
  var cm = op.cm, display = cm.display, doc = cm.doc;

  if (op.updatedDisplay) { postUpdateDisplay(cm, op.update); }

  // Abort mouse wheel delta measurement, when scrolling explicitly
  if (display.wheelStartX != null && (op.scrollTop != null || op.scrollLeft != null || op.scrollToPos))
    { display.wheelStartX = display.wheelStartY = null; }

  // Propagate the scroll position to the actual DOM scroller
  if (op.scrollTop != null) { setScrollTop(cm, op.scrollTop, op.forceScroll); }

  if (op.scrollLeft != null) { setScrollLeft(cm, op.scrollLeft, true, true); }
  // If we need to scroll a specific position into view, do so.
  if (op.scrollToPos) {
    var rect = scrollPosIntoView(cm, clipPos(doc, op.scrollToPos.from),
                                 clipPos(doc, op.scrollToPos.to), op.scrollToPos.margin);
    maybeScrollWindow(cm, rect);
  }

  // Fire events for markers that are hidden/unidden by editing or
  // undoing
  var hidden = op.maybeHiddenMarkers, unhidden = op.maybeUnhiddenMarkers;
  if (hidden) { for (var i = 0; i < hidden.length; ++i)
    { if (!hidden[i].lines.length) { signal(hidden[i], "hide"); } } }
  if (unhidden) { for (var i$1 = 0; i$1 < unhidden.length; ++i$1)
    { if (unhidden[i$1].lines.length) { signal(unhidden[i$1], "unhide"); } } }

  if (display.wrapper.offsetHeight)
    { doc.scrollTop = cm.display.scroller.scrollTop; }

  // Fire change events, and delayed event handlers
  if (op.changeObjs)
    { signal(cm, "changes", cm, op.changeObjs); }
  if (op.update)
    { op.update.finish(); }
}

// Run the given function in an operation
function runInOp(cm, f) {
  if (cm.curOp) { return f() }
  startOperation(cm);
  try { return f() }
  finally { endOperation(cm); }
}
// Wraps a function in an operation. Returns the wrapped function.
function operation(cm, f) {
  return function() {
    if (cm.curOp) { return f.apply(cm, arguments) }
    startOperation(cm);
    try { return f.apply(cm, arguments) }
    finally { endOperation(cm); }
  }
}
// Used to add methods to editor and doc instances, wrapping them in
// operations.
function methodOp(f) {
  return function() {
    if (this.curOp) { return f.apply(this, arguments) }
    startOperation(this);
    try { return f.apply(this, arguments) }
    finally { endOperation(this); }
  }
}
function docMethodOp(f) {
  return function() {
    var cm = this.cm;
    if (!cm || cm.curOp) { return f.apply(this, arguments) }
    startOperation(cm);
    try { return f.apply(this, arguments) }
    finally { endOperation(cm); }
  }
}

// Updates the display.view data structure for a given change to the
// document. From and to are in pre-change coordinates. Lendiff is
// the amount of lines added or subtracted by the change. This is
// used for changes that span multiple lines, or change the way
// lines are divided into visual lines. regLineChange (below)
// registers single-line changes.
function regChange(cm, from, to, lendiff) {
  if (from == null) { from = cm.doc.first; }
  if (to == null) { to = cm.doc.first + cm.doc.size; }
  if (!lendiff) { lendiff = 0; }

  var display = cm.display;
  if (lendiff && to < display.viewTo &&
      (display.updateLineNumbers == null || display.updateLineNumbers > from))
    { display.updateLineNumbers = from; }

  cm.curOp.viewChanged = true;

  if (from >= display.viewTo) { // Change after
    if (sawCollapsedSpans && visualLineNo(cm.doc, from) < display.viewTo)
      { resetView(cm); }
  } else if (to <= display.viewFrom) { // Change before
    if (sawCollapsedSpans && visualLineEndNo(cm.doc, to + lendiff) > display.viewFrom) {
      resetView(cm);
    } else {
      display.viewFrom += lendiff;
      display.viewTo += lendiff;
    }
  } else if (from <= display.viewFrom && to >= display.viewTo) { // Full overlap
    resetView(cm);
  } else if (from <= display.viewFrom) { // Top overlap
    var cut = viewCuttingPoint(cm, to, to + lendiff, 1);
    if (cut) {
      display.view = display.view.slice(cut.index);
      display.viewFrom = cut.lineN;
      display.viewTo += lendiff;
    } else {
      resetView(cm);
    }
  } else if (to >= display.viewTo) { // Bottom overlap
    var cut$1 = viewCuttingPoint(cm, from, from, -1);
    if (cut$1) {
      display.view = display.view.slice(0, cut$1.index);
      display.viewTo = cut$1.lineN;
    } else {
      resetView(cm);
    }
  } else { // Gap in the middle
    var cutTop = viewCuttingPoint(cm, from, from, -1);
    var cutBot = viewCuttingPoint(cm, to, to + lendiff, 1);
    if (cutTop && cutBot) {
      display.view = display.view.slice(0, cutTop.index)
        .concat(buildViewArray(cm, cutTop.lineN, cutBot.lineN))
        .concat(display.view.slice(cutBot.index));
      display.viewTo += lendiff;
    } else {
      resetView(cm);
    }
  }

  var ext = display.externalMeasured;
  if (ext) {
    if (to < ext.lineN)
      { ext.lineN += lendiff; }
    else if (from < ext.lineN + ext.size)
      { display.externalMeasured = null; }
  }
}

// Register a change to a single line. Type must be one of "text",
// "gutter", "class", "widget"
function regLineChange(cm, line, type) {
  cm.curOp.viewChanged = true;
  var display = cm.display, ext = cm.display.externalMeasured;
  if (ext && line >= ext.lineN && line < ext.lineN + ext.size)
    { display.externalMeasured = null; }

  if (line < display.viewFrom || line >= display.viewTo) { return }
  var lineView = display.view[findViewIndex(cm, line)];
  if (lineView.node == null) { return }
  var arr = lineView.changes || (lineView.changes = []);
  if (indexOf(arr, type) == -1) { arr.push(type); }
}

// Clear the view.
function resetView(cm) {
  cm.display.viewFrom = cm.display.viewTo = cm.doc.first;
  cm.display.view = [];
  cm.display.viewOffset = 0;
}

function viewCuttingPoint(cm, oldN, newN, dir) {
  var index = findViewIndex(cm, oldN), diff, view = cm.display.view;
  if (!sawCollapsedSpans || newN == cm.doc.first + cm.doc.size)
    { return {index: index, lineN: newN} }
  var n = cm.display.viewFrom;
  for (var i = 0; i < index; i++)
    { n += view[i].size; }
  if (n != oldN) {
    if (dir > 0) {
      if (index == view.length - 1) { return null }
      diff = (n + view[index].size) - oldN;
      index++;
    } else {
      diff = n - oldN;
    }
    oldN += diff; newN += diff;
  }
  while (visualLineNo(cm.doc, newN) != newN) {
    if (index == (dir < 0 ? 0 : view.length - 1)) { return null }
    newN += dir * view[index - (dir < 0 ? 1 : 0)].size;
    index += dir;
  }
  return {index: index, lineN: newN}
}

// Force the view to cover a given range, adding empty view element
// or clipping off existing ones as needed.
function adjustView(cm, from, to) {
  var display = cm.display, view = display.view;
  if (view.length == 0 || from >= display.viewTo || to <= display.viewFrom) {
    display.view = buildViewArray(cm, from, to);
    display.viewFrom = from;
  } else {
    if (display.viewFrom > from)
      { display.view = buildViewArray(cm, from, display.viewFrom).concat(display.view); }
    else if (display.viewFrom < from)
      { display.view = display.view.slice(findViewIndex(cm, from)); }
    display.viewFrom = from;
    if (display.viewTo < to)
      { display.view = display.view.concat(buildViewArray(cm, display.viewTo, to)); }
    else if (display.viewTo > to)
      { display.view = display.view.slice(0, findViewIndex(cm, to)); }
  }
  display.viewTo = to;
}

// Count the number of lines in the view whose DOM representation is
// out of date (or nonexistent).
function countDirtyView(cm) {
  var view = cm.display.view, dirty = 0;
  for (var i = 0; i < view.length; i++) {
    var lineView = view[i];
    if (!lineView.hidden && (!lineView.node || lineView.changes)) { ++dirty; }
  }
  return dirty
}

// HIGHLIGHT WORKER

function startWorker(cm, time) {
  if (cm.doc.highlightFrontier < cm.display.viewTo)
    { cm.state.highlight.set(time, bind(highlightWorker, cm)); }
}

function highlightWorker(cm) {
  var doc = cm.doc;
  if (doc.highlightFrontier >= cm.display.viewTo) { return }
  var end = +new Date + cm.options.workTime;
  var context = getContextBefore(cm, doc.highlightFrontier);
  var changedLines = [];

  doc.iter(context.line, Math.min(doc.first + doc.size, cm.display.viewTo + 500), function (line) {
    if (context.line >= cm.display.viewFrom) { // Visible
      var oldStyles = line.styles;
      var resetState = line.text.length > cm.options.maxHighlightLength ? copyState(doc.mode, context.state) : null;
      var highlighted = highlightLine(cm, line, context, true);
      if (resetState) { context.state = resetState; }
      line.styles = highlighted.styles;
      var oldCls = line.styleClasses, newCls = highlighted.classes;
      if (newCls) { line.styleClasses = newCls; }
      else if (oldCls) { line.styleClasses = null; }
      var ischange = !oldStyles || oldStyles.length != line.styles.length ||
        oldCls != newCls && (!oldCls || !newCls || oldCls.bgClass != newCls.bgClass || oldCls.textClass != newCls.textClass);
      for (var i = 0; !ischange && i < oldStyles.length; ++i) { ischange = oldStyles[i] != line.styles[i]; }
      if (ischange) { changedLines.push(context.line); }
      line.stateAfter = context.save();
      context.nextLine();
    } else {
      if (line.text.length <= cm.options.maxHighlightLength)
        { processLine(cm, line.text, context); }
      line.stateAfter = context.line % 5 == 0 ? context.save() : null;
      context.nextLine();
    }
    if (+new Date > end) {
      startWorker(cm, cm.options.workDelay);
      return true
    }
  });
  doc.highlightFrontier = context.line;
  doc.modeFrontier = Math.max(doc.modeFrontier, context.line);
  if (changedLines.length) { runInOp(cm, function () {
    for (var i = 0; i < changedLines.length; i++)
      { regLineChange(cm, changedLines[i], "text"); }
  }); }
}

// DISPLAY DRAWING

var DisplayUpdate = function(cm, viewport, force) {
  var display = cm.display;

  this.viewport = viewport;
  // Store some values that we'll need later (but don't want to force a relayout for)
  this.visible = visibleLines(display, cm.doc, viewport);
  this.editorIsHidden = !display.wrapper.offsetWidth;
  this.wrapperHeight = display.wrapper.clientHeight;
  this.wrapperWidth = display.wrapper.clientWidth;
  this.oldDisplayWidth = displayWidth(cm);
  this.force = force;
  this.dims = getDimensions(cm);
  this.events = [];
};

DisplayUpdate.prototype.signal = function (emitter, type) {
  if (hasHandler(emitter, type))
    { this.events.push(arguments); }
};
DisplayUpdate.prototype.finish = function () {
    var this$1 = this;

  for (var i = 0; i < this.events.length; i++)
    { signal.apply(null, this$1.events[i]); }
};

function maybeClipScrollbars(cm) {
  var display = cm.display;
  if (!display.scrollbarsClipped && display.scroller.offsetWidth) {
    display.nativeBarWidth = display.scroller.offsetWidth - display.scroller.clientWidth;
    display.heightForcer.style.height = scrollGap(cm) + "px";
    display.sizer.style.marginBottom = -display.nativeBarWidth + "px";
    display.sizer.style.borderRightWidth = scrollGap(cm) + "px";
    display.scrollbarsClipped = true;
  }
}

function selectionSnapshot(cm) {
  if (cm.hasFocus()) { return null }
  var active = activeElt();
  if (!active || !contains(cm.display.lineDiv, active)) { return null }
  var result = {activeElt: active};
  if (window.getSelection) {
    var sel = window.getSelection();
    if (sel.anchorNode && sel.extend && contains(cm.display.lineDiv, sel.anchorNode)) {
      result.anchorNode = sel.anchorNode;
      result.anchorOffset = sel.anchorOffset;
      result.focusNode = sel.focusNode;
      result.focusOffset = sel.focusOffset;
    }
  }
  return result
}

function restoreSelection(snapshot) {
  if (!snapshot || !snapshot.activeElt || snapshot.activeElt == activeElt()) { return }
  snapshot.activeElt.focus();
  if (snapshot.anchorNode && contains(document.body, snapshot.anchorNode) && contains(document.body, snapshot.focusNode)) {
    var sel = window.getSelection(), range$$1 = document.createRange();
    range$$1.setEnd(snapshot.anchorNode, snapshot.anchorOffset);
    range$$1.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range$$1);
    sel.extend(snapshot.focusNode, snapshot.focusOffset);
  }
}

// Does the actual updating of the line display. Bails out
// (returning false) when there is nothing to be done and forced is
// false.
function updateDisplayIfNeeded(cm, update) {
  var display = cm.display, doc = cm.doc;

  if (update.editorIsHidden) {
    resetView(cm);
    return false
  }

  // Bail out if the visible area is already rendered and nothing changed.
  if (!update.force &&
      update.visible.from >= display.viewFrom && update.visible.to <= display.viewTo &&
      (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo) &&
      display.renderedView == display.view && countDirtyView(cm) == 0)
    { return false }

  if (maybeUpdateLineNumberWidth(cm)) {
    resetView(cm);
    update.dims = getDimensions(cm);
  }

  // Compute a suitable new viewport (from & to)
  var end = doc.first + doc.size;
  var from = Math.max(update.visible.from - cm.options.viewportMargin, doc.first);
  var to = Math.min(end, update.visible.to + cm.options.viewportMargin);
  if (display.viewFrom < from && from - display.viewFrom < 20) { from = Math.max(doc.first, display.viewFrom); }
  if (display.viewTo > to && display.viewTo - to < 20) { to = Math.min(end, display.viewTo); }
  if (sawCollapsedSpans) {
    from = visualLineNo(cm.doc, from);
    to = visualLineEndNo(cm.doc, to);
  }

  var different = from != display.viewFrom || to != display.viewTo ||
    display.lastWrapHeight != update.wrapperHeight || display.lastWrapWidth != update.wrapperWidth;
  adjustView(cm, from, to);

  display.viewOffset = heightAtLine(getLine(cm.doc, display.viewFrom));
  // Position the mover div to align with the current scroll position
  cm.display.mover.style.top = display.viewOffset + "px";

  var toUpdate = countDirtyView(cm);
  if (!different && toUpdate == 0 && !update.force && display.renderedView == display.view &&
      (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo))
    { return false }

  // For big changes, we hide the enclosing element during the
  // update, since that speeds up the operations on most browsers.
  var selSnapshot = selectionSnapshot(cm);
  if (toUpdate > 4) { display.lineDiv.style.display = "none"; }
  patchDisplay(cm, display.updateLineNumbers, update.dims);
  if (toUpdate > 4) { display.lineDiv.style.display = ""; }
  display.renderedView = display.view;
  // There might have been a widget with a focused element that got
  // hidden or updated, if so re-focus it.
  restoreSelection(selSnapshot);

  // Prevent selection and cursors from interfering with the scroll
  // width and height.
  removeChildren(display.cursorDiv);
  removeChildren(display.selectionDiv);
  display.gutters.style.height = display.sizer.style.minHeight = 0;

  if (different) {
    display.lastWrapHeight = update.wrapperHeight;
    display.lastWrapWidth = update.wrapperWidth;
    startWorker(cm, 400);
  }

  display.updateLineNumbers = null;

  return true
}

function postUpdateDisplay(cm, update) {
  var viewport = update.viewport;

  for (var first = true;; first = false) {
    if (!first || !cm.options.lineWrapping || update.oldDisplayWidth == displayWidth(cm)) {
      // Clip forced viewport to actual scrollable area.
      if (viewport && viewport.top != null)
        { viewport = {top: Math.min(cm.doc.height + paddingVert(cm.display) - displayHeight(cm), viewport.top)}; }
      // Updated line heights might result in the drawn area not
      // actually covering the viewport. Keep looping until it does.
      update.visible = visibleLines(cm.display, cm.doc, viewport);
      if (update.visible.from >= cm.display.viewFrom && update.visible.to <= cm.display.viewTo)
        { break }
    }
    if (!updateDisplayIfNeeded(cm, update)) { break }
    updateHeightsInViewport(cm);
    var barMeasure = measureForScrollbars(cm);
    updateSelection(cm);
    updateScrollbars(cm, barMeasure);
    setDocumentHeight(cm, barMeasure);
    update.force = false;
  }

  update.signal(cm, "update", cm);
  if (cm.display.viewFrom != cm.display.reportedViewFrom || cm.display.viewTo != cm.display.reportedViewTo) {
    update.signal(cm, "viewportChange", cm, cm.display.viewFrom, cm.display.viewTo);
    cm.display.reportedViewFrom = cm.display.viewFrom; cm.display.reportedViewTo = cm.display.viewTo;
  }
}

function updateDisplaySimple(cm, viewport) {
  var update = new DisplayUpdate(cm, viewport);
  if (updateDisplayIfNeeded(cm, update)) {
    updateHeightsInViewport(cm);
    postUpdateDisplay(cm, update);
    var barMeasure = measureForScrollbars(cm);
    updateSelection(cm);
    updateScrollbars(cm, barMeasure);
    setDocumentHeight(cm, barMeasure);
    update.finish();
  }
}

// Sync the actual display DOM structure with display.view, removing
// nodes for lines that are no longer in view, and creating the ones
// that are not there yet, and updating the ones that are out of
// date.
function patchDisplay(cm, updateNumbersFrom, dims) {
  var display = cm.display, lineNumbers = cm.options.lineNumbers;
  var container = display.lineDiv, cur = container.firstChild;

  function rm(node) {
    var next = node.nextSibling;
    // Works around a throw-scroll bug in OS X Webkit
    if (webkit && mac && cm.display.currentWheelTarget == node)
      { node.style.display = "none"; }
    else
      { node.parentNode.removeChild(node); }
    return next
  }

  var view = display.view, lineN = display.viewFrom;
  // Loop over the elements in the view, syncing cur (the DOM nodes
  // in display.lineDiv) with the view as we go.
  for (var i = 0; i < view.length; i++) {
    var lineView = view[i];
    if (lineView.hidden) {
    } else if (!lineView.node || lineView.node.parentNode != container) { // Not drawn yet
      var node = buildLineElement(cm, lineView, lineN, dims);
      container.insertBefore(node, cur);
    } else { // Already drawn
      while (cur != lineView.node) { cur = rm(cur); }
      var updateNumber = lineNumbers && updateNumbersFrom != null &&
        updateNumbersFrom <= lineN && lineView.lineNumber;
      if (lineView.changes) {
        if (indexOf(lineView.changes, "gutter") > -1) { updateNumber = false; }
        updateLineForChanges(cm, lineView, lineN, dims);
      }
      if (updateNumber) {
        removeChildren(lineView.lineNumber);
        lineView.lineNumber.appendChild(document.createTextNode(lineNumberFor(cm.options, lineN)));
      }
      cur = lineView.node.nextSibling;
    }
    lineN += lineView.size;
  }
  while (cur) { cur = rm(cur); }
}

function updateGutterSpace(cm) {
  var width = cm.display.gutters.offsetWidth;
  cm.display.sizer.style.marginLeft = width + "px";
}

function setDocumentHeight(cm, measure) {
  cm.display.sizer.style.minHeight = measure.docHeight + "px";
  cm.display.heightForcer.style.top = measure.docHeight + "px";
  cm.display.gutters.style.height = (measure.docHeight + cm.display.barHeight + scrollGap(cm)) + "px";
}

// Rebuild the gutter elements, ensure the margin to the left of the
// code matches their width.
function updateGutters(cm) {
  var gutters = cm.display.gutters, specs = cm.options.gutters;
  removeChildren(gutters);
  var i = 0;
  for (; i < specs.length; ++i) {
    var gutterClass = specs[i];
    var gElt = gutters.appendChild(elt("div", null, "CodeMirror-gutter " + gutterClass));
    if (gutterClass == "CodeMirror-linenumbers") {
      cm.display.lineGutter = gElt;
      gElt.style.width = (cm.display.lineNumWidth || 1) + "px";
    }
  }
  gutters.style.display = i ? "" : "none";
  updateGutterSpace(cm);
}

// Make sure the gutters options contains the element
// "CodeMirror-linenumbers" when the lineNumbers option is true.
function setGuttersForLineNumbers(options) {
  var found = indexOf(options.gutters, "CodeMirror-linenumbers");
  if (found == -1 && options.lineNumbers) {
    options.gutters = options.gutters.concat(["CodeMirror-linenumbers"]);
  } else if (found > -1 && !options.lineNumbers) {
    options.gutters = options.gutters.slice(0);
    options.gutters.splice(found, 1);
  }
}

// Since the delta values reported on mouse wheel events are
// unstandardized between browsers and even browser versions, and
// generally horribly unpredictable, this code starts by measuring
// the scroll effect that the first few mouse wheel events have,
// and, from that, detects the way it can convert deltas to pixel
// offsets afterwards.
//
// The reason we want to know the amount a wheel event will scroll
// is that it gives us a chance to update the display before the
// actual scrolling happens, reducing flickering.

var wheelSamples = 0;
var wheelPixelsPerUnit = null;
// Fill in a browser-detected starting value on browsers where we
// know one. These don't have to be accurate -- the result of them
// being wrong would just be a slight flicker on the first wheel
// scroll (if it is large enough).
if (ie) { wheelPixelsPerUnit = -.53; }
else if (gecko) { wheelPixelsPerUnit = 15; }
else if (chrome) { wheelPixelsPerUnit = -.7; }
else if (safari) { wheelPixelsPerUnit = -1/3; }

function wheelEventDelta(e) {
  var dx = e.wheelDeltaX, dy = e.wheelDeltaY;
  if (dx == null && e.detail && e.axis == e.HORIZONTAL_AXIS) { dx = e.detail; }
  if (dy == null && e.detail && e.axis == e.VERTICAL_AXIS) { dy = e.detail; }
  else if (dy == null) { dy = e.wheelDelta; }
  return {x: dx, y: dy}
}
function wheelEventPixels(e) {
  var delta = wheelEventDelta(e);
  delta.x *= wheelPixelsPerUnit;
  delta.y *= wheelPixelsPerUnit;
  return delta
}

function onScrollWheel(cm, e) {
  var delta = wheelEventDelta(e), dx = delta.x, dy = delta.y;

  var display = cm.display, scroll = display.scroller;
  // Quit if there's nothing to scroll here
  var canScrollX = scroll.scrollWidth > scroll.clientWidth;
  var canScrollY = scroll.scrollHeight > scroll.clientHeight;
  if (!(dx && canScrollX || dy && canScrollY)) { return }

  // Webkit browsers on OS X abort momentum scrolls when the target
  // of the scroll event is removed from the scrollable element.
  // This hack (see related code in patchDisplay) makes sure the
  // element is kept around.
  if (dy && mac && webkit) {
    outer: for (var cur = e.target, view = display.view; cur != scroll; cur = cur.parentNode) {
      for (var i = 0; i < view.length; i++) {
        if (view[i].node == cur) {
          cm.display.currentWheelTarget = cur;
          break outer
        }
      }
    }
  }

  // On some browsers, horizontal scrolling will cause redraws to
  // happen before the gutter has been realigned, causing it to
  // wriggle around in a most unseemly way. When we have an
  // estimated pixels/delta value, we just handle horizontal
  // scrolling entirely here. It'll be slightly off from native, but
  // better than glitching out.
  if (dx && !gecko && !presto && wheelPixelsPerUnit != null) {
    if (dy && canScrollY)
      { updateScrollTop(cm, Math.max(0, scroll.scrollTop + dy * wheelPixelsPerUnit)); }
    setScrollLeft(cm, Math.max(0, scroll.scrollLeft + dx * wheelPixelsPerUnit));
    // Only prevent default scrolling if vertical scrolling is
    // actually possible. Otherwise, it causes vertical scroll
    // jitter on OSX trackpads when deltaX is small and deltaY
    // is large (issue #3579)
    if (!dy || (dy && canScrollY))
      { e_preventDefault(e); }
    display.wheelStartX = null; // Abort measurement, if in progress
    return
  }

  // 'Project' the visible viewport to cover the area that is being
  // scrolled into view (if we know enough to estimate it).
  if (dy && wheelPixelsPerUnit != null) {
    var pixels = dy * wheelPixelsPerUnit;
    var top = cm.doc.scrollTop, bot = top + display.wrapper.clientHeight;
    if (pixels < 0) { top = Math.max(0, top + pixels - 50); }
    else { bot = Math.min(cm.doc.height, bot + pixels + 50); }
    updateDisplaySimple(cm, {top: top, bottom: bot});
  }

  if (wheelSamples < 20) {
    if (display.wheelStartX == null) {
      display.wheelStartX = scroll.scrollLeft; display.wheelStartY = scroll.scrollTop;
      display.wheelDX = dx; display.wheelDY = dy;
      setTimeout(function () {
        if (display.wheelStartX == null) { return }
        var movedX = scroll.scrollLeft - display.wheelStartX;
        var movedY = scroll.scrollTop - display.wheelStartY;
        var sample = (movedY && display.wheelDY && movedY / display.wheelDY) ||
          (movedX && display.wheelDX && movedX / display.wheelDX);
        display.wheelStartX = display.wheelStartY = null;
        if (!sample) { return }
        wheelPixelsPerUnit = (wheelPixelsPerUnit * wheelSamples + sample) / (wheelSamples + 1);
        ++wheelSamples;
      }, 200);
    } else {
      display.wheelDX += dx; display.wheelDY += dy;
    }
  }
}

// Selection objects are immutable. A new one is created every time
// the selection changes. A selection is one or more non-overlapping
// (and non-touching) ranges, sorted, and an integer that indicates
// which one is the primary selection (the one that's scrolled into
// view, that getCursor returns, etc).
var Selection = function(ranges, primIndex) {
  this.ranges = ranges;
  this.primIndex = primIndex;
};

Selection.prototype.primary = function () { return this.ranges[this.primIndex] };

Selection.prototype.equals = function (other) {
    var this$1 = this;

  if (other == this) { return true }
  if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length) { return false }
  for (var i = 0; i < this.ranges.length; i++) {
    var here = this$1.ranges[i], there = other.ranges[i];
    if (!equalCursorPos(here.anchor, there.anchor) || !equalCursorPos(here.head, there.head)) { return false }
  }
  return true
};

Selection.prototype.deepCopy = function () {
    var this$1 = this;

  var out = [];
  for (var i = 0; i < this.ranges.length; i++)
    { out[i] = new Range(copyPos(this$1.ranges[i].anchor), copyPos(this$1.ranges[i].head)); }
  return new Selection(out, this.primIndex)
};

Selection.prototype.somethingSelected = function () {
    var this$1 = this;

  for (var i = 0; i < this.ranges.length; i++)
    { if (!this$1.ranges[i].empty()) { return true } }
  return false
};

Selection.prototype.contains = function (pos, end) {
    var this$1 = this;

  if (!end) { end = pos; }
  for (var i = 0; i < this.ranges.length; i++) {
    var range = this$1.ranges[i];
    if (cmp(end, range.from()) >= 0 && cmp(pos, range.to()) <= 0)
      { return i }
  }
  return -1
};

var Range = function(anchor, head) {
  this.anchor = anchor; this.head = head;
};

Range.prototype.from = function () { return minPos(this.anchor, this.head) };
Range.prototype.to = function () { return maxPos(this.anchor, this.head) };
Range.prototype.empty = function () { return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch };

// Take an unsorted, potentially overlapping set of ranges, and
// build a selection out of it. 'Consumes' ranges array (modifying
// it).
function normalizeSelection(ranges, primIndex) {
  var prim = ranges[primIndex];
  ranges.sort(function (a, b) { return cmp(a.from(), b.from()); });
  primIndex = indexOf(ranges, prim);
  for (var i = 1; i < ranges.length; i++) {
    var cur = ranges[i], prev = ranges[i - 1];
    if (cmp(prev.to(), cur.from()) >= 0) {
      var from = minPos(prev.from(), cur.from()), to = maxPos(prev.to(), cur.to());
      var inv = prev.empty() ? cur.from() == cur.head : prev.from() == prev.head;
      if (i <= primIndex) { --primIndex; }
      ranges.splice(--i, 2, new Range(inv ? to : from, inv ? from : to));
    }
  }
  return new Selection(ranges, primIndex)
}

function simpleSelection(anchor, head) {
  return new Selection([new Range(anchor, head || anchor)], 0)
}

// Compute the position of the end of a change (its 'to' property
// refers to the pre-change end).
function changeEnd(change) {
  if (!change.text) { return change.to }
  return Pos(change.from.line + change.text.length - 1,
             lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0))
}

// Adjust a position to refer to the post-change position of the
// same text, or the end of the change if the change covers it.
function adjustForChange(pos, change) {
  if (cmp(pos, change.from) < 0) { return pos }
  if (cmp(pos, change.to) <= 0) { return changeEnd(change) }

  var line = pos.line + change.text.length - (change.to.line - change.from.line) - 1, ch = pos.ch;
  if (pos.line == change.to.line) { ch += changeEnd(change).ch - change.to.ch; }
  return Pos(line, ch)
}

function computeSelAfterChange(doc, change) {
  var out = [];
  for (var i = 0; i < doc.sel.ranges.length; i++) {
    var range = doc.sel.ranges[i];
    out.push(new Range(adjustForChange(range.anchor, change),
                       adjustForChange(range.head, change)));
  }
  return normalizeSelection(out, doc.sel.primIndex)
}

function offsetPos(pos, old, nw) {
  if (pos.line == old.line)
    { return Pos(nw.line, pos.ch - old.ch + nw.ch) }
  else
    { return Pos(nw.line + (pos.line - old.line), pos.ch) }
}

// Used by replaceSelections to allow moving the selection to the
// start or around the replaced test. Hint may be "start" or "around".
function computeReplacedSel(doc, changes, hint) {
  var out = [];
  var oldPrev = Pos(doc.first, 0), newPrev = oldPrev;
  for (var i = 0; i < changes.length; i++) {
    var change = changes[i];
    var from = offsetPos(change.from, oldPrev, newPrev);
    var to = offsetPos(changeEnd(change), oldPrev, newPrev);
    oldPrev = change.to;
    newPrev = to;
    if (hint == "around") {
      var range = doc.sel.ranges[i], inv = cmp(range.head, range.anchor) < 0;
      out[i] = new Range(inv ? to : from, inv ? from : to);
    } else {
      out[i] = new Range(from, from);
    }
  }
  return new Selection(out, doc.sel.primIndex)
}

// Used to get the editor into a consistent state again when options change.

function loadMode(cm) {
  cm.doc.mode = getMode(cm.options, cm.doc.modeOption);
  resetModeState(cm);
}

function resetModeState(cm) {
  cm.doc.iter(function (line) {
    if (line.stateAfter) { line.stateAfter = null; }
    if (line.styles) { line.styles = null; }
  });
  cm.doc.modeFrontier = cm.doc.highlightFrontier = cm.doc.first;
  startWorker(cm, 100);
  cm.state.modeGen++;
  if (cm.curOp) { regChange(cm); }
}

// DOCUMENT DATA STRUCTURE

// By default, updates that start and end at the beginning of a line
// are treated specially, in order to make the association of line
// widgets and marker elements with the text behave more intuitive.
function isWholeLineUpdate(doc, change) {
  return change.from.ch == 0 && change.to.ch == 0 && lst(change.text) == "" &&
    (!doc.cm || doc.cm.options.wholeLineUpdateBefore)
}

// Perform a change on the document data structure.
function updateDoc(doc, change, markedSpans, estimateHeight$$1) {
  function spansFor(n) {return markedSpans ? markedSpans[n] : null}
  function update(line, text, spans) {
    updateLine(line, text, spans, estimateHeight$$1);
    signalLater(line, "change", line, change);
  }
  function linesFor(start, end) {
    var result = [];
    for (var i = start; i < end; ++i)
      { result.push(new Line(text[i], spansFor(i), estimateHeight$$1)); }
    return result
  }

  var from = change.from, to = change.to, text = change.text;
  var firstLine = getLine(doc, from.line), lastLine = getLine(doc, to.line);
  var lastText = lst(text), lastSpans = spansFor(text.length - 1), nlines = to.line - from.line;

  // Adjust the line structure
  if (change.full) {
    doc.insert(0, linesFor(0, text.length));
    doc.remove(text.length, doc.size - text.length);
  } else if (isWholeLineUpdate(doc, change)) {
    // This is a whole-line replace. Treated specially to make
    // sure line objects move the way they are supposed to.
    var added = linesFor(0, text.length - 1);
    update(lastLine, lastLine.text, lastSpans);
    if (nlines) { doc.remove(from.line, nlines); }
    if (added.length) { doc.insert(from.line, added); }
  } else if (firstLine == lastLine) {
    if (text.length == 1) {
      update(firstLine, firstLine.text.slice(0, from.ch) + lastText + firstLine.text.slice(to.ch), lastSpans);
    } else {
      var added$1 = linesFor(1, text.length - 1);
      added$1.push(new Line(lastText + firstLine.text.slice(to.ch), lastSpans, estimateHeight$$1));
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
      doc.insert(from.line + 1, added$1);
    }
  } else if (text.length == 1) {
    update(firstLine, firstLine.text.slice(0, from.ch) + text[0] + lastLine.text.slice(to.ch), spansFor(0));
    doc.remove(from.line + 1, nlines);
  } else {
    update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
    update(lastLine, lastText + lastLine.text.slice(to.ch), lastSpans);
    var added$2 = linesFor(1, text.length - 1);
    if (nlines > 1) { doc.remove(from.line + 1, nlines - 1); }
    doc.insert(from.line + 1, added$2);
  }

  signalLater(doc, "change", doc, change);
}

// Call f for all linked documents.
function linkedDocs(doc, f, sharedHistOnly) {
  function propagate(doc, skip, sharedHist) {
    if (doc.linked) { for (var i = 0; i < doc.linked.length; ++i) {
      var rel = doc.linked[i];
      if (rel.doc == skip) { continue }
      var shared = sharedHist && rel.sharedHist;
      if (sharedHistOnly && !shared) { continue }
      f(rel.doc, shared);
      propagate(rel.doc, doc, shared);
    } }
  }
  propagate(doc, null, true);
}

// Attach a document to an editor.
function attachDoc(cm, doc) {
  if (doc.cm) { throw new Error("This document is already in use.") }
  cm.doc = doc;
  doc.cm = cm;
  estimateLineHeights(cm);
  loadMode(cm);
  setDirectionClass(cm);
  if (!cm.options.lineWrapping) { findMaxLine(cm); }
  cm.options.mode = doc.modeOption;
  regChange(cm);
}

function setDirectionClass(cm) {
  (cm.doc.direction == "rtl" ? addClass : rmClass)(cm.display.lineDiv, "CodeMirror-rtl");
}

function directionChanged(cm) {
  runInOp(cm, function () {
    setDirectionClass(cm);
    regChange(cm);
  });
}

function History(startGen) {
  // Arrays of change events and selections. Doing something adds an
  // event to done and clears undo. Undoing moves events from done
  // to undone, redoing moves them in the other direction.
  this.done = []; this.undone = [];
  this.undoDepth = Infinity;
  // Used to track when changes can be merged into a single undo
  // event
  this.lastModTime = this.lastSelTime = 0;
  this.lastOp = this.lastSelOp = null;
  this.lastOrigin = this.lastSelOrigin = null;
  // Used by the isClean() method
  this.generation = this.maxGeneration = startGen || 1;
}

// Create a history change event from an updateDoc-style change
// object.
function historyChangeFromChange(doc, change) {
  var histChange = {from: copyPos(change.from), to: changeEnd(change), text: getBetween(doc, change.from, change.to)};
  attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
  linkedDocs(doc, function (doc) { return attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1); }, true);
  return histChange
}

// Pop all selection events off the end of a history array. Stop at
// a change event.
function clearSelectionEvents(array) {
  while (array.length) {
    var last = lst(array);
    if (last.ranges) { array.pop(); }
    else { break }
  }
}

// Find the top change event in the history. Pop off selection
// events that are in the way.
function lastChangeEvent(hist, force) {
  if (force) {
    clearSelectionEvents(hist.done);
    return lst(hist.done)
  } else if (hist.done.length && !lst(hist.done).ranges) {
    return lst(hist.done)
  } else if (hist.done.length > 1 && !hist.done[hist.done.length - 2].ranges) {
    hist.done.pop();
    return lst(hist.done)
  }
}

// Register a change in the history. Merges changes that are within
// a single operation, or are close together with an origin that
// allows merging (starting with "+") into a single event.
function addChangeToHistory(doc, change, selAfter, opId) {
  var hist = doc.history;
  hist.undone.length = 0;
  var time = +new Date, cur;
  var last;

  if ((hist.lastOp == opId ||
       hist.lastOrigin == change.origin && change.origin &&
       ((change.origin.charAt(0) == "+" && doc.cm && hist.lastModTime > time - doc.cm.options.historyEventDelay) ||
        change.origin.charAt(0) == "*")) &&
      (cur = lastChangeEvent(hist, hist.lastOp == opId))) {
    // Merge this change into the last event
    last = lst(cur.changes);
    if (cmp(change.from, change.to) == 0 && cmp(change.from, last.to) == 0) {
      // Optimized case for simple insertion -- don't want to add
      // new changesets for every character typed
      last.to = changeEnd(change);
    } else {
      // Add new sub-event
      cur.changes.push(historyChangeFromChange(doc, change));
    }
  } else {
    // Can not be merged, start a new event.
    var before = lst(hist.done);
    if (!before || !before.ranges)
      { pushSelectionToHistory(doc.sel, hist.done); }
    cur = {changes: [historyChangeFromChange(doc, change)],
           generation: hist.generation};
    hist.done.push(cur);
    while (hist.done.length > hist.undoDepth) {
      hist.done.shift();
      if (!hist.done[0].ranges) { hist.done.shift(); }
    }
  }
  hist.done.push(selAfter);
  hist.generation = ++hist.maxGeneration;
  hist.lastModTime = hist.lastSelTime = time;
  hist.lastOp = hist.lastSelOp = opId;
  hist.lastOrigin = hist.lastSelOrigin = change.origin;

  if (!last) { signal(doc, "historyAdded"); }
}

function selectionEventCanBeMerged(doc, origin, prev, sel) {
  var ch = origin.charAt(0);
  return ch == "*" ||
    ch == "+" &&
    prev.ranges.length == sel.ranges.length &&
    prev.somethingSelected() == sel.somethingSelected() &&
    new Date - doc.history.lastSelTime <= (doc.cm ? doc.cm.options.historyEventDelay : 500)
}

// Called whenever the selection changes, sets the new selection as
// the pending selection in the history, and pushes the old pending
// selection into the 'done' array when it was significantly
// different (in number of selected ranges, emptiness, or time).
function addSelectionToHistory(doc, sel, opId, options) {
  var hist = doc.history, origin = options && options.origin;

  // A new event is started when the previous origin does not match
  // the current, or the origins don't allow matching. Origins
  // starting with * are always merged, those starting with + are
  // merged when similar and close together in time.
  if (opId == hist.lastSelOp ||
      (origin && hist.lastSelOrigin == origin &&
       (hist.lastModTime == hist.lastSelTime && hist.lastOrigin == origin ||
        selectionEventCanBeMerged(doc, origin, lst(hist.done), sel))))
    { hist.done[hist.done.length - 1] = sel; }
  else
    { pushSelectionToHistory(sel, hist.done); }

  hist.lastSelTime = +new Date;
  hist.lastSelOrigin = origin;
  hist.lastSelOp = opId;
  if (options && options.clearRedo !== false)
    { clearSelectionEvents(hist.undone); }
}

function pushSelectionToHistory(sel, dest) {
  var top = lst(dest);
  if (!(top && top.ranges && top.equals(sel)))
    { dest.push(sel); }
}

// Used to store marked span information in the history.
function attachLocalSpans(doc, change, from, to) {
  var existing = change["spans_" + doc.id], n = 0;
  doc.iter(Math.max(doc.first, from), Math.min(doc.first + doc.size, to), function (line) {
    if (line.markedSpans)
      { (existing || (existing = change["spans_" + doc.id] = {}))[n] = line.markedSpans; }
    ++n;
  });
}

// When un/re-doing restores text containing marked spans, those
// that have been explicitly cleared should not be restored.
function removeClearedSpans(spans) {
  if (!spans) { return null }
  var out;
  for (var i = 0; i < spans.length; ++i) {
    if (spans[i].marker.explicitlyCleared) { if (!out) { out = spans.slice(0, i); } }
    else if (out) { out.push(spans[i]); }
  }
  return !out ? spans : out.length ? out : null
}

// Retrieve and filter the old marked spans stored in a change event.
function getOldSpans(doc, change) {
  var found = change["spans_" + doc.id];
  if (!found) { return null }
  var nw = [];
  for (var i = 0; i < change.text.length; ++i)
    { nw.push(removeClearedSpans(found[i])); }
  return nw
}

// Used for un/re-doing changes from the history. Combines the
// result of computing the existing spans with the set of spans that
// existed in the history (so that deleting around a span and then
// undoing brings back the span).
function mergeOldSpans(doc, change) {
  var old = getOldSpans(doc, change);
  var stretched = stretchSpansOverChange(doc, change);
  if (!old) { return stretched }
  if (!stretched) { return old }

  for (var i = 0; i < old.length; ++i) {
    var oldCur = old[i], stretchCur = stretched[i];
    if (oldCur && stretchCur) {
      spans: for (var j = 0; j < stretchCur.length; ++j) {
        var span = stretchCur[j];
        for (var k = 0; k < oldCur.length; ++k)
          { if (oldCur[k].marker == span.marker) { continue spans } }
        oldCur.push(span);
      }
    } else if (stretchCur) {
      old[i] = stretchCur;
    }
  }
  return old
}

// Used both to provide a JSON-safe object in .getHistory, and, when
// detaching a document, to split the history in two
function copyHistoryArray(events, newGroup, instantiateSel) {
  var copy = [];
  for (var i = 0; i < events.length; ++i) {
    var event = events[i];
    if (event.ranges) {
      copy.push(instantiateSel ? Selection.prototype.deepCopy.call(event) : event);
      continue
    }
    var changes = event.changes, newChanges = [];
    copy.push({changes: newChanges});
    for (var j = 0; j < changes.length; ++j) {
      var change = changes[j], m = (void 0);
      newChanges.push({from: change.from, to: change.to, text: change.text});
      if (newGroup) { for (var prop in change) { if (m = prop.match(/^spans_(\d+)$/)) {
        if (indexOf(newGroup, Number(m[1])) > -1) {
          lst(newChanges)[prop] = change[prop];
          delete change[prop];
        }
      } } }
    }
  }
  return copy
}

// The 'scroll' parameter given to many of these indicated whether
// the new cursor position should be scrolled into view after
// modifying the selection.

// If shift is held or the extend flag is set, extends a range to
// include a given position (and optionally a second position).
// Otherwise, simply returns the range between the given positions.
// Used for cursor motion and such.
function extendRange(range, head, other, extend) {
  if (extend) {
    var anchor = range.anchor;
    if (other) {
      var posBefore = cmp(head, anchor) < 0;
      if (posBefore != (cmp(other, anchor) < 0)) {
        anchor = head;
        head = other;
      } else if (posBefore != (cmp(head, other) < 0)) {
        head = other;
      }
    }
    return new Range(anchor, head)
  } else {
    return new Range(other || head, head)
  }
}

// Extend the primary selection range, discard the rest.
function extendSelection(doc, head, other, options, extend) {
  if (extend == null) { extend = doc.cm && (doc.cm.display.shift || doc.extend); }
  setSelection(doc, new Selection([extendRange(doc.sel.primary(), head, other, extend)], 0), options);
}

// Extend all selections (pos is an array of selections with length
// equal the number of selections)
function extendSelections(doc, heads, options) {
  var out = [];
  var extend = doc.cm && (doc.cm.display.shift || doc.extend);
  for (var i = 0; i < doc.sel.ranges.length; i++)
    { out[i] = extendRange(doc.sel.ranges[i], heads[i], null, extend); }
  var newSel = normalizeSelection(out, doc.sel.primIndex);
  setSelection(doc, newSel, options);
}

// Updates a single range in the selection.
function replaceOneSelection(doc, i, range, options) {
  var ranges = doc.sel.ranges.slice(0);
  ranges[i] = range;
  setSelection(doc, normalizeSelection(ranges, doc.sel.primIndex), options);
}

// Reset the selection to a single range.
function setSimpleSelection(doc, anchor, head, options) {
  setSelection(doc, simpleSelection(anchor, head), options);
}

// Give beforeSelectionChange handlers a change to influence a
// selection update.
function filterSelectionChange(doc, sel, options) {
  var obj = {
    ranges: sel.ranges,
    update: function(ranges) {
      var this$1 = this;

      this.ranges = [];
      for (var i = 0; i < ranges.length; i++)
        { this$1.ranges[i] = new Range(clipPos(doc, ranges[i].anchor),
                                   clipPos(doc, ranges[i].head)); }
    },
    origin: options && options.origin
  };
  signal(doc, "beforeSelectionChange", doc, obj);
  if (doc.cm) { signal(doc.cm, "beforeSelectionChange", doc.cm, obj); }
  if (obj.ranges != sel.ranges) { return normalizeSelection(obj.ranges, obj.ranges.length - 1) }
  else { return sel }
}

function setSelectionReplaceHistory(doc, sel, options) {
  var done = doc.history.done, last = lst(done);
  if (last && last.ranges) {
    done[done.length - 1] = sel;
    setSelectionNoUndo(doc, sel, options);
  } else {
    setSelection(doc, sel, options);
  }
}

// Set a new selection.
function setSelection(doc, sel, options) {
  setSelectionNoUndo(doc, sel, options);
  addSelectionToHistory(doc, doc.sel, doc.cm ? doc.cm.curOp.id : NaN, options);
}

function setSelectionNoUndo(doc, sel, options) {
  if (hasHandler(doc, "beforeSelectionChange") || doc.cm && hasHandler(doc.cm, "beforeSelectionChange"))
    { sel = filterSelectionChange(doc, sel, options); }

  var bias = options && options.bias ||
    (cmp(sel.primary().head, doc.sel.primary().head) < 0 ? -1 : 1);
  setSelectionInner(doc, skipAtomicInSelection(doc, sel, bias, true));

  if (!(options && options.scroll === false) && doc.cm)
    { ensureCursorVisible(doc.cm); }
}

function setSelectionInner(doc, sel) {
  if (sel.equals(doc.sel)) { return }

  doc.sel = sel;

  if (doc.cm) {
    doc.cm.curOp.updateInput = doc.cm.curOp.selectionChanged = true;
    signalCursorActivity(doc.cm);
  }
  signalLater(doc, "cursorActivity", doc);
}

// Verify that the selection does not partially select any atomic
// marked ranges.
function reCheckSelection(doc) {
  setSelectionInner(doc, skipAtomicInSelection(doc, doc.sel, null, false));
}

// Return a selection that does not partially select any atomic
// ranges.
function skipAtomicInSelection(doc, sel, bias, mayClear) {
  var out;
  for (var i = 0; i < sel.ranges.length; i++) {
    var range = sel.ranges[i];
    var old = sel.ranges.length == doc.sel.ranges.length && doc.sel.ranges[i];
    var newAnchor = skipAtomic(doc, range.anchor, old && old.anchor, bias, mayClear);
    var newHead = skipAtomic(doc, range.head, old && old.head, bias, mayClear);
    if (out || newAnchor != range.anchor || newHead != range.head) {
      if (!out) { out = sel.ranges.slice(0, i); }
      out[i] = new Range(newAnchor, newHead);
    }
  }
  return out ? normalizeSelection(out, sel.primIndex) : sel
}

function skipAtomicInner(doc, pos, oldPos, dir, mayClear) {
  var line = getLine(doc, pos.line);
  if (line.markedSpans) { for (var i = 0; i < line.markedSpans.length; ++i) {
    var sp = line.markedSpans[i], m = sp.marker;
    if ((sp.from == null || (m.inclusiveLeft ? sp.from <= pos.ch : sp.from < pos.ch)) &&
        (sp.to == null || (m.inclusiveRight ? sp.to >= pos.ch : sp.to > pos.ch))) {
      if (mayClear) {
        signal(m, "beforeCursorEnter");
        if (m.explicitlyCleared) {
          if (!line.markedSpans) { break }
          else {--i; continue}
        }
      }
      if (!m.atomic) { continue }

      if (oldPos) {
        var near = m.find(dir < 0 ? 1 : -1), diff = (void 0);
        if (dir < 0 ? m.inclusiveRight : m.inclusiveLeft)
          { near = movePos(doc, near, -dir, near && near.line == pos.line ? line : null); }
        if (near && near.line == pos.line && (diff = cmp(near, oldPos)) && (dir < 0 ? diff < 0 : diff > 0))
          { return skipAtomicInner(doc, near, pos, dir, mayClear) }
      }

      var far = m.find(dir < 0 ? -1 : 1);
      if (dir < 0 ? m.inclusiveLeft : m.inclusiveRight)
        { far = movePos(doc, far, dir, far.line == pos.line ? line : null); }
      return far ? skipAtomicInner(doc, far, pos, dir, mayClear) : null
    }
  } }
  return pos
}

// Ensure a given position is not inside an atomic range.
function skipAtomic(doc, pos, oldPos, bias, mayClear) {
  var dir = bias || 1;
  var found = skipAtomicInner(doc, pos, oldPos, dir, mayClear) ||
      (!mayClear && skipAtomicInner(doc, pos, oldPos, dir, true)) ||
      skipAtomicInner(doc, pos, oldPos, -dir, mayClear) ||
      (!mayClear && skipAtomicInner(doc, pos, oldPos, -dir, true));
  if (!found) {
    doc.cantEdit = true;
    return Pos(doc.first, 0)
  }
  return found
}

function movePos(doc, pos, dir, line) {
  if (dir < 0 && pos.ch == 0) {
    if (pos.line > doc.first) { return clipPos(doc, Pos(pos.line - 1)) }
    else { return null }
  } else if (dir > 0 && pos.ch == (line || getLine(doc, pos.line)).text.length) {
    if (pos.line < doc.first + doc.size - 1) { return Pos(pos.line + 1, 0) }
    else { return null }
  } else {
    return new Pos(pos.line, pos.ch + dir)
  }
}

function selectAll(cm) {
  cm.setSelection(Pos(cm.firstLine(), 0), Pos(cm.lastLine()), sel_dontScroll);
}

// UPDATING

// Allow "beforeChange" event handlers to influence a change
function filterChange(doc, change, update) {
  var obj = {
    canceled: false,
    from: change.from,
    to: change.to,
    text: change.text,
    origin: change.origin,
    cancel: function () { return obj.canceled = true; }
  };
  if (update) { obj.update = function (from, to, text, origin) {
    if (from) { obj.from = clipPos(doc, from); }
    if (to) { obj.to = clipPos(doc, to); }
    if (text) { obj.text = text; }
    if (origin !== undefined) { obj.origin = origin; }
  }; }
  signal(doc, "beforeChange", doc, obj);
  if (doc.cm) { signal(doc.cm, "beforeChange", doc.cm, obj); }

  if (obj.canceled) { return null }
  return {from: obj.from, to: obj.to, text: obj.text, origin: obj.origin}
}

// Apply a change to a document, and add it to the document's
// history, and propagating it to all linked documents.
function makeChange(doc, change, ignoreReadOnly) {
  if (doc.cm) {
    if (!doc.cm.curOp) { return operation(doc.cm, makeChange)(doc, change, ignoreReadOnly) }
    if (doc.cm.state.suppressEdits) { return }
  }

  if (hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange")) {
    change = filterChange(doc, change, true);
    if (!change) { return }
  }

  // Possibly split or suppress the update based on the presence
  // of read-only spans in its range.
  var split = sawReadOnlySpans && !ignoreReadOnly && removeReadOnlyRanges(doc, change.from, change.to);
  if (split) {
    for (var i = split.length - 1; i >= 0; --i)
      { makeChangeInner(doc, {from: split[i].from, to: split[i].to, text: i ? [""] : change.text, origin: change.origin}); }
  } else {
    makeChangeInner(doc, change);
  }
}

function makeChangeInner(doc, change) {
  if (change.text.length == 1 && change.text[0] == "" && cmp(change.from, change.to) == 0) { return }
  var selAfter = computeSelAfterChange(doc, change);
  addChangeToHistory(doc, change, selAfter, doc.cm ? doc.cm.curOp.id : NaN);

  makeChangeSingleDoc(doc, change, selAfter, stretchSpansOverChange(doc, change));
  var rebased = [];

  linkedDocs(doc, function (doc, sharedHist) {
    if (!sharedHist && indexOf(rebased, doc.history) == -1) {
      rebaseHist(doc.history, change);
      rebased.push(doc.history);
    }
    makeChangeSingleDoc(doc, change, null, stretchSpansOverChange(doc, change));
  });
}

// Revert a change stored in a document's history.
function makeChangeFromHistory(doc, type, allowSelectionOnly) {
  if (doc.cm && doc.cm.state.suppressEdits && !allowSelectionOnly) { return }

  var hist = doc.history, event, selAfter = doc.sel;
  var source = type == "undo" ? hist.done : hist.undone, dest = type == "undo" ? hist.undone : hist.done;

  // Verify that there is a useable event (so that ctrl-z won't
  // needlessly clear selection events)
  var i = 0;
  for (; i < source.length; i++) {
    event = source[i];
    if (allowSelectionOnly ? event.ranges && !event.equals(doc.sel) : !event.ranges)
      { break }
  }
  if (i == source.length) { return }
  hist.lastOrigin = hist.lastSelOrigin = null;

  for (;;) {
    event = source.pop();
    if (event.ranges) {
      pushSelectionToHistory(event, dest);
      if (allowSelectionOnly && !event.equals(doc.sel)) {
        setSelection(doc, event, {clearRedo: false});
        return
      }
      selAfter = event;
    }
    else { break }
  }

  // Build up a reverse change object to add to the opposite history
  // stack (redo when undoing, and vice versa).
  var antiChanges = [];
  pushSelectionToHistory(selAfter, dest);
  dest.push({changes: antiChanges, generation: hist.generation});
  hist.generation = event.generation || ++hist.maxGeneration;

  var filter = hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange");

  var loop = function ( i ) {
    var change = event.changes[i];
    change.origin = type;
    if (filter && !filterChange(doc, change, false)) {
      source.length = 0;
      return {}
    }

    antiChanges.push(historyChangeFromChange(doc, change));

    var after = i ? computeSelAfterChange(doc, change) : lst(source);
    makeChangeSingleDoc(doc, change, after, mergeOldSpans(doc, change));
    if (!i && doc.cm) { doc.cm.scrollIntoView({from: change.from, to: changeEnd(change)}); }
    var rebased = [];

    // Propagate to the linked documents
    linkedDocs(doc, function (doc, sharedHist) {
      if (!sharedHist && indexOf(rebased, doc.history) == -1) {
        rebaseHist(doc.history, change);
        rebased.push(doc.history);
      }
      makeChangeSingleDoc(doc, change, null, mergeOldSpans(doc, change));
    });
  };

  for (var i$1 = event.changes.length - 1; i$1 >= 0; --i$1) {
    var returned = loop( i$1 );

    if ( returned ) return returned.v;
  }
}

// Sub-views need their line numbers shifted when text is added
// above or below them in the parent document.
function shiftDoc(doc, distance) {
  if (distance == 0) { return }
  doc.first += distance;
  doc.sel = new Selection(map(doc.sel.ranges, function (range) { return new Range(
    Pos(range.anchor.line + distance, range.anchor.ch),
    Pos(range.head.line + distance, range.head.ch)
  ); }), doc.sel.primIndex);
  if (doc.cm) {
    regChange(doc.cm, doc.first, doc.first - distance, distance);
    for (var d = doc.cm.display, l = d.viewFrom; l < d.viewTo; l++)
      { regLineChange(doc.cm, l, "gutter"); }
  }
}

// More lower-level change function, handling only a single document
// (not linked ones).
function makeChangeSingleDoc(doc, change, selAfter, spans) {
  if (doc.cm && !doc.cm.curOp)
    { return operation(doc.cm, makeChangeSingleDoc)(doc, change, selAfter, spans) }

  if (change.to.line < doc.first) {
    shiftDoc(doc, change.text.length - 1 - (change.to.line - change.from.line));
    return
  }
  if (change.from.line > doc.lastLine()) { return }

  // Clip the change to the size of this doc
  if (change.from.line < doc.first) {
    var shift = change.text.length - 1 - (doc.first - change.from.line);
    shiftDoc(doc, shift);
    change = {from: Pos(doc.first, 0), to: Pos(change.to.line + shift, change.to.ch),
              text: [lst(change.text)], origin: change.origin};
  }
  var last = doc.lastLine();
  if (change.to.line > last) {
    change = {from: change.from, to: Pos(last, getLine(doc, last).text.length),
              text: [change.text[0]], origin: change.origin};
  }

  change.removed = getBetween(doc, change.from, change.to);

  if (!selAfter) { selAfter = computeSelAfterChange(doc, change); }
  if (doc.cm) { makeChangeSingleDocInEditor(doc.cm, change, spans); }
  else { updateDoc(doc, change, spans); }
  setSelectionNoUndo(doc, selAfter, sel_dontScroll);
}

// Handle the interaction of a change to a document with the editor
// that this document is part of.
function makeChangeSingleDocInEditor(cm, change, spans) {
  var doc = cm.doc, display = cm.display, from = change.from, to = change.to;

  var recomputeMaxLength = false, checkWidthStart = from.line;
  if (!cm.options.lineWrapping) {
    checkWidthStart = lineNo(visualLine(getLine(doc, from.line)));
    doc.iter(checkWidthStart, to.line + 1, function (line) {
      if (line == display.maxLine) {
        recomputeMaxLength = true;
        return true
      }
    });
  }

  if (doc.sel.contains(change.from, change.to) > -1)
    { signalCursorActivity(cm); }

  updateDoc(doc, change, spans, estimateHeight(cm));

  if (!cm.options.lineWrapping) {
    doc.iter(checkWidthStart, from.line + change.text.length, function (line) {
      var len = lineLength(line);
      if (len > display.maxLineLength) {
        display.maxLine = line;
        display.maxLineLength = len;
        display.maxLineChanged = true;
        recomputeMaxLength = false;
      }
    });
    if (recomputeMaxLength) { cm.curOp.updateMaxLine = true; }
  }

  retreatFrontier(doc, from.line);
  startWorker(cm, 400);

  var lendiff = change.text.length - (to.line - from.line) - 1;
  // Remember that these lines changed, for updating the display
  if (change.full)
    { regChange(cm); }
  else if (from.line == to.line && change.text.length == 1 && !isWholeLineUpdate(cm.doc, change))
    { regLineChange(cm, from.line, "text"); }
  else
    { regChange(cm, from.line, to.line + 1, lendiff); }

  var changesHandler = hasHandler(cm, "changes"), changeHandler = hasHandler(cm, "change");
  if (changeHandler || changesHandler) {
    var obj = {
      from: from, to: to,
      text: change.text,
      removed: change.removed,
      origin: change.origin
    };
    if (changeHandler) { signalLater(cm, "change", cm, obj); }
    if (changesHandler) { (cm.curOp.changeObjs || (cm.curOp.changeObjs = [])).push(obj); }
  }
  cm.display.selForContextMenu = null;
}

function replaceRange(doc, code, from, to, origin) {
  if (!to) { to = from; }
  if (cmp(to, from) < 0) { var assign;
    (assign = [to, from], from = assign[0], to = assign[1], assign); }
  if (typeof code == "string") { code = doc.splitLines(code); }
  makeChange(doc, {from: from, to: to, text: code, origin: origin});
}

// Rebasing/resetting history to deal with externally-sourced changes

function rebaseHistSelSingle(pos, from, to, diff) {
  if (to < pos.line) {
    pos.line += diff;
  } else if (from < pos.line) {
    pos.line = from;
    pos.ch = 0;
  }
}

// Tries to rebase an array of history events given a change in the
// document. If the change touches the same lines as the event, the
// event, and everything 'behind' it, is discarded. If the change is
// before the event, the event's positions are updated. Uses a
// copy-on-write scheme for the positions, to avoid having to
// reallocate them all on every rebase, but also avoid problems with
// shared position objects being unsafely updated.
function rebaseHistArray(array, from, to, diff) {
  for (var i = 0; i < array.length; ++i) {
    var sub = array[i], ok = true;
    if (sub.ranges) {
      if (!sub.copied) { sub = array[i] = sub.deepCopy(); sub.copied = true; }
      for (var j = 0; j < sub.ranges.length; j++) {
        rebaseHistSelSingle(sub.ranges[j].anchor, from, to, diff);
        rebaseHistSelSingle(sub.ranges[j].head, from, to, diff);
      }
      continue
    }
    for (var j$1 = 0; j$1 < sub.changes.length; ++j$1) {
      var cur = sub.changes[j$1];
      if (to < cur.from.line) {
        cur.from = Pos(cur.from.line + diff, cur.from.ch);
        cur.to = Pos(cur.to.line + diff, cur.to.ch);
      } else if (from <= cur.to.line) {
        ok = false;
        break
      }
    }
    if (!ok) {
      array.splice(0, i + 1);
      i = 0;
    }
  }
}

function rebaseHist(hist, change) {
  var from = change.from.line, to = change.to.line, diff = change.text.length - (to - from) - 1;
  rebaseHistArray(hist.done, from, to, diff);
  rebaseHistArray(hist.undone, from, to, diff);
}

// Utility for applying a change to a line by handle or number,
// returning the number and optionally registering the line as
// changed.
function changeLine(doc, handle, changeType, op) {
  var no = handle, line = handle;
  if (typeof handle == "number") { line = getLine(doc, clipLine(doc, handle)); }
  else { no = lineNo(handle); }
  if (no == null) { return null }
  if (op(line, no) && doc.cm) { regLineChange(doc.cm, no, changeType); }
  return line
}

// The document is represented as a BTree consisting of leaves, with
// chunk of lines in them, and branches, with up to ten leaves or
// other branch nodes below them. The top node is always a branch
// node, and is the document object itself (meaning it has
// additional methods and properties).
//
// All nodes have parent links. The tree is used both to go from
// line numbers to line objects, and to go from objects to numbers.
// It also indexes by height, and is used to convert between height
// and line object, and to find the total height of the document.
//
// See also http://marijnhaverbeke.nl/blog/codemirror-line-tree.html

function LeafChunk(lines) {
  var this$1 = this;

  this.lines = lines;
  this.parent = null;
  var height = 0;
  for (var i = 0; i < lines.length; ++i) {
    lines[i].parent = this$1;
    height += lines[i].height;
  }
  this.height = height;
}

LeafChunk.prototype = {
  chunkSize: function chunkSize() { return this.lines.length },

  // Remove the n lines at offset 'at'.
  removeInner: function removeInner(at, n) {
    var this$1 = this;

    for (var i = at, e = at + n; i < e; ++i) {
      var line = this$1.lines[i];
      this$1.height -= line.height;
      cleanUpLine(line);
      signalLater(line, "delete");
    }
    this.lines.splice(at, n);
  },

  // Helper used to collapse a small branch into a single leaf.
  collapse: function collapse(lines) {
    lines.push.apply(lines, this.lines);
  },

  // Insert the given array of lines at offset 'at', count them as
  // having the given height.
  insertInner: function insertInner(at, lines, height) {
    var this$1 = this;

    this.height += height;
    this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at));
    for (var i = 0; i < lines.length; ++i) { lines[i].parent = this$1; }
  },

  // Used to iterate over a part of the tree.
  iterN: function iterN(at, n, op) {
    var this$1 = this;

    for (var e = at + n; at < e; ++at)
      { if (op(this$1.lines[at])) { return true } }
  }
};

function BranchChunk(children) {
  var this$1 = this;

  this.children = children;
  var size = 0, height = 0;
  for (var i = 0; i < children.length; ++i) {
    var ch = children[i];
    size += ch.chunkSize(); height += ch.height;
    ch.parent = this$1;
  }
  this.size = size;
  this.height = height;
  this.parent = null;
}

BranchChunk.prototype = {
  chunkSize: function chunkSize() { return this.size },

  removeInner: function removeInner(at, n) {
    var this$1 = this;

    this.size -= n;
    for (var i = 0; i < this.children.length; ++i) {
      var child = this$1.children[i], sz = child.chunkSize();
      if (at < sz) {
        var rm = Math.min(n, sz - at), oldHeight = child.height;
        child.removeInner(at, rm);
        this$1.height -= oldHeight - child.height;
        if (sz == rm) { this$1.children.splice(i--, 1); child.parent = null; }
        if ((n -= rm) == 0) { break }
        at = 0;
      } else { at -= sz; }
    }
    // If the result is smaller than 25 lines, ensure that it is a
    // single leaf node.
    if (this.size - n < 25 &&
        (this.children.length > 1 || !(this.children[0] instanceof LeafChunk))) {
      var lines = [];
      this.collapse(lines);
      this.children = [new LeafChunk(lines)];
      this.children[0].parent = this;
    }
  },

  collapse: function collapse(lines) {
    var this$1 = this;

    for (var i = 0; i < this.children.length; ++i) { this$1.children[i].collapse(lines); }
  },

  insertInner: function insertInner(at, lines, height) {
    var this$1 = this;

    this.size += lines.length;
    this.height += height;
    for (var i = 0; i < this.children.length; ++i) {
      var child = this$1.children[i], sz = child.chunkSize();
      if (at <= sz) {
        child.insertInner(at, lines, height);
        if (child.lines && child.lines.length > 50) {
          // To avoid memory thrashing when child.lines is huge (e.g. first view of a large file), it's never spliced.
          // Instead, small slices are taken. They're taken in order because sequential memory accesses are fastest.
          var remaining = child.lines.length % 25 + 25;
          for (var pos = remaining; pos < child.lines.length;) {
            var leaf = new LeafChunk(child.lines.slice(pos, pos += 25));
            child.height -= leaf.height;
            this$1.children.splice(++i, 0, leaf);
            leaf.parent = this$1;
          }
          child.lines = child.lines.slice(0, remaining);
          this$1.maybeSpill();
        }
        break
      }
      at -= sz;
    }
  },

  // When a node has grown, check whether it should be split.
  maybeSpill: function maybeSpill() {
    if (this.children.length <= 10) { return }
    var me = this;
    do {
      var spilled = me.children.splice(me.children.length - 5, 5);
      var sibling = new BranchChunk(spilled);
      if (!me.parent) { // Become the parent node
        var copy = new BranchChunk(me.children);
        copy.parent = me;
        me.children = [copy, sibling];
        me = copy;
     } else {
        me.size -= sibling.size;
        me.height -= sibling.height;
        var myIndex = indexOf(me.parent.children, me);
        me.parent.children.splice(myIndex + 1, 0, sibling);
      }
      sibling.parent = me.parent;
    } while (me.children.length > 10)
    me.parent.maybeSpill();
  },

  iterN: function iterN(at, n, op) {
    var this$1 = this;

    for (var i = 0; i < this.children.length; ++i) {
      var child = this$1.children[i], sz = child.chunkSize();
      if (at < sz) {
        var used = Math.min(n, sz - at);
        if (child.iterN(at, used, op)) { return true }
        if ((n -= used) == 0) { break }
        at = 0;
      } else { at -= sz; }
    }
  }
};

// Line widgets are block elements displayed above or below a line.

var LineWidget = function(doc, node, options) {
  var this$1 = this;

  if (options) { for (var opt in options) { if (options.hasOwnProperty(opt))
    { this$1[opt] = options[opt]; } } }
  this.doc = doc;
  this.node = node;
};

LineWidget.prototype.clear = function () {
    var this$1 = this;

  var cm = this.doc.cm, ws = this.line.widgets, line = this.line, no = lineNo(line);
  if (no == null || !ws) { return }
  for (var i = 0; i < ws.length; ++i) { if (ws[i] == this$1) { ws.splice(i--, 1); } }
  if (!ws.length) { line.widgets = null; }
  var height = widgetHeight(this);
  updateLineHeight(line, Math.max(0, line.height - height));
  if (cm) {
    runInOp(cm, function () {
      adjustScrollWhenAboveVisible(cm, line, -height);
      regLineChange(cm, no, "widget");
    });
    signalLater(cm, "lineWidgetCleared", cm, this, no);
  }
};

LineWidget.prototype.changed = function () {
    var this$1 = this;

  var oldH = this.height, cm = this.doc.cm, line = this.line;
  this.height = null;
  var diff = widgetHeight(this) - oldH;
  if (!diff) { return }
  updateLineHeight(line, line.height + diff);
  if (cm) {
    runInOp(cm, function () {
      cm.curOp.forceUpdate = true;
      adjustScrollWhenAboveVisible(cm, line, diff);
      signalLater(cm, "lineWidgetChanged", cm, this$1, lineNo(line));
    });
  }
};
eventMixin(LineWidget);

function adjustScrollWhenAboveVisible(cm, line, diff) {
  if (heightAtLine(line) < ((cm.curOp && cm.curOp.scrollTop) || cm.doc.scrollTop))
    { addToScrollTop(cm, diff); }
}

function addLineWidget(doc, handle, node, options) {
  var widget = new LineWidget(doc, node, options);
  var cm = doc.cm;
  if (cm && widget.noHScroll) { cm.display.alignWidgets = true; }
  changeLine(doc, handle, "widget", function (line) {
    var widgets = line.widgets || (line.widgets = []);
    if (widget.insertAt == null) { widgets.push(widget); }
    else { widgets.splice(Math.min(widgets.length - 1, Math.max(0, widget.insertAt)), 0, widget); }
    widget.line = line;
    if (cm && !lineIsHidden(doc, line)) {
      var aboveVisible = heightAtLine(line) < doc.scrollTop;
      updateLineHeight(line, line.height + widgetHeight(widget));
      if (aboveVisible) { addToScrollTop(cm, widget.height); }
      cm.curOp.forceUpdate = true;
    }
    return true
  });
  signalLater(cm, "lineWidgetAdded", cm, widget, typeof handle == "number" ? handle : lineNo(handle));
  return widget
}

// TEXTMARKERS

// Created with markText and setBookmark methods. A TextMarker is a
// handle that can be used to clear or find a marked position in the
// document. Line objects hold arrays (markedSpans) containing
// {from, to, marker} object pointing to such marker objects, and
// indicating that such a marker is present on that line. Multiple
// lines may point to the same marker when it spans across lines.
// The spans will have null for their from/to properties when the
// marker continues beyond the start/end of the line. Markers have
// links back to the lines they currently touch.

// Collapsed markers have unique ids, in order to be able to order
// them, which is needed for uniquely determining an outer marker
// when they overlap (they may nest, but not partially overlap).
var nextMarkerId = 0;

var TextMarker = function(doc, type) {
  this.lines = [];
  this.type = type;
  this.doc = doc;
  this.id = ++nextMarkerId;
};

// Clear the marker.
TextMarker.prototype.clear = function () {
    var this$1 = this;

  if (this.explicitlyCleared) { return }
  var cm = this.doc.cm, withOp = cm && !cm.curOp;
  if (withOp) { startOperation(cm); }
  if (hasHandler(this, "clear")) {
    var found = this.find();
    if (found) { signalLater(this, "clear", found.from, found.to); }
  }
  var min = null, max = null;
  for (var i = 0; i < this.lines.length; ++i) {
    var line = this$1.lines[i];
    var span = getMarkedSpanFor(line.markedSpans, this$1);
    if (cm && !this$1.collapsed) { regLineChange(cm, lineNo(line), "text"); }
    else if (cm) {
      if (span.to != null) { max = lineNo(line); }
      if (span.from != null) { min = lineNo(line); }
    }
    line.markedSpans = removeMarkedSpan(line.markedSpans, span);
    if (span.from == null && this$1.collapsed && !lineIsHidden(this$1.doc, line) && cm)
      { updateLineHeight(line, textHeight(cm.display)); }
  }
  if (cm && this.collapsed && !cm.options.lineWrapping) { for (var i$1 = 0; i$1 < this.lines.length; ++i$1) {
    var visual = visualLine(this$1.lines[i$1]), len = lineLength(visual);
    if (len > cm.display.maxLineLength) {
      cm.display.maxLine = visual;
      cm.display.maxLineLength = len;
      cm.display.maxLineChanged = true;
    }
  } }

  if (min != null && cm && this.collapsed) { regChange(cm, min, max + 1); }
  this.lines.length = 0;
  this.explicitlyCleared = true;
  if (this.atomic && this.doc.cantEdit) {
    this.doc.cantEdit = false;
    if (cm) { reCheckSelection(cm.doc); }
  }
  if (cm) { signalLater(cm, "markerCleared", cm, this, min, max); }
  if (withOp) { endOperation(cm); }
  if (this.parent) { this.parent.clear(); }
};

// Find the position of the marker in the document. Returns a {from,
// to} object by default. Side can be passed to get a specific side
// -- 0 (both), -1 (left), or 1 (right). When lineObj is true, the
// Pos objects returned contain a line object, rather than a line
// number (used to prevent looking up the same line twice).
TextMarker.prototype.find = function (side, lineObj) {
    var this$1 = this;

  if (side == null && this.type == "bookmark") { side = 1; }
  var from, to;
  for (var i = 0; i < this.lines.length; ++i) {
    var line = this$1.lines[i];
    var span = getMarkedSpanFor(line.markedSpans, this$1);
    if (span.from != null) {
      from = Pos(lineObj ? line : lineNo(line), span.from);
      if (side == -1) { return from }
    }
    if (span.to != null) {
      to = Pos(lineObj ? line : lineNo(line), span.to);
      if (side == 1) { return to }
    }
  }
  return from && {from: from, to: to}
};

// Signals that the marker's widget changed, and surrounding layout
// should be recomputed.
TextMarker.prototype.changed = function () {
    var this$1 = this;

  var pos = this.find(-1, true), widget = this, cm = this.doc.cm;
  if (!pos || !cm) { return }
  runInOp(cm, function () {
    var line = pos.line, lineN = lineNo(pos.line);
    var view = findViewForLine(cm, lineN);
    if (view) {
      clearLineMeasurementCacheFor(view);
      cm.curOp.selectionChanged = cm.curOp.forceUpdate = true;
    }
    cm.curOp.updateMaxLine = true;
    if (!lineIsHidden(widget.doc, line) && widget.height != null) {
      var oldHeight = widget.height;
      widget.height = null;
      var dHeight = widgetHeight(widget) - oldHeight;
      if (dHeight)
        { updateLineHeight(line, line.height + dHeight); }
    }
    signalLater(cm, "markerChanged", cm, this$1);
  });
};

TextMarker.prototype.attachLine = function (line) {
  if (!this.lines.length && this.doc.cm) {
    var op = this.doc.cm.curOp;
    if (!op.maybeHiddenMarkers || indexOf(op.maybeHiddenMarkers, this) == -1)
      { (op.maybeUnhiddenMarkers || (op.maybeUnhiddenMarkers = [])).push(this); }
  }
  this.lines.push(line);
};

TextMarker.prototype.detachLine = function (line) {
  this.lines.splice(indexOf(this.lines, line), 1);
  if (!this.lines.length && this.doc.cm) {
    var op = this.doc.cm.curOp;(op.maybeHiddenMarkers || (op.maybeHiddenMarkers = [])).push(this);
  }
};
eventMixin(TextMarker);

// Create a marker, wire it up to the right lines, and
function markText(doc, from, to, options, type) {
  // Shared markers (across linked documents) are handled separately
  // (markTextShared will call out to this again, once per
  // document).
  if (options && options.shared) { return markTextShared(doc, from, to, options, type) }
  // Ensure we are in an operation.
  if (doc.cm && !doc.cm.curOp) { return operation(doc.cm, markText)(doc, from, to, options, type) }

  var marker = new TextMarker(doc, type), diff = cmp(from, to);
  if (options) { copyObj(options, marker, false); }
  // Don't connect empty markers unless clearWhenEmpty is false
  if (diff > 0 || diff == 0 && marker.clearWhenEmpty !== false)
    { return marker }
  if (marker.replacedWith) {
    // Showing up as a widget implies collapsed (widget replaces text)
    marker.collapsed = true;
    marker.widgetNode = eltP("span", [marker.replacedWith], "CodeMirror-widget");
    if (!options.handleMouseEvents) { marker.widgetNode.setAttribute("cm-ignore-events", "true"); }
    if (options.insertLeft) { marker.widgetNode.insertLeft = true; }
  }
  if (marker.collapsed) {
    if (conflictingCollapsedRange(doc, from.line, from, to, marker) ||
        from.line != to.line && conflictingCollapsedRange(doc, to.line, from, to, marker))
      { throw new Error("Inserting collapsed marker partially overlapping an existing one") }
    seeCollapsedSpans();
  }

  if (marker.addToHistory)
    { addChangeToHistory(doc, {from: from, to: to, origin: "markText"}, doc.sel, NaN); }

  var curLine = from.line, cm = doc.cm, updateMaxLine;
  doc.iter(curLine, to.line + 1, function (line) {
    if (cm && marker.collapsed && !cm.options.lineWrapping && visualLine(line) == cm.display.maxLine)
      { updateMaxLine = true; }
    if (marker.collapsed && curLine != from.line) { updateLineHeight(line, 0); }
    addMarkedSpan(line, new MarkedSpan(marker,
                                       curLine == from.line ? from.ch : null,
                                       curLine == to.line ? to.ch : null));
    ++curLine;
  });
  // lineIsHidden depends on the presence of the spans, so needs a second pass
  if (marker.collapsed) { doc.iter(from.line, to.line + 1, function (line) {
    if (lineIsHidden(doc, line)) { updateLineHeight(line, 0); }
  }); }

  if (marker.clearOnEnter) { on(marker, "beforeCursorEnter", function () { return marker.clear(); }); }

  if (marker.readOnly) {
    seeReadOnlySpans();
    if (doc.history.done.length || doc.history.undone.length)
      { doc.clearHistory(); }
  }
  if (marker.collapsed) {
    marker.id = ++nextMarkerId;
    marker.atomic = true;
  }
  if (cm) {
    // Sync editor state
    if (updateMaxLine) { cm.curOp.updateMaxLine = true; }
    if (marker.collapsed)
      { regChange(cm, from.line, to.line + 1); }
    else if (marker.className || marker.title || marker.startStyle || marker.endStyle || marker.css)
      { for (var i = from.line; i <= to.line; i++) { regLineChange(cm, i, "text"); } }
    if (marker.atomic) { reCheckSelection(cm.doc); }
    signalLater(cm, "markerAdded", cm, marker);
  }
  return marker
}

// SHARED TEXTMARKERS

// A shared marker spans multiple linked documents. It is
// implemented as a meta-marker-object controlling multiple normal
// markers.
var SharedTextMarker = function(markers, primary) {
  var this$1 = this;

  this.markers = markers;
  this.primary = primary;
  for (var i = 0; i < markers.length; ++i)
    { markers[i].parent = this$1; }
};

SharedTextMarker.prototype.clear = function () {
    var this$1 = this;

  if (this.explicitlyCleared) { return }
  this.explicitlyCleared = true;
  for (var i = 0; i < this.markers.length; ++i)
    { this$1.markers[i].clear(); }
  signalLater(this, "clear");
};

SharedTextMarker.prototype.find = function (side, lineObj) {
  return this.primary.find(side, lineObj)
};
eventMixin(SharedTextMarker);

function markTextShared(doc, from, to, options, type) {
  options = copyObj(options);
  options.shared = false;
  var markers = [markText(doc, from, to, options, type)], primary = markers[0];
  var widget = options.widgetNode;
  linkedDocs(doc, function (doc) {
    if (widget) { options.widgetNode = widget.cloneNode(true); }
    markers.push(markText(doc, clipPos(doc, from), clipPos(doc, to), options, type));
    for (var i = 0; i < doc.linked.length; ++i)
      { if (doc.linked[i].isParent) { return } }
    primary = lst(markers);
  });
  return new SharedTextMarker(markers, primary)
}

function findSharedMarkers(doc) {
  return doc.findMarks(Pos(doc.first, 0), doc.clipPos(Pos(doc.lastLine())), function (m) { return m.parent; })
}

function copySharedMarkers(doc, markers) {
  for (var i = 0; i < markers.length; i++) {
    var marker = markers[i], pos = marker.find();
    var mFrom = doc.clipPos(pos.from), mTo = doc.clipPos(pos.to);
    if (cmp(mFrom, mTo)) {
      var subMark = markText(doc, mFrom, mTo, marker.primary, marker.primary.type);
      marker.markers.push(subMark);
      subMark.parent = marker;
    }
  }
}

function detachSharedMarkers(markers) {
  var loop = function ( i ) {
    var marker = markers[i], linked = [marker.primary.doc];
    linkedDocs(marker.primary.doc, function (d) { return linked.push(d); });
    for (var j = 0; j < marker.markers.length; j++) {
      var subMarker = marker.markers[j];
      if (indexOf(linked, subMarker.doc) == -1) {
        subMarker.parent = null;
        marker.markers.splice(j--, 1);
      }
    }
  };

  for (var i = 0; i < markers.length; i++) loop( i );
}

var nextDocId = 0;
var Doc = function(text, mode, firstLine, lineSep, direction) {
  if (!(this instanceof Doc)) { return new Doc(text, mode, firstLine, lineSep, direction) }
  if (firstLine == null) { firstLine = 0; }

  BranchChunk.call(this, [new LeafChunk([new Line("", null)])]);
  this.first = firstLine;
  this.scrollTop = this.scrollLeft = 0;
  this.cantEdit = false;
  this.cleanGeneration = 1;
  this.modeFrontier = this.highlightFrontier = firstLine;
  var start = Pos(firstLine, 0);
  this.sel = simpleSelection(start);
  this.history = new History(null);
  this.id = ++nextDocId;
  this.modeOption = mode;
  this.lineSep = lineSep;
  this.direction = (direction == "rtl") ? "rtl" : "ltr";
  this.extend = false;

  if (typeof text == "string") { text = this.splitLines(text); }
  updateDoc(this, {from: start, to: start, text: text});
  setSelection(this, simpleSelection(start), sel_dontScroll);
};

Doc.prototype = createObj(BranchChunk.prototype, {
  constructor: Doc,
  // Iterate over the document. Supports two forms -- with only one
  // argument, it calls that for each line in the document. With
  // three, it iterates over the range given by the first two (with
  // the second being non-inclusive).
  iter: function(from, to, op) {
    if (op) { this.iterN(from - this.first, to - from, op); }
    else { this.iterN(this.first, this.first + this.size, from); }
  },

  // Non-public interface for adding and removing lines.
  insert: function(at, lines) {
    var height = 0;
    for (var i = 0; i < lines.length; ++i) { height += lines[i].height; }
    this.insertInner(at - this.first, lines, height);
  },
  remove: function(at, n) { this.removeInner(at - this.first, n); },

  // From here, the methods are part of the public interface. Most
  // are also available from CodeMirror (editor) instances.

  getValue: function(lineSep) {
    var lines = getLines(this, this.first, this.first + this.size);
    if (lineSep === false) { return lines }
    return lines.join(lineSep || this.lineSeparator())
  },
  setValue: docMethodOp(function(code) {
    var top = Pos(this.first, 0), last = this.first + this.size - 1;
    makeChange(this, {from: top, to: Pos(last, getLine(this, last).text.length),
                      text: this.splitLines(code), origin: "setValue", full: true}, true);
    if (this.cm) { scrollToCoords(this.cm, 0, 0); }
    setSelection(this, simpleSelection(top), sel_dontScroll);
  }),
  replaceRange: function(code, from, to, origin) {
    from = clipPos(this, from);
    to = to ? clipPos(this, to) : from;
    replaceRange(this, code, from, to, origin);
  },
  getRange: function(from, to, lineSep) {
    var lines = getBetween(this, clipPos(this, from), clipPos(this, to));
    if (lineSep === false) { return lines }
    return lines.join(lineSep || this.lineSeparator())
  },

  getLine: function(line) {var l = this.getLineHandle(line); return l && l.text},

  getLineHandle: function(line) {if (isLine(this, line)) { return getLine(this, line) }},
  getLineNumber: function(line) {return lineNo(line)},

  getLineHandleVisualStart: function(line) {
    if (typeof line == "number") { line = getLine(this, line); }
    return visualLine(line)
  },

  lineCount: function() {return this.size},
  firstLine: function() {return this.first},
  lastLine: function() {return this.first + this.size - 1},

  clipPos: function(pos) {return clipPos(this, pos)},

  getCursor: function(start) {
    var range$$1 = this.sel.primary(), pos;
    if (start == null || start == "head") { pos = range$$1.head; }
    else if (start == "anchor") { pos = range$$1.anchor; }
    else if (start == "end" || start == "to" || start === false) { pos = range$$1.to(); }
    else { pos = range$$1.from(); }
    return pos
  },
  listSelections: function() { return this.sel.ranges },
  somethingSelected: function() {return this.sel.somethingSelected()},

  setCursor: docMethodOp(function(line, ch, options) {
    setSimpleSelection(this, clipPos(this, typeof line == "number" ? Pos(line, ch || 0) : line), null, options);
  }),
  setSelection: docMethodOp(function(anchor, head, options) {
    setSimpleSelection(this, clipPos(this, anchor), clipPos(this, head || anchor), options);
  }),
  extendSelection: docMethodOp(function(head, other, options) {
    extendSelection(this, clipPos(this, head), other && clipPos(this, other), options);
  }),
  extendSelections: docMethodOp(function(heads, options) {
    extendSelections(this, clipPosArray(this, heads), options);
  }),
  extendSelectionsBy: docMethodOp(function(f, options) {
    var heads = map(this.sel.ranges, f);
    extendSelections(this, clipPosArray(this, heads), options);
  }),
  setSelections: docMethodOp(function(ranges, primary, options) {
    var this$1 = this;

    if (!ranges.length) { return }
    var out = [];
    for (var i = 0; i < ranges.length; i++)
      { out[i] = new Range(clipPos(this$1, ranges[i].anchor),
                         clipPos(this$1, ranges[i].head)); }
    if (primary == null) { primary = Math.min(ranges.length - 1, this.sel.primIndex); }
    setSelection(this, normalizeSelection(out, primary), options);
  }),
  addSelection: docMethodOp(function(anchor, head, options) {
    var ranges = this.sel.ranges.slice(0);
    ranges.push(new Range(clipPos(this, anchor), clipPos(this, head || anchor)));
    setSelection(this, normalizeSelection(ranges, ranges.length - 1), options);
  }),

  getSelection: function(lineSep) {
    var this$1 = this;

    var ranges = this.sel.ranges, lines;
    for (var i = 0; i < ranges.length; i++) {
      var sel = getBetween(this$1, ranges[i].from(), ranges[i].to());
      lines = lines ? lines.concat(sel) : sel;
    }
    if (lineSep === false) { return lines }
    else { return lines.join(lineSep || this.lineSeparator()) }
  },
  getSelections: function(lineSep) {
    var this$1 = this;

    var parts = [], ranges = this.sel.ranges;
    for (var i = 0; i < ranges.length; i++) {
      var sel = getBetween(this$1, ranges[i].from(), ranges[i].to());
      if (lineSep !== false) { sel = sel.join(lineSep || this$1.lineSeparator()); }
      parts[i] = sel;
    }
    return parts
  },
  replaceSelection: function(code, collapse, origin) {
    var dup = [];
    for (var i = 0; i < this.sel.ranges.length; i++)
      { dup[i] = code; }
    this.replaceSelections(dup, collapse, origin || "+input");
  },
  replaceSelections: docMethodOp(function(code, collapse, origin) {
    var this$1 = this;

    var changes = [], sel = this.sel;
    for (var i = 0; i < sel.ranges.length; i++) {
      var range$$1 = sel.ranges[i];
      changes[i] = {from: range$$1.from(), to: range$$1.to(), text: this$1.splitLines(code[i]), origin: origin};
    }
    var newSel = collapse && collapse != "end" && computeReplacedSel(this, changes, collapse);
    for (var i$1 = changes.length - 1; i$1 >= 0; i$1--)
      { makeChange(this$1, changes[i$1]); }
    if (newSel) { setSelectionReplaceHistory(this, newSel); }
    else if (this.cm) { ensureCursorVisible(this.cm); }
  }),
  undo: docMethodOp(function() {makeChangeFromHistory(this, "undo");}),
  redo: docMethodOp(function() {makeChangeFromHistory(this, "redo");}),
  undoSelection: docMethodOp(function() {makeChangeFromHistory(this, "undo", true);}),
  redoSelection: docMethodOp(function() {makeChangeFromHistory(this, "redo", true);}),

  setExtending: function(val) {this.extend = val;},
  getExtending: function() {return this.extend},

  historySize: function() {
    var hist = this.history, done = 0, undone = 0;
    for (var i = 0; i < hist.done.length; i++) { if (!hist.done[i].ranges) { ++done; } }
    for (var i$1 = 0; i$1 < hist.undone.length; i$1++) { if (!hist.undone[i$1].ranges) { ++undone; } }
    return {undo: done, redo: undone}
  },
  clearHistory: function() {this.history = new History(this.history.maxGeneration);},

  markClean: function() {
    this.cleanGeneration = this.changeGeneration(true);
  },
  changeGeneration: function(forceSplit) {
    if (forceSplit)
      { this.history.lastOp = this.history.lastSelOp = this.history.lastOrigin = null; }
    return this.history.generation
  },
  isClean: function (gen) {
    return this.history.generation == (gen || this.cleanGeneration)
  },

  getHistory: function() {
    return {done: copyHistoryArray(this.history.done),
            undone: copyHistoryArray(this.history.undone)}
  },
  setHistory: function(histData) {
    var hist = this.history = new History(this.history.maxGeneration);
    hist.done = copyHistoryArray(histData.done.slice(0), null, true);
    hist.undone = copyHistoryArray(histData.undone.slice(0), null, true);
  },

  setGutterMarker: docMethodOp(function(line, gutterID, value) {
    return changeLine(this, line, "gutter", function (line) {
      var markers = line.gutterMarkers || (line.gutterMarkers = {});
      markers[gutterID] = value;
      if (!value && isEmpty(markers)) { line.gutterMarkers = null; }
      return true
    })
  }),

  clearGutter: docMethodOp(function(gutterID) {
    var this$1 = this;

    this.iter(function (line) {
      if (line.gutterMarkers && line.gutterMarkers[gutterID]) {
        changeLine(this$1, line, "gutter", function () {
          line.gutterMarkers[gutterID] = null;
          if (isEmpty(line.gutterMarkers)) { line.gutterMarkers = null; }
          return true
        });
      }
    });
  }),

  lineInfo: function(line) {
    var n;
    if (typeof line == "number") {
      if (!isLine(this, line)) { return null }
      n = line;
      line = getLine(this, line);
      if (!line) { return null }
    } else {
      n = lineNo(line);
      if (n == null) { return null }
    }
    return {line: n, handle: line, text: line.text, gutterMarkers: line.gutterMarkers,
            textClass: line.textClass, bgClass: line.bgClass, wrapClass: line.wrapClass,
            widgets: line.widgets}
  },

  addLineClass: docMethodOp(function(handle, where, cls) {
    return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
      var prop = where == "text" ? "textClass"
               : where == "background" ? "bgClass"
               : where == "gutter" ? "gutterClass" : "wrapClass";
      if (!line[prop]) { line[prop] = cls; }
      else if (classTest(cls).test(line[prop])) { return false }
      else { line[prop] += " " + cls; }
      return true
    })
  }),
  removeLineClass: docMethodOp(function(handle, where, cls) {
    return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
      var prop = where == "text" ? "textClass"
               : where == "background" ? "bgClass"
               : where == "gutter" ? "gutterClass" : "wrapClass";
      var cur = line[prop];
      if (!cur) { return false }
      else if (cls == null) { line[prop] = null; }
      else {
        var found = cur.match(classTest(cls));
        if (!found) { return false }
        var end = found.index + found[0].length;
        line[prop] = cur.slice(0, found.index) + (!found.index || end == cur.length ? "" : " ") + cur.slice(end) || null;
      }
      return true
    })
  }),

  addLineWidget: docMethodOp(function(handle, node, options) {
    return addLineWidget(this, handle, node, options)
  }),
  removeLineWidget: function(widget) { widget.clear(); },

  markText: function(from, to, options) {
    return markText(this, clipPos(this, from), clipPos(this, to), options, options && options.type || "range")
  },
  setBookmark: function(pos, options) {
    var realOpts = {replacedWith: options && (options.nodeType == null ? options.widget : options),
                    insertLeft: options && options.insertLeft,
                    clearWhenEmpty: false, shared: options && options.shared,
                    handleMouseEvents: options && options.handleMouseEvents};
    pos = clipPos(this, pos);
    return markText(this, pos, pos, realOpts, "bookmark")
  },
  findMarksAt: function(pos) {
    pos = clipPos(this, pos);
    var markers = [], spans = getLine(this, pos.line).markedSpans;
    if (spans) { for (var i = 0; i < spans.length; ++i) {
      var span = spans[i];
      if ((span.from == null || span.from <= pos.ch) &&
          (span.to == null || span.to >= pos.ch))
        { markers.push(span.marker.parent || span.marker); }
    } }
    return markers
  },
  findMarks: function(from, to, filter) {
    from = clipPos(this, from); to = clipPos(this, to);
    var found = [], lineNo$$1 = from.line;
    this.iter(from.line, to.line + 1, function (line) {
      var spans = line.markedSpans;
      if (spans) { for (var i = 0; i < spans.length; i++) {
        var span = spans[i];
        if (!(span.to != null && lineNo$$1 == from.line && from.ch >= span.to ||
              span.from == null && lineNo$$1 != from.line ||
              span.from != null && lineNo$$1 == to.line && span.from >= to.ch) &&
            (!filter || filter(span.marker)))
          { found.push(span.marker.parent || span.marker); }
      } }
      ++lineNo$$1;
    });
    return found
  },
  getAllMarks: function() {
    var markers = [];
    this.iter(function (line) {
      var sps = line.markedSpans;
      if (sps) { for (var i = 0; i < sps.length; ++i)
        { if (sps[i].from != null) { markers.push(sps[i].marker); } } }
    });
    return markers
  },

  posFromIndex: function(off) {
    var ch, lineNo$$1 = this.first, sepSize = this.lineSeparator().length;
    this.iter(function (line) {
      var sz = line.text.length + sepSize;
      if (sz > off) { ch = off; return true }
      off -= sz;
      ++lineNo$$1;
    });
    return clipPos(this, Pos(lineNo$$1, ch))
  },
  indexFromPos: function (coords) {
    coords = clipPos(this, coords);
    var index = coords.ch;
    if (coords.line < this.first || coords.ch < 0) { return 0 }
    var sepSize = this.lineSeparator().length;
    this.iter(this.first, coords.line, function (line) { // iter aborts when callback returns a truthy value
      index += line.text.length + sepSize;
    });
    return index
  },

  copy: function(copyHistory) {
    var doc = new Doc(getLines(this, this.first, this.first + this.size),
                      this.modeOption, this.first, this.lineSep, this.direction);
    doc.scrollTop = this.scrollTop; doc.scrollLeft = this.scrollLeft;
    doc.sel = this.sel;
    doc.extend = false;
    if (copyHistory) {
      doc.history.undoDepth = this.history.undoDepth;
      doc.setHistory(this.getHistory());
    }
    return doc
  },

  linkedDoc: function(options) {
    if (!options) { options = {}; }
    var from = this.first, to = this.first + this.size;
    if (options.from != null && options.from > from) { from = options.from; }
    if (options.to != null && options.to < to) { to = options.to; }
    var copy = new Doc(getLines(this, from, to), options.mode || this.modeOption, from, this.lineSep, this.direction);
    if (options.sharedHist) { copy.history = this.history
    ; }(this.linked || (this.linked = [])).push({doc: copy, sharedHist: options.sharedHist});
    copy.linked = [{doc: this, isParent: true, sharedHist: options.sharedHist}];
    copySharedMarkers(copy, findSharedMarkers(this));
    return copy
  },
  unlinkDoc: function(other) {
    var this$1 = this;

    if (other instanceof CodeMirror$1) { other = other.doc; }
    if (this.linked) { for (var i = 0; i < this.linked.length; ++i) {
      var link = this$1.linked[i];
      if (link.doc != other) { continue }
      this$1.linked.splice(i, 1);
      other.unlinkDoc(this$1);
      detachSharedMarkers(findSharedMarkers(this$1));
      break
    } }
    // If the histories were shared, split them again
    if (other.history == this.history) {
      var splitIds = [other.id];
      linkedDocs(other, function (doc) { return splitIds.push(doc.id); }, true);
      other.history = new History(null);
      other.history.done = copyHistoryArray(this.history.done, splitIds);
      other.history.undone = copyHistoryArray(this.history.undone, splitIds);
    }
  },
  iterLinkedDocs: function(f) {linkedDocs(this, f);},

  getMode: function() {return this.mode},
  getEditor: function() {return this.cm},

  splitLines: function(str) {
    if (this.lineSep) { return str.split(this.lineSep) }
    return splitLinesAuto(str)
  },
  lineSeparator: function() { return this.lineSep || "\n" },

  setDirection: docMethodOp(function (dir) {
    if (dir != "rtl") { dir = "ltr"; }
    if (dir == this.direction) { return }
    this.direction = dir;
    this.iter(function (line) { return line.order = null; });
    if (this.cm) { directionChanged(this.cm); }
  })
});

// Public alias.
Doc.prototype.eachLine = Doc.prototype.iter;

// Kludge to work around strange IE behavior where it'll sometimes
// re-fire a series of drag-related events right after the drop (#1551)
var lastDrop = 0;

function onDrop(e) {
  var cm = this;
  clearDragCursor(cm);
  if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e))
    { return }
  e_preventDefault(e);
  if (ie) { lastDrop = +new Date; }
  var pos = posFromMouse(cm, e, true), files = e.dataTransfer.files;
  if (!pos || cm.isReadOnly()) { return }
  // Might be a file drop, in which case we simply extract the text
  // and insert it.
  if (files && files.length && window.FileReader && window.File) {
    var n = files.length, text = Array(n), read = 0;
    var loadFile = function (file, i) {
      if (cm.options.allowDropFileTypes &&
          indexOf(cm.options.allowDropFileTypes, file.type) == -1)
        { return }

      var reader = new FileReader;
      reader.onload = operation(cm, function () {
        var content = reader.result;
        if (/[\x00-\x08\x0e-\x1f]{2}/.test(content)) { content = ""; }
        text[i] = content;
        if (++read == n) {
          pos = clipPos(cm.doc, pos);
          var change = {from: pos, to: pos,
                        text: cm.doc.splitLines(text.join(cm.doc.lineSeparator())),
                        origin: "paste"};
          makeChange(cm.doc, change);
          setSelectionReplaceHistory(cm.doc, simpleSelection(pos, changeEnd(change)));
        }
      });
      reader.readAsText(file);
    };
    for (var i = 0; i < n; ++i) { loadFile(files[i], i); }
  } else { // Normal drop
    // Don't do a replace if the drop happened inside of the selected text.
    if (cm.state.draggingText && cm.doc.sel.contains(pos) > -1) {
      cm.state.draggingText(e);
      // Ensure the editor is re-focused
      setTimeout(function () { return cm.display.input.focus(); }, 20);
      return
    }
    try {
      var text$1 = e.dataTransfer.getData("Text");
      if (text$1) {
        var selected;
        if (cm.state.draggingText && !cm.state.draggingText.copy)
          { selected = cm.listSelections(); }
        setSelectionNoUndo(cm.doc, simpleSelection(pos, pos));
        if (selected) { for (var i$1 = 0; i$1 < selected.length; ++i$1)
          { replaceRange(cm.doc, "", selected[i$1].anchor, selected[i$1].head, "drag"); } }
        cm.replaceSelection(text$1, "around", "paste");
        cm.display.input.focus();
      }
    }
    catch(e){}
  }
}

function onDragStart(cm, e) {
  if (ie && (!cm.state.draggingText || +new Date - lastDrop < 100)) { e_stop(e); return }
  if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e)) { return }

  e.dataTransfer.setData("Text", cm.getSelection());
  e.dataTransfer.effectAllowed = "copyMove";

  // Use dummy image instead of default browsers image.
  // Recent Safari (~6.0.2) have a tendency to segfault when this happens, so we don't do it there.
  if (e.dataTransfer.setDragImage && !safari) {
    var img = elt("img", null, null, "position: fixed; left: 0; top: 0;");
    img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
    if (presto) {
      img.width = img.height = 1;
      cm.display.wrapper.appendChild(img);
      // Force a relayout, or Opera won't use our image for some obscure reason
      img._top = img.offsetTop;
    }
    e.dataTransfer.setDragImage(img, 0, 0);
    if (presto) { img.parentNode.removeChild(img); }
  }
}

function onDragOver(cm, e) {
  var pos = posFromMouse(cm, e);
  if (!pos) { return }
  var frag = document.createDocumentFragment();
  drawSelectionCursor(cm, pos, frag);
  if (!cm.display.dragCursor) {
    cm.display.dragCursor = elt("div", null, "CodeMirror-cursors CodeMirror-dragcursors");
    cm.display.lineSpace.insertBefore(cm.display.dragCursor, cm.display.cursorDiv);
  }
  removeChildrenAndAdd(cm.display.dragCursor, frag);
}

function clearDragCursor(cm) {
  if (cm.display.dragCursor) {
    cm.display.lineSpace.removeChild(cm.display.dragCursor);
    cm.display.dragCursor = null;
  }
}

// These must be handled carefully, because naively registering a
// handler for each editor will cause the editors to never be
// garbage collected.

function forEachCodeMirror(f) {
  if (!document.getElementsByClassName) { return }
  var byClass = document.getElementsByClassName("CodeMirror");
  for (var i = 0; i < byClass.length; i++) {
    var cm = byClass[i].CodeMirror;
    if (cm) { f(cm); }
  }
}

var globalsRegistered = false;
function ensureGlobalHandlers() {
  if (globalsRegistered) { return }
  registerGlobalHandlers();
  globalsRegistered = true;
}
function registerGlobalHandlers() {
  // When the window resizes, we need to refresh active editors.
  var resizeTimer;
  on(window, "resize", function () {
    if (resizeTimer == null) { resizeTimer = setTimeout(function () {
      resizeTimer = null;
      forEachCodeMirror(onResize);
    }, 100); }
  });
  // When the window loses focus, we want to show the editor as blurred
  on(window, "blur", function () { return forEachCodeMirror(onBlur); });
}
// Called when the window resizes
function onResize(cm) {
  var d = cm.display;
  if (d.lastWrapHeight == d.wrapper.clientHeight && d.lastWrapWidth == d.wrapper.clientWidth)
    { return }
  // Might be a text scaling operation, clear size caches.
  d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;
  d.scrollbarsClipped = false;
  cm.setSize();
}

var keyNames = {
  3: "Pause", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
  19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
  36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
  46: "Delete", 59: ";", 61: "=", 91: "Mod", 92: "Mod", 93: "Mod",
  106: "*", 107: "=", 109: "-", 110: ".", 111: "/", 127: "Delete", 145: "ScrollLock",
  173: "-", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\",
  221: "]", 222: "'", 63232: "Up", 63233: "Down", 63234: "Left", 63235: "Right", 63272: "Delete",
  63273: "Home", 63275: "End", 63276: "PageUp", 63277: "PageDown", 63302: "Insert"
};

// Number keys
for (var i = 0; i < 10; i++) { keyNames[i + 48] = keyNames[i + 96] = String(i); }
// Alphabetic keys
for (var i$1 = 65; i$1 <= 90; i$1++) { keyNames[i$1] = String.fromCharCode(i$1); }
// Function keys
for (var i$2 = 1; i$2 <= 12; i$2++) { keyNames[i$2 + 111] = keyNames[i$2 + 63235] = "F" + i$2; }

var keyMap = {};

keyMap.basic = {
  "Left": "goCharLeft", "Right": "goCharRight", "Up": "goLineUp", "Down": "goLineDown",
  "End": "goLineEnd", "Home": "goLineStartSmart", "PageUp": "goPageUp", "PageDown": "goPageDown",
  "Delete": "delCharAfter", "Backspace": "delCharBefore", "Shift-Backspace": "delCharBefore",
  "Tab": "defaultTab", "Shift-Tab": "indentAuto",
  "Enter": "newlineAndIndent", "Insert": "toggleOverwrite",
  "Esc": "singleSelection"
};
// Note that the save and find-related commands aren't defined by
// default. User code or addons can define them. Unknown commands
// are simply ignored.
keyMap.pcDefault = {
  "Ctrl-A": "selectAll", "Ctrl-D": "deleteLine", "Ctrl-Z": "undo", "Shift-Ctrl-Z": "redo", "Ctrl-Y": "redo",
  "Ctrl-Home": "goDocStart", "Ctrl-End": "goDocEnd", "Ctrl-Up": "goLineUp", "Ctrl-Down": "goLineDown",
  "Ctrl-Left": "goGroupLeft", "Ctrl-Right": "goGroupRight", "Alt-Left": "goLineStart", "Alt-Right": "goLineEnd",
  "Ctrl-Backspace": "delGroupBefore", "Ctrl-Delete": "delGroupAfter", "Ctrl-S": "save", "Ctrl-F": "find",
  "Ctrl-G": "findNext", "Shift-Ctrl-G": "findPrev", "Shift-Ctrl-F": "replace", "Shift-Ctrl-R": "replaceAll",
  "Ctrl-[": "indentLess", "Ctrl-]": "indentMore",
  "Ctrl-U": "undoSelection", "Shift-Ctrl-U": "redoSelection", "Alt-U": "redoSelection",
  fallthrough: "basic"
};
// Very basic readline/emacs-style bindings, which are standard on Mac.
keyMap.emacsy = {
  "Ctrl-F": "goCharRight", "Ctrl-B": "goCharLeft", "Ctrl-P": "goLineUp", "Ctrl-N": "goLineDown",
  "Alt-F": "goWordRight", "Alt-B": "goWordLeft", "Ctrl-A": "goLineStart", "Ctrl-E": "goLineEnd",
  "Ctrl-V": "goPageDown", "Shift-Ctrl-V": "goPageUp", "Ctrl-D": "delCharAfter", "Ctrl-H": "delCharBefore",
  "Alt-D": "delWordAfter", "Alt-Backspace": "delWordBefore", "Ctrl-K": "killLine", "Ctrl-T": "transposeChars",
  "Ctrl-O": "openLine"
};
keyMap.macDefault = {
  "Cmd-A": "selectAll", "Cmd-D": "deleteLine", "Cmd-Z": "undo", "Shift-Cmd-Z": "redo", "Cmd-Y": "redo",
  "Cmd-Home": "goDocStart", "Cmd-Up": "goDocStart", "Cmd-End": "goDocEnd", "Cmd-Down": "goDocEnd", "Alt-Left": "goGroupLeft",
  "Alt-Right": "goGroupRight", "Cmd-Left": "goLineLeft", "Cmd-Right": "goLineRight", "Alt-Backspace": "delGroupBefore",
  "Ctrl-Alt-Backspace": "delGroupAfter", "Alt-Delete": "delGroupAfter", "Cmd-S": "save", "Cmd-F": "find",
  "Cmd-G": "findNext", "Shift-Cmd-G": "findPrev", "Cmd-Alt-F": "replace", "Shift-Cmd-Alt-F": "replaceAll",
  "Cmd-[": "indentLess", "Cmd-]": "indentMore", "Cmd-Backspace": "delWrappedLineLeft", "Cmd-Delete": "delWrappedLineRight",
  "Cmd-U": "undoSelection", "Shift-Cmd-U": "redoSelection", "Ctrl-Up": "goDocStart", "Ctrl-Down": "goDocEnd",
  fallthrough: ["basic", "emacsy"]
};
keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault;

// KEYMAP DISPATCH

function normalizeKeyName(name) {
  var parts = name.split(/-(?!$)/);
  name = parts[parts.length - 1];
  var alt, ctrl, shift, cmd;
  for (var i = 0; i < parts.length - 1; i++) {
    var mod = parts[i];
    if (/^(cmd|meta|m)$/i.test(mod)) { cmd = true; }
    else if (/^a(lt)?$/i.test(mod)) { alt = true; }
    else if (/^(c|ctrl|control)$/i.test(mod)) { ctrl = true; }
    else if (/^s(hift)?$/i.test(mod)) { shift = true; }
    else { throw new Error("Unrecognized modifier name: " + mod) }
  }
  if (alt) { name = "Alt-" + name; }
  if (ctrl) { name = "Ctrl-" + name; }
  if (cmd) { name = "Cmd-" + name; }
  if (shift) { name = "Shift-" + name; }
  return name
}

// This is a kludge to keep keymaps mostly working as raw objects
// (backwards compatibility) while at the same time support features
// like normalization and multi-stroke key bindings. It compiles a
// new normalized keymap, and then updates the old object to reflect
// this.
function normalizeKeyMap(keymap) {
  var copy = {};
  for (var keyname in keymap) { if (keymap.hasOwnProperty(keyname)) {
    var value = keymap[keyname];
    if (/^(name|fallthrough|(de|at)tach)$/.test(keyname)) { continue }
    if (value == "...") { delete keymap[keyname]; continue }

    var keys = map(keyname.split(" "), normalizeKeyName);
    for (var i = 0; i < keys.length; i++) {
      var val = (void 0), name = (void 0);
      if (i == keys.length - 1) {
        name = keys.join(" ");
        val = value;
      } else {
        name = keys.slice(0, i + 1).join(" ");
        val = "...";
      }
      var prev = copy[name];
      if (!prev) { copy[name] = val; }
      else if (prev != val) { throw new Error("Inconsistent bindings for " + name) }
    }
    delete keymap[keyname];
  } }
  for (var prop in copy) { keymap[prop] = copy[prop]; }
  return keymap
}

function lookupKey(key, map$$1, handle, context) {
  map$$1 = getKeyMap(map$$1);
  var found = map$$1.call ? map$$1.call(key, context) : map$$1[key];
  if (found === false) { return "nothing" }
  if (found === "...") { return "multi" }
  if (found != null && handle(found)) { return "handled" }

  if (map$$1.fallthrough) {
    if (Object.prototype.toString.call(map$$1.fallthrough) != "[object Array]")
      { return lookupKey(key, map$$1.fallthrough, handle, context) }
    for (var i = 0; i < map$$1.fallthrough.length; i++) {
      var result = lookupKey(key, map$$1.fallthrough[i], handle, context);
      if (result) { return result }
    }
  }
}

// Modifier key presses don't count as 'real' key presses for the
// purpose of keymap fallthrough.
function isModifierKey(value) {
  var name = typeof value == "string" ? value : keyNames[value.keyCode];
  return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod"
}

function addModifierNames(name, event, noShift) {
  var base = name;
  if (event.altKey && base != "Alt") { name = "Alt-" + name; }
  if ((flipCtrlCmd ? event.metaKey : event.ctrlKey) && base != "Ctrl") { name = "Ctrl-" + name; }
  if ((flipCtrlCmd ? event.ctrlKey : event.metaKey) && base != "Cmd") { name = "Cmd-" + name; }
  if (!noShift && event.shiftKey && base != "Shift") { name = "Shift-" + name; }
  return name
}

// Look up the name of a key as indicated by an event object.
function keyName(event, noShift) {
  if (presto && event.keyCode == 34 && event["char"]) { return false }
  var name = keyNames[event.keyCode];
  if (name == null || event.altGraphKey) { return false }
  // Ctrl-ScrollLock has keyCode 3, same as Ctrl-Pause,
  // so we'll use event.code when available (Chrome 48+, FF 38+, Safari 10.1+)
  if (event.keyCode == 3 && event.code) { name = event.code; }
  return addModifierNames(name, event, noShift)
}

function getKeyMap(val) {
  return typeof val == "string" ? keyMap[val] : val
}

// Helper for deleting text near the selection(s), used to implement
// backspace, delete, and similar functionality.
function deleteNearSelection(cm, compute) {
  var ranges = cm.doc.sel.ranges, kill = [];
  // Build up a set of ranges to kill first, merging overlapping
  // ranges.
  for (var i = 0; i < ranges.length; i++) {
    var toKill = compute(ranges[i]);
    while (kill.length && cmp(toKill.from, lst(kill).to) <= 0) {
      var replaced = kill.pop();
      if (cmp(replaced.from, toKill.from) < 0) {
        toKill.from = replaced.from;
        break
      }
    }
    kill.push(toKill);
  }
  // Next, remove those actual ranges.
  runInOp(cm, function () {
    for (var i = kill.length - 1; i >= 0; i--)
      { replaceRange(cm.doc, "", kill[i].from, kill[i].to, "+delete"); }
    ensureCursorVisible(cm);
  });
}

function moveCharLogically(line, ch, dir) {
  var target = skipExtendingChars(line.text, ch + dir, dir);
  return target < 0 || target > line.text.length ? null : target
}

function moveLogically(line, start, dir) {
  var ch = moveCharLogically(line, start.ch, dir);
  return ch == null ? null : new Pos(start.line, ch, dir < 0 ? "after" : "before")
}

function endOfLine(visually, cm, lineObj, lineNo, dir) {
  if (visually) {
    var order = getOrder(lineObj, cm.doc.direction);
    if (order) {
      var part = dir < 0 ? lst(order) : order[0];
      var moveInStorageOrder = (dir < 0) == (part.level == 1);
      var sticky = moveInStorageOrder ? "after" : "before";
      var ch;
      // With a wrapped rtl chunk (possibly spanning multiple bidi parts),
      // it could be that the last bidi part is not on the last visual line,
      // since visual lines contain content order-consecutive chunks.
      // Thus, in rtl, we are looking for the first (content-order) character
      // in the rtl chunk that is on the last line (that is, the same line
      // as the last (content-order) character).
      if (part.level > 0 || cm.doc.direction == "rtl") {
        var prep = prepareMeasureForLine(cm, lineObj);
        ch = dir < 0 ? lineObj.text.length - 1 : 0;
        var targetTop = measureCharPrepared(cm, prep, ch).top;
        ch = findFirst(function (ch) { return measureCharPrepared(cm, prep, ch).top == targetTop; }, (dir < 0) == (part.level == 1) ? part.from : part.to - 1, ch);
        if (sticky == "before") { ch = moveCharLogically(lineObj, ch, 1); }
      } else { ch = dir < 0 ? part.to : part.from; }
      return new Pos(lineNo, ch, sticky)
    }
  }
  return new Pos(lineNo, dir < 0 ? lineObj.text.length : 0, dir < 0 ? "before" : "after")
}

function moveVisually(cm, line, start, dir) {
  var bidi = getOrder(line, cm.doc.direction);
  if (!bidi) { return moveLogically(line, start, dir) }
  if (start.ch >= line.text.length) {
    start.ch = line.text.length;
    start.sticky = "before";
  } else if (start.ch <= 0) {
    start.ch = 0;
    start.sticky = "after";
  }
  var partPos = getBidiPartAt(bidi, start.ch, start.sticky), part = bidi[partPos];
  if (cm.doc.direction == "ltr" && part.level % 2 == 0 && (dir > 0 ? part.to > start.ch : part.from < start.ch)) {
    // Case 1: We move within an ltr part in an ltr editor. Even with wrapped lines,
    // nothing interesting happens.
    return moveLogically(line, start, dir)
  }

  var mv = function (pos, dir) { return moveCharLogically(line, pos instanceof Pos ? pos.ch : pos, dir); };
  var prep;
  var getWrappedLineExtent = function (ch) {
    if (!cm.options.lineWrapping) { return {begin: 0, end: line.text.length} }
    prep = prep || prepareMeasureForLine(cm, line);
    return wrappedLineExtentChar(cm, line, prep, ch)
  };
  var wrappedLineExtent = getWrappedLineExtent(start.sticky == "before" ? mv(start, -1) : start.ch);

  if (cm.doc.direction == "rtl" || part.level == 1) {
    var moveInStorageOrder = (part.level == 1) == (dir < 0);
    var ch = mv(start, moveInStorageOrder ? 1 : -1);
    if (ch != null && (!moveInStorageOrder ? ch >= part.from && ch >= wrappedLineExtent.begin : ch <= part.to && ch <= wrappedLineExtent.end)) {
      // Case 2: We move within an rtl part or in an rtl editor on the same visual line
      var sticky = moveInStorageOrder ? "before" : "after";
      return new Pos(start.line, ch, sticky)
    }
  }

  // Case 3: Could not move within this bidi part in this visual line, so leave
  // the current bidi part

  var searchInVisualLine = function (partPos, dir, wrappedLineExtent) {
    var getRes = function (ch, moveInStorageOrder) { return moveInStorageOrder
      ? new Pos(start.line, mv(ch, 1), "before")
      : new Pos(start.line, ch, "after"); };

    for (; partPos >= 0 && partPos < bidi.length; partPos += dir) {
      var part = bidi[partPos];
      var moveInStorageOrder = (dir > 0) == (part.level != 1);
      var ch = moveInStorageOrder ? wrappedLineExtent.begin : mv(wrappedLineExtent.end, -1);
      if (part.from <= ch && ch < part.to) { return getRes(ch, moveInStorageOrder) }
      ch = moveInStorageOrder ? part.from : mv(part.to, -1);
      if (wrappedLineExtent.begin <= ch && ch < wrappedLineExtent.end) { return getRes(ch, moveInStorageOrder) }
    }
  };

  // Case 3a: Look for other bidi parts on the same visual line
  var res = searchInVisualLine(partPos + dir, dir, wrappedLineExtent);
  if (res) { return res }

  // Case 3b: Look for other bidi parts on the next visual line
  var nextCh = dir > 0 ? wrappedLineExtent.end : mv(wrappedLineExtent.begin, -1);
  if (nextCh != null && !(dir > 0 && nextCh == line.text.length)) {
    res = searchInVisualLine(dir > 0 ? 0 : bidi.length - 1, dir, getWrappedLineExtent(nextCh));
    if (res) { return res }
  }

  // Case 4: Nowhere to move
  return null
}

// Commands are parameter-less actions that can be performed on an
// editor, mostly used for keybindings.
var commands = {
  selectAll: selectAll,
  singleSelection: function (cm) { return cm.setSelection(cm.getCursor("anchor"), cm.getCursor("head"), sel_dontScroll); },
  killLine: function (cm) { return deleteNearSelection(cm, function (range) {
    if (range.empty()) {
      var len = getLine(cm.doc, range.head.line).text.length;
      if (range.head.ch == len && range.head.line < cm.lastLine())
        { return {from: range.head, to: Pos(range.head.line + 1, 0)} }
      else
        { return {from: range.head, to: Pos(range.head.line, len)} }
    } else {
      return {from: range.from(), to: range.to()}
    }
  }); },
  deleteLine: function (cm) { return deleteNearSelection(cm, function (range) { return ({
    from: Pos(range.from().line, 0),
    to: clipPos(cm.doc, Pos(range.to().line + 1, 0))
  }); }); },
  delLineLeft: function (cm) { return deleteNearSelection(cm, function (range) { return ({
    from: Pos(range.from().line, 0), to: range.from()
  }); }); },
  delWrappedLineLeft: function (cm) { return deleteNearSelection(cm, function (range) {
    var top = cm.charCoords(range.head, "div").top + 5;
    var leftPos = cm.coordsChar({left: 0, top: top}, "div");
    return {from: leftPos, to: range.from()}
  }); },
  delWrappedLineRight: function (cm) { return deleteNearSelection(cm, function (range) {
    var top = cm.charCoords(range.head, "div").top + 5;
    var rightPos = cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div");
    return {from: range.from(), to: rightPos }
  }); },
  undo: function (cm) { return cm.undo(); },
  redo: function (cm) { return cm.redo(); },
  undoSelection: function (cm) { return cm.undoSelection(); },
  redoSelection: function (cm) { return cm.redoSelection(); },
  goDocStart: function (cm) { return cm.extendSelection(Pos(cm.firstLine(), 0)); },
  goDocEnd: function (cm) { return cm.extendSelection(Pos(cm.lastLine())); },
  goLineStart: function (cm) { return cm.extendSelectionsBy(function (range) { return lineStart(cm, range.head.line); },
    {origin: "+move", bias: 1}
  ); },
  goLineStartSmart: function (cm) { return cm.extendSelectionsBy(function (range) { return lineStartSmart(cm, range.head); },
    {origin: "+move", bias: 1}
  ); },
  goLineEnd: function (cm) { return cm.extendSelectionsBy(function (range) { return lineEnd(cm, range.head.line); },
    {origin: "+move", bias: -1}
  ); },
  goLineRight: function (cm) { return cm.extendSelectionsBy(function (range) {
    var top = cm.cursorCoords(range.head, "div").top + 5;
    return cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div")
  }, sel_move); },
  goLineLeft: function (cm) { return cm.extendSelectionsBy(function (range) {
    var top = cm.cursorCoords(range.head, "div").top + 5;
    return cm.coordsChar({left: 0, top: top}, "div")
  }, sel_move); },
  goLineLeftSmart: function (cm) { return cm.extendSelectionsBy(function (range) {
    var top = cm.cursorCoords(range.head, "div").top + 5;
    var pos = cm.coordsChar({left: 0, top: top}, "div");
    if (pos.ch < cm.getLine(pos.line).search(/\S/)) { return lineStartSmart(cm, range.head) }
    return pos
  }, sel_move); },
  goLineUp: function (cm) { return cm.moveV(-1, "line"); },
  goLineDown: function (cm) { return cm.moveV(1, "line"); },
  goPageUp: function (cm) { return cm.moveV(-1, "page"); },
  goPageDown: function (cm) { return cm.moveV(1, "page"); },
  goCharLeft: function (cm) { return cm.moveH(-1, "char"); },
  goCharRight: function (cm) { return cm.moveH(1, "char"); },
  goColumnLeft: function (cm) { return cm.moveH(-1, "column"); },
  goColumnRight: function (cm) { return cm.moveH(1, "column"); },
  goWordLeft: function (cm) { return cm.moveH(-1, "word"); },
  goGroupRight: function (cm) { return cm.moveH(1, "group"); },
  goGroupLeft: function (cm) { return cm.moveH(-1, "group"); },
  goWordRight: function (cm) { return cm.moveH(1, "word"); },
  delCharBefore: function (cm) { return cm.deleteH(-1, "char"); },
  delCharAfter: function (cm) { return cm.deleteH(1, "char"); },
  delWordBefore: function (cm) { return cm.deleteH(-1, "word"); },
  delWordAfter: function (cm) { return cm.deleteH(1, "word"); },
  delGroupBefore: function (cm) { return cm.deleteH(-1, "group"); },
  delGroupAfter: function (cm) { return cm.deleteH(1, "group"); },
  indentAuto: function (cm) { return cm.indentSelection("smart"); },
  indentMore: function (cm) { return cm.indentSelection("add"); },
  indentLess: function (cm) { return cm.indentSelection("subtract"); },
  insertTab: function (cm) { return cm.replaceSelection("\t"); },
  insertSoftTab: function (cm) {
    var spaces = [], ranges = cm.listSelections(), tabSize = cm.options.tabSize;
    for (var i = 0; i < ranges.length; i++) {
      var pos = ranges[i].from();
      var col = countColumn(cm.getLine(pos.line), pos.ch, tabSize);
      spaces.push(spaceStr(tabSize - col % tabSize));
    }
    cm.replaceSelections(spaces);
  },
  defaultTab: function (cm) {
    if (cm.somethingSelected()) { cm.indentSelection("add"); }
    else { cm.execCommand("insertTab"); }
  },
  // Swap the two chars left and right of each selection's head.
  // Move cursor behind the two swapped characters afterwards.
  //
  // Doesn't consider line feeds a character.
  // Doesn't scan more than one line above to find a character.
  // Doesn't do anything on an empty line.
  // Doesn't do anything with non-empty selections.
  transposeChars: function (cm) { return runInOp(cm, function () {
    var ranges = cm.listSelections(), newSel = [];
    for (var i = 0; i < ranges.length; i++) {
      if (!ranges[i].empty()) { continue }
      var cur = ranges[i].head, line = getLine(cm.doc, cur.line).text;
      if (line) {
        if (cur.ch == line.length) { cur = new Pos(cur.line, cur.ch - 1); }
        if (cur.ch > 0) {
          cur = new Pos(cur.line, cur.ch + 1);
          cm.replaceRange(line.charAt(cur.ch - 1) + line.charAt(cur.ch - 2),
                          Pos(cur.line, cur.ch - 2), cur, "+transpose");
        } else if (cur.line > cm.doc.first) {
          var prev = getLine(cm.doc, cur.line - 1).text;
          if (prev) {
            cur = new Pos(cur.line, 1);
            cm.replaceRange(line.charAt(0) + cm.doc.lineSeparator() +
                            prev.charAt(prev.length - 1),
                            Pos(cur.line - 1, prev.length - 1), cur, "+transpose");
          }
        }
      }
      newSel.push(new Range(cur, cur));
    }
    cm.setSelections(newSel);
  }); },
  newlineAndIndent: function (cm) { return runInOp(cm, function () {
    var sels = cm.listSelections();
    for (var i = sels.length - 1; i >= 0; i--)
      { cm.replaceRange(cm.doc.lineSeparator(), sels[i].anchor, sels[i].head, "+input"); }
    sels = cm.listSelections();
    for (var i$1 = 0; i$1 < sels.length; i$1++)
      { cm.indentLine(sels[i$1].from().line, null, true); }
    ensureCursorVisible(cm);
  }); },
  openLine: function (cm) { return cm.replaceSelection("\n", "start"); },
  toggleOverwrite: function (cm) { return cm.toggleOverwrite(); }
};


function lineStart(cm, lineN) {
  var line = getLine(cm.doc, lineN);
  var visual = visualLine(line);
  if (visual != line) { lineN = lineNo(visual); }
  return endOfLine(true, cm, visual, lineN, 1)
}
function lineEnd(cm, lineN) {
  var line = getLine(cm.doc, lineN);
  var visual = visualLineEnd(line);
  if (visual != line) { lineN = lineNo(visual); }
  return endOfLine(true, cm, line, lineN, -1)
}
function lineStartSmart(cm, pos) {
  var start = lineStart(cm, pos.line);
  var line = getLine(cm.doc, start.line);
  var order = getOrder(line, cm.doc.direction);
  if (!order || order[0].level == 0) {
    var firstNonWS = Math.max(0, line.text.search(/\S/));
    var inWS = pos.line == start.line && pos.ch <= firstNonWS && pos.ch;
    return Pos(start.line, inWS ? 0 : firstNonWS, start.sticky)
  }
  return start
}

// Run a handler that was bound to a key.
function doHandleBinding(cm, bound, dropShift) {
  if (typeof bound == "string") {
    bound = commands[bound];
    if (!bound) { return false }
  }
  // Ensure previous input has been read, so that the handler sees a
  // consistent view of the document
  cm.display.input.ensurePolled();
  var prevShift = cm.display.shift, done = false;
  try {
    if (cm.isReadOnly()) { cm.state.suppressEdits = true; }
    if (dropShift) { cm.display.shift = false; }
    done = bound(cm) != Pass;
  } finally {
    cm.display.shift = prevShift;
    cm.state.suppressEdits = false;
  }
  return done
}

function lookupKeyForEditor(cm, name, handle) {
  for (var i = 0; i < cm.state.keyMaps.length; i++) {
    var result = lookupKey(name, cm.state.keyMaps[i], handle, cm);
    if (result) { return result }
  }
  return (cm.options.extraKeys && lookupKey(name, cm.options.extraKeys, handle, cm))
    || lookupKey(name, cm.options.keyMap, handle, cm)
}

// Note that, despite the name, this function is also used to check
// for bound mouse clicks.

var stopSeq = new Delayed;

function dispatchKey(cm, name, e, handle) {
  var seq = cm.state.keySeq;
  if (seq) {
    if (isModifierKey(name)) { return "handled" }
    if (/\'$/.test(name))
      { cm.state.keySeq = null; }
    else
      { stopSeq.set(50, function () {
        if (cm.state.keySeq == seq) {
          cm.state.keySeq = null;
          cm.display.input.reset();
        }
      }); }
    if (dispatchKeyInner(cm, seq + " " + name, e, handle)) { return true }
  }
  return dispatchKeyInner(cm, name, e, handle)
}

function dispatchKeyInner(cm, name, e, handle) {
  var result = lookupKeyForEditor(cm, name, handle);

  if (result == "multi")
    { cm.state.keySeq = name; }
  if (result == "handled")
    { signalLater(cm, "keyHandled", cm, name, e); }

  if (result == "handled" || result == "multi") {
    e_preventDefault(e);
    restartBlink(cm);
  }

  return !!result
}

// Handle a key from the keydown event.
function handleKeyBinding(cm, e) {
  var name = keyName(e, true);
  if (!name) { return false }

  if (e.shiftKey && !cm.state.keySeq) {
    // First try to resolve full name (including 'Shift-'). Failing
    // that, see if there is a cursor-motion command (starting with
    // 'go') bound to the keyname without 'Shift-'.
    return dispatchKey(cm, "Shift-" + name, e, function (b) { return doHandleBinding(cm, b, true); })
        || dispatchKey(cm, name, e, function (b) {
             if (typeof b == "string" ? /^go[A-Z]/.test(b) : b.motion)
               { return doHandleBinding(cm, b) }
           })
  } else {
    return dispatchKey(cm, name, e, function (b) { return doHandleBinding(cm, b); })
  }
}

// Handle a key from the keypress event
function handleCharBinding(cm, e, ch) {
  return dispatchKey(cm, "'" + ch + "'", e, function (b) { return doHandleBinding(cm, b, true); })
}

var lastStoppedKey = null;
function onKeyDown(e) {
  var cm = this;
  cm.curOp.focus = activeElt();
  if (signalDOMEvent(cm, e)) { return }
  // IE does strange things with escape.
  if (ie && ie_version < 11 && e.keyCode == 27) { e.returnValue = false; }
  var code = e.keyCode;
  cm.display.shift = code == 16 || e.shiftKey;
  var handled = handleKeyBinding(cm, e);
  if (presto) {
    lastStoppedKey = handled ? code : null;
    // Opera has no cut event... we try to at least catch the key combo
    if (!handled && code == 88 && !hasCopyEvent && (mac ? e.metaKey : e.ctrlKey))
      { cm.replaceSelection("", null, "cut"); }
  }

  // Turn mouse into crosshair when Alt is held on Mac.
  if (code == 18 && !/\bCodeMirror-crosshair\b/.test(cm.display.lineDiv.className))
    { showCrossHair(cm); }
}

function showCrossHair(cm) {
  var lineDiv = cm.display.lineDiv;
  addClass(lineDiv, "CodeMirror-crosshair");

  function up(e) {
    if (e.keyCode == 18 || !e.altKey) {
      rmClass(lineDiv, "CodeMirror-crosshair");
      off(document, "keyup", up);
      off(document, "mouseover", up);
    }
  }
  on(document, "keyup", up);
  on(document, "mouseover", up);
}

function onKeyUp(e) {
  if (e.keyCode == 16) { this.doc.sel.shift = false; }
  signalDOMEvent(this, e);
}

function onKeyPress(e) {
  var cm = this;
  if (eventInWidget(cm.display, e) || signalDOMEvent(cm, e) || e.ctrlKey && !e.altKey || mac && e.metaKey) { return }
  var keyCode = e.keyCode, charCode = e.charCode;
  if (presto && keyCode == lastStoppedKey) {lastStoppedKey = null; e_preventDefault(e); return}
  if ((presto && (!e.which || e.which < 10)) && handleKeyBinding(cm, e)) { return }
  var ch = String.fromCharCode(charCode == null ? keyCode : charCode);
  // Some browsers fire keypress events for backspace
  if (ch == "\x08") { return }
  if (handleCharBinding(cm, e, ch)) { return }
  cm.display.input.onKeyPress(e);
}

var DOUBLECLICK_DELAY = 400;

var PastClick = function(time, pos, button) {
  this.time = time;
  this.pos = pos;
  this.button = button;
};

PastClick.prototype.compare = function (time, pos, button) {
  return this.time + DOUBLECLICK_DELAY > time &&
    cmp(pos, this.pos) == 0 && button == this.button
};

var lastClick;
var lastDoubleClick;
function clickRepeat(pos, button) {
  var now = +new Date;
  if (lastDoubleClick && lastDoubleClick.compare(now, pos, button)) {
    lastClick = lastDoubleClick = null;
    return "triple"
  } else if (lastClick && lastClick.compare(now, pos, button)) {
    lastDoubleClick = new PastClick(now, pos, button);
    lastClick = null;
    return "double"
  } else {
    lastClick = new PastClick(now, pos, button);
    lastDoubleClick = null;
    return "single"
  }
}

// A mouse down can be a single click, double click, triple click,
// start of selection drag, start of text drag, new cursor
// (ctrl-click), rectangle drag (alt-drag), or xwin
// middle-click-paste. Or it might be a click on something we should
// not interfere with, such as a scrollbar or widget.
function onMouseDown(e) {
  var cm = this, display = cm.display;
  if (signalDOMEvent(cm, e) || display.activeTouch && display.input.supportsTouch()) { return }
  display.input.ensurePolled();
  display.shift = e.shiftKey;

  if (eventInWidget(display, e)) {
    if (!webkit) {
      // Briefly turn off draggability, to allow widgets to do
      // normal dragging things.
      display.scroller.draggable = false;
      setTimeout(function () { return display.scroller.draggable = true; }, 100);
    }
    return
  }
  if (clickInGutter(cm, e)) { return }
  var pos = posFromMouse(cm, e), button = e_button(e), repeat = pos ? clickRepeat(pos, button) : "single";
  window.focus();

  // #3261: make sure, that we're not starting a second selection
  if (button == 1 && cm.state.selectingText)
    { cm.state.selectingText(e); }

  if (pos && handleMappedButton(cm, button, pos, repeat, e)) { return }

  if (button == 1) {
    if (pos) { leftButtonDown(cm, pos, repeat, e); }
    else if (e_target(e) == display.scroller) { e_preventDefault(e); }
  } else if (button == 2) {
    if (pos) { extendSelection(cm.doc, pos); }
    setTimeout(function () { return display.input.focus(); }, 20);
  } else if (button == 3) {
    if (captureRightClick) { onContextMenu(cm, e); }
    else { delayBlurEvent(cm); }
  }
}

function handleMappedButton(cm, button, pos, repeat, event) {
  var name = "Click";
  if (repeat == "double") { name = "Double" + name; }
  else if (repeat == "triple") { name = "Triple" + name; }
  name = (button == 1 ? "Left" : button == 2 ? "Middle" : "Right") + name;

  return dispatchKey(cm,  addModifierNames(name, event), event, function (bound) {
    if (typeof bound == "string") { bound = commands[bound]; }
    if (!bound) { return false }
    var done = false;
    try {
      if (cm.isReadOnly()) { cm.state.suppressEdits = true; }
      done = bound(cm, pos) != Pass;
    } finally {
      cm.state.suppressEdits = false;
    }
    return done
  })
}

function configureMouse(cm, repeat, event) {
  var option = cm.getOption("configureMouse");
  var value = option ? option(cm, repeat, event) : {};
  if (value.unit == null) {
    var rect = chromeOS ? event.shiftKey && event.metaKey : event.altKey;
    value.unit = rect ? "rectangle" : repeat == "single" ? "char" : repeat == "double" ? "word" : "line";
  }
  if (value.extend == null || cm.doc.extend) { value.extend = cm.doc.extend || event.shiftKey; }
  if (value.addNew == null) { value.addNew = mac ? event.metaKey : event.ctrlKey; }
  if (value.moveOnDrag == null) { value.moveOnDrag = !(mac ? event.altKey : event.ctrlKey); }
  return value
}

function leftButtonDown(cm, pos, repeat, event) {
  if (ie) { setTimeout(bind(ensureFocus, cm), 0); }
  else { cm.curOp.focus = activeElt(); }

  var behavior = configureMouse(cm, repeat, event);

  var sel = cm.doc.sel, contained;
  if (cm.options.dragDrop && dragAndDrop && !cm.isReadOnly() &&
      repeat == "single" && (contained = sel.contains(pos)) > -1 &&
      (cmp((contained = sel.ranges[contained]).from(), pos) < 0 || pos.xRel > 0) &&
      (cmp(contained.to(), pos) > 0 || pos.xRel < 0))
    { leftButtonStartDrag(cm, event, pos, behavior); }
  else
    { leftButtonSelect(cm, event, pos, behavior); }
}

// Start a text drag. When it ends, see if any dragging actually
// happen, and treat as a click if it didn't.
function leftButtonStartDrag(cm, event, pos, behavior) {
  var display = cm.display, moved = false;
  var dragEnd = operation(cm, function (e) {
    if (webkit) { display.scroller.draggable = false; }
    cm.state.draggingText = false;
    off(document, "mouseup", dragEnd);
    off(document, "mousemove", mouseMove);
    off(display.scroller, "dragstart", dragStart);
    off(display.scroller, "drop", dragEnd);
    if (!moved) {
      e_preventDefault(e);
      if (!behavior.addNew)
        { extendSelection(cm.doc, pos, null, null, behavior.extend); }
      // Work around unexplainable focus problem in IE9 (#2127) and Chrome (#3081)
      if (webkit || ie && ie_version == 9)
        { setTimeout(function () {document.body.focus(); display.input.focus();}, 20); }
      else
        { display.input.focus(); }
    }
  });
  var mouseMove = function(e2) {
    moved = moved || Math.abs(event.clientX - e2.clientX) + Math.abs(event.clientY - e2.clientY) >= 10;
  };
  var dragStart = function () { return moved = true; };
  // Let the drag handler handle this.
  if (webkit) { display.scroller.draggable = true; }
  cm.state.draggingText = dragEnd;
  dragEnd.copy = !behavior.moveOnDrag;
  // IE's approach to draggable
  if (display.scroller.dragDrop) { display.scroller.dragDrop(); }
  on(document, "mouseup", dragEnd);
  on(document, "mousemove", mouseMove);
  on(display.scroller, "dragstart", dragStart);
  on(display.scroller, "drop", dragEnd);

  delayBlurEvent(cm);
  setTimeout(function () { return display.input.focus(); }, 20);
}

function rangeForUnit(cm, pos, unit) {
  if (unit == "char") { return new Range(pos, pos) }
  if (unit == "word") { return cm.findWordAt(pos) }
  if (unit == "line") { return new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0))) }
  var result = unit(cm, pos);
  return new Range(result.from, result.to)
}

// Normal selection, as opposed to text dragging.
function leftButtonSelect(cm, event, start, behavior) {
  var display = cm.display, doc = cm.doc;
  e_preventDefault(event);

  var ourRange, ourIndex, startSel = doc.sel, ranges = startSel.ranges;
  if (behavior.addNew && !behavior.extend) {
    ourIndex = doc.sel.contains(start);
    if (ourIndex > -1)
      { ourRange = ranges[ourIndex]; }
    else
      { ourRange = new Range(start, start); }
  } else {
    ourRange = doc.sel.primary();
    ourIndex = doc.sel.primIndex;
  }

  if (behavior.unit == "rectangle") {
    if (!behavior.addNew) { ourRange = new Range(start, start); }
    start = posFromMouse(cm, event, true, true);
    ourIndex = -1;
  } else {
    var range$$1 = rangeForUnit(cm, start, behavior.unit);
    if (behavior.extend)
      { ourRange = extendRange(ourRange, range$$1.anchor, range$$1.head, behavior.extend); }
    else
      { ourRange = range$$1; }
  }

  if (!behavior.addNew) {
    ourIndex = 0;
    setSelection(doc, new Selection([ourRange], 0), sel_mouse);
    startSel = doc.sel;
  } else if (ourIndex == -1) {
    ourIndex = ranges.length;
    setSelection(doc, normalizeSelection(ranges.concat([ourRange]), ourIndex),
                 {scroll: false, origin: "*mouse"});
  } else if (ranges.length > 1 && ranges[ourIndex].empty() && behavior.unit == "char" && !behavior.extend) {
    setSelection(doc, normalizeSelection(ranges.slice(0, ourIndex).concat(ranges.slice(ourIndex + 1)), 0),
                 {scroll: false, origin: "*mouse"});
    startSel = doc.sel;
  } else {
    replaceOneSelection(doc, ourIndex, ourRange, sel_mouse);
  }

  var lastPos = start;
  function extendTo(pos) {
    if (cmp(lastPos, pos) == 0) { return }
    lastPos = pos;

    if (behavior.unit == "rectangle") {
      var ranges = [], tabSize = cm.options.tabSize;
      var startCol = countColumn(getLine(doc, start.line).text, start.ch, tabSize);
      var posCol = countColumn(getLine(doc, pos.line).text, pos.ch, tabSize);
      var left = Math.min(startCol, posCol), right = Math.max(startCol, posCol);
      for (var line = Math.min(start.line, pos.line), end = Math.min(cm.lastLine(), Math.max(start.line, pos.line));
           line <= end; line++) {
        var text = getLine(doc, line).text, leftPos = findColumn(text, left, tabSize);
        if (left == right)
          { ranges.push(new Range(Pos(line, leftPos), Pos(line, leftPos))); }
        else if (text.length > leftPos)
          { ranges.push(new Range(Pos(line, leftPos), Pos(line, findColumn(text, right, tabSize)))); }
      }
      if (!ranges.length) { ranges.push(new Range(start, start)); }
      setSelection(doc, normalizeSelection(startSel.ranges.slice(0, ourIndex).concat(ranges), ourIndex),
                   {origin: "*mouse", scroll: false});
      cm.scrollIntoView(pos);
    } else {
      var oldRange = ourRange;
      var range$$1 = rangeForUnit(cm, pos, behavior.unit);
      var anchor = oldRange.anchor, head;
      if (cmp(range$$1.anchor, anchor) > 0) {
        head = range$$1.head;
        anchor = minPos(oldRange.from(), range$$1.anchor);
      } else {
        head = range$$1.anchor;
        anchor = maxPos(oldRange.to(), range$$1.head);
      }
      var ranges$1 = startSel.ranges.slice(0);
      ranges$1[ourIndex] = bidiSimplify(cm, new Range(clipPos(doc, anchor), head));
      setSelection(doc, normalizeSelection(ranges$1, ourIndex), sel_mouse);
    }
  }

  var editorSize = display.wrapper.getBoundingClientRect();
  // Used to ensure timeout re-tries don't fire when another extend
  // happened in the meantime (clearTimeout isn't reliable -- at
  // least on Chrome, the timeouts still happen even when cleared,
  // if the clear happens after their scheduled firing time).
  var counter = 0;

  function extend(e) {
    var curCount = ++counter;
    var cur = posFromMouse(cm, e, true, behavior.unit == "rectangle");
    if (!cur) { return }
    if (cmp(cur, lastPos) != 0) {
      cm.curOp.focus = activeElt();
      extendTo(cur);
      var visible = visibleLines(display, doc);
      if (cur.line >= visible.to || cur.line < visible.from)
        { setTimeout(operation(cm, function () {if (counter == curCount) { extend(e); }}), 150); }
    } else {
      var outside = e.clientY < editorSize.top ? -20 : e.clientY > editorSize.bottom ? 20 : 0;
      if (outside) { setTimeout(operation(cm, function () {
        if (counter != curCount) { return }
        display.scroller.scrollTop += outside;
        extend(e);
      }), 50); }
    }
  }

  function done(e) {
    cm.state.selectingText = false;
    counter = Infinity;
    e_preventDefault(e);
    display.input.focus();
    off(document, "mousemove", move);
    off(document, "mouseup", up);
    doc.history.lastSelOrigin = null;
  }

  var move = operation(cm, function (e) {
    if (!e_button(e)) { done(e); }
    else { extend(e); }
  });
  var up = operation(cm, done);
  cm.state.selectingText = up;
  on(document, "mousemove", move);
  on(document, "mouseup", up);
}

// Used when mouse-selecting to adjust the anchor to the proper side
// of a bidi jump depending on the visual position of the head.
function bidiSimplify(cm, range$$1) {
  var anchor = range$$1.anchor;
  var head = range$$1.head;
  var anchorLine = getLine(cm.doc, anchor.line);
  if (cmp(anchor, head) == 0 && anchor.sticky == head.sticky) { return range$$1 }
  var order = getOrder(anchorLine);
  if (!order) { return range$$1 }
  var index = getBidiPartAt(order, anchor.ch, anchor.sticky), part = order[index];
  if (part.from != anchor.ch && part.to != anchor.ch) { return range$$1 }
  var boundary = index + ((part.from == anchor.ch) == (part.level != 1) ? 0 : 1);
  if (boundary == 0 || boundary == order.length) { return range$$1 }

  // Compute the relative visual position of the head compared to the
  // anchor (<0 is to the left, >0 to the right)
  var leftSide;
  if (head.line != anchor.line) {
    leftSide = (head.line - anchor.line) * (cm.doc.direction == "ltr" ? 1 : -1) > 0;
  } else {
    var headIndex = getBidiPartAt(order, head.ch, head.sticky);
    var dir = headIndex - index || (head.ch - anchor.ch) * (part.level == 1 ? -1 : 1);
    if (headIndex == boundary - 1 || headIndex == boundary)
      { leftSide = dir < 0; }
    else
      { leftSide = dir > 0; }
  }

  var usePart = order[boundary + (leftSide ? -1 : 0)];
  var from = leftSide == (usePart.level == 1);
  var ch = from ? usePart.from : usePart.to, sticky = from ? "after" : "before";
  return anchor.ch == ch && anchor.sticky == sticky ? range$$1 : new Range(new Pos(anchor.line, ch, sticky), head)
}


// Determines whether an event happened in the gutter, and fires the
// handlers for the corresponding event.
function gutterEvent(cm, e, type, prevent) {
  var mX, mY;
  if (e.touches) {
    mX = e.touches[0].clientX;
    mY = e.touches[0].clientY;
  } else {
    try { mX = e.clientX; mY = e.clientY; }
    catch(e) { return false }
  }
  if (mX >= Math.floor(cm.display.gutters.getBoundingClientRect().right)) { return false }
  if (prevent) { e_preventDefault(e); }

  var display = cm.display;
  var lineBox = display.lineDiv.getBoundingClientRect();

  if (mY > lineBox.bottom || !hasHandler(cm, type)) { return e_defaultPrevented(e) }
  mY -= lineBox.top - display.viewOffset;

  for (var i = 0; i < cm.options.gutters.length; ++i) {
    var g = display.gutters.childNodes[i];
    if (g && g.getBoundingClientRect().right >= mX) {
      var line = lineAtHeight(cm.doc, mY);
      var gutter = cm.options.gutters[i];
      signal(cm, type, cm, line, gutter, e);
      return e_defaultPrevented(e)
    }
  }
}

function clickInGutter(cm, e) {
  return gutterEvent(cm, e, "gutterClick", true)
}

// CONTEXT MENU HANDLING

// To make the context menu work, we need to briefly unhide the
// textarea (making it as unobtrusive as possible) to let the
// right-click take effect on it.
function onContextMenu(cm, e) {
  if (eventInWidget(cm.display, e) || contextMenuInGutter(cm, e)) { return }
  if (signalDOMEvent(cm, e, "contextmenu")) { return }
  cm.display.input.onContextMenu(e);
}

function contextMenuInGutter(cm, e) {
  if (!hasHandler(cm, "gutterContextMenu")) { return false }
  return gutterEvent(cm, e, "gutterContextMenu", false)
}

function themeChanged(cm) {
  cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-s-\S+/g, "") +
    cm.options.theme.replace(/(^|\s)\s*/g, " cm-s-");
  clearCaches(cm);
}

var Init = {toString: function(){return "CodeMirror.Init"}};

var defaults = {};
var optionHandlers = {};

function defineOptions(CodeMirror) {
  var optionHandlers = CodeMirror.optionHandlers;

  function option(name, deflt, handle, notOnInit) {
    CodeMirror.defaults[name] = deflt;
    if (handle) { optionHandlers[name] =
      notOnInit ? function (cm, val, old) {if (old != Init) { handle(cm, val, old); }} : handle; }
  }

  CodeMirror.defineOption = option;

  // Passed to option handlers when there is no old value.
  CodeMirror.Init = Init;

  // These two are, on init, called from the constructor because they
  // have to be initialized before the editor can start at all.
  option("value", "", function (cm, val) { return cm.setValue(val); }, true);
  option("mode", null, function (cm, val) {
    cm.doc.modeOption = val;
    loadMode(cm);
  }, true);

  option("indentUnit", 2, loadMode, true);
  option("indentWithTabs", false);
  option("smartIndent", true);
  option("tabSize", 4, function (cm) {
    resetModeState(cm);
    clearCaches(cm);
    regChange(cm);
  }, true);

  option("lineSeparator", null, function (cm, val) {
    cm.doc.lineSep = val;
    if (!val) { return }
    var newBreaks = [], lineNo = cm.doc.first;
    cm.doc.iter(function (line) {
      for (var pos = 0;;) {
        var found = line.text.indexOf(val, pos);
        if (found == -1) { break }
        pos = found + val.length;
        newBreaks.push(Pos(lineNo, found));
      }
      lineNo++;
    });
    for (var i = newBreaks.length - 1; i >= 0; i--)
      { replaceRange(cm.doc, val, newBreaks[i], Pos(newBreaks[i].line, newBreaks[i].ch + val.length)); }
  });
  option("specialChars", /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff]/g, function (cm, val, old) {
    cm.state.specialChars = new RegExp(val.source + (val.test("\t") ? "" : "|\t"), "g");
    if (old != Init) { cm.refresh(); }
  });
  option("specialCharPlaceholder", defaultSpecialCharPlaceholder, function (cm) { return cm.refresh(); }, true);
  option("electricChars", true);
  option("inputStyle", mobile ? "contenteditable" : "textarea", function () {
    throw new Error("inputStyle can not (yet) be changed in a running editor") // FIXME
  }, true);
  option("spellcheck", false, function (cm, val) { return cm.getInputField().spellcheck = val; }, true);
  option("rtlMoveVisually", !windows);
  option("wholeLineUpdateBefore", true);

  option("theme", "default", function (cm) {
    themeChanged(cm);
    guttersChanged(cm);
  }, true);
  option("keyMap", "default", function (cm, val, old) {
    var next = getKeyMap(val);
    var prev = old != Init && getKeyMap(old);
    if (prev && prev.detach) { prev.detach(cm, next); }
    if (next.attach) { next.attach(cm, prev || null); }
  });
  option("extraKeys", null);
  option("configureMouse", null);

  option("lineWrapping", false, wrappingChanged, true);
  option("gutters", [], function (cm) {
    setGuttersForLineNumbers(cm.options);
    guttersChanged(cm);
  }, true);
  option("fixedGutter", true, function (cm, val) {
    cm.display.gutters.style.left = val ? compensateForHScroll(cm.display) + "px" : "0";
    cm.refresh();
  }, true);
  option("coverGutterNextToScrollbar", false, function (cm) { return updateScrollbars(cm); }, true);
  option("scrollbarStyle", "native", function (cm) {
    initScrollbars(cm);
    updateScrollbars(cm);
    cm.display.scrollbars.setScrollTop(cm.doc.scrollTop);
    cm.display.scrollbars.setScrollLeft(cm.doc.scrollLeft);
  }, true);
  option("lineNumbers", false, function (cm) {
    setGuttersForLineNumbers(cm.options);
    guttersChanged(cm);
  }, true);
  option("firstLineNumber", 1, guttersChanged, true);
  option("lineNumberFormatter", function (integer) { return integer; }, guttersChanged, true);
  option("showCursorWhenSelecting", false, updateSelection, true);

  option("resetSelectionOnContextMenu", true);
  option("lineWiseCopyCut", true);
  option("pasteLinesPerSelection", true);

  option("readOnly", false, function (cm, val) {
    if (val == "nocursor") {
      onBlur(cm);
      cm.display.input.blur();
    }
    cm.display.input.readOnlyChanged(val);
  });
  option("disableInput", false, function (cm, val) {if (!val) { cm.display.input.reset(); }}, true);
  option("dragDrop", true, dragDropChanged);
  option("allowDropFileTypes", null);

  option("cursorBlinkRate", 530);
  option("cursorScrollMargin", 0);
  option("cursorHeight", 1, updateSelection, true);
  option("singleCursorHeightPerLine", true, updateSelection, true);
  option("workTime", 100);
  option("workDelay", 100);
  option("flattenSpans", true, resetModeState, true);
  option("addModeClass", false, resetModeState, true);
  option("pollInterval", 100);
  option("undoDepth", 200, function (cm, val) { return cm.doc.history.undoDepth = val; });
  option("historyEventDelay", 1250);
  option("viewportMargin", 10, function (cm) { return cm.refresh(); }, true);
  option("maxHighlightLength", 10000, resetModeState, true);
  option("moveInputWithCursor", true, function (cm, val) {
    if (!val) { cm.display.input.resetPosition(); }
  });

  option("tabindex", null, function (cm, val) { return cm.display.input.getField().tabIndex = val || ""; });
  option("autofocus", null);
  option("direction", "ltr", function (cm, val) { return cm.doc.setDirection(val); }, true);
}

function guttersChanged(cm) {
  updateGutters(cm);
  regChange(cm);
  alignHorizontally(cm);
}

function dragDropChanged(cm, value, old) {
  var wasOn = old && old != Init;
  if (!value != !wasOn) {
    var funcs = cm.display.dragFunctions;
    var toggle = value ? on : off;
    toggle(cm.display.scroller, "dragstart", funcs.start);
    toggle(cm.display.scroller, "dragenter", funcs.enter);
    toggle(cm.display.scroller, "dragover", funcs.over);
    toggle(cm.display.scroller, "dragleave", funcs.leave);
    toggle(cm.display.scroller, "drop", funcs.drop);
  }
}

function wrappingChanged(cm) {
  if (cm.options.lineWrapping) {
    addClass(cm.display.wrapper, "CodeMirror-wrap");
    cm.display.sizer.style.minWidth = "";
    cm.display.sizerWidth = null;
  } else {
    rmClass(cm.display.wrapper, "CodeMirror-wrap");
    findMaxLine(cm);
  }
  estimateLineHeights(cm);
  regChange(cm);
  clearCaches(cm);
  setTimeout(function () { return updateScrollbars(cm); }, 100);
}

// A CodeMirror instance represents an editor. This is the object
// that user code is usually dealing with.

function CodeMirror$1(place, options) {
  var this$1 = this;

  if (!(this instanceof CodeMirror$1)) { return new CodeMirror$1(place, options) }

  this.options = options = options ? copyObj(options) : {};
  // Determine effective options based on given values and defaults.
  copyObj(defaults, options, false);
  setGuttersForLineNumbers(options);

  var doc = options.value;
  if (typeof doc == "string") { doc = new Doc(doc, options.mode, null, options.lineSeparator, options.direction); }
  this.doc = doc;

  var input = new CodeMirror$1.inputStyles[options.inputStyle](this);
  var display = this.display = new Display(place, doc, input);
  display.wrapper.CodeMirror = this;
  updateGutters(this);
  themeChanged(this);
  if (options.lineWrapping)
    { this.display.wrapper.className += " CodeMirror-wrap"; }
  initScrollbars(this);

  this.state = {
    keyMaps: [],  // stores maps added by addKeyMap
    overlays: [], // highlighting overlays, as added by addOverlay
    modeGen: 0,   // bumped when mode/overlay changes, used to invalidate highlighting info
    overwrite: false,
    delayingBlurEvent: false,
    focused: false,
    suppressEdits: false, // used to disable editing during key handlers when in readOnly mode
    pasteIncoming: false, cutIncoming: false, // help recognize paste/cut edits in input.poll
    selectingText: false,
    draggingText: false,
    highlight: new Delayed(), // stores highlight worker timeout
    keySeq: null,  // Unfinished key sequence
    specialChars: null
  };

  if (options.autofocus && !mobile) { display.input.focus(); }

  // Override magic textarea content restore that IE sometimes does
  // on our hidden textarea on reload
  if (ie && ie_version < 11) { setTimeout(function () { return this$1.display.input.reset(true); }, 20); }

  registerEventHandlers(this);
  ensureGlobalHandlers();

  startOperation(this);
  this.curOp.forceUpdate = true;
  attachDoc(this, doc);

  if ((options.autofocus && !mobile) || this.hasFocus())
    { setTimeout(bind(onFocus, this), 20); }
  else
    { onBlur(this); }

  for (var opt in optionHandlers) { if (optionHandlers.hasOwnProperty(opt))
    { optionHandlers[opt](this$1, options[opt], Init); } }
  maybeUpdateLineNumberWidth(this);
  if (options.finishInit) { options.finishInit(this); }
  for (var i = 0; i < initHooks.length; ++i) { initHooks[i](this$1); }
  endOperation(this);
  // Suppress optimizelegibility in Webkit, since it breaks text
  // measuring on line wrapping boundaries.
  if (webkit && options.lineWrapping &&
      getComputedStyle(display.lineDiv).textRendering == "optimizelegibility")
    { display.lineDiv.style.textRendering = "auto"; }
}

// The default configuration options.
CodeMirror$1.defaults = defaults;
// Functions to run when options are changed.
CodeMirror$1.optionHandlers = optionHandlers;

// Attach the necessary event handlers when initializing the editor
function registerEventHandlers(cm) {
  var d = cm.display;
  on(d.scroller, "mousedown", operation(cm, onMouseDown));
  // Older IE's will not fire a second mousedown for a double click
  if (ie && ie_version < 11)
    { on(d.scroller, "dblclick", operation(cm, function (e) {
      if (signalDOMEvent(cm, e)) { return }
      var pos = posFromMouse(cm, e);
      if (!pos || clickInGutter(cm, e) || eventInWidget(cm.display, e)) { return }
      e_preventDefault(e);
      var word = cm.findWordAt(pos);
      extendSelection(cm.doc, word.anchor, word.head);
    })); }
  else
    { on(d.scroller, "dblclick", function (e) { return signalDOMEvent(cm, e) || e_preventDefault(e); }); }
  // Some browsers fire contextmenu *after* opening the menu, at
  // which point we can't mess with it anymore. Context menu is
  // handled in onMouseDown for these browsers.
  if (!captureRightClick) { on(d.scroller, "contextmenu", function (e) { return onContextMenu(cm, e); }); }

  // Used to suppress mouse event handling when a touch happens
  var touchFinished, prevTouch = {end: 0};
  function finishTouch() {
    if (d.activeTouch) {
      touchFinished = setTimeout(function () { return d.activeTouch = null; }, 1000);
      prevTouch = d.activeTouch;
      prevTouch.end = +new Date;
    }
  }
  function isMouseLikeTouchEvent(e) {
    if (e.touches.length != 1) { return false }
    var touch = e.touches[0];
    return touch.radiusX <= 1 && touch.radiusY <= 1
  }
  function farAway(touch, other) {
    if (other.left == null) { return true }
    var dx = other.left - touch.left, dy = other.top - touch.top;
    return dx * dx + dy * dy > 20 * 20
  }
  on(d.scroller, "touchstart", function (e) {
    if (!signalDOMEvent(cm, e) && !isMouseLikeTouchEvent(e) && !clickInGutter(cm, e)) {
      d.input.ensurePolled();
      clearTimeout(touchFinished);
      var now = +new Date;
      d.activeTouch = {start: now, moved: false,
                       prev: now - prevTouch.end <= 300 ? prevTouch : null};
      if (e.touches.length == 1) {
        d.activeTouch.left = e.touches[0].pageX;
        d.activeTouch.top = e.touches[0].pageY;
      }
    }
  });
  on(d.scroller, "touchmove", function () {
    if (d.activeTouch) { d.activeTouch.moved = true; }
  });
  on(d.scroller, "touchend", function (e) {
    var touch = d.activeTouch;
    if (touch && !eventInWidget(d, e) && touch.left != null &&
        !touch.moved && new Date - touch.start < 300) {
      var pos = cm.coordsChar(d.activeTouch, "page"), range;
      if (!touch.prev || farAway(touch, touch.prev)) // Single tap
        { range = new Range(pos, pos); }
      else if (!touch.prev.prev || farAway(touch, touch.prev.prev)) // Double tap
        { range = cm.findWordAt(pos); }
      else // Triple tap
        { range = new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0))); }
      cm.setSelection(range.anchor, range.head);
      cm.focus();
      e_preventDefault(e);
    }
    finishTouch();
  });
  on(d.scroller, "touchcancel", finishTouch);

  // Sync scrolling between fake scrollbars and real scrollable
  // area, ensure viewport is updated when scrolling.
  on(d.scroller, "scroll", function () {
    if (d.scroller.clientHeight) {
      updateScrollTop(cm, d.scroller.scrollTop);
      setScrollLeft(cm, d.scroller.scrollLeft, true);
      signal(cm, "scroll", cm);
    }
  });

  // Listen to wheel events in order to try and update the viewport on time.
  on(d.scroller, "mousewheel", function (e) { return onScrollWheel(cm, e); });
  on(d.scroller, "DOMMouseScroll", function (e) { return onScrollWheel(cm, e); });

  // Prevent wrapper from ever scrolling
  on(d.wrapper, "scroll", function () { return d.wrapper.scrollTop = d.wrapper.scrollLeft = 0; });

  d.dragFunctions = {
    enter: function (e) {if (!signalDOMEvent(cm, e)) { e_stop(e); }},
    over: function (e) {if (!signalDOMEvent(cm, e)) { onDragOver(cm, e); e_stop(e); }},
    start: function (e) { return onDragStart(cm, e); },
    drop: operation(cm, onDrop),
    leave: function (e) {if (!signalDOMEvent(cm, e)) { clearDragCursor(cm); }}
  };

  var inp = d.input.getField();
  on(inp, "keyup", function (e) { return onKeyUp.call(cm, e); });
  on(inp, "keydown", operation(cm, onKeyDown));
  on(inp, "keypress", operation(cm, onKeyPress));
  on(inp, "focus", function (e) { return onFocus(cm, e); });
  on(inp, "blur", function (e) { return onBlur(cm, e); });
}

var initHooks = [];
CodeMirror$1.defineInitHook = function (f) { return initHooks.push(f); };

// Indent the given line. The how parameter can be "smart",
// "add"/null, "subtract", or "prev". When aggressive is false
// (typically set to true for forced single-line indents), empty
// lines are not indented, and places where the mode returns Pass
// are left alone.
function indentLine(cm, n, how, aggressive) {
  var doc = cm.doc, state;
  if (how == null) { how = "add"; }
  if (how == "smart") {
    // Fall back to "prev" when the mode doesn't have an indentation
    // method.
    if (!doc.mode.indent) { how = "prev"; }
    else { state = getContextBefore(cm, n).state; }
  }

  var tabSize = cm.options.tabSize;
  var line = getLine(doc, n), curSpace = countColumn(line.text, null, tabSize);
  if (line.stateAfter) { line.stateAfter = null; }
  var curSpaceString = line.text.match(/^\s*/)[0], indentation;
  if (!aggressive && !/\S/.test(line.text)) {
    indentation = 0;
    how = "not";
  } else if (how == "smart") {
    indentation = doc.mode.indent(state, line.text.slice(curSpaceString.length), line.text);
    if (indentation == Pass || indentation > 150) {
      if (!aggressive) { return }
      how = "prev";
    }
  }
  if (how == "prev") {
    if (n > doc.first) { indentation = countColumn(getLine(doc, n-1).text, null, tabSize); }
    else { indentation = 0; }
  } else if (how == "add") {
    indentation = curSpace + cm.options.indentUnit;
  } else if (how == "subtract") {
    indentation = curSpace - cm.options.indentUnit;
  } else if (typeof how == "number") {
    indentation = curSpace + how;
  }
  indentation = Math.max(0, indentation);

  var indentString = "", pos = 0;
  if (cm.options.indentWithTabs)
    { for (var i = Math.floor(indentation / tabSize); i; --i) {pos += tabSize; indentString += "\t";} }
  if (pos < indentation) { indentString += spaceStr(indentation - pos); }

  if (indentString != curSpaceString) {
    replaceRange(doc, indentString, Pos(n, 0), Pos(n, curSpaceString.length), "+input");
    line.stateAfter = null;
    return true
  } else {
    // Ensure that, if the cursor was in the whitespace at the start
    // of the line, it is moved to the end of that space.
    for (var i$1 = 0; i$1 < doc.sel.ranges.length; i$1++) {
      var range = doc.sel.ranges[i$1];
      if (range.head.line == n && range.head.ch < curSpaceString.length) {
        var pos$1 = Pos(n, curSpaceString.length);
        replaceOneSelection(doc, i$1, new Range(pos$1, pos$1));
        break
      }
    }
  }
}

// This will be set to a {lineWise: bool, text: [string]} object, so
// that, when pasting, we know what kind of selections the copied
// text was made out of.
var lastCopied = null;

function setLastCopied(newLastCopied) {
  lastCopied = newLastCopied;
}

function applyTextInput(cm, inserted, deleted, sel, origin) {
  var doc = cm.doc;
  cm.display.shift = false;
  if (!sel) { sel = doc.sel; }

  var paste = cm.state.pasteIncoming || origin == "paste";
  var textLines = splitLinesAuto(inserted), multiPaste = null;
  // When pasting N lines into N selections, insert one line per selection
  if (paste && sel.ranges.length > 1) {
    if (lastCopied && lastCopied.text.join("\n") == inserted) {
      if (sel.ranges.length % lastCopied.text.length == 0) {
        multiPaste = [];
        for (var i = 0; i < lastCopied.text.length; i++)
          { multiPaste.push(doc.splitLines(lastCopied.text[i])); }
      }
    } else if (textLines.length == sel.ranges.length && cm.options.pasteLinesPerSelection) {
      multiPaste = map(textLines, function (l) { return [l]; });
    }
  }

  var updateInput;
  // Normal behavior is to insert the new text into every selection
  for (var i$1 = sel.ranges.length - 1; i$1 >= 0; i$1--) {
    var range$$1 = sel.ranges[i$1];
    var from = range$$1.from(), to = range$$1.to();
    if (range$$1.empty()) {
      if (deleted && deleted > 0) // Handle deletion
        { from = Pos(from.line, from.ch - deleted); }
      else if (cm.state.overwrite && !paste) // Handle overwrite
        { to = Pos(to.line, Math.min(getLine(doc, to.line).text.length, to.ch + lst(textLines).length)); }
      else if (lastCopied && lastCopied.lineWise && lastCopied.text.join("\n") == inserted)
        { from = to = Pos(from.line, 0); }
    }
    updateInput = cm.curOp.updateInput;
    var changeEvent = {from: from, to: to, text: multiPaste ? multiPaste[i$1 % multiPaste.length] : textLines,
                       origin: origin || (paste ? "paste" : cm.state.cutIncoming ? "cut" : "+input")};
    makeChange(cm.doc, changeEvent);
    signalLater(cm, "inputRead", cm, changeEvent);
  }
  if (inserted && !paste)
    { triggerElectric(cm, inserted); }

  ensureCursorVisible(cm);
  cm.curOp.updateInput = updateInput;
  cm.curOp.typing = true;
  cm.state.pasteIncoming = cm.state.cutIncoming = false;
}

function handlePaste(e, cm) {
  var pasted = e.clipboardData && e.clipboardData.getData("Text");
  if (pasted) {
    e.preventDefault();
    if (!cm.isReadOnly() && !cm.options.disableInput)
      { runInOp(cm, function () { return applyTextInput(cm, pasted, 0, null, "paste"); }); }
    return true
  }
}

function triggerElectric(cm, inserted) {
  // When an 'electric' character is inserted, immediately trigger a reindent
  if (!cm.options.electricChars || !cm.options.smartIndent) { return }
  var sel = cm.doc.sel;

  for (var i = sel.ranges.length - 1; i >= 0; i--) {
    var range$$1 = sel.ranges[i];
    if (range$$1.head.ch > 100 || (i && sel.ranges[i - 1].head.line == range$$1.head.line)) { continue }
    var mode = cm.getModeAt(range$$1.head);
    var indented = false;
    if (mode.electricChars) {
      for (var j = 0; j < mode.electricChars.length; j++)
        { if (inserted.indexOf(mode.electricChars.charAt(j)) > -1) {
          indented = indentLine(cm, range$$1.head.line, "smart");
          break
        } }
    } else if (mode.electricInput) {
      if (mode.electricInput.test(getLine(cm.doc, range$$1.head.line).text.slice(0, range$$1.head.ch)))
        { indented = indentLine(cm, range$$1.head.line, "smart"); }
    }
    if (indented) { signalLater(cm, "electricInput", cm, range$$1.head.line); }
  }
}

function copyableRanges(cm) {
  var text = [], ranges = [];
  for (var i = 0; i < cm.doc.sel.ranges.length; i++) {
    var line = cm.doc.sel.ranges[i].head.line;
    var lineRange = {anchor: Pos(line, 0), head: Pos(line + 1, 0)};
    ranges.push(lineRange);
    text.push(cm.getRange(lineRange.anchor, lineRange.head));
  }
  return {text: text, ranges: ranges}
}

function disableBrowserMagic(field, spellcheck) {
  field.setAttribute("autocorrect", "off");
  field.setAttribute("autocapitalize", "off");
  field.setAttribute("spellcheck", !!spellcheck);
}

function hiddenTextarea() {
  var te = elt("textarea", null, null, "position: absolute; bottom: -1em; padding: 0; width: 1px; height: 1em; outline: none");
  var div = elt("div", [te], null, "overflow: hidden; position: relative; width: 3px; height: 0px;");
  // The textarea is kept positioned near the cursor to prevent the
  // fact that it'll be scrolled into view on input from scrolling
  // our fake cursor out of view. On webkit, when wrap=off, paste is
  // very slow. So make the area wide instead.
  if (webkit) { te.style.width = "1000px"; }
  else { te.setAttribute("wrap", "off"); }
  // If border: 0; -- iOS fails to open keyboard (issue #1287)
  if (ios) { te.style.border = "1px solid black"; }
  disableBrowserMagic(te);
  return div
}

// The publicly visible API. Note that methodOp(f) means
// 'wrap f in an operation, performed on its `this` parameter'.

// This is not the complete set of editor methods. Most of the
// methods defined on the Doc type are also injected into
// CodeMirror.prototype, for backwards compatibility and
// convenience.

var addEditorMethods = function(CodeMirror) {
  var optionHandlers = CodeMirror.optionHandlers;

  var helpers = CodeMirror.helpers = {};

  CodeMirror.prototype = {
    constructor: CodeMirror,
    focus: function(){window.focus(); this.display.input.focus();},

    setOption: function(option, value) {
      var options = this.options, old = options[option];
      if (options[option] == value && option != "mode") { return }
      options[option] = value;
      if (optionHandlers.hasOwnProperty(option))
        { operation(this, optionHandlers[option])(this, value, old); }
      signal(this, "optionChange", this, option);
    },

    getOption: function(option) {return this.options[option]},
    getDoc: function() {return this.doc},

    addKeyMap: function(map$$1, bottom) {
      this.state.keyMaps[bottom ? "push" : "unshift"](getKeyMap(map$$1));
    },
    removeKeyMap: function(map$$1) {
      var maps = this.state.keyMaps;
      for (var i = 0; i < maps.length; ++i)
        { if (maps[i] == map$$1 || maps[i].name == map$$1) {
          maps.splice(i, 1);
          return true
        } }
    },

    addOverlay: methodOp(function(spec, options) {
      var mode = spec.token ? spec : CodeMirror.getMode(this.options, spec);
      if (mode.startState) { throw new Error("Overlays may not be stateful.") }
      insertSorted(this.state.overlays,
                   {mode: mode, modeSpec: spec, opaque: options && options.opaque,
                    priority: (options && options.priority) || 0},
                   function (overlay) { return overlay.priority; });
      this.state.modeGen++;
      regChange(this);
    }),
    removeOverlay: methodOp(function(spec) {
      var this$1 = this;

      var overlays = this.state.overlays;
      for (var i = 0; i < overlays.length; ++i) {
        var cur = overlays[i].modeSpec;
        if (cur == spec || typeof spec == "string" && cur.name == spec) {
          overlays.splice(i, 1);
          this$1.state.modeGen++;
          regChange(this$1);
          return
        }
      }
    }),

    indentLine: methodOp(function(n, dir, aggressive) {
      if (typeof dir != "string" && typeof dir != "number") {
        if (dir == null) { dir = this.options.smartIndent ? "smart" : "prev"; }
        else { dir = dir ? "add" : "subtract"; }
      }
      if (isLine(this.doc, n)) { indentLine(this, n, dir, aggressive); }
    }),
    indentSelection: methodOp(function(how) {
      var this$1 = this;

      var ranges = this.doc.sel.ranges, end = -1;
      for (var i = 0; i < ranges.length; i++) {
        var range$$1 = ranges[i];
        if (!range$$1.empty()) {
          var from = range$$1.from(), to = range$$1.to();
          var start = Math.max(end, from.line);
          end = Math.min(this$1.lastLine(), to.line - (to.ch ? 0 : 1)) + 1;
          for (var j = start; j < end; ++j)
            { indentLine(this$1, j, how); }
          var newRanges = this$1.doc.sel.ranges;
          if (from.ch == 0 && ranges.length == newRanges.length && newRanges[i].from().ch > 0)
            { replaceOneSelection(this$1.doc, i, new Range(from, newRanges[i].to()), sel_dontScroll); }
        } else if (range$$1.head.line > end) {
          indentLine(this$1, range$$1.head.line, how, true);
          end = range$$1.head.line;
          if (i == this$1.doc.sel.primIndex) { ensureCursorVisible(this$1); }
        }
      }
    }),

    // Fetch the parser token for a given character. Useful for hacks
    // that want to inspect the mode state (say, for completion).
    getTokenAt: function(pos, precise) {
      return takeToken(this, pos, precise)
    },

    getLineTokens: function(line, precise) {
      return takeToken(this, Pos(line), precise, true)
    },

    getTokenTypeAt: function(pos) {
      pos = clipPos(this.doc, pos);
      var styles = getLineStyles(this, getLine(this.doc, pos.line));
      var before = 0, after = (styles.length - 1) / 2, ch = pos.ch;
      var type;
      if (ch == 0) { type = styles[2]; }
      else { for (;;) {
        var mid = (before + after) >> 1;
        if ((mid ? styles[mid * 2 - 1] : 0) >= ch) { after = mid; }
        else if (styles[mid * 2 + 1] < ch) { before = mid + 1; }
        else { type = styles[mid * 2 + 2]; break }
      } }
      var cut = type ? type.indexOf("overlay ") : -1;
      return cut < 0 ? type : cut == 0 ? null : type.slice(0, cut - 1)
    },

    getModeAt: function(pos) {
      var mode = this.doc.mode;
      if (!mode.innerMode) { return mode }
      return CodeMirror.innerMode(mode, this.getTokenAt(pos).state).mode
    },

    getHelper: function(pos, type) {
      return this.getHelpers(pos, type)[0]
    },

    getHelpers: function(pos, type) {
      var this$1 = this;

      var found = [];
      if (!helpers.hasOwnProperty(type)) { return found }
      var help = helpers[type], mode = this.getModeAt(pos);
      if (typeof mode[type] == "string") {
        if (help[mode[type]]) { found.push(help[mode[type]]); }
      } else if (mode[type]) {
        for (var i = 0; i < mode[type].length; i++) {
          var val = help[mode[type][i]];
          if (val) { found.push(val); }
        }
      } else if (mode.helperType && help[mode.helperType]) {
        found.push(help[mode.helperType]);
      } else if (help[mode.name]) {
        found.push(help[mode.name]);
      }
      for (var i$1 = 0; i$1 < help._global.length; i$1++) {
        var cur = help._global[i$1];
        if (cur.pred(mode, this$1) && indexOf(found, cur.val) == -1)
          { found.push(cur.val); }
      }
      return found
    },

    getStateAfter: function(line, precise) {
      var doc = this.doc;
      line = clipLine(doc, line == null ? doc.first + doc.size - 1: line);
      return getContextBefore(this, line + 1, precise).state
    },

    cursorCoords: function(start, mode) {
      var pos, range$$1 = this.doc.sel.primary();
      if (start == null) { pos = range$$1.head; }
      else if (typeof start == "object") { pos = clipPos(this.doc, start); }
      else { pos = start ? range$$1.from() : range$$1.to(); }
      return cursorCoords(this, pos, mode || "page")
    },

    charCoords: function(pos, mode) {
      return charCoords(this, clipPos(this.doc, pos), mode || "page")
    },

    coordsChar: function(coords, mode) {
      coords = fromCoordSystem(this, coords, mode || "page");
      return coordsChar(this, coords.left, coords.top)
    },

    lineAtHeight: function(height, mode) {
      height = fromCoordSystem(this, {top: height, left: 0}, mode || "page").top;
      return lineAtHeight(this.doc, height + this.display.viewOffset)
    },
    heightAtLine: function(line, mode, includeWidgets) {
      var end = false, lineObj;
      if (typeof line == "number") {
        var last = this.doc.first + this.doc.size - 1;
        if (line < this.doc.first) { line = this.doc.first; }
        else if (line > last) { line = last; end = true; }
        lineObj = getLine(this.doc, line);
      } else {
        lineObj = line;
      }
      return intoCoordSystem(this, lineObj, {top: 0, left: 0}, mode || "page", includeWidgets || end).top +
        (end ? this.doc.height - heightAtLine(lineObj) : 0)
    },

    defaultTextHeight: function() { return textHeight(this.display) },
    defaultCharWidth: function() { return charWidth(this.display) },

    getViewport: function() { return {from: this.display.viewFrom, to: this.display.viewTo}},

    addWidget: function(pos, node, scroll, vert, horiz) {
      var display = this.display;
      pos = cursorCoords(this, clipPos(this.doc, pos));
      var top = pos.bottom, left = pos.left;
      node.style.position = "absolute";
      node.setAttribute("cm-ignore-events", "true");
      this.display.input.setUneditable(node);
      display.sizer.appendChild(node);
      if (vert == "over") {
        top = pos.top;
      } else if (vert == "above" || vert == "near") {
        var vspace = Math.max(display.wrapper.clientHeight, this.doc.height),
        hspace = Math.max(display.sizer.clientWidth, display.lineSpace.clientWidth);
        // Default to positioning above (if specified and possible); otherwise default to positioning below
        if ((vert == 'above' || pos.bottom + node.offsetHeight > vspace) && pos.top > node.offsetHeight)
          { top = pos.top - node.offsetHeight; }
        else if (pos.bottom + node.offsetHeight <= vspace)
          { top = pos.bottom; }
        if (left + node.offsetWidth > hspace)
          { left = hspace - node.offsetWidth; }
      }
      node.style.top = top + "px";
      node.style.left = node.style.right = "";
      if (horiz == "right") {
        left = display.sizer.clientWidth - node.offsetWidth;
        node.style.right = "0px";
      } else {
        if (horiz == "left") { left = 0; }
        else if (horiz == "middle") { left = (display.sizer.clientWidth - node.offsetWidth) / 2; }
        node.style.left = left + "px";
      }
      if (scroll)
        { scrollIntoView(this, {left: left, top: top, right: left + node.offsetWidth, bottom: top + node.offsetHeight}); }
    },

    triggerOnKeyDown: methodOp(onKeyDown),
    triggerOnKeyPress: methodOp(onKeyPress),
    triggerOnKeyUp: onKeyUp,
    triggerOnMouseDown: methodOp(onMouseDown),

    execCommand: function(cmd) {
      if (commands.hasOwnProperty(cmd))
        { return commands[cmd].call(null, this) }
    },

    triggerElectric: methodOp(function(text) { triggerElectric(this, text); }),

    findPosH: function(from, amount, unit, visually) {
      var this$1 = this;

      var dir = 1;
      if (amount < 0) { dir = -1; amount = -amount; }
      var cur = clipPos(this.doc, from);
      for (var i = 0; i < amount; ++i) {
        cur = findPosH(this$1.doc, cur, dir, unit, visually);
        if (cur.hitSide) { break }
      }
      return cur
    },

    moveH: methodOp(function(dir, unit) {
      var this$1 = this;

      this.extendSelectionsBy(function (range$$1) {
        if (this$1.display.shift || this$1.doc.extend || range$$1.empty())
          { return findPosH(this$1.doc, range$$1.head, dir, unit, this$1.options.rtlMoveVisually) }
        else
          { return dir < 0 ? range$$1.from() : range$$1.to() }
      }, sel_move);
    }),

    deleteH: methodOp(function(dir, unit) {
      var sel = this.doc.sel, doc = this.doc;
      if (sel.somethingSelected())
        { doc.replaceSelection("", null, "+delete"); }
      else
        { deleteNearSelection(this, function (range$$1) {
          var other = findPosH(doc, range$$1.head, dir, unit, false);
          return dir < 0 ? {from: other, to: range$$1.head} : {from: range$$1.head, to: other}
        }); }
    }),

    findPosV: function(from, amount, unit, goalColumn) {
      var this$1 = this;

      var dir = 1, x = goalColumn;
      if (amount < 0) { dir = -1; amount = -amount; }
      var cur = clipPos(this.doc, from);
      for (var i = 0; i < amount; ++i) {
        var coords = cursorCoords(this$1, cur, "div");
        if (x == null) { x = coords.left; }
        else { coords.left = x; }
        cur = findPosV(this$1, coords, dir, unit);
        if (cur.hitSide) { break }
      }
      return cur
    },

    moveV: methodOp(function(dir, unit) {
      var this$1 = this;

      var doc = this.doc, goals = [];
      var collapse = !this.display.shift && !doc.extend && doc.sel.somethingSelected();
      doc.extendSelectionsBy(function (range$$1) {
        if (collapse)
          { return dir < 0 ? range$$1.from() : range$$1.to() }
        var headPos = cursorCoords(this$1, range$$1.head, "div");
        if (range$$1.goalColumn != null) { headPos.left = range$$1.goalColumn; }
        goals.push(headPos.left);
        var pos = findPosV(this$1, headPos, dir, unit);
        if (unit == "page" && range$$1 == doc.sel.primary())
          { addToScrollTop(this$1, charCoords(this$1, pos, "div").top - headPos.top); }
        return pos
      }, sel_move);
      if (goals.length) { for (var i = 0; i < doc.sel.ranges.length; i++)
        { doc.sel.ranges[i].goalColumn = goals[i]; } }
    }),

    // Find the word at the given position (as returned by coordsChar).
    findWordAt: function(pos) {
      var doc = this.doc, line = getLine(doc, pos.line).text;
      var start = pos.ch, end = pos.ch;
      if (line) {
        var helper = this.getHelper(pos, "wordChars");
        if ((pos.sticky == "before" || end == line.length) && start) { --start; } else { ++end; }
        var startChar = line.charAt(start);
        var check = isWordChar(startChar, helper)
          ? function (ch) { return isWordChar(ch, helper); }
          : /\s/.test(startChar) ? function (ch) { return /\s/.test(ch); }
          : function (ch) { return (!/\s/.test(ch) && !isWordChar(ch)); };
        while (start > 0 && check(line.charAt(start - 1))) { --start; }
        while (end < line.length && check(line.charAt(end))) { ++end; }
      }
      return new Range(Pos(pos.line, start), Pos(pos.line, end))
    },

    toggleOverwrite: function(value) {
      if (value != null && value == this.state.overwrite) { return }
      if (this.state.overwrite = !this.state.overwrite)
        { addClass(this.display.cursorDiv, "CodeMirror-overwrite"); }
      else
        { rmClass(this.display.cursorDiv, "CodeMirror-overwrite"); }

      signal(this, "overwriteToggle", this, this.state.overwrite);
    },
    hasFocus: function() { return this.display.input.getField() == activeElt() },
    isReadOnly: function() { return !!(this.options.readOnly || this.doc.cantEdit) },

    scrollTo: methodOp(function (x, y) { scrollToCoords(this, x, y); }),
    getScrollInfo: function() {
      var scroller = this.display.scroller;
      return {left: scroller.scrollLeft, top: scroller.scrollTop,
              height: scroller.scrollHeight - scrollGap(this) - this.display.barHeight,
              width: scroller.scrollWidth - scrollGap(this) - this.display.barWidth,
              clientHeight: displayHeight(this), clientWidth: displayWidth(this)}
    },

    scrollIntoView: methodOp(function(range$$1, margin) {
      if (range$$1 == null) {
        range$$1 = {from: this.doc.sel.primary().head, to: null};
        if (margin == null) { margin = this.options.cursorScrollMargin; }
      } else if (typeof range$$1 == "number") {
        range$$1 = {from: Pos(range$$1, 0), to: null};
      } else if (range$$1.from == null) {
        range$$1 = {from: range$$1, to: null};
      }
      if (!range$$1.to) { range$$1.to = range$$1.from; }
      range$$1.margin = margin || 0;

      if (range$$1.from.line != null) {
        scrollToRange(this, range$$1);
      } else {
        scrollToCoordsRange(this, range$$1.from, range$$1.to, range$$1.margin);
      }
    }),

    setSize: methodOp(function(width, height) {
      var this$1 = this;

      var interpret = function (val) { return typeof val == "number" || /^\d+$/.test(String(val)) ? val + "px" : val; };
      if (width != null) { this.display.wrapper.style.width = interpret(width); }
      if (height != null) { this.display.wrapper.style.height = interpret(height); }
      if (this.options.lineWrapping) { clearLineMeasurementCache(this); }
      var lineNo$$1 = this.display.viewFrom;
      this.doc.iter(lineNo$$1, this.display.viewTo, function (line) {
        if (line.widgets) { for (var i = 0; i < line.widgets.length; i++)
          { if (line.widgets[i].noHScroll) { regLineChange(this$1, lineNo$$1, "widget"); break } } }
        ++lineNo$$1;
      });
      this.curOp.forceUpdate = true;
      signal(this, "refresh", this);
    }),

    operation: function(f){return runInOp(this, f)},
    startOperation: function(){return startOperation(this)},
    endOperation: function(){return endOperation(this)},

    refresh: methodOp(function() {
      var oldHeight = this.display.cachedTextHeight;
      regChange(this);
      this.curOp.forceUpdate = true;
      clearCaches(this);
      scrollToCoords(this, this.doc.scrollLeft, this.doc.scrollTop);
      updateGutterSpace(this);
      if (oldHeight == null || Math.abs(oldHeight - textHeight(this.display)) > .5)
        { estimateLineHeights(this); }
      signal(this, "refresh", this);
    }),

    swapDoc: methodOp(function(doc) {
      var old = this.doc;
      old.cm = null;
      attachDoc(this, doc);
      clearCaches(this);
      this.display.input.reset();
      scrollToCoords(this, doc.scrollLeft, doc.scrollTop);
      this.curOp.forceScroll = true;
      signalLater(this, "swapDoc", this, old);
      return old
    }),

    getInputField: function(){return this.display.input.getField()},
    getWrapperElement: function(){return this.display.wrapper},
    getScrollerElement: function(){return this.display.scroller},
    getGutterElement: function(){return this.display.gutters}
  };
  eventMixin(CodeMirror);

  CodeMirror.registerHelper = function(type, name, value) {
    if (!helpers.hasOwnProperty(type)) { helpers[type] = CodeMirror[type] = {_global: []}; }
    helpers[type][name] = value;
  };
  CodeMirror.registerGlobalHelper = function(type, name, predicate, value) {
    CodeMirror.registerHelper(type, name, value);
    helpers[type]._global.push({pred: predicate, val: value});
  };
};

// Used for horizontal relative motion. Dir is -1 or 1 (left or
// right), unit can be "char", "column" (like char, but doesn't
// cross line boundaries), "word" (across next word), or "group" (to
// the start of next group of word or non-word-non-whitespace
// chars). The visually param controls whether, in right-to-left
// text, direction 1 means to move towards the next index in the
// string, or towards the character to the right of the current
// position. The resulting position will have a hitSide=true
// property if it reached the end of the document.
function findPosH(doc, pos, dir, unit, visually) {
  var oldPos = pos;
  var origDir = dir;
  var lineObj = getLine(doc, pos.line);
  function findNextLine() {
    var l = pos.line + dir;
    if (l < doc.first || l >= doc.first + doc.size) { return false }
    pos = new Pos(l, pos.ch, pos.sticky);
    return lineObj = getLine(doc, l)
  }
  function moveOnce(boundToLine) {
    var next;
    if (visually) {
      next = moveVisually(doc.cm, lineObj, pos, dir);
    } else {
      next = moveLogically(lineObj, pos, dir);
    }
    if (next == null) {
      if (!boundToLine && findNextLine())
        { pos = endOfLine(visually, doc.cm, lineObj, pos.line, dir); }
      else
        { return false }
    } else {
      pos = next;
    }
    return true
  }

  if (unit == "char") {
    moveOnce();
  } else if (unit == "column") {
    moveOnce(true);
  } else if (unit == "word" || unit == "group") {
    var sawType = null, group = unit == "group";
    var helper = doc.cm && doc.cm.getHelper(pos, "wordChars");
    for (var first = true;; first = false) {
      if (dir < 0 && !moveOnce(!first)) { break }
      var cur = lineObj.text.charAt(pos.ch) || "\n";
      var type = isWordChar(cur, helper) ? "w"
        : group && cur == "\n" ? "n"
        : !group || /\s/.test(cur) ? null
        : "p";
      if (group && !first && !type) { type = "s"; }
      if (sawType && sawType != type) {
        if (dir < 0) {dir = 1; moveOnce(); pos.sticky = "after";}
        break
      }

      if (type) { sawType = type; }
      if (dir > 0 && !moveOnce(!first)) { break }
    }
  }
  var result = skipAtomic(doc, pos, oldPos, origDir, true);
  if (equalCursorPos(oldPos, result)) { result.hitSide = true; }
  return result
}

// For relative vertical movement. Dir may be -1 or 1. Unit can be
// "page" or "line". The resulting position will have a hitSide=true
// property if it reached the end of the document.
function findPosV(cm, pos, dir, unit) {
  var doc = cm.doc, x = pos.left, y;
  if (unit == "page") {
    var pageSize = Math.min(cm.display.wrapper.clientHeight, window.innerHeight || document.documentElement.clientHeight);
    var moveAmount = Math.max(pageSize - .5 * textHeight(cm.display), 3);
    y = (dir > 0 ? pos.bottom : pos.top) + dir * moveAmount;

  } else if (unit == "line") {
    y = dir > 0 ? pos.bottom + 3 : pos.top - 3;
  }
  var target;
  for (;;) {
    target = coordsChar(cm, x, y);
    if (!target.outside) { break }
    if (dir < 0 ? y <= 0 : y >= doc.height) { target.hitSide = true; break }
    y += dir * 5;
  }
  return target
}

// CONTENTEDITABLE INPUT STYLE

var ContentEditableInput = function(cm) {
  this.cm = cm;
  this.lastAnchorNode = this.lastAnchorOffset = this.lastFocusNode = this.lastFocusOffset = null;
  this.polling = new Delayed();
  this.composing = null;
  this.gracePeriod = false;
  this.readDOMTimeout = null;
};

ContentEditableInput.prototype.init = function (display) {
    var this$1 = this;

  var input = this, cm = input.cm;
  var div = input.div = display.lineDiv;
  disableBrowserMagic(div, cm.options.spellcheck);

  on(div, "paste", function (e) {
    if (signalDOMEvent(cm, e) || handlePaste(e, cm)) { return }
    // IE doesn't fire input events, so we schedule a read for the pasted content in this way
    if (ie_version <= 11) { setTimeout(operation(cm, function () { return this$1.updateFromDOM(); }), 20); }
  });

  on(div, "compositionstart", function (e) {
    this$1.composing = {data: e.data, done: false};
  });
  on(div, "compositionupdate", function (e) {
    if (!this$1.composing) { this$1.composing = {data: e.data, done: false}; }
  });
  on(div, "compositionend", function (e) {
    if (this$1.composing) {
      if (e.data != this$1.composing.data) { this$1.readFromDOMSoon(); }
      this$1.composing.done = true;
    }
  });

  on(div, "touchstart", function () { return input.forceCompositionEnd(); });

  on(div, "input", function () {
    if (!this$1.composing) { this$1.readFromDOMSoon(); }
  });

  function onCopyCut(e) {
    if (signalDOMEvent(cm, e)) { return }
    if (cm.somethingSelected()) {
      setLastCopied({lineWise: false, text: cm.getSelections()});
      if (e.type == "cut") { cm.replaceSelection("", null, "cut"); }
    } else if (!cm.options.lineWiseCopyCut) {
      return
    } else {
      var ranges = copyableRanges(cm);
      setLastCopied({lineWise: true, text: ranges.text});
      if (e.type == "cut") {
        cm.operation(function () {
          cm.setSelections(ranges.ranges, 0, sel_dontScroll);
          cm.replaceSelection("", null, "cut");
        });
      }
    }
    if (e.clipboardData) {
      e.clipboardData.clearData();
      var content = lastCopied.text.join("\n");
      // iOS exposes the clipboard API, but seems to discard content inserted into it
      e.clipboardData.setData("Text", content);
      if (e.clipboardData.getData("Text") == content) {
        e.preventDefault();
        return
      }
    }
    // Old-fashioned briefly-focus-a-textarea hack
    var kludge = hiddenTextarea(), te = kludge.firstChild;
    cm.display.lineSpace.insertBefore(kludge, cm.display.lineSpace.firstChild);
    te.value = lastCopied.text.join("\n");
    var hadFocus = document.activeElement;
    selectInput(te);
    setTimeout(function () {
      cm.display.lineSpace.removeChild(kludge);
      hadFocus.focus();
      if (hadFocus == div) { input.showPrimarySelection(); }
    }, 50);
  }
  on(div, "copy", onCopyCut);
  on(div, "cut", onCopyCut);
};

ContentEditableInput.prototype.prepareSelection = function () {
  var result = prepareSelection(this.cm, false);
  result.focus = this.cm.state.focused;
  return result
};

ContentEditableInput.prototype.showSelection = function (info, takeFocus) {
  if (!info || !this.cm.display.view.length) { return }
  if (info.focus || takeFocus) { this.showPrimarySelection(); }
  this.showMultipleSelections(info);
};

ContentEditableInput.prototype.showPrimarySelection = function () {
  var sel = window.getSelection(), cm = this.cm, prim = cm.doc.sel.primary();
  var from = prim.from(), to = prim.to();

  if (cm.display.viewTo == cm.display.viewFrom || from.line >= cm.display.viewTo || to.line < cm.display.viewFrom) {
    sel.removeAllRanges();
    return
  }

  var curAnchor = domToPos(cm, sel.anchorNode, sel.anchorOffset);
  var curFocus = domToPos(cm, sel.focusNode, sel.focusOffset);
  if (curAnchor && !curAnchor.bad && curFocus && !curFocus.bad &&
      cmp(minPos(curAnchor, curFocus), from) == 0 &&
      cmp(maxPos(curAnchor, curFocus), to) == 0)
    { return }

  var view = cm.display.view;
  var start = (from.line >= cm.display.viewFrom && posToDOM(cm, from)) ||
      {node: view[0].measure.map[2], offset: 0};
  var end = to.line < cm.display.viewTo && posToDOM(cm, to);
  if (!end) {
    var measure = view[view.length - 1].measure;
    var map$$1 = measure.maps ? measure.maps[measure.maps.length - 1] : measure.map;
    end = {node: map$$1[map$$1.length - 1], offset: map$$1[map$$1.length - 2] - map$$1[map$$1.length - 3]};
  }

  if (!start || !end) {
    sel.removeAllRanges();
    return
  }

  var old = sel.rangeCount && sel.getRangeAt(0), rng;
  try { rng = range(start.node, start.offset, end.offset, end.node); }
  catch(e) {} // Our model of the DOM might be outdated, in which case the range we try to set can be impossible
  if (rng) {
    if (!gecko && cm.state.focused) {
      sel.collapse(start.node, start.offset);
      if (!rng.collapsed) {
        sel.removeAllRanges();
        sel.addRange(rng);
      }
    } else {
      sel.removeAllRanges();
      sel.addRange(rng);
    }
    if (old && sel.anchorNode == null) { sel.addRange(old); }
    else if (gecko) { this.startGracePeriod(); }
  }
  this.rememberSelection();
};

ContentEditableInput.prototype.startGracePeriod = function () {
    var this$1 = this;

  clearTimeout(this.gracePeriod);
  this.gracePeriod = setTimeout(function () {
    this$1.gracePeriod = false;
    if (this$1.selectionChanged())
      { this$1.cm.operation(function () { return this$1.cm.curOp.selectionChanged = true; }); }
  }, 20);
};

ContentEditableInput.prototype.showMultipleSelections = function (info) {
  removeChildrenAndAdd(this.cm.display.cursorDiv, info.cursors);
  removeChildrenAndAdd(this.cm.display.selectionDiv, info.selection);
};

ContentEditableInput.prototype.rememberSelection = function () {
  var sel = window.getSelection();
  this.lastAnchorNode = sel.anchorNode; this.lastAnchorOffset = sel.anchorOffset;
  this.lastFocusNode = sel.focusNode; this.lastFocusOffset = sel.focusOffset;
};

ContentEditableInput.prototype.selectionInEditor = function () {
  var sel = window.getSelection();
  if (!sel.rangeCount) { return false }
  var node = sel.getRangeAt(0).commonAncestorContainer;
  return contains(this.div, node)
};

ContentEditableInput.prototype.focus = function () {
  if (this.cm.options.readOnly != "nocursor") {
    if (!this.selectionInEditor())
      { this.showSelection(this.prepareSelection(), true); }
    this.div.focus();
  }
};
ContentEditableInput.prototype.blur = function () { this.div.blur(); };
ContentEditableInput.prototype.getField = function () { return this.div };

ContentEditableInput.prototype.supportsTouch = function () { return true };

ContentEditableInput.prototype.receivedFocus = function () {
  var input = this;
  if (this.selectionInEditor())
    { this.pollSelection(); }
  else
    { runInOp(this.cm, function () { return input.cm.curOp.selectionChanged = true; }); }

  function poll() {
    if (input.cm.state.focused) {
      input.pollSelection();
      input.polling.set(input.cm.options.pollInterval, poll);
    }
  }
  this.polling.set(this.cm.options.pollInterval, poll);
};

ContentEditableInput.prototype.selectionChanged = function () {
  var sel = window.getSelection();
  return sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset ||
    sel.focusNode != this.lastFocusNode || sel.focusOffset != this.lastFocusOffset
};

ContentEditableInput.prototype.pollSelection = function () {
  if (this.readDOMTimeout != null || this.gracePeriod || !this.selectionChanged()) { return }
  var sel = window.getSelection(), cm = this.cm;
  // On Android Chrome (version 56, at least), backspacing into an
  // uneditable block element will put the cursor in that element,
  // and then, because it's not editable, hide the virtual keyboard.
  // Because Android doesn't allow us to actually detect backspace
  // presses in a sane way, this code checks for when that happens
  // and simulates a backspace press in this case.
  if (android && chrome && this.cm.options.gutters.length && isInGutter(sel.anchorNode)) {
    this.cm.triggerOnKeyDown({type: "keydown", keyCode: 8, preventDefault: Math.abs});
    this.blur();
    this.focus();
    return
  }
  if (this.composing) { return }
  this.rememberSelection();
  var anchor = domToPos(cm, sel.anchorNode, sel.anchorOffset);
  var head = domToPos(cm, sel.focusNode, sel.focusOffset);
  if (anchor && head) { runInOp(cm, function () {
    setSelection(cm.doc, simpleSelection(anchor, head), sel_dontScroll);
    if (anchor.bad || head.bad) { cm.curOp.selectionChanged = true; }
  }); }
};

ContentEditableInput.prototype.pollContent = function () {
  if (this.readDOMTimeout != null) {
    clearTimeout(this.readDOMTimeout);
    this.readDOMTimeout = null;
  }

  var cm = this.cm, display = cm.display, sel = cm.doc.sel.primary();
  var from = sel.from(), to = sel.to();
  if (from.ch == 0 && from.line > cm.firstLine())
    { from = Pos(from.line - 1, getLine(cm.doc, from.line - 1).length); }
  if (to.ch == getLine(cm.doc, to.line).text.length && to.line < cm.lastLine())
    { to = Pos(to.line + 1, 0); }
  if (from.line < display.viewFrom || to.line > display.viewTo - 1) { return false }

  var fromIndex, fromLine, fromNode;
  if (from.line == display.viewFrom || (fromIndex = findViewIndex(cm, from.line)) == 0) {
    fromLine = lineNo(display.view[0].line);
    fromNode = display.view[0].node;
  } else {
    fromLine = lineNo(display.view[fromIndex].line);
    fromNode = display.view[fromIndex - 1].node.nextSibling;
  }
  var toIndex = findViewIndex(cm, to.line);
  var toLine, toNode;
  if (toIndex == display.view.length - 1) {
    toLine = display.viewTo - 1;
    toNode = display.lineDiv.lastChild;
  } else {
    toLine = lineNo(display.view[toIndex + 1].line) - 1;
    toNode = display.view[toIndex + 1].node.previousSibling;
  }

  if (!fromNode) { return false }
  var newText = cm.doc.splitLines(domTextBetween(cm, fromNode, toNode, fromLine, toLine));
  var oldText = getBetween(cm.doc, Pos(fromLine, 0), Pos(toLine, getLine(cm.doc, toLine).text.length));
  while (newText.length > 1 && oldText.length > 1) {
    if (lst(newText) == lst(oldText)) { newText.pop(); oldText.pop(); toLine--; }
    else if (newText[0] == oldText[0]) { newText.shift(); oldText.shift(); fromLine++; }
    else { break }
  }

  var cutFront = 0, cutEnd = 0;
  var newTop = newText[0], oldTop = oldText[0], maxCutFront = Math.min(newTop.length, oldTop.length);
  while (cutFront < maxCutFront && newTop.charCodeAt(cutFront) == oldTop.charCodeAt(cutFront))
    { ++cutFront; }
  var newBot = lst(newText), oldBot = lst(oldText);
  var maxCutEnd = Math.min(newBot.length - (newText.length == 1 ? cutFront : 0),
                           oldBot.length - (oldText.length == 1 ? cutFront : 0));
  while (cutEnd < maxCutEnd &&
         newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1))
    { ++cutEnd; }
  // Try to move start of change to start of selection if ambiguous
  if (newText.length == 1 && oldText.length == 1 && fromLine == from.line) {
    while (cutFront && cutFront > from.ch &&
           newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1)) {
      cutFront--;
      cutEnd++;
    }
  }

  newText[newText.length - 1] = newBot.slice(0, newBot.length - cutEnd).replace(/^\u200b+/, "");
  newText[0] = newText[0].slice(cutFront).replace(/\u200b+$/, "");

  var chFrom = Pos(fromLine, cutFront);
  var chTo = Pos(toLine, oldText.length ? lst(oldText).length - cutEnd : 0);
  if (newText.length > 1 || newText[0] || cmp(chFrom, chTo)) {
    replaceRange(cm.doc, newText, chFrom, chTo, "+input");
    return true
  }
};

ContentEditableInput.prototype.ensurePolled = function () {
  this.forceCompositionEnd();
};
ContentEditableInput.prototype.reset = function () {
  this.forceCompositionEnd();
};
ContentEditableInput.prototype.forceCompositionEnd = function () {
  if (!this.composing) { return }
  clearTimeout(this.readDOMTimeout);
  this.composing = null;
  this.updateFromDOM();
  this.div.blur();
  this.div.focus();
};
ContentEditableInput.prototype.readFromDOMSoon = function () {
    var this$1 = this;

  if (this.readDOMTimeout != null) { return }
  this.readDOMTimeout = setTimeout(function () {
    this$1.readDOMTimeout = null;
    if (this$1.composing) {
      if (this$1.composing.done) { this$1.composing = null; }
      else { return }
    }
    this$1.updateFromDOM();
  }, 80);
};

ContentEditableInput.prototype.updateFromDOM = function () {
    var this$1 = this;

  if (this.cm.isReadOnly() || !this.pollContent())
    { runInOp(this.cm, function () { return regChange(this$1.cm); }); }
};

ContentEditableInput.prototype.setUneditable = function (node) {
  node.contentEditable = "false";
};

ContentEditableInput.prototype.onKeyPress = function (e) {
  if (e.charCode == 0) { return }
  e.preventDefault();
  if (!this.cm.isReadOnly())
    { operation(this.cm, applyTextInput)(this.cm, String.fromCharCode(e.charCode == null ? e.keyCode : e.charCode), 0); }
};

ContentEditableInput.prototype.readOnlyChanged = function (val) {
  this.div.contentEditable = String(val != "nocursor");
};

ContentEditableInput.prototype.onContextMenu = function () {};
ContentEditableInput.prototype.resetPosition = function () {};

ContentEditableInput.prototype.needsContentAttribute = true;

function posToDOM(cm, pos) {
  var view = findViewForLine(cm, pos.line);
  if (!view || view.hidden) { return null }
  var line = getLine(cm.doc, pos.line);
  var info = mapFromLineView(view, line, pos.line);

  var order = getOrder(line, cm.doc.direction), side = "left";
  if (order) {
    var partPos = getBidiPartAt(order, pos.ch);
    side = partPos % 2 ? "right" : "left";
  }
  var result = nodeAndOffsetInLineMap(info.map, pos.ch, side);
  result.offset = result.collapse == "right" ? result.end : result.start;
  return result
}

function isInGutter(node) {
  for (var scan = node; scan; scan = scan.parentNode)
    { if (/CodeMirror-gutter-wrapper/.test(scan.className)) { return true } }
  return false
}

function badPos(pos, bad) { if (bad) { pos.bad = true; } return pos }

function domTextBetween(cm, from, to, fromLine, toLine) {
  var text = "", closing = false, lineSep = cm.doc.lineSeparator();
  function recognizeMarker(id) { return function (marker) { return marker.id == id; } }
  function close() {
    if (closing) {
      text += lineSep;
      closing = false;
    }
  }
  function addText(str) {
    if (str) {
      close();
      text += str;
    }
  }
  function walk(node) {
    if (node.nodeType == 1) {
      var cmText = node.getAttribute("cm-text");
      if (cmText != null) {
        addText(cmText || node.textContent.replace(/\u200b/g, ""));
        return
      }
      var markerID = node.getAttribute("cm-marker"), range$$1;
      if (markerID) {
        var found = cm.findMarks(Pos(fromLine, 0), Pos(toLine + 1, 0), recognizeMarker(+markerID));
        if (found.length && (range$$1 = found[0].find(0)))
          { addText(getBetween(cm.doc, range$$1.from, range$$1.to).join(lineSep)); }
        return
      }
      if (node.getAttribute("contenteditable") == "false") { return }
      var isBlock = /^(pre|div|p)$/i.test(node.nodeName);
      if (isBlock) { close(); }
      for (var i = 0; i < node.childNodes.length; i++)
        { walk(node.childNodes[i]); }
      if (isBlock) { closing = true; }
    } else if (node.nodeType == 3) {
      addText(node.nodeValue);
    }
  }
  for (;;) {
    walk(from);
    if (from == to) { break }
    from = from.nextSibling;
  }
  return text
}

function domToPos(cm, node, offset) {
  var lineNode;
  if (node == cm.display.lineDiv) {
    lineNode = cm.display.lineDiv.childNodes[offset];
    if (!lineNode) { return badPos(cm.clipPos(Pos(cm.display.viewTo - 1)), true) }
    node = null; offset = 0;
  } else {
    for (lineNode = node;; lineNode = lineNode.parentNode) {
      if (!lineNode || lineNode == cm.display.lineDiv) { return null }
      if (lineNode.parentNode && lineNode.parentNode == cm.display.lineDiv) { break }
    }
  }
  for (var i = 0; i < cm.display.view.length; i++) {
    var lineView = cm.display.view[i];
    if (lineView.node == lineNode)
      { return locateNodeInLineView(lineView, node, offset) }
  }
}

function locateNodeInLineView(lineView, node, offset) {
  var wrapper = lineView.text.firstChild, bad = false;
  if (!node || !contains(wrapper, node)) { return badPos(Pos(lineNo(lineView.line), 0), true) }
  if (node == wrapper) {
    bad = true;
    node = wrapper.childNodes[offset];
    offset = 0;
    if (!node) {
      var line = lineView.rest ? lst(lineView.rest) : lineView.line;
      return badPos(Pos(lineNo(line), line.text.length), bad)
    }
  }

  var textNode = node.nodeType == 3 ? node : null, topNode = node;
  if (!textNode && node.childNodes.length == 1 && node.firstChild.nodeType == 3) {
    textNode = node.firstChild;
    if (offset) { offset = textNode.nodeValue.length; }
  }
  while (topNode.parentNode != wrapper) { topNode = topNode.parentNode; }
  var measure = lineView.measure, maps = measure.maps;

  function find(textNode, topNode, offset) {
    for (var i = -1; i < (maps ? maps.length : 0); i++) {
      var map$$1 = i < 0 ? measure.map : maps[i];
      for (var j = 0; j < map$$1.length; j += 3) {
        var curNode = map$$1[j + 2];
        if (curNode == textNode || curNode == topNode) {
          var line = lineNo(i < 0 ? lineView.line : lineView.rest[i]);
          var ch = map$$1[j] + offset;
          if (offset < 0 || curNode != textNode) { ch = map$$1[j + (offset ? 1 : 0)]; }
          return Pos(line, ch)
        }
      }
    }
  }
  var found = find(textNode, topNode, offset);
  if (found) { return badPos(found, bad) }

  // FIXME this is all really shaky. might handle the few cases it needs to handle, but likely to cause problems
  for (var after = topNode.nextSibling, dist = textNode ? textNode.nodeValue.length - offset : 0; after; after = after.nextSibling) {
    found = find(after, after.firstChild, 0);
    if (found)
      { return badPos(Pos(found.line, found.ch - dist), bad) }
    else
      { dist += after.textContent.length; }
  }
  for (var before = topNode.previousSibling, dist$1 = offset; before; before = before.previousSibling) {
    found = find(before, before.firstChild, -1);
    if (found)
      { return badPos(Pos(found.line, found.ch + dist$1), bad) }
    else
      { dist$1 += before.textContent.length; }
  }
}

// TEXTAREA INPUT STYLE

var TextareaInput = function(cm) {
  this.cm = cm;
  // See input.poll and input.reset
  this.prevInput = "";

  // Flag that indicates whether we expect input to appear real soon
  // now (after some event like 'keypress' or 'input') and are
  // polling intensively.
  this.pollingFast = false;
  // Self-resetting timeout for the poller
  this.polling = new Delayed();
  // Used to work around IE issue with selection being forgotten when focus moves away from textarea
  this.hasSelection = false;
  this.composing = null;
};

TextareaInput.prototype.init = function (display) {
    var this$1 = this;

  var input = this, cm = this.cm;

  // Wraps and hides input textarea
  var div = this.wrapper = hiddenTextarea();
  // The semihidden textarea that is focused when the editor is
  // focused, and receives input.
  var te = this.textarea = div.firstChild;
  display.wrapper.insertBefore(div, display.wrapper.firstChild);

  // Needed to hide big blue blinking cursor on Mobile Safari (doesn't seem to work in iOS 8 anymore)
  if (ios) { te.style.width = "0px"; }

  on(te, "input", function () {
    if (ie && ie_version >= 9 && this$1.hasSelection) { this$1.hasSelection = null; }
    input.poll();
  });

  on(te, "paste", function (e) {
    if (signalDOMEvent(cm, e) || handlePaste(e, cm)) { return }

    cm.state.pasteIncoming = true;
    input.fastPoll();
  });

  function prepareCopyCut(e) {
    if (signalDOMEvent(cm, e)) { return }
    if (cm.somethingSelected()) {
      setLastCopied({lineWise: false, text: cm.getSelections()});
    } else if (!cm.options.lineWiseCopyCut) {
      return
    } else {
      var ranges = copyableRanges(cm);
      setLastCopied({lineWise: true, text: ranges.text});
      if (e.type == "cut") {
        cm.setSelections(ranges.ranges, null, sel_dontScroll);
      } else {
        input.prevInput = "";
        te.value = ranges.text.join("\n");
        selectInput(te);
      }
    }
    if (e.type == "cut") { cm.state.cutIncoming = true; }
  }
  on(te, "cut", prepareCopyCut);
  on(te, "copy", prepareCopyCut);

  on(display.scroller, "paste", function (e) {
    if (eventInWidget(display, e) || signalDOMEvent(cm, e)) { return }
    cm.state.pasteIncoming = true;
    input.focus();
  });

  // Prevent normal selection in the editor (we handle our own)
  on(display.lineSpace, "selectstart", function (e) {
    if (!eventInWidget(display, e)) { e_preventDefault(e); }
  });

  on(te, "compositionstart", function () {
    var start = cm.getCursor("from");
    if (input.composing) { input.composing.range.clear(); }
    input.composing = {
      start: start,
      range: cm.markText(start, cm.getCursor("to"), {className: "CodeMirror-composing"})
    };
  });
  on(te, "compositionend", function () {
    if (input.composing) {
      input.poll();
      input.composing.range.clear();
      input.composing = null;
    }
  });
};

TextareaInput.prototype.prepareSelection = function () {
  // Redraw the selection and/or cursor
  var cm = this.cm, display = cm.display, doc = cm.doc;
  var result = prepareSelection(cm);

  // Move the hidden textarea near the cursor to prevent scrolling artifacts
  if (cm.options.moveInputWithCursor) {
    var headPos = cursorCoords(cm, doc.sel.primary().head, "div");
    var wrapOff = display.wrapper.getBoundingClientRect(), lineOff = display.lineDiv.getBoundingClientRect();
    result.teTop = Math.max(0, Math.min(display.wrapper.clientHeight - 10,
                                        headPos.top + lineOff.top - wrapOff.top));
    result.teLeft = Math.max(0, Math.min(display.wrapper.clientWidth - 10,
                                         headPos.left + lineOff.left - wrapOff.left));
  }

  return result
};

TextareaInput.prototype.showSelection = function (drawn) {
  var cm = this.cm, display = cm.display;
  removeChildrenAndAdd(display.cursorDiv, drawn.cursors);
  removeChildrenAndAdd(display.selectionDiv, drawn.selection);
  if (drawn.teTop != null) {
    this.wrapper.style.top = drawn.teTop + "px";
    this.wrapper.style.left = drawn.teLeft + "px";
  }
};

// Reset the input to correspond to the selection (or to be empty,
// when not typing and nothing is selected)
TextareaInput.prototype.reset = function (typing) {
  if (this.contextMenuPending || this.composing) { return }
  var cm = this.cm;
  if (cm.somethingSelected()) {
    this.prevInput = "";
    var content = cm.getSelection();
    this.textarea.value = content;
    if (cm.state.focused) { selectInput(this.textarea); }
    if (ie && ie_version >= 9) { this.hasSelection = content; }
  } else if (!typing) {
    this.prevInput = this.textarea.value = "";
    if (ie && ie_version >= 9) { this.hasSelection = null; }
  }
};

TextareaInput.prototype.getField = function () { return this.textarea };

TextareaInput.prototype.supportsTouch = function () { return false };

TextareaInput.prototype.focus = function () {
  if (this.cm.options.readOnly != "nocursor" && (!mobile || activeElt() != this.textarea)) {
    try { this.textarea.focus(); }
    catch (e) {} // IE8 will throw if the textarea is display: none or not in DOM
  }
};

TextareaInput.prototype.blur = function () { this.textarea.blur(); };

TextareaInput.prototype.resetPosition = function () {
  this.wrapper.style.top = this.wrapper.style.left = 0;
};

TextareaInput.prototype.receivedFocus = function () { this.slowPoll(); };

// Poll for input changes, using the normal rate of polling. This
// runs as long as the editor is focused.
TextareaInput.prototype.slowPoll = function () {
    var this$1 = this;

  if (this.pollingFast) { return }
  this.polling.set(this.cm.options.pollInterval, function () {
    this$1.poll();
    if (this$1.cm.state.focused) { this$1.slowPoll(); }
  });
};

// When an event has just come in that is likely to add or change
// something in the input textarea, we poll faster, to ensure that
// the change appears on the screen quickly.
TextareaInput.prototype.fastPoll = function () {
  var missed = false, input = this;
  input.pollingFast = true;
  function p() {
    var changed = input.poll();
    if (!changed && !missed) {missed = true; input.polling.set(60, p);}
    else {input.pollingFast = false; input.slowPoll();}
  }
  input.polling.set(20, p);
};

// Read input from the textarea, and update the document to match.
// When something is selected, it is present in the textarea, and
// selected (unless it is huge, in which case a placeholder is
// used). When nothing is selected, the cursor sits after previously
// seen text (can be empty), which is stored in prevInput (we must
// not reset the textarea when typing, because that breaks IME).
TextareaInput.prototype.poll = function () {
    var this$1 = this;

  var cm = this.cm, input = this.textarea, prevInput = this.prevInput;
  // Since this is called a *lot*, try to bail out as cheaply as
  // possible when it is clear that nothing happened. hasSelection
  // will be the case when there is a lot of text in the textarea,
  // in which case reading its value would be expensive.
  if (this.contextMenuPending || !cm.state.focused ||
      (hasSelection(input) && !prevInput && !this.composing) ||
      cm.isReadOnly() || cm.options.disableInput || cm.state.keySeq)
    { return false }

  var text = input.value;
  // If nothing changed, bail.
  if (text == prevInput && !cm.somethingSelected()) { return false }
  // Work around nonsensical selection resetting in IE9/10, and
  // inexplicable appearance of private area unicode characters on
  // some key combos in Mac (#2689).
  if (ie && ie_version >= 9 && this.hasSelection === text ||
      mac && /[\uf700-\uf7ff]/.test(text)) {
    cm.display.input.reset();
    return false
  }

  if (cm.doc.sel == cm.display.selForContextMenu) {
    var first = text.charCodeAt(0);
    if (first == 0x200b && !prevInput) { prevInput = "\u200b"; }
    if (first == 0x21da) { this.reset(); return this.cm.execCommand("undo") }
  }
  // Find the part of the input that is actually new
  var same = 0, l = Math.min(prevInput.length, text.length);
  while (same < l && prevInput.charCodeAt(same) == text.charCodeAt(same)) { ++same; }

  runInOp(cm, function () {
    applyTextInput(cm, text.slice(same), prevInput.length - same,
                   null, this$1.composing ? "*compose" : null);

    // Don't leave long text in the textarea, since it makes further polling slow
    if (text.length > 1000 || text.indexOf("\n") > -1) { input.value = this$1.prevInput = ""; }
    else { this$1.prevInput = text; }

    if (this$1.composing) {
      this$1.composing.range.clear();
      this$1.composing.range = cm.markText(this$1.composing.start, cm.getCursor("to"),
                                         {className: "CodeMirror-composing"});
    }
  });
  return true
};

TextareaInput.prototype.ensurePolled = function () {
  if (this.pollingFast && this.poll()) { this.pollingFast = false; }
};

TextareaInput.prototype.onKeyPress = function () {
  if (ie && ie_version >= 9) { this.hasSelection = null; }
  this.fastPoll();
};

TextareaInput.prototype.onContextMenu = function (e) {
  var input = this, cm = input.cm, display = cm.display, te = input.textarea;
  var pos = posFromMouse(cm, e), scrollPos = display.scroller.scrollTop;
  if (!pos || presto) { return } // Opera is difficult.

  // Reset the current text selection only if the click is done outside of the selection
  // and 'resetSelectionOnContextMenu' option is true.
  var reset = cm.options.resetSelectionOnContextMenu;
  if (reset && cm.doc.sel.contains(pos) == -1)
    { operation(cm, setSelection)(cm.doc, simpleSelection(pos), sel_dontScroll); }

  var oldCSS = te.style.cssText, oldWrapperCSS = input.wrapper.style.cssText;
  input.wrapper.style.cssText = "position: absolute";
  var wrapperBox = input.wrapper.getBoundingClientRect();
  te.style.cssText = "position: absolute; width: 30px; height: 30px;\n      top: " + (e.clientY - wrapperBox.top - 5) + "px; left: " + (e.clientX - wrapperBox.left - 5) + "px;\n      z-index: 1000; background: " + (ie ? "rgba(255, 255, 255, .05)" : "transparent") + ";\n      outline: none; border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);";
  var oldScrollY;
  if (webkit) { oldScrollY = window.scrollY; } // Work around Chrome issue (#2712)
  display.input.focus();
  if (webkit) { window.scrollTo(null, oldScrollY); }
  display.input.reset();
  // Adds "Select all" to context menu in FF
  if (!cm.somethingSelected()) { te.value = input.prevInput = " "; }
  input.contextMenuPending = true;
  display.selForContextMenu = cm.doc.sel;
  clearTimeout(display.detectingSelectAll);

  // Select-all will be greyed out if there's nothing to select, so
  // this adds a zero-width space so that we can later check whether
  // it got selected.
  function prepareSelectAllHack() {
    if (te.selectionStart != null) {
      var selected = cm.somethingSelected();
      var extval = "\u200b" + (selected ? te.value : "");
      te.value = "\u21da"; // Used to catch context-menu undo
      te.value = extval;
      input.prevInput = selected ? "" : "\u200b";
      te.selectionStart = 1; te.selectionEnd = extval.length;
      // Re-set this, in case some other handler touched the
      // selection in the meantime.
      display.selForContextMenu = cm.doc.sel;
    }
  }
  function rehide() {
    input.contextMenuPending = false;
    input.wrapper.style.cssText = oldWrapperCSS;
    te.style.cssText = oldCSS;
    if (ie && ie_version < 9) { display.scrollbars.setScrollTop(display.scroller.scrollTop = scrollPos); }

    // Try to detect the user choosing select-all
    if (te.selectionStart != null) {
      if (!ie || (ie && ie_version < 9)) { prepareSelectAllHack(); }
      var i = 0, poll = function () {
        if (display.selForContextMenu == cm.doc.sel && te.selectionStart == 0 &&
            te.selectionEnd > 0 && input.prevInput == "\u200b") {
          operation(cm, selectAll)(cm);
        } else if (i++ < 10) {
          display.detectingSelectAll = setTimeout(poll, 500);
        } else {
          display.selForContextMenu = null;
          display.input.reset();
        }
      };
      display.detectingSelectAll = setTimeout(poll, 200);
    }
  }

  if (ie && ie_version >= 9) { prepareSelectAllHack(); }
  if (captureRightClick) {
    e_stop(e);
    var mouseup = function () {
      off(window, "mouseup", mouseup);
      setTimeout(rehide, 20);
    };
    on(window, "mouseup", mouseup);
  } else {
    setTimeout(rehide, 50);
  }
};

TextareaInput.prototype.readOnlyChanged = function (val) {
  if (!val) { this.reset(); }
  this.textarea.disabled = val == "nocursor";
};

TextareaInput.prototype.setUneditable = function () {};

TextareaInput.prototype.needsContentAttribute = false;

function fromTextArea(textarea, options) {
  options = options ? copyObj(options) : {};
  options.value = textarea.value;
  if (!options.tabindex && textarea.tabIndex)
    { options.tabindex = textarea.tabIndex; }
  if (!options.placeholder && textarea.placeholder)
    { options.placeholder = textarea.placeholder; }
  // Set autofocus to true if this textarea is focused, or if it has
  // autofocus and no other element is focused.
  if (options.autofocus == null) {
    var hasFocus = activeElt();
    options.autofocus = hasFocus == textarea ||
      textarea.getAttribute("autofocus") != null && hasFocus == document.body;
  }

  function save() {textarea.value = cm.getValue();}

  var realSubmit;
  if (textarea.form) {
    on(textarea.form, "submit", save);
    // Deplorable hack to make the submit method do the right thing.
    if (!options.leaveSubmitMethodAlone) {
      var form = textarea.form;
      realSubmit = form.submit;
      try {
        var wrappedSubmit = form.submit = function () {
          save();
          form.submit = realSubmit;
          form.submit();
          form.submit = wrappedSubmit;
        };
      } catch(e) {}
    }
  }

  options.finishInit = function (cm) {
    cm.save = save;
    cm.getTextArea = function () { return textarea; };
    cm.toTextArea = function () {
      cm.toTextArea = isNaN; // Prevent this from being ran twice
      save();
      textarea.parentNode.removeChild(cm.getWrapperElement());
      textarea.style.display = "";
      if (textarea.form) {
        off(textarea.form, "submit", save);
        if (typeof textarea.form.submit == "function")
          { textarea.form.submit = realSubmit; }
      }
    };
  };

  textarea.style.display = "none";
  var cm = CodeMirror$1(function (node) { return textarea.parentNode.insertBefore(node, textarea.nextSibling); },
    options);
  return cm
}

function addLegacyProps(CodeMirror) {
  CodeMirror.off = off;
  CodeMirror.on = on;
  CodeMirror.wheelEventPixels = wheelEventPixels;
  CodeMirror.Doc = Doc;
  CodeMirror.splitLines = splitLinesAuto;
  CodeMirror.countColumn = countColumn;
  CodeMirror.findColumn = findColumn;
  CodeMirror.isWordChar = isWordCharBasic;
  CodeMirror.Pass = Pass;
  CodeMirror.signal = signal;
  CodeMirror.Line = Line;
  CodeMirror.changeEnd = changeEnd;
  CodeMirror.scrollbarModel = scrollbarModel;
  CodeMirror.Pos = Pos;
  CodeMirror.cmpPos = cmp;
  CodeMirror.modes = modes;
  CodeMirror.mimeModes = mimeModes;
  CodeMirror.resolveMode = resolveMode;
  CodeMirror.getMode = getMode;
  CodeMirror.modeExtensions = modeExtensions;
  CodeMirror.extendMode = extendMode;
  CodeMirror.copyState = copyState;
  CodeMirror.startState = startState;
  CodeMirror.innerMode = innerMode;
  CodeMirror.commands = commands;
  CodeMirror.keyMap = keyMap;
  CodeMirror.keyName = keyName;
  CodeMirror.isModifierKey = isModifierKey;
  CodeMirror.lookupKey = lookupKey;
  CodeMirror.normalizeKeyMap = normalizeKeyMap;
  CodeMirror.StringStream = StringStream;
  CodeMirror.SharedTextMarker = SharedTextMarker;
  CodeMirror.TextMarker = TextMarker;
  CodeMirror.LineWidget = LineWidget;
  CodeMirror.e_preventDefault = e_preventDefault;
  CodeMirror.e_stopPropagation = e_stopPropagation;
  CodeMirror.e_stop = e_stop;
  CodeMirror.addClass = addClass;
  CodeMirror.contains = contains;
  CodeMirror.rmClass = rmClass;
  CodeMirror.keyNames = keyNames;
}

// EDITOR CONSTRUCTOR

defineOptions(CodeMirror$1);

addEditorMethods(CodeMirror$1);

// Set up methods on CodeMirror's prototype to redirect to the editor's document.
var dontDelegate = "iter insert remove copy getEditor constructor".split(" ");
for (var prop in Doc.prototype) { if (Doc.prototype.hasOwnProperty(prop) && indexOf(dontDelegate, prop) < 0)
  { CodeMirror$1.prototype[prop] = (function(method) {
    return function() {return method.apply(this.doc, arguments)}
  })(Doc.prototype[prop]); } }

eventMixin(Doc);

// INPUT HANDLING

CodeMirror$1.inputStyles = {"textarea": TextareaInput, "contenteditable": ContentEditableInput};

// MODE DEFINITION AND QUERYING

// Extra arguments are stored as the mode's dependencies, which is
// used by (legacy) mechanisms like loadmode.js to automatically
// load a mode. (Preferred mechanism is the require/define calls.)
CodeMirror$1.defineMode = function(name/*, mode, …*/) {
  if (!CodeMirror$1.defaults.mode && name != "null") { CodeMirror$1.defaults.mode = name; }
  defineMode.apply(this, arguments);
};

CodeMirror$1.defineMIME = defineMIME;

// Minimal default mode.
CodeMirror$1.defineMode("null", function () { return ({token: function (stream) { return stream.skipToEnd(); }}); });
CodeMirror$1.defineMIME("text/plain", "null");

// EXTENSIONS

CodeMirror$1.defineExtension = function (name, func) {
  CodeMirror$1.prototype[name] = func;
};
CodeMirror$1.defineDocExtension = function (name, func) {
  Doc.prototype[name] = func;
};

CodeMirror$1.fromTextArea = fromTextArea;

addLegacyProps(CodeMirror$1);

CodeMirror$1.version = "5.34.0";

return CodeMirror$1;

})));
});

var xml = createCommonjsModule$1(function (module, exports) {
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  mod(codemirror);
})(function(CodeMirror) {
var htmlConfig = {
  autoSelfClosers: {'area': true, 'base': true, 'br': true, 'col': true, 'command': true,
                    'embed': true, 'frame': true, 'hr': true, 'img': true, 'input': true,
                    'keygen': true, 'link': true, 'meta': true, 'param': true, 'source': true,
                    'track': true, 'wbr': true, 'menuitem': true},
  implicitlyClosed: {'dd': true, 'li': true, 'optgroup': true, 'option': true, 'p': true,
                     'rp': true, 'rt': true, 'tbody': true, 'td': true, 'tfoot': true,
                     'th': true, 'tr': true},
  contextGrabbers: {
    'dd': {'dd': true, 'dt': true},
    'dt': {'dd': true, 'dt': true},
    'li': {'li': true},
    'option': {'option': true, 'optgroup': true},
    'optgroup': {'optgroup': true},
    'p': {'address': true, 'article': true, 'aside': true, 'blockquote': true, 'dir': true,
          'div': true, 'dl': true, 'fieldset': true, 'footer': true, 'form': true,
          'h1': true, 'h2': true, 'h3': true, 'h4': true, 'h5': true, 'h6': true,
          'header': true, 'hgroup': true, 'hr': true, 'menu': true, 'nav': true, 'ol': true,
          'p': true, 'pre': true, 'section': true, 'table': true, 'ul': true},
    'rp': {'rp': true, 'rt': true},
    'rt': {'rp': true, 'rt': true},
    'tbody': {'tbody': true, 'tfoot': true},
    'td': {'td': true, 'th': true},
    'tfoot': {'tbody': true},
    'th': {'td': true, 'th': true},
    'thead': {'tbody': true, 'tfoot': true},
    'tr': {'tr': true}
  },
  doNotIndent: {"pre": true},
  allowUnquoted: true,
  allowMissing: true,
  caseFold: true
};

var xmlConfig = {
  autoSelfClosers: {},
  implicitlyClosed: {},
  contextGrabbers: {},
  doNotIndent: {},
  allowUnquoted: false,
  allowMissing: false,
  allowMissingTagName: false,
  caseFold: false
};

CodeMirror.defineMode("xml", function(editorConf, config_) {
  var indentUnit = editorConf.indentUnit;
  var config = {};
  var defaults = config_.htmlMode ? htmlConfig : xmlConfig;
  for (var prop in defaults) config[prop] = defaults[prop];
  for (var prop in config_) config[prop] = config_[prop];

  // Return variables for tokenizers
  var type, setStyle;

  function inText(stream, state) {
    function chain(parser) {
      state.tokenize = parser;
      return parser(stream, state);
    }

    var ch = stream.next();
    if (ch == "<") {
      if (stream.eat("!")) {
        if (stream.eat("[")) {
          if (stream.match("CDATA[")) return chain(inBlock("atom", "]]>"));
          else return null;
        } else if (stream.match("--")) {
          return chain(inBlock("comment", "-->"));
        } else if (stream.match("DOCTYPE", true, true)) {
          stream.eatWhile(/[\w\._\-]/);
          return chain(doctype(1));
        } else {
          return null;
        }
      } else if (stream.eat("?")) {
        stream.eatWhile(/[\w\._\-]/);
        state.tokenize = inBlock("meta", "?>");
        return "meta";
      } else {
        type = stream.eat("/") ? "closeTag" : "openTag";
        state.tokenize = inTag;
        return "tag bracket";
      }
    } else if (ch == "&") {
      var ok;
      if (stream.eat("#")) {
        if (stream.eat("x")) {
          ok = stream.eatWhile(/[a-fA-F\d]/) && stream.eat(";");
        } else {
          ok = stream.eatWhile(/[\d]/) && stream.eat(";");
        }
      } else {
        ok = stream.eatWhile(/[\w\.\-:]/) && stream.eat(";");
      }
      return ok ? "atom" : "error";
    } else {
      stream.eatWhile(/[^&<]/);
      return null;
    }
  }
  inText.isInText = true;

  function inTag(stream, state) {
    var ch = stream.next();
    if (ch == ">" || (ch == "/" && stream.eat(">"))) {
      state.tokenize = inText;
      type = ch == ">" ? "endTag" : "selfcloseTag";
      return "tag bracket";
    } else if (ch == "=") {
      type = "equals";
      return null;
    } else if (ch == "<") {
      state.tokenize = inText;
      state.state = baseState;
      state.tagName = state.tagStart = null;
      var next = state.tokenize(stream, state);
      return next ? next + " tag error" : "tag error";
    } else if (/[\'\"]/.test(ch)) {
      state.tokenize = inAttribute(ch);
      state.stringStartCol = stream.column();
      return state.tokenize(stream, state);
    } else {
      stream.match(/^[^\s\u00a0=<>\"\']*[^\s\u00a0=<>\"\'\/]/);
      return "word";
    }
  }

  function inAttribute(quote) {
    var closure = function(stream, state) {
      while (!stream.eol()) {
        if (stream.next() == quote) {
          state.tokenize = inTag;
          break;
        }
      }
      return "string";
    };
    closure.isInAttribute = true;
    return closure;
  }

  function inBlock(style, terminator) {
    return function(stream, state) {
      while (!stream.eol()) {
        if (stream.match(terminator)) {
          state.tokenize = inText;
          break;
        }
        stream.next();
      }
      return style;
    };
  }
  function doctype(depth) {
    return function(stream, state) {
      var ch;
      while ((ch = stream.next()) != null) {
        if (ch == "<") {
          state.tokenize = doctype(depth + 1);
          return state.tokenize(stream, state);
        } else if (ch == ">") {
          if (depth == 1) {
            state.tokenize = inText;
            break;
          } else {
            state.tokenize = doctype(depth - 1);
            return state.tokenize(stream, state);
          }
        }
      }
      return "meta";
    };
  }

  function Context(state, tagName, startOfLine) {
    this.prev = state.context;
    this.tagName = tagName;
    this.indent = state.indented;
    this.startOfLine = startOfLine;
    if (config.doNotIndent.hasOwnProperty(tagName) || (state.context && state.context.noIndent))
      this.noIndent = true;
  }
  function popContext(state) {
    if (state.context) state.context = state.context.prev;
  }
  function maybePopContext(state, nextTagName) {
    var parentTagName;
    while (true) {
      if (!state.context) {
        return;
      }
      parentTagName = state.context.tagName;
      if (!config.contextGrabbers.hasOwnProperty(parentTagName) ||
          !config.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)) {
        return;
      }
      popContext(state);
    }
  }

  function baseState(type, stream, state) {
    if (type == "openTag") {
      state.tagStart = stream.column();
      return tagNameState;
    } else if (type == "closeTag") {
      return closeTagNameState;
    } else {
      return baseState;
    }
  }
  function tagNameState(type, stream, state) {
    if (type == "word") {
      state.tagName = stream.current();
      setStyle = "tag";
      return attrState;
    } else if (config.allowMissingTagName && type == "endTag") {
      setStyle = "tag bracket";
      return attrState(type, stream, state);
    } else {
      setStyle = "error";
      return tagNameState;
    }
  }
  function closeTagNameState(type, stream, state) {
    if (type == "word") {
      var tagName = stream.current();
      if (state.context && state.context.tagName != tagName &&
          config.implicitlyClosed.hasOwnProperty(state.context.tagName))
        popContext(state);
      if ((state.context && state.context.tagName == tagName) || config.matchClosing === false) {
        setStyle = "tag";
        return closeState;
      } else {
        setStyle = "tag error";
        return closeStateErr;
      }
    } else if (config.allowMissingTagName && type == "endTag") {
      setStyle = "tag bracket";
      return closeState(type, stream, state);
    } else {
      setStyle = "error";
      return closeStateErr;
    }
  }

  function closeState(type, _stream, state) {
    if (type != "endTag") {
      setStyle = "error";
      return closeState;
    }
    popContext(state);
    return baseState;
  }
  function closeStateErr(type, stream, state) {
    setStyle = "error";
    return closeState(type, stream, state);
  }

  function attrState(type, _stream, state) {
    if (type == "word") {
      setStyle = "attribute";
      return attrEqState;
    } else if (type == "endTag" || type == "selfcloseTag") {
      var tagName = state.tagName, tagStart = state.tagStart;
      state.tagName = state.tagStart = null;
      if (type == "selfcloseTag" ||
          config.autoSelfClosers.hasOwnProperty(tagName)) {
        maybePopContext(state, tagName);
      } else {
        maybePopContext(state, tagName);
        state.context = new Context(state, tagName, tagStart == state.indented);
      }
      return baseState;
    }
    setStyle = "error";
    return attrState;
  }
  function attrEqState(type, stream, state) {
    if (type == "equals") return attrValueState;
    if (!config.allowMissing) setStyle = "error";
    return attrState(type, stream, state);
  }
  function attrValueState(type, stream, state) {
    if (type == "string") return attrContinuedState;
    if (type == "word" && config.allowUnquoted) {setStyle = "string"; return attrState;}
    setStyle = "error";
    return attrState(type, stream, state);
  }
  function attrContinuedState(type, stream, state) {
    if (type == "string") return attrContinuedState;
    return attrState(type, stream, state);
  }

  return {
    startState: function(baseIndent) {
      var state = {tokenize: inText,
                   state: baseState,
                   indented: baseIndent || 0,
                   tagName: null, tagStart: null,
                   context: null};
      if (baseIndent != null) state.baseIndent = baseIndent;
      return state
    },

    token: function(stream, state) {
      if (!state.tagName && stream.sol())
        state.indented = stream.indentation();

      if (stream.eatSpace()) return null;
      type = null;
      var style = state.tokenize(stream, state);
      if ((style || type) && style != "comment") {
        setStyle = null;
        state.state = state.state(type || style, stream, state);
        if (setStyle)
          style = setStyle == "error" ? style + " error" : setStyle;
      }
      return style;
    },

    indent: function(state, textAfter, fullLine) {
      var context = state.context;
      // Indent multi-line strings (e.g. css).
      if (state.tokenize.isInAttribute) {
        if (state.tagStart == state.indented)
          return state.stringStartCol + 1;
        else
          return state.indented + indentUnit;
      }
      if (context && context.noIndent) return CodeMirror.Pass;
      if (state.tokenize != inTag && state.tokenize != inText)
        return fullLine ? fullLine.match(/^(\s*)/)[0].length : 0;
      // Indent the starts of attribute names.
      if (state.tagName) {
        if (config.multilineTagIndentPastTag !== false)
          return state.tagStart + state.tagName.length + 2;
        else
          return state.tagStart + indentUnit * (config.multilineTagIndentFactor || 1);
      }
      if (config.alignCDATA && /<!\[CDATA\[/.test(textAfter)) return 0;
      var tagAfter = textAfter && /^<(\/)?([\w_:\.-]*)/.exec(textAfter);
      if (tagAfter && tagAfter[1]) { // Closing tag spotted
        while (context) {
          if (context.tagName == tagAfter[2]) {
            context = context.prev;
            break;
          } else if (config.implicitlyClosed.hasOwnProperty(context.tagName)) {
            context = context.prev;
          } else {
            break;
          }
        }
      } else if (tagAfter) { // Opening tag spotted
        while (context) {
          var grabbers = config.contextGrabbers[context.tagName];
          if (grabbers && grabbers.hasOwnProperty(tagAfter[2]))
            context = context.prev;
          else
            break;
        }
      }
      while (context && context.prev && !context.startOfLine)
        context = context.prev;
      if (context) return context.indent + indentUnit;
      else return state.baseIndent || 0;
    },

    electricInput: /<\/[\s\w:]+>$/,
    blockCommentStart: "<!--",
    blockCommentEnd: "-->",

    configuration: config.htmlMode ? "html" : "xml",
    helperType: config.htmlMode ? "html" : "xml",

    skipAttribute: function(state) {
      if (state.state == attrValueState)
        state.state = attrState;
    }
  };
});

CodeMirror.defineMIME("text/xml", "xml");
CodeMirror.defineMIME("application/xml", "xml");
if (!CodeMirror.mimeModes.hasOwnProperty("text/html"))
  CodeMirror.defineMIME("text/html", {name: "xml", htmlMode: true});

});
});

/*!
 * repeat-string <https://github.com/jonschlinkert/repeat-string>
 *
 * Copyright (c) 2014-2015, Jon Schlinkert.
 * Licensed under the MIT License.
 */

/**
 * Results cache
 */

var res = '';
var cache;

/**
 * Expose `repeat`
 */

var repeatString = repeat$1;

/**
 * Repeat the given `string` the specified `number`
 * of times.
 *
 * **Example:**
 *
 * ```js
 * var repeat = require('repeat-string');
 * repeat('A', 5);
 * //=> AAAAA
 * ```
 *
 * @param {String} `string` The string to repeat
 * @param {Number} `number` The number of times to repeat the string
 * @return {String} Repeated string
 * @api public
 */

function repeat$1(str, num) {
  if (typeof str !== 'string') {
    throw new TypeError('expected a string');
  }

  // cover common, quick use cases
  if (num === 1) return str;
  if (num === 2) return str + str;

  var max = str.length * num;
  if (cache !== str || typeof cache === 'undefined') {
    cache = str;
    res = '';
  } else if (res.length >= max) {
    return res.substr(0, max);
  }

  while (max > res.length && num > 1) {
    if (num & 1) {
      res += str;
    }

    num >>= 1;
    str += str;
  }

  res += str;
  res = res.substr(0, max);
  return res;
}

var splitOnTags = function splitOnTags(str) {
  return str.split(/(<\/?[^>]+>)/g).filter(function (line) {
    return line.trim() !== '';
  });
};
var isTag = function isTag(str) {
  return (/<[^>!]+>/.test(str)
  );
};
var isClosingTag = function isClosingTag(str) {
  return (/<\/+[^>]+>/.test(str)
  );
};
var isSelfClosingTag = function isSelfClosingTag(str) {
  return (/<[^>]+\/>/.test(str)
  );
};
var isOpeningTag = function isOpeningTag(str) {
  return isTag(str) && !isClosingTag(str) && !isSelfClosingTag(str);
};

var dist = function (xml, indent) {
  var depth = 0;
  indent = indent || '    ';

  return splitOnTags(xml).map(function (item) {
    if (isClosingTag(item)) {
      depth--;
    }

    var line = repeatString(indent, depth) + item;

    if (isOpeningTag(item)) {
      depth++;
    }

    return line;
  }).join('\n');
};

/* src/components/SVGInput.html generated by Svelte v1.54.1 */
function data$1() {
	return {
		cmInput: null,
		selectedExample: 'bunny'
	};
}

var methods$1 = {
	handleFiles(e) {
		const file = e[0];
		const hiddenExamples = this.get('hiddenExamples');
		const context = this;

		if (file.type === 'image/svg+xml') {
			const reader = new FileReader();
			reader.onload = function () {
				context.setNewSVG(reader.result, true, null);
			};
			reader.readAsText(file);
		} else {
			this.setNewSVG(hiddenExamples.pipe, true, null);
			this.set({ errorMessage: true });
		}
	},

	setNewSVG(rawSVG, updateCodeMirror, example) {
		const pathsOnly = pathologize(rawSVG);

		//first update preview image and svg reference in DOM
		//and handle error message information and example selection if necessary
		this.set({
			svgPreview: pathsOnly,
			selectedExample: example,
			errorMessage: false

		});

		//updates code mirror if svg isn't coming from a paste
		if (updateCodeMirror) {
			const cmInput = this.get('cmInput');
			cmInput.setValue(dist(rawSVG));
		}

		//then fires an event telling the app it's time to coordinate
		this.fire('readySVG', {
			ready: true
		});
	}

};

function oncreate$1() {

	const cmInput = codemirror(this.refs.cmInput, {
		value: '//raw SVG will go here',
		mode: 'xml',
		lineNumbers: true,
		lineWrapping: true,
		htmlMode: true
	});

	this.set({ cmInput });

	//sets the initial example
	const selectedExample = this.get('selectedExample');
	const examples = this.get('examples');

	//listens for new SVG input from direct pasting or editing into the code mirror
	cmInput.on('change', (cm, change) => {
		if (change.origin != 'setValue') {
			const changedValue = cm.getValue();
			this.setNewSVG(changedValue, false, null);
		}
	});

	this.setNewSVG(examples[selectedExample], true, selectedExample);

	this.observe('secretSVG', secretSVG => {
		if (secretSVG) {
			const hiddenExamples = this.get('hiddenExamples');
			this.setNewSVG(hiddenExamples[secretSVG], true, null);
			this.set({ secretSVG: null });
		}
	});
}

function encapsulateStyles$2(node) {
	setAttribute(node, "svelte-4062298389", "");
}

function add_css$2() {
	var style = createElement("style");
	style.id = 'svelte-4062298389-style';
	style.textContent = "input[svelte-4062298389][type=\"file\"],[svelte-4062298389] input[type=\"file\"]{display:none}[svelte-4062298389].custom-file-upload,[svelte-4062298389] .custom-file-upload{border:2px solid #F037A5;color:#F037A5;border-radius:500px;display:inline-block;padding:10px 29px;cursor:pointer;font-size:12px;text-transform:uppercase;height:35px;font-weight:900;line-height:1;letter-spacing:2px}[svelte-4062298389].custom-file-upload:hover,[svelte-4062298389] .custom-file-upload:hover{background-color:#F037A5;color:#FAE62D}[svelte-4062298389].smaller-paste,[svelte-4062298389] .smaller-paste{font-size:12px;margin-top:0px;padding-left:5px}[svelte-4062298389]#svg-holder,[svelte-4062298389] #svg-holder{fill:none;stroke:black;stroke-width:2px;width:100px;height:100px;position:absolute;top:60px;right:30px}[svelte-4062298389]#svg-holder > svg,[svelte-4062298389] #svg-holder > svg{width:100px;height:100px}[svelte-4062298389].nestpas,[svelte-4062298389] .nestpas{font-family:'Pacifico', cursive;font-size:14px;position:absolute;top:130px;right:16px;width:109px;color:#EB1E32;line-height:1}[svelte-4062298389].CodeMirror,[svelte-4062298389] .CodeMirror{height:300px}[svelte-4062298389].cm-input,[svelte-4062298389] .cm-input{margin-bottom:20px;position:relative}[svelte-4062298389].svg-text-error,[svelte-4062298389] .svg-text-error{width:calc(100% - 30px);left:30px;padding-left:20px;height:60px;background-color:#F037A5;position:absolute;bottom:0;z-index:10;border:2px solid #FAE62D;font-size:14px;color:white}[svelte-4062298389].example-container,[svelte-4062298389] .example-container{display:flex;width:100%;justify-content:space-between;flex-wrap:wrap}[svelte-4062298389].dot-button > svg,[svelte-4062298389] .dot-button > svg{fill:none;stroke:#F037A5;stroke-width:2px;width:32px;margin:0;vertical-align:middle}[svelte-4062298389].dot-button,[svelte-4062298389] .dot-button{background-color:transparent;width:66px;height:66px;border-radius:66px;border:#F037A5 2px solid;font-size:14px;color:#F037A5;margin-bottom:20px}[svelte-4062298389].dot-button:hover,[svelte-4062298389] .dot-button:hover{background-color:#F037A5;color:#FAE62D}[svelte-4062298389].selected-dot-button,[svelte-4062298389] .selected-dot-button{background-color:#F037A5;color:#FAE62D}[svelte-4062298389].selected-dot-button > svg,[svelte-4062298389] .selected-dot-button > svg{fill:none;stroke:#FAE62D;stroke-width:2px;width:32px;margin:0}[svelte-4062298389].dot-button:hover > svg,[svelte-4062298389] .dot-button:hover > svg{fill:none;stroke:#FAE62D;stroke-width:2px;width:32px;margin:0}[svelte-4062298389].icon,[svelte-4062298389] .icon{width:16px;display:inline-block}";
	appendNode(style, document.head);
}

function create_main_fragment$2(state, component) {
	var div, h2, text_1, label, text_3, input, text_4, p, text_6, div_1, text_8, text_9, div_2, text_11, h3, text_13, div_3, text_15, p_1;

	function change_handler(event) {
		component.handleFiles(input.files);
	}

	var if_block = state.errorMessage && create_if_block$1(state, component);

	var if_block_1 = state.svgTextError && create_if_block_1(state, component);

	var each_value = state.Object.keys(state.examples);

	var each_blocks = [];

	for (var i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(state, each_value, each_value[i], i, component);
	}

	return {
		c: function create() {
			div = createElement("div");
			h2 = createElement("h2");
			h2.textContent = "Import SVG";
			text_1 = createText("\n  ");
			label = createElement("label");
			label.textContent = "Select File";
			text_3 = createText("\n  ");
			input = createElement("input");
			text_4 = createText("\n  ");
			p = createElement("p");
			p.textContent = "or paste SVG text file below";
			text_6 = createText("\n  ");
			div_1 = createElement("div");
			text_8 = createText("\n\n  ");
			if (if_block) if_block.c();
			text_9 = createText("\n  ");
			div_2 = createElement("div");
			if (if_block_1) if_block_1.c();
			text_11 = createText("\n  ");
			h3 = createElement("h3");
			h3.textContent = "...or try an example";
			text_13 = createText("\n\n  ");
			div_3 = createElement("div");

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			text_15 = createText("\n  ");
			p_1 = createElement("p");
			p_1.innerHTML = "Find more SVGs at the <a target=\"_blank\" href=\"https://thenounproject.com\">Noun Project\n  <img class=\"icon\" alt=\"link out\" src=\"../coordinator/src/static/images/link-out.svg\"></a>";
			this.h();
		},

		h: function hydrate() {
			encapsulateStyles$2(div);
			label.htmlFor = "file-upload";
			label.className = "custom-file-upload";
			input.id = "file-upload";
			input.type = "file";
			addListener(input, "change", change_handler);
			p.className = "smaller-paste";
			setStyle(div_1, "stroke", state.errorMessage ? "#EB1E32" : "#F037A5");
			div_1.id = "svg-holder";
			div_2.className = "cm-input";
			div_3.className = "example-container";
			div.className = "step-1";
			setStyle(div, "display", state.step === 1 ? "block" : "none");
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			appendNode(h2, div);
			appendNode(text_1, div);
			appendNode(label, div);
			appendNode(text_3, div);
			appendNode(input, div);
			appendNode(text_4, div);
			appendNode(p, div);
			appendNode(text_6, div);
			appendNode(div_1, div);
			div_1.innerHTML = state.svgPreview;
			component.refs.svgHolder = div_1;
			appendNode(text_8, div);
			if (if_block) if_block.m(div, null);
			appendNode(text_9, div);
			appendNode(div_2, div);
			if (if_block_1) if_block_1.m(div_2, null);
			component.refs.cmInput = div_2;
			appendNode(text_11, div);
			appendNode(h3, div);
			appendNode(text_13, div);
			appendNode(div_3, div);

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div_3, null);
			}

			appendNode(text_15, div);
			appendNode(p_1, div);
		},

		p: function update(changed, state) {
			if (changed.svgPreview) {
				div_1.innerHTML = state.svgPreview;
			}

			if (changed.errorMessage) {
				setStyle(div_1, "stroke", state.errorMessage ? "#EB1E32" : "#F037A5");
			}

			if (state.errorMessage) {
				if (!if_block) {
					if_block = create_if_block$1(state, component);
					if_block.c();
					if_block.m(div, text_9);
				}
			} else if (if_block) {
				if_block.u();
				if_block.d();
				if_block = null;
			}

			if (state.svgTextError) {
				if (!if_block_1) {
					if_block_1 = create_if_block_1(state, component);
					if_block_1.c();
					if_block_1.m(div_2, null);
				}
			} else if (if_block_1) {
				if_block_1.u();
				if_block_1.d();
				if_block_1 = null;
			}

			var each_value = state.Object.keys(state.examples);

			if (changed.examples || changed.Object || changed.selectedExample) {
				for (var i = 0; i < each_value.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].p(changed, state, each_value, each_value[i], i);
					} else {
						each_blocks[i] = create_each_block(state, each_value, each_value[i], i, component);
						each_blocks[i].c();
						each_blocks[i].m(div_3, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].u();
					each_blocks[i].d();
				}
				each_blocks.length = each_value.length;
			}

			if (changed.step) {
				setStyle(div, "display", state.step === 1 ? "block" : "none");
			}
		},

		u: function unmount() {
			div_1.innerHTML = '';

			detachNode(div);
			if (if_block) if_block.u();
			if (if_block_1) if_block_1.u();

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].u();
			}
		},

		d: function destroy$$1() {
			removeListener(input, "change", change_handler);
			if (component.refs.svgHolder === div_1) component.refs.svgHolder = null;
			if (if_block) if_block.d();
			if (if_block_1) if_block_1.d();
			if (component.refs.cmInput === div_2) component.refs.cmInput = null;

			destroyEach(each_blocks);
		}
	};
}

// (12:2) {{#if errorMessage}}
function create_if_block$1(state, component) {
	var p;

	return {
		c: function create() {
			p = createElement("p");
			p.textContent = "Error: Ceci n'est pas une SVG";
			this.h();
		},

		h: function hydrate() {
			p.className = "nestpas";
		},

		m: function mount(target, anchor) {
			insertNode(p, target, anchor);
		},

		u: function unmount() {
			detachNode(p);
		},

		d: noop
	};
}

// (16:4) {{#if svgTextError }}
function create_if_block_1(state, component) {
	var div;

	return {
		c: function create() {
			div = createElement("div");
			div.innerHTML = "<p>Yikes! There is a problem with your SVG text file. Try again.</p>";
			this.h();
		},

		h: function hydrate() {
			div.className = "svg-text-error";
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
		},

		u: function unmount() {
			detachNode(div);
		},

		d: noop
	};
}

// (25:4) {{#each Object.keys(examples) as example }}
function create_each_block(state, each_value, example, example_index, component) {
	var button,
	    raw_value = state.examples[example],
	    button_class_value;

	return {
		c: function create() {
			button = createElement("button");
			this.h();
		},

		h: function hydrate() {
			button.className = button_class_value = "dot-button " + (state.selectedExample === example ? "selected-dot-button" : "");
			addListener(button, "click", click_handler);

			button._svelte = {
				component: component,
				each_value: each_value,
				example_index: example_index
			};
		},

		m: function mount(target, anchor) {
			insertNode(button, target, anchor);
			button.innerHTML = raw_value;
		},

		p: function update(changed, state, each_value, example, example_index) {
			if ((changed.examples || changed.Object) && raw_value !== (raw_value = state.examples[example])) {
				button.innerHTML = raw_value;
			}

			if ((changed.selectedExample || changed.Object || changed.examples) && button_class_value !== (button_class_value = "dot-button " + (state.selectedExample === example ? "selected-dot-button" : ""))) {
				button.className = button_class_value;
			}

			button._svelte.each_value = each_value;
			button._svelte.example_index = example_index;
		},

		u: function unmount() {
			button.innerHTML = '';

			detachNode(button);
		},

		d: function destroy$$1() {
			removeListener(button, "click", click_handler);
		}
	};
}

function click_handler(event) {
	var component = this._svelte.component;
	var state = component.get();
	var each_value = this._svelte.each_value,
	    example_index = this._svelte.example_index,
	    example = each_value[example_index];
	component.setNewSVG(state.examples[example], true, example);
}

function SVGInput(options) {
	init(this, options);
	this.refs = {};
	this._state = assign({ Object: Object }, data$1(), options.data);

	if (!document.getElementById("svelte-4062298389-style")) add_css$2();

	var _oncreate = oncreate$1.bind(this);

	if (!options.root) {
		this._oncreate = [];
	}

	this._fragment = create_main_fragment$2(this._state, this);

	this.root._oncreate.push(_oncreate);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		callAll(this._oncreate);
	}
}

assign(SVGInput.prototype, methods$1, proto);

/* src/components/Refinement.html generated by Svelte v1.54.1 */
function confetti() {
	return `rgb(${Math.round(Math.random() * 255)}, ${Math.round(Math.random() * 255)}, ${Math.round(Math.random() * 255)})`;
}

function encapsulateStyles$3(node) {
	setAttribute(node, "svelte-916729838", "");
}

function add_css$3() {
	var style = createElement("style");
	style.id = 'svelte-916729838-style';
	style.textContent = "[svelte-916729838].slider-text,[svelte-916729838] .slider-text{margin-bottom:2px;margin-top:20px}[svelte-916729838].adjust,[svelte-916729838] .adjust{width:50px}[svelte-916729838].color-picker,[svelte-916729838] .color-picker{width:50px;margin-right:10px;margin-left:10px}[svelte-916729838].dark-selected,[svelte-916729838] .dark-selected{background-color:#616467;color:white;border-color:#616467}[svelte-916729838].dark-selected:hover,[svelte-916729838] .dark-selected:hover{color:white}[svelte-916729838].non-selected,[svelte-916729838] .non-selected{color:#616467}[svelte-916729838].non-selected:hover,[svelte-916729838] .non-selected:hover{color:white}";
	appendNode(style, document.head);
}

function create_main_fragment$3(state, component) {
	var div,
	    h2,
	    text_1,
	    p,
	    strong,
	    text_3,
	    input,
	    input_updating = false,
	    text_5,
	    input_1,
	    text_6,
	    p_1,
	    strong_1,
	    text_8,
	    input_2,
	    input_2_updating = false,
	    text_10,
	    input_3,
	    text_11,
	    p_2,
	    strong_2,
	    text_13,
	    input_4,
	    input_4_updating = false,
	    text_15,
	    input_5,
	    text_16,
	    p_3,
	    strong_3,
	    text_18,
	    input_6,
	    input_6_updating = false,
	    text_20,
	    input_7,
	    text_21,
	    p_4,
	    strong_4,
	    text_23,
	    input_8,
	    input_8_updating = false,
	    text_25,
	    input_9,
	    text_26,
	    p_5,
	    strong_5,
	    text_28,
	    input_10,
	    a,
	    span,
	    span_1,
	    span_2,
	    span_3,
	    span_4,
	    span_5,
	    span_6,
	    span_7,
	    span_8,
	    text_38,
	    div_1,
	    button,
	    button_class_value,
	    text_40,
	    button_1,
	    button_1_class_value,
	    text_43,
	    p_6;

	function input_input_handler() {
		input_updating = true;
		component.set({ numPoints: input.value });
		input_updating = false;
	}

	function input_1_input_handler() {
		component.set({ numPoints: toNumber(input_1.value) });
	}

	function input_1_change_handler() {
		component.set({ numPoints: toNumber(input_1.value) });
	}

	function input_2_input_handler() {
		input_2_updating = true;
		component.set({ scale: input_2.value });
		input_2_updating = false;
	}

	function input_3_input_handler() {
		component.set({ scale: toNumber(input_3.value) });
	}

	function input_3_change_handler() {
		component.set({ scale: toNumber(input_3.value) });
	}

	function input_4_input_handler() {
		input_4_updating = true;
		component.set({ translateX: input_4.value });
		input_4_updating = false;
	}

	function input_5_input_handler() {
		component.set({ translateX: toNumber(input_5.value) });
	}

	function input_5_change_handler() {
		component.set({ translateX: toNumber(input_5.value) });
	}

	function input_6_input_handler() {
		input_6_updating = true;
		component.set({ translateY: input_6.value });
		input_6_updating = false;
	}

	function input_7_input_handler() {
		component.set({ translateY: toNumber(input_7.value) });
	}

	function input_7_change_handler() {
		component.set({ translateY: toNumber(input_7.value) });
	}

	function input_8_input_handler() {
		input_8_updating = true;
		component.set({ radius: input_8.value });
		input_8_updating = false;
	}

	function input_9_input_handler() {
		component.set({ radius: toNumber(input_9.value) });
	}

	function input_9_change_handler() {
		component.set({ radius: toNumber(input_9.value) });
	}

	function input_10_input_handler() {
		component.set({ color: input_10.value });
	}

	function click_handler(event) {
		component.set({ color: "random" });
	}

	function click_handler_1(event) {
		component.set({ coordType: "outline" });
	}

	function click_handler_2(event) {
		component.set({ coordType: "inside" });
	}

	return {
		c: function create() {
			div = createElement("div");
			h2 = createElement("h2");
			h2.textContent = "Refine Dots";
			text_1 = createText("\n\n");
			p = createElement("p");
			strong = createElement("strong");
			strong.textContent = "Number of points:";
			text_3 = createText("\n  ");
			input = createElement("input");
			text_5 = createText("\n");
			input_1 = createElement("input");
			text_6 = createText("\n\n");
			p_1 = createElement("p");
			strong_1 = createElement("strong");
			strong_1.textContent = "Scale:";
			text_8 = createText("\n  ");
			input_2 = createElement("input");
			text_10 = createText("\n");
			input_3 = createElement("input");
			text_11 = createText("\n\n");
			p_2 = createElement("p");
			strong_2 = createElement("strong");
			strong_2.textContent = "Translate X:";
			text_13 = createText("\n  ");
			input_4 = createElement("input");
			text_15 = createText("\n");
			input_5 = createElement("input");
			text_16 = createText("\n\n");
			p_3 = createElement("p");
			strong_3 = createElement("strong");
			strong_3.textContent = "Translate Y:";
			text_18 = createText("\n  ");
			input_6 = createElement("input");
			text_20 = createText("\n");
			input_7 = createElement("input");
			text_21 = createText("\n\n");
			p_4 = createElement("p");
			strong_4 = createElement("strong");
			strong_4.textContent = "Dot radius:";
			text_23 = createText("\n  ");
			input_8 = createElement("input");
			text_25 = createText("\n");
			input_9 = createElement("input");
			text_26 = createText("\n\n\n");
			p_5 = createElement("p");
			strong_5 = createElement("strong");
			strong_5.textContent = "Color:";
			text_28 = createText("\n  ");
			input_10 = createElement("input");
			a = createElement("a");
			span = createElement("span");
			span.textContent = "C";
			span_1 = createElement("span");
			span_1.textContent = "o";
			span_2 = createElement("span");
			span_2.textContent = "n";
			span_3 = createElement("span");
			span_3.textContent = "f";
			span_4 = createElement("span");
			span_4.textContent = "e";
			span_5 = createElement("span");
			span_5.textContent = "t";
			span_6 = createElement("span");
			span_6.textContent = "t";
			span_7 = createElement("span");
			span_7.textContent = "i";
			span_8 = createElement("span");
			span_8.textContent = "!";
			text_38 = createText("\n");
			div_1 = createElement("div");
			button = createElement("button");
			button.textContent = "Outline";
			text_40 = createText("\n  \n  ");
			button_1 = createElement("button");
			button_1.textContent = "Fill";
			text_43 = createText("\n\n");
			p_6 = createElement("p");
			p_6.textContent = "Note: Fill mode works best with very simple SVGs.";
			this.h();
		},

		h: function hydrate() {
			encapsulateStyles$3(div);
			addListener(input, "input", input_input_handler);
			input.className = "adjust";
			input.type = "text";
			p.className = "slider-text";
			addListener(input_1, "input", input_1_input_handler);
			addListener(input_1, "change", input_1_change_handler);
			input_1.type = "range";
			input_1.min = "1";
			input_1.max = "5000";
			addListener(input_2, "input", input_2_input_handler);
			input_2.className = "adjust";
			input_2.type = "text";
			p_1.className = "slider-text";
			addListener(input_3, "input", input_3_input_handler);
			addListener(input_3, "change", input_3_change_handler);
			input_3.type = "range";
			input_3.min = "1";
			input_3.max = "100";
			addListener(input_4, "input", input_4_input_handler);
			input_4.className = "adjust";
			input_4.type = "text";
			p_2.className = "slider-text";
			addListener(input_5, "input", input_5_input_handler);
			addListener(input_5, "change", input_5_change_handler);
			input_5.type = "range";
			input_5.min = "1";
			input_5.max = "1000";
			addListener(input_6, "input", input_6_input_handler);
			input_6.className = "adjust";
			input_6.type = "text";
			p_3.className = "slider-text";
			addListener(input_7, "input", input_7_input_handler);
			addListener(input_7, "change", input_7_change_handler);
			input_7.type = "range";
			input_7.min = "1";
			input_7.max = "1000";
			addListener(input_8, "input", input_8_input_handler);
			input_8.className = "adjust";
			input_8.type = "text";
			p_4.className = "slider-text";
			addListener(input_9, "input", input_9_input_handler);
			addListener(input_9, "change", input_9_change_handler);
			input_9.type = "range";
			input_9.min = "1";
			input_9.max = "100";
			addListener(input_10, "input", input_10_input_handler);
			input_10.className = "color-picker";
			input_10.type = "color";
			setStyle(span, "color", confetti());
			setStyle(span_1, "color", confetti());
			setStyle(span_2, "color", confetti());
			setStyle(span_3, "color", confetti());
			setStyle(span_4, "color", confetti());
			setStyle(span_5, "color", confetti());
			setStyle(span_6, "color", confetti());
			setStyle(span_7, "color", confetti());
			setStyle(span_8, "color", confetti());
			addListener(a, "click", click_handler);
			button.type = "button";
			button.className = button_class_value = "btn btn-stroked-dark data-format-but " + (state.coordType === 'outline' ? 'dark-selected' : 'non-selected');
			addListener(button, "click", click_handler_1);
			button_1.type = "button";
			button_1.className = button_1_class_value = "btn btn-stroked-dark data-format-but " + (state.coordType === 'inside' ? 'dark-selected' : 'non-selected');
			addListener(button_1, "click", click_handler_2);
			div_1.className = "btn-group btn-group-sm";
			setAttribute(div_1, "role", "group");
			setAttribute(div_1, "aria-label", "...");
			p_6.className = "small";
			div.className = "step-2";
			setStyle(div, "display", state.step === 2 ? "block" : "none");
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			appendNode(h2, div);
			appendNode(text_1, div);
			appendNode(p, div);
			appendNode(strong, p);
			appendNode(text_3, p);
			appendNode(input, p);

			input.value = state.numPoints;

			appendNode(text_5, div);
			appendNode(input_1, div);

			input_1.value = state.numPoints;

			appendNode(text_6, div);
			appendNode(p_1, div);
			appendNode(strong_1, p_1);
			appendNode(text_8, p_1);
			appendNode(input_2, p_1);

			input_2.value = state.scale;

			appendNode(text_10, div);
			appendNode(input_3, div);

			input_3.value = state.scale;

			appendNode(text_11, div);
			appendNode(p_2, div);
			appendNode(strong_2, p_2);
			appendNode(text_13, p_2);
			appendNode(input_4, p_2);

			input_4.value = state.translateX;

			appendNode(text_15, div);
			appendNode(input_5, div);

			input_5.value = state.translateX;

			appendNode(text_16, div);
			appendNode(p_3, div);
			appendNode(strong_3, p_3);
			appendNode(text_18, p_3);
			appendNode(input_6, p_3);

			input_6.value = state.translateY;

			appendNode(text_20, div);
			appendNode(input_7, div);

			input_7.value = state.translateY;

			appendNode(text_21, div);
			appendNode(p_4, div);
			appendNode(strong_4, p_4);
			appendNode(text_23, p_4);
			appendNode(input_8, p_4);

			input_8.value = state.radius;

			appendNode(text_25, div);
			appendNode(input_9, div);

			input_9.value = state.radius;

			appendNode(text_26, div);
			appendNode(p_5, div);
			appendNode(strong_5, p_5);
			appendNode(text_28, p_5);
			appendNode(input_10, p_5);

			input_10.value = state.color;

			appendNode(a, p_5);
			appendNode(span, a);
			appendNode(span_1, a);
			appendNode(span_2, a);
			appendNode(span_3, a);
			appendNode(span_4, a);
			appendNode(span_5, a);
			appendNode(span_6, a);
			appendNode(span_7, a);
			appendNode(span_8, a);
			appendNode(text_38, div);
			appendNode(div_1, div);
			appendNode(button, div_1);
			appendNode(text_40, div_1);
			appendNode(button_1, div_1);
			appendNode(text_43, div);
			appendNode(p_6, div);
		},

		p: function update(changed, state) {
			if (!input_updating) input.value = state.numPoints;
			input_1.value = state.numPoints;
			input_1.value = state.numPoints;
			if (!input_2_updating) input_2.value = state.scale;
			input_3.value = state.scale;
			input_3.value = state.scale;
			if (!input_4_updating) input_4.value = state.translateX;
			input_5.value = state.translateX;
			input_5.value = state.translateX;
			if (!input_6_updating) input_6.value = state.translateY;
			input_7.value = state.translateY;
			input_7.value = state.translateY;
			if (!input_8_updating) input_8.value = state.radius;
			input_9.value = state.radius;
			input_9.value = state.radius;
			input_10.value = state.color;
			if (changed.coordType && button_class_value !== (button_class_value = "btn btn-stroked-dark data-format-but " + (state.coordType === 'outline' ? 'dark-selected' : 'non-selected'))) {
				button.className = button_class_value;
			}

			if (changed.coordType && button_1_class_value !== (button_1_class_value = "btn btn-stroked-dark data-format-but " + (state.coordType === 'inside' ? 'dark-selected' : 'non-selected'))) {
				button_1.className = button_1_class_value;
			}

			if (changed.step) {
				setStyle(div, "display", state.step === 2 ? "block" : "none");
			}
		},

		u: function unmount() {
			detachNode(div);
		},

		d: function destroy$$1() {
			removeListener(input, "input", input_input_handler);
			removeListener(input_1, "input", input_1_input_handler);
			removeListener(input_1, "change", input_1_change_handler);
			removeListener(input_2, "input", input_2_input_handler);
			removeListener(input_3, "input", input_3_input_handler);
			removeListener(input_3, "change", input_3_change_handler);
			removeListener(input_4, "input", input_4_input_handler);
			removeListener(input_5, "input", input_5_input_handler);
			removeListener(input_5, "change", input_5_change_handler);
			removeListener(input_6, "input", input_6_input_handler);
			removeListener(input_7, "input", input_7_input_handler);
			removeListener(input_7, "change", input_7_change_handler);
			removeListener(input_8, "input", input_8_input_handler);
			removeListener(input_9, "input", input_9_input_handler);
			removeListener(input_9, "change", input_9_change_handler);
			removeListener(input_10, "input", input_10_input_handler);
			removeListener(a, "click", click_handler);
			removeListener(button, "click", click_handler_1);
			removeListener(button_1, "click", click_handler_2);
		}
	};
}

function Refinement(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!document.getElementById("svelte-916729838-style")) add_css$3();

	this._fragment = create_main_fragment$3(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(Refinement.prototype, proto);

/* src/components/Credits.html generated by Svelte v1.54.1 */
var methods$2 = {
	setSecretSVG(id) {
		this.fire('secretSVG', {
			id
		});
	}
};

function encapsulateStyles$4(node) {
	setAttribute(node, "svelte-1289012754", "");
}

function add_css$4() {
	var style = createElement("style");
	style.id = 'svelte-1289012754-style';
	style.textContent = "[svelte-1289012754].dita,[svelte-1289012754] .dita{width:100%}[svelte-1289012754].step-4 p,[svelte-1289012754] .step-4 p{font-size:14px}[svelte-1289012754].image-credits > li,[svelte-1289012754] .image-credits > li{font-size:14px;font-weight:normal;padding:0;cursor:default}";
	appendNode(style, document.head);
}

function create_main_fragment$4(state, component) {
	var div, h3, text_1, img, text_2, p, text_3, a, text_5, a_1, text_7, a_2, text_9, text_10, h3_1, text_12, p_1, text_16, h3_2, text_18, p_2, text_19, a_4, text_21, a_5, text_23, a_6, text_25, a_7, text_27, a_8, text_29, a_9, text_31, a_10, text_33, a_11, text_35, text_36, h3_3, text_38, ul;

	function click_handler(event) {
		component.setSecretSVG("aliza");
	}

	function click_handler_1(event) {
		component.setSecretSVG("spotify");
	}

	return {
		c: function create() {
			div = createElement("div");
			h3 = createElement("h3");
			h3.textContent = "Why does this exist?";
			text_1 = createText("\n  ");
			img = createElement("img");
			text_2 = createText("\n  ");
			p = createElement("p");
			text_3 = createText("I (");
			a = createElement("a");
			a.textContent = "Aliza";
			text_5 = createText(") needed a way to compose Dita Von Teese's face out of 7,532 dots for ");
			a_1 = createElement("a");
			a_1.textContent = "this (nearly) award-winning project";
			text_7 = createText(" for Spotify. Here are some ");
			a_2 = createElement("a");
			a_2.textContent = "other ideas about how you could use coördinator";
			text_9 = createText(".");
			text_10 = createText("\n  ");
			h3_1 = createElement("h3");
			h3_1.textContent = "Contribute";
			text_12 = createText("\n  ");
			p_1 = createElement("p");
			p_1.innerHTML = "This project is free and open source under an Apache 2.0 license. <a href=\"https://github.com/spotify/coordinator\" target=\"_blank\">I'd love for you to contribute</a>.";
			text_16 = createText("\n  ");
			h3_2 = createElement("h3");
			h3_2.textContent = "Thanks!";
			text_18 = createText("\n  ");
			p_2 = createElement("p");
			text_19 = createText("Many thanks to my colleagues on the Data:Design team for letting me ");
			a_4 = createElement("a");
			a_4.textContent = "put the spot in Spotify";
			text_21 = createText(",\n     ");
			a_5 = createElement("a");
			a_5.textContent = "Rich Harris";
			text_23 = createText(" for ");
			a_6 = createElement("a");
			a_6.textContent = "Pathologist";
			text_25 = createText(" (and ");
			a_7 = createElement("a");
			a_7.textContent = "Svelte";
			text_27 = createText(" and ");
			a_8 = createElement("a");
			a_8.textContent = "Rollup";
			text_29 = createText("), the fine folks of ");
			a_9 = createElement("a");
			a_9.textContent = "csv soundsystem";
			text_31 = createText(" for their open source support, and ");
			a_10 = createElement("a");
			a_10.textContent = "Noah Veltman";
			text_33 = createText(" for a ");
			a_11 = createElement("a");
			a_11.textContent = "clutch tweet";
			text_35 = createText(" in the nick of time!");
			text_36 = createText("\n\n  ");
			h3_3 = createElement("h3");
			h3_3.textContent = "Image Credits";
			text_38 = createText("\n  ");
			ul = createElement("ul");
			ul.innerHTML = "<li>Bunny: Erik Dana (Noun Project)</li>\n    <li>N64: Ozza Okuonghae (Noun Project)</li>\n    <li>Sonia Sotomayor: Lorie Shaull (Noun Project)</li>\n    <li>Banjo dude: Luis Prado (Noun Project)</li>\n    <li>Pigeon: Kari Gaynor (Noun Project)</li>\n    <li>Accessible Icon: The Accessible Icon Project</li>\n    <li>Cat: Maxim Kulikov (Noun Project)</li>\n    <li>Spotify Icon: Copyright Spotify</li>\n    <li>Download &amp; link out symbol: Loudoun Design Co. (Noun Project)</li>\n  ";
			this.h();
		},

		h: function hydrate() {
			encapsulateStyles$4(div);
			img.className = "dita";
			img.alt = "dita von teese dissolving into dots";
			img.src = "../coordinator/src/static/images/dita.gif";
			addListener(a, "click", click_handler);
			a_1.href = "https://www.informationisbeautifulawards.com/showcase/2556-you-are-what-you-stream";
			a_1.target = "_blank";
			a_2.href = "https://bl.ocks.org/alizauf";
			a_2.target = "_blank";
			addListener(a_4, "click", click_handler_1);
			a_5.href = "https://twitter.com/rich_harris";
			a_5.target = "_blank";
			a_6.href = "https://pathologist.surge.sh";
			a_6.target = "_blank";
			a_7.href = "https://svelte.technology/";
			a_7.target = "_blank";
			a_8.href = "https://rollupjs.org/";
			a_8.target = "_blank";
			a_9.href = "http://csv.nyc/";
			a_9.target = "_blank";
			a_10.href = "https://twitter.com/veltman";
			a_10.target = "_blank";
			a_11.href = "https://twitter.com/veltman/status/867069236467818497?cn=cmVwbHk%3D";
			a_11.target = "_blank";
			ul.className = "image-credits";
			div.className = "step-4";
			setStyle(div, "display", state.step === 4 ? "block" : "none");
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			appendNode(h3, div);
			appendNode(text_1, div);
			appendNode(img, div);
			appendNode(text_2, div);
			appendNode(p, div);
			appendNode(text_3, p);
			appendNode(a, p);
			appendNode(text_5, p);
			appendNode(a_1, p);
			appendNode(text_7, p);
			appendNode(a_2, p);
			appendNode(text_9, p);
			appendNode(text_10, div);
			appendNode(h3_1, div);
			appendNode(text_12, div);
			appendNode(p_1, div);
			appendNode(text_16, div);
			appendNode(h3_2, div);
			appendNode(text_18, div);
			appendNode(p_2, div);
			appendNode(text_19, p_2);
			appendNode(a_4, p_2);
			appendNode(text_21, p_2);
			appendNode(a_5, p_2);
			appendNode(text_23, p_2);
			appendNode(a_6, p_2);
			appendNode(text_25, p_2);
			appendNode(a_7, p_2);
			appendNode(text_27, p_2);
			appendNode(a_8, p_2);
			appendNode(text_29, p_2);
			appendNode(a_9, p_2);
			appendNode(text_31, p_2);
			appendNode(a_10, p_2);
			appendNode(text_33, p_2);
			appendNode(a_11, p_2);
			appendNode(text_35, p_2);
			appendNode(text_36, div);
			appendNode(h3_3, div);
			appendNode(text_38, div);
			appendNode(ul, div);
		},

		p: function update(changed, state) {
			if (changed.step) {
				setStyle(div, "display", state.step === 4 ? "block" : "none");
			}
		},

		u: function unmount() {
			detachNode(div);
		},

		d: function destroy$$1() {
			removeListener(a, "click", click_handler);
			removeListener(a_4, "click", click_handler_1);
		}
	};
}

function Credits(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!document.getElementById("svelte-1289012754-style")) add_css$4();

	this._fragment = create_main_fragment$4(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(Credits.prototype, methods$2, proto);

var javascript = createCommonjsModule$1(function (module, exports) {
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  mod(codemirror);
})(function(CodeMirror) {
CodeMirror.defineMode("javascript", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var statementIndent = parserConfig.statementIndent;
  var jsonldMode = parserConfig.jsonld;
  var jsonMode = parserConfig.json || jsonldMode;
  var isTS = parserConfig.typescript;
  var wordRE = parserConfig.wordCharacters || /[\w$\xa1-\uffff]/;

  // Tokenizer

  var keywords = function(){
    function kw(type) {return {type: type, style: "keyword"};}
    var A = kw("keyword a"), B = kw("keyword b"), C = kw("keyword c"), D = kw("keyword d");
    var operator = kw("operator"), atom = {type: "atom", style: "atom"};

    return {
      "if": kw("if"), "while": A, "with": A, "else": B, "do": B, "try": B, "finally": B,
      "return": D, "break": D, "continue": D, "new": kw("new"), "delete": C, "void": C, "throw": C,
      "debugger": kw("debugger"), "var": kw("var"), "const": kw("var"), "let": kw("var"),
      "function": kw("function"), "catch": kw("catch"),
      "for": kw("for"), "switch": kw("switch"), "case": kw("case"), "default": kw("default"),
      "in": operator, "typeof": operator, "instanceof": operator,
      "true": atom, "false": atom, "null": atom, "undefined": atom, "NaN": atom, "Infinity": atom,
      "this": kw("this"), "class": kw("class"), "super": kw("atom"),
      "yield": C, "export": kw("export"), "import": kw("import"), "extends": C,
      "await": C
    };
  }();

  var isOperatorChar = /[+\-*&%=<>!?|~^@]/;
  var isJsonldKeyword = /^@(context|id|value|language|type|container|list|set|reverse|index|base|vocab|graph)"/;

  function readRegexp(stream) {
    var escaped = false, next, inSet = false;
    while ((next = stream.next()) != null) {
      if (!escaped) {
        if (next == "/" && !inSet) return;
        if (next == "[") inSet = true;
        else if (inSet && next == "]") inSet = false;
      }
      escaped = !escaped && next == "\\";
    }
  }

  // Used as scratch variables to communicate multiple values without
  // consing up tons of objects.
  var type, content;
  function ret(tp, style, cont) {
    type = tp; content = cont;
    return style;
  }
  function tokenBase(stream, state) {
    var ch = stream.next();
    if (ch == '"' || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    } else if (ch == "." && stream.match(/^\d+(?:[eE][+\-]?\d+)?/)) {
      return ret("number", "number");
    } else if (ch == "." && stream.match("..")) {
      return ret("spread", "meta");
    } else if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
      return ret(ch);
    } else if (ch == "=" && stream.eat(">")) {
      return ret("=>", "operator");
    } else if (ch == "0" && stream.eat(/x/i)) {
      stream.eatWhile(/[\da-f]/i);
      return ret("number", "number");
    } else if (ch == "0" && stream.eat(/o/i)) {
      stream.eatWhile(/[0-7]/i);
      return ret("number", "number");
    } else if (ch == "0" && stream.eat(/b/i)) {
      stream.eatWhile(/[01]/i);
      return ret("number", "number");
    } else if (/\d/.test(ch)) {
      stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);
      return ret("number", "number");
    } else if (ch == "/") {
      if (stream.eat("*")) {
        state.tokenize = tokenComment;
        return tokenComment(stream, state);
      } else if (stream.eat("/")) {
        stream.skipToEnd();
        return ret("comment", "comment");
      } else if (expressionAllowed(stream, state, 1)) {
        readRegexp(stream);
        stream.match(/^\b(([gimyu])(?![gimyu]*\2))+\b/);
        return ret("regexp", "string-2");
      } else {
        stream.eat("=");
        return ret("operator", "operator", stream.current());
      }
    } else if (ch == "`") {
      state.tokenize = tokenQuasi;
      return tokenQuasi(stream, state);
    } else if (ch == "#") {
      stream.skipToEnd();
      return ret("error", "error");
    } else if (isOperatorChar.test(ch)) {
      if (ch != ">" || !state.lexical || state.lexical.type != ">") {
        if (stream.eat("=")) {
          if (ch == "!" || ch == "=") stream.eat("=");
        } else if (/[<>*+\-]/.test(ch)) {
          stream.eat(ch);
          if (ch == ">") stream.eat(ch);
        }
      }
      return ret("operator", "operator", stream.current());
    } else if (wordRE.test(ch)) {
      stream.eatWhile(wordRE);
      var word = stream.current();
      if (state.lastType != ".") {
        if (keywords.propertyIsEnumerable(word)) {
          var kw = keywords[word];
          return ret(kw.type, kw.style, word)
        }
        if (word == "async" && stream.match(/^(\s|\/\*.*?\*\/)*[\(\w]/, false))
          return ret("async", "keyword", word)
      }
      return ret("variable", "variable", word)
    }
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next;
      if (jsonldMode && stream.peek() == "@" && stream.match(isJsonldKeyword)){
        state.tokenize = tokenBase;
        return ret("jsonld-keyword", "meta");
      }
      while ((next = stream.next()) != null) {
        if (next == quote && !escaped) break;
        escaped = !escaped && next == "\\";
      }
      if (!escaped) state.tokenize = tokenBase;
      return ret("string", "string");
    };
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = tokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return ret("comment", "comment");
  }

  function tokenQuasi(stream, state) {
    var escaped = false, next;
    while ((next = stream.next()) != null) {
      if (!escaped && (next == "`" || next == "$" && stream.eat("{"))) {
        state.tokenize = tokenBase;
        break;
      }
      escaped = !escaped && next == "\\";
    }
    return ret("quasi", "string-2", stream.current());
  }

  var brackets = "([{}])";
  // This is a crude lookahead trick to try and notice that we're
  // parsing the argument patterns for a fat-arrow function before we
  // actually hit the arrow token. It only works if the arrow is on
  // the same line as the arguments and there's no strange noise
  // (comments) in between. Fallback is to only notice when we hit the
  // arrow, and not declare the arguments as locals for the arrow
  // body.
  function findFatArrow(stream, state) {
    if (state.fatArrowAt) state.fatArrowAt = null;
    var arrow = stream.string.indexOf("=>", stream.start);
    if (arrow < 0) return;

    if (isTS) { // Try to skip TypeScript return type declarations after the arguments
      var m = /:\s*(?:\w+(?:<[^>]*>|\[\])?|\{[^}]*\})\s*$/.exec(stream.string.slice(stream.start, arrow));
      if (m) arrow = m.index;
    }

    var depth = 0, sawSomething = false;
    for (var pos = arrow - 1; pos >= 0; --pos) {
      var ch = stream.string.charAt(pos);
      var bracket = brackets.indexOf(ch);
      if (bracket >= 0 && bracket < 3) {
        if (!depth) { ++pos; break; }
        if (--depth == 0) { if (ch == "(") sawSomething = true; break; }
      } else if (bracket >= 3 && bracket < 6) {
        ++depth;
      } else if (wordRE.test(ch)) {
        sawSomething = true;
      } else if (/["'\/]/.test(ch)) {
        return;
      } else if (sawSomething && !depth) {
        ++pos;
        break;
      }
    }
    if (sawSomething && !depth) state.fatArrowAt = pos;
  }

  // Parser

  var atomicTypes = {"atom": true, "number": true, "variable": true, "string": true, "regexp": true, "this": true, "jsonld-keyword": true};

  function JSLexical(indented, column, type, align, prev, info) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.prev = prev;
    this.info = info;
    if (align != null) this.align = align;
  }

  function inScope(state, varname) {
    for (var v = state.localVars; v; v = v.next)
      if (v.name == varname) return true;
    for (var cx = state.context; cx; cx = cx.prev) {
      for (var v = cx.vars; v; v = v.next)
        if (v.name == varname) return true;
    }
  }

  function parseJS(state, style, type, content, stream) {
    var cc = state.cc;
    // Communicate our context to the combinators.
    // (Less wasteful than consing up a hundred closures on every call.)
    cx.state = state; cx.stream = stream; cx.marked = null, cx.cc = cc; cx.style = style;

    if (!state.lexical.hasOwnProperty("align"))
      state.lexical.align = true;

    while(true) {
      var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
      if (combinator(type, content)) {
        while(cc.length && cc[cc.length - 1].lex)
          cc.pop()();
        if (cx.marked) return cx.marked;
        if (type == "variable" && inScope(state, content)) return "variable-2";
        return style;
      }
    }
  }

  // Combinator utils

  var cx = {state: null, column: null, marked: null, cc: null};
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--) cx.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }
  function register(varname) {
    function inList(list) {
      for (var v = list; v; v = v.next)
        if (v.name == varname) return true;
      return false;
    }
    var state = cx.state;
    cx.marked = "def";
    if (state.context) {
      if (inList(state.localVars)) return;
      state.localVars = {name: varname, next: state.localVars};
    } else {
      if (inList(state.globalVars)) return;
      if (parserConfig.globalVars)
        state.globalVars = {name: varname, next: state.globalVars};
    }
  }

  function isModifier(name) {
    return name == "public" || name == "private" || name == "protected" || name == "abstract" || name == "readonly"
  }

  // Combinators

  var defaultVars = {name: "this", next: {name: "arguments"}};
  function pushcontext() {
    cx.state.context = {prev: cx.state.context, vars: cx.state.localVars};
    cx.state.localVars = defaultVars;
  }
  function popcontext() {
    cx.state.localVars = cx.state.context.vars;
    cx.state.context = cx.state.context.prev;
  }
  function pushlex(type, info) {
    var result = function() {
      var state = cx.state, indent = state.indented;
      if (state.lexical.type == "stat") indent = state.lexical.indented;
      else for (var outer = state.lexical; outer && outer.type == ")" && outer.align; outer = outer.prev)
        indent = outer.indented;
      state.lexical = new JSLexical(indent, cx.stream.column(), type, null, state.lexical, info);
    };
    result.lex = true;
    return result;
  }
  function poplex() {
    var state = cx.state;
    if (state.lexical.prev) {
      if (state.lexical.type == ")")
        state.indented = state.lexical.indented;
      state.lexical = state.lexical.prev;
    }
  }
  poplex.lex = true;

  function expect(wanted) {
    function exp(type) {
      if (type == wanted) return cont();
      else if (wanted == ";") return pass();
      else return cont(exp);
    }
    return exp;
  }

  function statement(type, value) {
    if (type == "var") return cont(pushlex("vardef", value.length), vardef, expect(";"), poplex);
    if (type == "keyword a") return cont(pushlex("form"), parenExpr, statement, poplex);
    if (type == "keyword b") return cont(pushlex("form"), statement, poplex);
    if (type == "keyword d") return cx.stream.match(/^\s*$/, false) ? cont() : cont(pushlex("stat"), maybeexpression, expect(";"), poplex);
    if (type == "debugger") return cont(expect(";"));
    if (type == "{") return cont(pushlex("}"), block, poplex);
    if (type == ";") return cont();
    if (type == "if") {
      if (cx.state.lexical.info == "else" && cx.state.cc[cx.state.cc.length - 1] == poplex)
        cx.state.cc.pop()();
      return cont(pushlex("form"), parenExpr, statement, poplex, maybeelse);
    }
    if (type == "function") return cont(functiondef);
    if (type == "for") return cont(pushlex("form"), forspec, statement, poplex);
    if (type == "class" || (isTS && value == "interface")) { cx.marked = "keyword"; return cont(pushlex("form"), className, poplex); }
    if (type == "variable") {
      if (isTS && value == "declare") {
        cx.marked = "keyword";
        return cont(statement)
      } else if (isTS && (value == "module" || value == "enum" || value == "type") && cx.stream.match(/^\s*\w/, false)) {
        cx.marked = "keyword";
        if (value == "enum") return cont(enumdef);
        else if (value == "type") return cont(typeexpr, expect("operator"), typeexpr, expect(";"));
        else return cont(pushlex("form"), pattern, expect("{"), pushlex("}"), block, poplex, poplex)
      } else if (isTS && value == "namespace") {
        cx.marked = "keyword";
        return cont(pushlex("form"), expression, block, poplex)
      } else {
        return cont(pushlex("stat"), maybelabel);
      }
    }
    if (type == "switch") return cont(pushlex("form"), parenExpr, expect("{"), pushlex("}", "switch"),
                                      block, poplex, poplex);
    if (type == "case") return cont(expression, expect(":"));
    if (type == "default") return cont(expect(":"));
    if (type == "catch") return cont(pushlex("form"), pushcontext, expect("("), funarg, expect(")"),
                                     statement, poplex, popcontext);
    if (type == "export") return cont(pushlex("stat"), afterExport, poplex);
    if (type == "import") return cont(pushlex("stat"), afterImport, poplex);
    if (type == "async") return cont(statement)
    if (value == "@") return cont(expression, statement)
    return pass(pushlex("stat"), expression, expect(";"), poplex);
  }
  function expression(type, value) {
    return expressionInner(type, value, false);
  }
  function expressionNoComma(type, value) {
    return expressionInner(type, value, true);
  }
  function parenExpr(type) {
    if (type != "(") return pass()
    return cont(pushlex(")"), expression, expect(")"), poplex)
  }
  function expressionInner(type, value, noComma) {
    if (cx.state.fatArrowAt == cx.stream.start) {
      var body = noComma ? arrowBodyNoComma : arrowBody;
      if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, expect("=>"), body, popcontext);
      else if (type == "variable") return pass(pushcontext, pattern, expect("=>"), body, popcontext);
    }

    var maybeop = noComma ? maybeoperatorNoComma : maybeoperatorComma;
    if (atomicTypes.hasOwnProperty(type)) return cont(maybeop);
    if (type == "function") return cont(functiondef, maybeop);
    if (type == "class" || (isTS && value == "interface")) { cx.marked = "keyword"; return cont(pushlex("form"), classExpression, poplex); }
    if (type == "keyword c" || type == "async") return cont(noComma ? expressionNoComma : expression);
    if (type == "(") return cont(pushlex(")"), maybeexpression, expect(")"), poplex, maybeop);
    if (type == "operator" || type == "spread") return cont(noComma ? expressionNoComma : expression);
    if (type == "[") return cont(pushlex("]"), arrayLiteral, poplex, maybeop);
    if (type == "{") return contCommasep(objprop, "}", null, maybeop);
    if (type == "quasi") return pass(quasi, maybeop);
    if (type == "new") return cont(maybeTarget(noComma));
    return cont();
  }
  function maybeexpression(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expression);
  }

  function maybeoperatorComma(type, value) {
    if (type == ",") return cont(expression);
    return maybeoperatorNoComma(type, value, false);
  }
  function maybeoperatorNoComma(type, value, noComma) {
    var me = noComma == false ? maybeoperatorComma : maybeoperatorNoComma;
    var expr = noComma == false ? expression : expressionNoComma;
    if (type == "=>") return cont(pushcontext, noComma ? arrowBodyNoComma : arrowBody, popcontext);
    if (type == "operator") {
      if (/\+\+|--/.test(value) || isTS && value == "!") return cont(me);
      if (isTS && value == "<" && cx.stream.match(/^([^>]|<.*?>)*>\s*\(/, false))
        return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, me);
      if (value == "?") return cont(expression, expect(":"), expr);
      return cont(expr);
    }
    if (type == "quasi") { return pass(quasi, me); }
    if (type == ";") return;
    if (type == "(") return contCommasep(expressionNoComma, ")", "call", me);
    if (type == ".") return cont(property, me);
    if (type == "[") return cont(pushlex("]"), maybeexpression, expect("]"), poplex, me);
    if (isTS && value == "as") { cx.marked = "keyword"; return cont(typeexpr, me) }
    if (type == "regexp") {
      cx.state.lastType = cx.marked = "operator";
      cx.stream.backUp(cx.stream.pos - cx.stream.start - 1);
      return cont(expr)
    }
  }
  function quasi(type, value) {
    if (type != "quasi") return pass();
    if (value.slice(value.length - 2) != "${") return cont(quasi);
    return cont(expression, continueQuasi);
  }
  function continueQuasi(type) {
    if (type == "}") {
      cx.marked = "string-2";
      cx.state.tokenize = tokenQuasi;
      return cont(quasi);
    }
  }
  function arrowBody(type) {
    findFatArrow(cx.stream, cx.state);
    return pass(type == "{" ? statement : expression);
  }
  function arrowBodyNoComma(type) {
    findFatArrow(cx.stream, cx.state);
    return pass(type == "{" ? statement : expressionNoComma);
  }
  function maybeTarget(noComma) {
    return function(type) {
      if (type == ".") return cont(noComma ? targetNoComma : target);
      else if (type == "variable" && isTS) return cont(maybeTypeArgs, noComma ? maybeoperatorNoComma : maybeoperatorComma)
      else return pass(noComma ? expressionNoComma : expression);
    };
  }
  function target(_, value) {
    if (value == "target") { cx.marked = "keyword"; return cont(maybeoperatorComma); }
  }
  function targetNoComma(_, value) {
    if (value == "target") { cx.marked = "keyword"; return cont(maybeoperatorNoComma); }
  }
  function maybelabel(type) {
    if (type == ":") return cont(poplex, statement);
    return pass(maybeoperatorComma, expect(";"), poplex);
  }
  function property(type) {
    if (type == "variable") {cx.marked = "property"; return cont();}
  }
  function objprop(type, value) {
    if (type == "async") {
      cx.marked = "property";
      return cont(objprop);
    } else if (type == "variable" || cx.style == "keyword") {
      cx.marked = "property";
      if (value == "get" || value == "set") return cont(getterSetter);
      var m; // Work around fat-arrow-detection complication for detecting typescript typed arrow params
      if (isTS && cx.state.fatArrowAt == cx.stream.start && (m = cx.stream.match(/^\s*:\s*/, false)))
        cx.state.fatArrowAt = cx.stream.pos + m[0].length;
      return cont(afterprop);
    } else if (type == "number" || type == "string") {
      cx.marked = jsonldMode ? "property" : (cx.style + " property");
      return cont(afterprop);
    } else if (type == "jsonld-keyword") {
      return cont(afterprop);
    } else if (isTS && isModifier(value)) {
      cx.marked = "keyword";
      return cont(objprop)
    } else if (type == "[") {
      return cont(expression, maybetype, expect("]"), afterprop);
    } else if (type == "spread") {
      return cont(expressionNoComma, afterprop);
    } else if (value == "*") {
      cx.marked = "keyword";
      return cont(objprop);
    } else if (type == ":") {
      return pass(afterprop)
    }
  }
  function getterSetter(type) {
    if (type != "variable") return pass(afterprop);
    cx.marked = "property";
    return cont(functiondef);
  }
  function afterprop(type) {
    if (type == ":") return cont(expressionNoComma);
    if (type == "(") return pass(functiondef);
  }
  function commasep(what, end, sep) {
    function proceed(type, value) {
      if (sep ? sep.indexOf(type) > -1 : type == ",") {
        var lex = cx.state.lexical;
        if (lex.info == "call") lex.pos = (lex.pos || 0) + 1;
        return cont(function(type, value) {
          if (type == end || value == end) return pass()
          return pass(what)
        }, proceed);
      }
      if (type == end || value == end) return cont();
      return cont(expect(end));
    }
    return function(type, value) {
      if (type == end || value == end) return cont();
      return pass(what, proceed);
    };
  }
  function contCommasep(what, end, info) {
    for (var i = 3; i < arguments.length; i++)
      cx.cc.push(arguments[i]);
    return cont(pushlex(end, info), commasep(what, end), poplex);
  }
  function block(type) {
    if (type == "}") return cont();
    return pass(statement, block);
  }
  function maybetype(type, value) {
    if (isTS) {
      if (type == ":") return cont(typeexpr);
      if (value == "?") return cont(maybetype);
    }
  }
  function mayberettype(type) {
    if (isTS && type == ":") {
      if (cx.stream.match(/^\s*\w+\s+is\b/, false)) return cont(expression, isKW, typeexpr)
      else return cont(typeexpr)
    }
  }
  function isKW(_, value) {
    if (value == "is") {
      cx.marked = "keyword";
      return cont()
    }
  }
  function typeexpr(type, value) {
    if (type == "variable" || value == "void") {
      if (value == "keyof") {
        cx.marked = "keyword";
        return cont(typeexpr)
      } else {
        cx.marked = "type";
        return cont(afterType)
      }
    }
    if (type == "string" || type == "number" || type == "atom") return cont(afterType);
    if (type == "[") return cont(pushlex("]"), commasep(typeexpr, "]", ","), poplex, afterType)
    if (type == "{") return cont(pushlex("}"), commasep(typeprop, "}", ",;"), poplex, afterType)
    if (type == "(") return cont(commasep(typearg, ")"), maybeReturnType)
  }
  function maybeReturnType(type) {
    if (type == "=>") return cont(typeexpr)
  }
  function typeprop(type, value) {
    if (type == "variable" || cx.style == "keyword") {
      cx.marked = "property";
      return cont(typeprop)
    } else if (value == "?") {
      return cont(typeprop)
    } else if (type == ":") {
      return cont(typeexpr)
    } else if (type == "[") {
      return cont(expression, maybetype, expect("]"), typeprop)
    }
  }
  function typearg(type) {
    if (type == "variable") return cont(typearg)
    else if (type == ":") return cont(typeexpr)
  }
  function afterType(type, value) {
    if (value == "<") return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, afterType)
    if (value == "|" || type == ".") return cont(typeexpr)
    if (type == "[") return cont(expect("]"), afterType)
    if (value == "extends" || value == "implements") { cx.marked = "keyword"; return cont(typeexpr) }
  }
  function maybeTypeArgs(_, value) {
    if (value == "<") return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, afterType)
  }
  function typeparam() {
    return pass(typeexpr, maybeTypeDefault)
  }
  function maybeTypeDefault(_, value) {
    if (value == "=") return cont(typeexpr)
  }
  function vardef(_, value) {
    if (value == "enum") {cx.marked = "keyword"; return cont(enumdef)}
    return pass(pattern, maybetype, maybeAssign, vardefCont);
  }
  function pattern(type, value) {
    if (isTS && isModifier(value)) { cx.marked = "keyword"; return cont(pattern) }
    if (type == "variable") { register(value); return cont(); }
    if (type == "spread") return cont(pattern);
    if (type == "[") return contCommasep(pattern, "]");
    if (type == "{") return contCommasep(proppattern, "}");
  }
  function proppattern(type, value) {
    if (type == "variable" && !cx.stream.match(/^\s*:/, false)) {
      register(value);
      return cont(maybeAssign);
    }
    if (type == "variable") cx.marked = "property";
    if (type == "spread") return cont(pattern);
    if (type == "}") return pass();
    return cont(expect(":"), pattern, maybeAssign);
  }
  function maybeAssign(_type, value) {
    if (value == "=") return cont(expressionNoComma);
  }
  function vardefCont(type) {
    if (type == ",") return cont(vardef);
  }
  function maybeelse(type, value) {
    if (type == "keyword b" && value == "else") return cont(pushlex("form", "else"), statement, poplex);
  }
  function forspec(type) {
    if (type == "(") return cont(pushlex(")"), forspec1, expect(")"), poplex);
  }
  function forspec1(type) {
    if (type == "var") return cont(vardef, expect(";"), forspec2);
    if (type == ";") return cont(forspec2);
    if (type == "variable") return cont(formaybeinof);
    return pass(expression, expect(";"), forspec2);
  }
  function formaybeinof(_type, value) {
    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
    return cont(maybeoperatorComma, forspec2);
  }
  function forspec2(type, value) {
    if (type == ";") return cont(forspec3);
    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
    return pass(expression, expect(";"), forspec3);
  }
  function forspec3(type) {
    if (type != ")") cont(expression);
  }
  function functiondef(type, value) {
    if (value == "*") {cx.marked = "keyword"; return cont(functiondef);}
    if (type == "variable") {register(value); return cont(functiondef);}
    if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, mayberettype, statement, popcontext);
    if (isTS && value == "<") return cont(pushlex(">"), commasep(typeparam, ">"), poplex, functiondef)
  }
  function funarg(type, value) {
    if (value == "@") cont(expression, funarg);
    if (type == "spread") return cont(funarg);
    if (isTS && isModifier(value)) { cx.marked = "keyword"; return cont(funarg); }
    return pass(pattern, maybetype, maybeAssign);
  }
  function classExpression(type, value) {
    // Class expressions may have an optional name.
    if (type == "variable") return className(type, value);
    return classNameAfter(type, value);
  }
  function className(type, value) {
    if (type == "variable") {register(value); return cont(classNameAfter);}
  }
  function classNameAfter(type, value) {
    if (value == "<") return cont(pushlex(">"), commasep(typeparam, ">"), poplex, classNameAfter)
    if (value == "extends" || value == "implements" || (isTS && type == ",")) {
      if (value == "implements") cx.marked = "keyword";
      return cont(isTS ? typeexpr : expression, classNameAfter);
    }
    if (type == "{") return cont(pushlex("}"), classBody, poplex);
  }
  function classBody(type, value) {
    if (type == "async" ||
        (type == "variable" &&
         (value == "static" || value == "get" || value == "set" || (isTS && isModifier(value))) &&
         cx.stream.match(/^\s+[\w$\xa1-\uffff]/, false))) {
      cx.marked = "keyword";
      return cont(classBody);
    }
    if (type == "variable" || cx.style == "keyword") {
      cx.marked = "property";
      return cont(isTS ? classfield : functiondef, classBody);
    }
    if (type == "[")
      return cont(expression, maybetype, expect("]"), isTS ? classfield : functiondef, classBody)
    if (value == "*") {
      cx.marked = "keyword";
      return cont(classBody);
    }
    if (type == ";") return cont(classBody);
    if (type == "}") return cont();
    if (value == "@") return cont(expression, classBody)
  }
  function classfield(type, value) {
    if (value == "?") return cont(classfield)
    if (type == ":") return cont(typeexpr, maybeAssign)
    if (value == "=") return cont(expressionNoComma)
    return pass(functiondef)
  }
  function afterExport(type, value) {
    if (value == "*") { cx.marked = "keyword"; return cont(maybeFrom, expect(";")); }
    if (value == "default") { cx.marked = "keyword"; return cont(expression, expect(";")); }
    if (type == "{") return cont(commasep(exportField, "}"), maybeFrom, expect(";"));
    return pass(statement);
  }
  function exportField(type, value) {
    if (value == "as") { cx.marked = "keyword"; return cont(expect("variable")); }
    if (type == "variable") return pass(expressionNoComma, exportField);
  }
  function afterImport(type) {
    if (type == "string") return cont();
    return pass(importSpec, maybeMoreImports, maybeFrom);
  }
  function importSpec(type, value) {
    if (type == "{") return contCommasep(importSpec, "}");
    if (type == "variable") register(value);
    if (value == "*") cx.marked = "keyword";
    return cont(maybeAs);
  }
  function maybeMoreImports(type) {
    if (type == ",") return cont(importSpec, maybeMoreImports)
  }
  function maybeAs(_type, value) {
    if (value == "as") { cx.marked = "keyword"; return cont(importSpec); }
  }
  function maybeFrom(_type, value) {
    if (value == "from") { cx.marked = "keyword"; return cont(expression); }
  }
  function arrayLiteral(type) {
    if (type == "]") return cont();
    return pass(commasep(expressionNoComma, "]"));
  }
  function enumdef() {
    return pass(pushlex("form"), pattern, expect("{"), pushlex("}"), commasep(enummember, "}"), poplex, poplex)
  }
  function enummember() {
    return pass(pattern, maybeAssign);
  }

  function isContinuedStatement(state, textAfter) {
    return state.lastType == "operator" || state.lastType == "," ||
      isOperatorChar.test(textAfter.charAt(0)) ||
      /[,.]/.test(textAfter.charAt(0));
  }

  function expressionAllowed(stream, state, backUp) {
    return state.tokenize == tokenBase &&
      /^(?:operator|sof|keyword [bcd]|case|new|export|default|spread|[\[{}\(,;:]|=>)$/.test(state.lastType) ||
      (state.lastType == "quasi" && /\{\s*$/.test(stream.string.slice(0, stream.pos - (backUp || 0))))
  }

  // Interface

  return {
    startState: function(basecolumn) {
      var state = {
        tokenize: tokenBase,
        lastType: "sof",
        cc: [],
        lexical: new JSLexical((basecolumn || 0) - indentUnit, 0, "block", false),
        localVars: parserConfig.localVars,
        context: parserConfig.localVars && {vars: parserConfig.localVars},
        indented: basecolumn || 0
      };
      if (parserConfig.globalVars && typeof parserConfig.globalVars == "object")
        state.globalVars = parserConfig.globalVars;
      return state;
    },

    token: function(stream, state) {
      if (stream.sol()) {
        if (!state.lexical.hasOwnProperty("align"))
          state.lexical.align = false;
        state.indented = stream.indentation();
        findFatArrow(stream, state);
      }
      if (state.tokenize != tokenComment && stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);
      if (type == "comment") return style;
      state.lastType = type == "operator" && (content == "++" || content == "--") ? "incdec" : type;
      return parseJS(state, style, type, content, stream);
    },

    indent: function(state, textAfter) {
      if (state.tokenize == tokenComment) return CodeMirror.Pass;
      if (state.tokenize != tokenBase) return 0;
      var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical, top;
      // Kludge to prevent 'maybelse' from blocking lexical scope pops
      if (!/^\s*else\b/.test(textAfter)) for (var i = state.cc.length - 1; i >= 0; --i) {
        var c = state.cc[i];
        if (c == poplex) lexical = lexical.prev;
        else if (c != maybeelse) break;
      }
      while ((lexical.type == "stat" || lexical.type == "form") &&
             (firstChar == "}" || ((top = state.cc[state.cc.length - 1]) &&
                                   (top == maybeoperatorComma || top == maybeoperatorNoComma) &&
                                   !/^[,\.=+\-*:?[\(]/.test(textAfter))))
        lexical = lexical.prev;
      if (statementIndent && lexical.type == ")" && lexical.prev.type == "stat")
        lexical = lexical.prev;
      var type = lexical.type, closing = firstChar == type;

      if (type == "vardef") return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? lexical.info + 1 : 0);
      else if (type == "form" && firstChar == "{") return lexical.indented;
      else if (type == "form") return lexical.indented + indentUnit;
      else if (type == "stat")
        return lexical.indented + (isContinuedStatement(state, textAfter) ? statementIndent || indentUnit : 0);
      else if (lexical.info == "switch" && !closing && parserConfig.doubleIndentSwitch != false)
        return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
      else if (lexical.align) return lexical.column + (closing ? 0 : 1);
      else return lexical.indented + (closing ? 0 : indentUnit);
    },

    electricInput: /^\s*(?:case .*?:|default:|\{|\})$/,
    blockCommentStart: jsonMode ? null : "/*",
    blockCommentEnd: jsonMode ? null : "*/",
    blockCommentContinue: jsonMode ? null : " * ",
    lineComment: jsonMode ? null : "//",
    fold: "brace",
    closeBrackets: "()[]{}''\"\"``",

    helperType: jsonMode ? "json" : "javascript",
    jsonldMode: jsonldMode,
    jsonMode: jsonMode,

    expressionAllowed: expressionAllowed,

    skipExpression: function(state) {
      var top = state.cc[state.cc.length - 1];
      if (top == expression || top == expressionNoComma) state.cc.pop();
    }
  };
});

CodeMirror.registerHelper("wordChars", "javascript", /[\w$]/);

CodeMirror.defineMIME("text/javascript", "javascript");
CodeMirror.defineMIME("text/ecmascript", "javascript");
CodeMirror.defineMIME("application/javascript", "javascript");
CodeMirror.defineMIME("application/x-javascript", "javascript");
CodeMirror.defineMIME("application/ecmascript", "javascript");
CodeMirror.defineMIME("application/json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/x-json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/ld+json", {name: "javascript", jsonld: true});
CodeMirror.defineMIME("text/typescript", { name: "javascript", typescript: true });
CodeMirror.defineMIME("application/typescript", { name: "javascript", typescript: true });

});
});

/* src/components/CoordsExport.html generated by Svelte v1.54.1 */
function data$2() {
	return {
		dataFormat: 'json',
		cmOutput: null,
		csvOutput: null,
		jsonCoords: null
	};
}

var methods$3 = {
	coordsToCsv(coords) {
		let csvOutput = 'x,y\n';
		coords.forEach(x => {
			csvOutput += `${x[0]},${x[1]}\n`;
		});
		this.set({ csvOutput });
		return csvOutput;
	},

	coordsToJson(coords) {
		const jsonCoords = JSON.stringify(coords);
		this.set({ jsonCoords });
		return jsonCoords;
	},

	updateExport(coords, dataFormat, cmOutput) {
		const csvOutput = this.coordsToCsv(coords);
		const jsonOutput = this.coordsToJson(coords);
		cmOutput.setValue(dataFormat === 'csv' ? csvOutput : jsonOutput);
	}
};

function oncreate$2() {
	const cmOutput = codemirror(this.refs.cmOutput, {
		value: '//coordinates will go here',
		mode: 'javascript',
		lineNumbers: true,
		lineWrapping: true,
		htmlMode: true
	});

	this.set({ cmOutput });

	this.observe('step', step => {
		if (step === 3) {
			//hack to fix when code mirror gets unhappy when it's instantiated behind a display:none
			setTimeout(function () {
				cmOutput.refresh();
			}, 50);
		}
	});

	this.observe('coords', coords => {
		const dataFormat = this.get('dataFormat');
		if (coords && dataFormat) {
			this.updateExport(coords, dataFormat, cmOutput);
		}
	});

	this.observe('dataFormat', dataFormat => {
		const coords = this.get('coords');
		if (coords && dataFormat) {
			this.updateExport(coords, dataFormat, cmOutput);
		}
	});
}

function encapsulateStyles$5(node) {
	setAttribute(node, "svelte-1157225068", "");
}

function add_css$5() {
	var style = createElement("style");
	style.id = 'svelte-1157225068-style';
	style.textContent = "[svelte-1157225068].output-actions,[svelte-1157225068] .output-actions{display:flex}[svelte-1157225068].data-format-but,[svelte-1157225068] .data-format-but{padding:11px 26px 9px}[svelte-1157225068].json-csv-dl,[svelte-1157225068] .json-csv-dl{margin-left:20px;margin-top:3px}[svelte-1157225068].CodeMirror,[svelte-1157225068] .CodeMirror{height:300px}[svelte-1157225068].cm-output,[svelte-1157225068] .cm-output{margin-bottom:30px}[svelte-1157225068].download,[svelte-1157225068] .download{width:20px;display:inline-block}[svelte-1157225068].dark-selected,[svelte-1157225068] .dark-selected{background-color:#616467;color:white;border-color:#616467}[svelte-1157225068].dark-selected:hover,[svelte-1157225068] .dark-selected:hover{color:white}[svelte-1157225068].non-selected,[svelte-1157225068] .non-selected{color:#616467}[svelte-1157225068].non-selected:hover,[svelte-1157225068] .non-selected:hover{color:white}";
	appendNode(style, document.head);
}

function create_main_fragment$5(state, component) {
	var div, h2, text_1, div_1, div_2, button, button_class_value, text_3, button_1, button_1_class_value, text_6, p, img, text_7, a, a_href_value, text_9, a_1, a_1_href_value, text_13, div_3, text_14, p_1, text_15, br, img_1, text_16, a_2;

	function click_handler(event) {
		component.set({ dataFormat: "json" });
	}

	function click_handler_1(event) {
		component.set({ dataFormat: "csv" });
	}

	return {
		c: function create() {
			div = createElement("div");
			h2 = createElement("h2");
			h2.textContent = "Get Coördinates";
			text_1 = createText("\n  ");
			div_1 = createElement("div");
			div_2 = createElement("div");
			button = createElement("button");
			button.textContent = "json";
			text_3 = createText("\n      ");
			button_1 = createElement("button");
			button_1.textContent = "csv";
			text_6 = createText("\n    ");
			p = createElement("p");
			img = createElement("img");
			text_7 = createText(":\n\n      ");
			a = createElement("a");
			a.textContent = "json";
			text_9 = createText("\n\n      ");
			a_1 = createElement("a");
			a_1.textContent = "csv";
			text_13 = createText("\n\n  ");
			div_3 = createElement("div");
			text_14 = createText("\n  ");
			p_1 = createElement("p");
			text_15 = createText("Carving a pumpkin or something?\n    ");
			br = createElement("br");
			img_1 = createElement("img");
			text_16 = createText(": ");
			a_2 = createElement("a");
			a_2.textContent = "png";
			this.h();
		},

		h: function hydrate() {
			encapsulateStyles$5(div);
			button.type = "button";
			button.className = button_class_value = "btn btn-stroked-dark data-format-but " + (state.dataFormat === 'json' ? 'dark-selected' : 'non-selected');
			addListener(button, "click", click_handler);
			button_1.type = "button";
			button_1.className = button_1_class_value = "btn btn-stroked-dark data-format-but " + (state.dataFormat === 'csv' ? 'dark-selected' : 'non-selected');
			addListener(button_1, "click", click_handler_1);
			div_2.className = "btn-group btn-group-sm";
			setAttribute(div_2, "role", "group");
			setAttribute(div_2, "aria-label", "...");
			img.className = "download";
			img.alt = "download icon";
			img.src = "../coordinator/src/static/images/download-black.svg";
			a.href = a_href_value = state.encodeURI("data:text/json;charset=utf-8," + state.jsonCoords);
			a.download = "coordinator.json";
			a_1.href = a_1_href_value = state.encodeURI("data:text/csv;charset=utf-8," + state.csvOutput);
			a_1.download = "coordinator.csv";
			p.className = "json-csv-dl";
			div_1.className = "output-actions";
			div_3.className = "cm-output";
			img_1.className = "download";
			img_1.alt = "download icon";
			img_1.src = "../coordinator/src/static/images/download-black.svg";
			a_2.href = state.imageForDownload;
			a_2.download = "coordinator.png";
			div.className = "step-3";
			setStyle(div, "display", state.step === 3 ? "block" : "none");
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			appendNode(h2, div);
			appendNode(text_1, div);
			appendNode(div_1, div);
			appendNode(div_2, div_1);
			appendNode(button, div_2);
			appendNode(text_3, div_2);
			appendNode(button_1, div_2);
			appendNode(text_6, div_1);
			appendNode(p, div_1);
			appendNode(img, p);
			appendNode(text_7, p);
			appendNode(a, p);
			appendNode(text_9, p);
			appendNode(a_1, p);
			appendNode(text_13, div);
			appendNode(div_3, div);
			component.refs.cmOutput = div_3;
			appendNode(text_14, div);
			appendNode(p_1, div);
			appendNode(text_15, p_1);
			appendNode(br, p_1);
			appendNode(img_1, p_1);
			appendNode(text_16, p_1);
			appendNode(a_2, p_1);
		},

		p: function update(changed, state) {
			if (changed.dataFormat && button_class_value !== (button_class_value = "btn btn-stroked-dark data-format-but " + (state.dataFormat === 'json' ? 'dark-selected' : 'non-selected'))) {
				button.className = button_class_value;
			}

			if (changed.dataFormat && button_1_class_value !== (button_1_class_value = "btn btn-stroked-dark data-format-but " + (state.dataFormat === 'csv' ? 'dark-selected' : 'non-selected'))) {
				button_1.className = button_1_class_value;
			}

			if ((changed.encodeURI || changed.jsonCoords) && a_href_value !== (a_href_value = state.encodeURI("data:text/json;charset=utf-8," + state.jsonCoords))) {
				a.href = a_href_value;
			}

			if ((changed.encodeURI || changed.csvOutput) && a_1_href_value !== (a_1_href_value = state.encodeURI("data:text/csv;charset=utf-8," + state.csvOutput))) {
				a_1.href = a_1_href_value;
			}

			if (changed.imageForDownload) {
				a_2.href = state.imageForDownload;
			}

			if (changed.step) {
				setStyle(div, "display", state.step === 3 ? "block" : "none");
			}
		},

		u: function unmount() {
			detachNode(div);
		},

		d: function destroy$$1() {
			removeListener(button, "click", click_handler);
			removeListener(button_1, "click", click_handler_1);
			if (component.refs.cmOutput === div_3) component.refs.cmOutput = null;
		}
	};
}

function CoordsExport(options) {
	init(this, options);
	this.refs = {};
	this._state = assign({ encodeURI: encodeURI }, data$2(), options.data);

	if (!document.getElementById("svelte-1157225068-style")) add_css$5();

	var _oncreate = oncreate$2.bind(this);

	if (!options.root) {
		this._oncreate = [];
	}

	this._fragment = create_main_fragment$5(this._state, this);

	this.root._oncreate.push(_oncreate);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		callAll(this._oncreate);
	}
}

assign(CoordsExport.prototype, methods$3, proto);

/* src/components/SmallWindowWarning.html generated by Svelte v1.54.1 */
function data$3() {
	return {
		url: window.location.href
	};
}

function encapsulateStyles$6(node) {
	setAttribute(node, "svelte-4130076710", "");
}

function add_css$6() {
	var style = createElement("style");
	style.id = 'svelte-4130076710-style';
	style.textContent = "img[svelte-4130076710],[svelte-4130076710] img{width:100%;margin:0 auto;border:1px solid #222326}[svelte-4130076710].small-window-warning,[svelte-4130076710] .small-window-warning{width:100vw;height:100vh;background-color:#F037A5;overflow:scroll;padding:20px}[svelte-4130076710].text,[svelte-4130076710] .text{margin:0 auto;text-align:center}a[svelte-4130076710],[svelte-4130076710] a{cursor:pointer;color:#FAE62D;border-bottom:solid 1px #FAE62D}input[svelte-4130076710],[svelte-4130076710] input{width:100%;background-color:#FAE62D}";
	appendNode(style, document.head);
}

function create_main_fragment$6(state, component) {
	var div, div_1, text_8, p_1, text_10, p_2, text_12, img, text_13, p_3, text_17, input;

	return {
		c: function create() {
			div = createElement("div");
			div_1 = createElement("div");
			div_1.innerHTML = "<h1>coördinator</h1>\n  <p>Turn an SVG into XY coördinates.\n  <br> Made by <a href=\"https://twitter.com/alizauf\">Aliza Aufrichtig</a> @ <a href=\"https://www.spotify.com\">Spotify</a></p>";
			text_8 = createText("\n  ");
			p_1 = createElement("p");
			p_1.textContent = "Hey! Coördinator is designed for you to upload an SVG, manipulate it, and then download XY coördinates for your creative coding uses. Which is to say, it is not super useful on tiny screens.";
			text_10 = createText("\n  ");
			p_2 = createElement("p");
			p_2.textContent = "So here's a gif of what it does.";
			text_12 = createText("\n  ");
			img = createElement("img");
			text_13 = createText("\n  ");
			p_3 = createElement("p");
			p_3.innerHTML = "Think it's cool? <a href=\"mailto:?subject=Note%20to%20Self%3A%20Check%20out%20Co%C3%B6rdinator%2C%20that%20tool%20I%20saw%20on%20the%20internet&body=https%3A%2F%2Fspotify.github.io%2Fcoordinator\" target=\"_top\">Email yourself a link</a> to check it out on the big screen, or just copy the link and do with it what you will.";
			text_17 = createText("\n\n  ");
			input = createElement("input");
			this.h();
		},

		h: function hydrate() {
			encapsulateStyles$6(div);
			div_1.className = "text";
			img.alt = "demonstration of app on desktop";
			img.src = "../coordinator/src/static/images/demonstration.gif";
			input.type = "text";
			input.value = state.url;
			div.className = "small-window-warning";
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			appendNode(div_1, div);
			appendNode(text_8, div);
			appendNode(p_1, div);
			appendNode(text_10, div);
			appendNode(p_2, div);
			appendNode(text_12, div);
			appendNode(img, div);
			appendNode(text_13, div);
			appendNode(p_3, div);
			appendNode(text_17, div);
			appendNode(input, div);
		},

		p: function update(changed, state) {
			if (changed.url) {
				input.value = state.url;
			}
		},

		u: function unmount() {
			detachNode(div);
		},

		d: noop
	};
}

function SmallWindowWarning(options) {
	init(this, options);
	this._state = assign(data$3(), options.data);

	if (!document.getElementById("svelte-4130076710-style")) add_css$6();

	this._fragment = create_main_fragment$6(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(SmallWindowWarning.prototype, proto);

var coordinator = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 110.4 147.44\"><title>Asset 2</title><g id=\"Layer_2\" data-name=\"Layer 2\"><g id=\"Layer_1-2\" data-name=\"Layer 1\"><path d=\"M9.06,27.66c0,4.74,3.18,7.38,7,7.38A6.15,6.15,0,0,0,22.2,30.6l8,2.46C28.92,38.28,24,43.44,16,43.44c-8.88,0-16-6.54-16-15.78A15.39,15.39,0,0,1,15.72,11.82c8.22,0,13,5,14.34,10.38L21.9,24.66a5.86,5.86,0,0,0-6-4.44C12.12,20.22,9.06,22.86,9.06,27.66Z\"/><path d=\"M65,27.6A15.42,15.42,0,0,1,49.2,43.44,15.46,15.46,0,0,1,33.36,27.6,15.41,15.41,0,0,1,49.2,11.82C58.14,11.82,65,18.36,65,27.6Zm-9.12,0c0-5-3.24-7.38-6.72-7.38s-6.72,2.34-6.72,7.38S45.78,35,49.2,35,55.92,32.64,55.92,27.6Z\"/><path d=\"M100.44,27.6a15.84,15.84,0,0,1-31.68,0A15.41,15.41,0,0,1,84.6,11.82C93.54,11.82,100.44,18.36,100.44,27.6ZM77.94,0a4.58,4.58,0,0,1,4.62,4.62,4.53,4.53,0,0,1-4.62,4.56,4.48,4.48,0,0,1-4.56-4.56A4.53,4.53,0,0,1,77.94,0ZM91.32,27.6c0-5-3.24-7.38-6.72-7.38s-6.72,2.34-6.72,7.38S81.18,35,84.6,35,91.32,32.64,91.32,27.6ZM91.2,0a4.58,4.58,0,0,1,4.62,4.62A4.53,4.53,0,0,1,91.2,9.18a4.48,4.48,0,0,1-4.56-4.56A4.53,4.53,0,0,1,91.2,0Z\"/><path d=\"M20.28,73.72a12.36,12.36,0,0,0-2.88-.3c-3.66,0-7,2.16-7,8.1v13H1.32V64.72h8.82v4c1.56-3.36,5.34-4.32,7.74-4.32a9,9,0,0,1,2.4.3Z\"/><path d=\"M54.6,89.2c0,2.7.18,4.68.24,5.34H46.08a20.52,20.52,0,0,1-.24-2.88c-1.38,2-4.38,3.54-8,3.54-8.4,0-14.76-6.48-14.76-15.66,0-8.88,6-15.54,14.46-15.54,5.1,0,7.32,1.92,8,3.06v-16h9ZM39,87c3.54,0,6.72-2.52,6.72-7.44S42.54,72.22,39,72.22s-6.72,2.4-6.72,7.38S35.46,87,39,87Z\"/><path d=\"M65.4,50.26a5.34,5.34,0,1,1-5.28,5.34A5.36,5.36,0,0,1,65.4,50.26ZM60.9,94.54V64.72H70V94.54Z\"/><path d=\"M85.38,94.54H76.26V64.72h8.82v3.42c1.62-2.82,5.28-4.2,8.34-4.2,7.5,0,10.86,5.34,10.86,11.88V94.54H95.16V77.38c0-2.94-1.56-5.16-4.86-5.16-3,0-4.92,2.22-4.92,5.22Z\"/><path d=\"M8.94,129.32l7-1.08c1.62-.24,2.16-1,2.16-2,0-1.74-1.5-3.24-4.38-3.24a4.8,4.8,0,0,0-5.1,4.38L.72,125.72c.36-4.26,4.32-9.9,13.08-9.9,9.66,0,13.2,5.4,13.2,11.52v14.58a29.31,29.31,0,0,0,.36,4.62H19.14a14.62,14.62,0,0,1-.3-3.36c-1.56,2.52-4.44,4.2-8.4,4.2-6.54,0-10.32-4.32-10.32-9.06C.12,133,4,130,8.94,129.32Zm9.18,5.52v-1.32l-5.64.9c-1.92.3-3.36,1.2-3.36,3.3,0,1.56,1,3.06,3.54,3.06C15.36,140.78,18.12,139.46,18.12,134.84Z\"/><path d=\"M45.12,116.72h5.82v8H45.12v11.16c0,2.46,1.32,3.12,3.3,3.12a11.24,11.24,0,0,0,2.4-.3v7.56a10.86,10.86,0,0,1-4.74.84c-6.18,0-10-3.66-10-9.6V124.7H30.84v-8h1.5c3.12,0,4.62-2.1,4.62-4.86V108h8.16Z\"/><path d=\"M86.46,131.6a15.42,15.42,0,0,1-15.84,15.84,15.81,15.81,0,1,1,0-31.62C79.56,115.82,86.46,122.36,86.46,131.6Zm-9.12,0c0-5-3.24-7.38-6.72-7.38s-6.72,2.34-6.72,7.38S67.2,139,70.62,139,77.34,136.64,77.34,131.6Z\"/><path d=\"M110.4,125.72a12.36,12.36,0,0,0-2.88-.3c-3.66,0-7,2.16-7,8.1v13H91.44V116.72h8.82v4c1.56-3.36,5.34-4.32,7.74-4.32a9,9,0,0,1,2.4.3Z\"/></g></g></svg>\n";

var bunny = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" x=\"0px\" y=\"0px\" viewBox=\"0 0 100 100\" style=\"enable-background:new 0 0 100 100;\" xml:space=\"preserve\">\n    <g>\n        <path d=\"M95.295,51.558c-2.091-4.181-11.101-14.188-15.282-16.877c-0.426-0.274-0.872-0.506-1.326-0.705   c0.778-2.507,1.326-5.43,1.326-8.705c0-11.352-6.572-15.981-6.572-15.981s-6.423,4.928-6.423,16.13   c0,2.979,0.457,5.669,1.124,8.019c-0.736,0.152-1.417,0.354-2.038,0.605c-0.606-2.938-1.751-6.285-3.844-9.643   c-6.006-9.633-14.032-10.086-14.032-10.086s-2.842,7.581,3.084,17.086c2.657,4.262,5.979,7.15,8.837,9.042   c-0.291,0.78-0.504,1.551-0.657,2.268c-5.418-4.074-12.435-6.539-20.104-6.539c-13.007,0-24.141,7.075-28.77,17.109   c-0.641-0.429-1.411-0.68-2.24-0.68c-2.227,0-4.033,1.972-4.033,4.198S6.15,61,8.377,61c0.01,0,0.02,0,0.03,0   c-0.178,1-0.321,1.281-0.415,2.061c0,0-3.291,27.939,8.209,27.939c8.861,0,24.193,0,30.765,0c-0.048-5-8.092-6.541-14.04-6.477   C40.527,81.486,45.9,74.098,45.9,65.413c0-10.853-8.391-19.724-19.039-20.527c0.525-0.041,1.054-0.058,1.589-0.058   c11.383,0,20.611,9.232,20.611,20.616c0,8.684-4.799,15.293-12.399,18.328c5.312-0.057,11.958,1.442,13.349,5.709   c5.507-1.774,10.288-4.957,13.837-8.965L72.993,91h11.948c1.344-7-8.514-6.056-8.514-6.056l-1.045-5.64   c9.856-6.423,7.02-18.057,7.02-18.057C90.02,61.248,97.386,55.741,95.295,51.558z M83.497,50.314c-1.08,0-1.956-0.876-1.956-1.958   s0.876-1.958,1.956-1.958c1.082,0,1.958,0.876,1.958,1.958S84.579,50.314,83.497,50.314z\"></path>\n    </g>\n</svg>\n";

var n64 = "\n<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" x=\"0px\" y=\"0px\" viewBox=\"0 0 100 125\" style=\"enable-background:new 0 0 100 100;\" xml:space=\"preserve\"><path d=\"M83.857193,39.195076c0.119339-0.7263832,0.1864395-1.4640656,0.1864395-2.2097511  c0-6.3632641-4.4094696-11.7132759-10.3327179-13.1621952V23.501936c0-1.1870632-0.9658051-2.1528721-2.1530762-2.1528721  h-6.3507843c0.0462646-1.0278625-0.5610275-1.9782677-1.5368614-2.3499298  c-12.178215-4.6422396-22.0567398-1.530735-25.7380905,0.0217361c-0.9263344,0.3909626-1.5008736,1.3327026-1.4519958,2.3281937  h-6.4528732c-1.1872692,0-2.1530781,0.9658089-2.1530781,2.1528721v0.0520592  c-6.6347847,0.8738422-11.7738457,6.5618362-11.7738457,13.4313297c0,0.6857834,0.058466,1.3679237,0.1611214,2.0422211  C12.401886,50.3099518,14.3364,61.1712265,16.6408329,68.2988663c0.6069641,1.8778915,2.2738552,3.1037064,4.2464848,3.1229858  c0.015789,0,0.0313721,0,0.0473671,0c1.9517136,0,3.6200409-1.1880875,4.2585812-3.0380936L31.21768,50.9309883l4.0505543,0.9593735  c2.5941505,0.6139374,4.602047,2.700985,5.1155052,5.3170776L45.0721169,81.09552  c0.6389503,3.2546387,3.3194313,4.7019119,5.7140617,4.7019119c0.0200958,0,0.0401917,0,0.0602875-0.0004044  c2.4093933-0.0246124,5.0993042-1.5235596,5.6767426-4.8175659l4.1486702-23.661705  c0.4703979-2.6845779,2.4881363-4.8249435,5.140316-5.4528198l3.1024323-0.7348137l5.9556656,17.2536354  c0.6385422,1.8500061,2.3068695,3.0380936,4.2585831,3.0380936c0.0159988,0,0.0315781,0,0.0475769,0  c1.9726257-0.0192795,3.6393127-1.2450943,4.2466888-3.1229858C85.7157593,61.2065735,87.6401749,50.4169159,83.857193,39.195076z   M72.031105,23.501936v0.0216331c-0.5055389-0.0574398-1.0185089-0.0899162-1.5391464-0.0899162h-5.5189743l0.0483932-0.4047775  h6.5364609C71.8186646,23.0288754,72.031105,23.241106,72.031105,23.501936z M30.0272331,23.0288754h6.6399879l0.0483932,0.4047775  h-7.063633c-0.0283737,0-0.0562859,0.0019741-0.0846348,0.0021534  C29.600872,23.2075806,29.7896519,23.0288754,30.0272331,23.0288754z M23.6053219,67.8358459  c-0.4902878,1.4202118-1.7103653,1.9205475-2.701601,1.9061966c-0.9848785-0.0094376-2.2022896-0.5294571-2.6646881-1.9599152  c-2.0539074-6.3530693-3.8035402-15.7688065-1.1470013-25.7069244c0.2067719,0.5111504,0.4433289,1.0105095,0.7120781,1.4932098  c1.9744759,3.5466309,5.6543922,6.0417404,9.8434601,6.6749496l1.3504925,0.2042351  c0.1912899,0.0289116,0.3806591,0.0723839,0.5712051,0.1106262L23.6053219,67.8358459z M65.4250565,50.2302399  c-3.3059006,0.7828979-5.8211021,3.4510727-6.4075623,6.7971611L54.868824,80.6891022  c-0.4392281,2.5045471-2.4504089,3.412117-4.0395851,3.4281082c-0.0143509,0.000412-0.0291176,0.000412-0.0434685,0.000412  c-1.5826149,0-3.5798531-0.8735352-4.0650101-3.3456726L42.031971,56.8842735  c-0.6397705-3.2611961-3.1428757-5.8629341-6.3765945-6.6286087l-5.2900085-1.2528877  c-0.3668423-0.0869408-0.7422981-0.1595306-1.1161137-0.2161255l-1.3506966-0.2042351  c-3.6784821-0.5561104-6.9033813-2.7358437-8.6266632-5.8309441c-0.9758568-1.7530136-1.4917755-3.7467651-1.4917755-5.7661476  c0-6.5461731,5.3256874-11.8718605,11.8718624-11.8718605h7.2644844l0.8891182,7.4359093  c0.0510597,0.4267197,0.4135971,0.7402458,0.8329315,0.7402458c0.0332184,0,0.0668488-0.0018425,0.1006813-0.0059433  c0.460556-0.0551605,0.789463-0.4730644,0.7343025-0.9336166l-1.3195267-11.0356503  c-0.0383453-0.3211155,0.1349258-0.6209049,0.4310265-0.7457848c2.7268181-1.1503582,12.5501823-4.5497589,24.4872551,0.000206  c0.3108635,0.1183167,0.5003319,0.4306145,0.4605522,0.7597275l-1.3115311,10.9698277  c-0.0549545,0.4605522,0.2739525,0.8784561,0.7345047,0.9336166c0.4539948,0.0545425,0.8784561-0.2733383,0.9338226-0.7343025  l0.8826065-7.3842354h5.7197495c6.5461807,0,11.8718643,5.3256874,11.8718643,11.8718605  c0,2.3218384-0.6701202,4.5704727-1.937355,6.5029106c-1.6564331,2.5244331-4.3984299,4.3522911-7.523468,5.0150299  l-1.7753677,0.3764801L65.4250565,50.2302399z M81.8245316,67.7821274  c-0.4621964,1.4304581-1.6798096,1.9504776-2.6644821,1.9599152c-0.9891891,0.0139389-2.211319-0.4859848-2.7018051-1.9061966  l-5.9008408-17.0947914l0.9376907-0.2220993l1.7560883-0.3723793c3.5552444-0.7537842,6.6823349-2.8449326,8.5794983-5.736824  c0.4636841-0.7069016,0.8491821-1.4538651,1.1701508-2.225563C85.6154099,52.0818062,83.8709259,61.4519234,81.8245316,67.7821274z   M50.5950661,45.773983c-4.5079269,0-8.1751289,3.667202-8.1751289,8.1751328s3.667202,8.1755409,8.1751289,8.1755409  s8.1751328-3.667614,8.1751328-8.1755409S55.1029968,45.773983,50.5950661,45.773983z M50.5950661,60.4448471  c-3.5814896,0-6.4953194-2.9138298-6.4953194-6.4957314c0-3.5814896,2.9138298-6.4953232,6.4953194-6.4953232  c3.5814934,0,6.4953232,2.9138336,6.4953232,6.4953232C57.0903893,57.5310173,54.1765594,60.4448471,50.5950661,60.4448471z   M53.4691162,49.9571037l-2.1128845-0.8677902c-0.5007439-0.2058754-1.0523415-0.2038269-1.551857,0.004509l-2.1083755,0.8809166  c-0.4999237,0.209156-0.888298,0.5999908-1.0933533,1.1007347l-0.867382,2.1128883  c-0.2058754,0.5007439-0.2042351,1.0519295,0.0045128,1.551857l0.8809166,2.1079636  c0.208744,0.4991035,0.5995789,0.8874779,1.1003227,1.0933533l2.1141167,0.8682022  c0.2485275,0.1017075,0.5093575,0.1525612,0.7697792,0.1525612c0.2649307,0,0.5294495-0.052494,0.7812576-0.1574821  l2.1079636-0.8809166c0.4995155-0.209156,0.8878899-0.5999908,1.0937653-1.1007347l0.8669739-2.1128883  c0.2062836-0.501152,0.2046432-1.0523415-0.0041046-1.5518532l-0.8809128-2.1075554  C54.3639793,50.5579147,53.9624786,50.1592903,53.4691162,49.9571037z M53.9009628,54.0717392l-0.8669701,2.1132965  c-0.0356827,0.0861206-0.1021194,0.1529694-0.1878319,0.1886482l-2.1079636,0.8809166  c-0.0853043,0.0356789-0.1796303,0.0360909-0.2657509,0.0012321l-2.1128883-0.867794  c-0.0844841-0.0348587-0.1533813-0.1033478-0.188652-0.1878281l-0.8809166-2.1079674  c-0.0352669-0.0840721-0.0356789-0.1808586-0.0008202-0.2653427l0.867794-2.1137047v-0.000412  c0.0344505-0.0844803,0.1025276-0.1529694,0.1870117-0.1878281l2.1083755-0.8809166  c0.0426483-0.0180435,0.0881729-0.0270691,0.1336937-0.0270691c0.0447044,0,0.0898132,0.0086136,0.1316452,0.0258369  l2.1137085,0.868206c0.0844803,0.0344467,0.1529694,0.1029358,0.1882401,0.1874199l0.8809166,2.1079636  C53.9358215,53.8904686,53.9362335,53.9868469,53.9009628,54.0717392z M51.3881683,53.9492188  c0,0.4379692-0.3550262,0.7929993-0.7929993,0.7929993c-0.4379692,0-0.7930222-0.3550301-0.7930222-0.7929993  c0-0.437973,0.3550529-0.7929993,0.7930222-0.7929993C51.0331421,53.1562195,51.3881683,53.5112457,51.3881683,53.9492188z   M57.3606529,23.4244251H44.0095215c-1.3869934,0-2.5156136,1.128624-2.5156136,2.5160255  c0,1.3871975,1.1286201,2.5158195,2.5156136,2.5158195h13.3511314c1.3869896,0,2.5156136-1.1286221,2.5156136-2.5160255  C59.8762665,24.5530491,58.7476425,23.4244251,57.3606529,23.4244251z M57.3606529,26.7764587H44.0095215  c-0.4609642,0-0.835804-0.3750439-0.835804-0.8362141c0-0.4609623,0.3748398-0.8360081,0.835804-0.8360081h13.3511314  c0.4609604,0,0.835804,0.3750458,0.835804,0.8362141C58.1964569,26.4014149,57.8216133,26.7764587,57.3606529,26.7764587z   M53.8993225,39.817955c0-1.8219109-1.4821358-3.3042564-3.3042564-3.3042564c-1.8221169,0-3.3042526,1.4823456-3.3042526,3.3042564  c0,1.8219147,1.4821358,3.3042564,3.3042526,3.3042564C52.4171867,43.1222115,53.8993225,41.6398697,53.8993225,39.817955z   M48.970623,39.817955c0-0.8956795,0.7287636-1.6244431,1.6244431-1.6244431c0.8956833,0,1.6244469,0.7287636,1.6244469,1.6244431  s-0.7287636,1.6244469-1.6244469,1.6244469C49.6993866,41.4424019,48.970623,40.7136345,48.970623,39.817955z   M33.2035332,34.9196014H31.609848v-1.5938911c0-0.5819473-0.4732685-1.0552139-1.0552139-1.0552139h-3.0661869  c-0.5819454,0-1.0552139,0.4732666-1.0552139,1.0552139v1.5938911h-1.5936871c-0.5819454,0-1.055212,0.4732666-1.055212,1.0552139  v3.0659828c0,0.5819473,0.4732666,1.0552139,1.055212,1.0552139h1.5936871v1.5936852  c0,0.5819473,0.4732685,1.0554199,1.0552139,1.0554199h3.0661869c0.5819454,0,1.0552139-0.4734726,1.0552139-1.0554199v-1.5936852  h1.5936852c0.5819473,0,1.0552139-0.4732666,1.0552139-1.0552139v-3.0659828  C34.2587471,35.392868,33.7854805,34.9196014,33.2035332,34.9196014z M32.5789375,38.4161987h-1.5936871  c-0.5819473,0-1.0552139,0.4732704-1.0552139,1.0552139v1.5938911h-1.8169918v-1.5938911  c0-0.5819435-0.4732666-1.0552139-1.0552139-1.0552139h-1.5936871v-1.8167839h1.5936871  c0.5819473,0,1.0552139-0.4734726,1.0552139-1.0554199v-1.5936852h1.8169918v1.5936852  c0,0.5819473,0.4732666,1.0554199,1.0552139,1.0554199h1.5936871V38.4161987z M29.0214386,28.8011723  c-4.8009529,0-8.7066345,3.9056835-8.7066345,8.7066364s3.9056816,8.7066307,8.7066345,8.7066307  s8.7066345-3.9056816,8.7066345-8.7066307S33.8223915,28.8011723,29.0214386,28.8011723z M29.0214386,44.5346298  c-3.8745136,0-7.026825-3.1523094-7.026825-7.0268211s3.1523113-7.026825,7.026825-7.026825s7.026825,3.1523094,7.026825,7.026825  S32.8959503,44.5346298,29.0214386,44.5346298z M72.9563141,44.0757179c1.5092545,0,2.7401199-1.1999054,2.796875-2.6953201  c0.6015244-0.3824272,1.1245422-0.887043,1.5273514-1.4751129c1.4697266-0.0846901,2.6402588-1.3036385,2.6402588-2.7940559  c0-1.4195671-1.0619812-2.593071-2.4328461-2.7748299c-0.430542-0.7426834-1.0380707-1.3719444-1.7672424-1.8262444  c-0.2116928-1.3368301-1.3687668-2.3632069-2.7643967-2.3632069c-1.3957062,0-2.5528564,1.0265064-2.7644501,2.3634624  c-0.7288437,0.4542503-1.3370056,1.0834846-1.7675705,1.8260422c-1.3707199,0.1819344-2.4324646,1.3553352-2.4324646,2.7747765  c0,1.4904175,1.1705246,2.7093925,2.6402588,2.7940788c0.4028854,0.5880737,0.9259491,1.0926895,1.5273514,1.475193  C70.2162399,42.8758659,71.4470825,44.0757179,72.9563141,44.0757179z M70.3924866,39.4095879  c0.7263565-0.5068703,1.2034912-1.3474159,1.2034912-2.2983589c0-1.0238876-0.5537491-1.9186707-1.3757095-2.4075737  c0.0997849-0.1209564,0.2052078-0.2351723,0.319931-0.3420334c0.4870605,0.8296547,1.3863525,1.3894806,2.4161148,1.3894806  c1.0297852,0,1.9290771-0.5598259,2.4161377-1.3895073c0.1147232,0.1068611,0.220253,0.2210007,0.3200607,0.3419571  c-0.8220596,0.4888763-1.3758621,1.383709-1.3758621,2.4076767c0,0.9509697,0.4771576,1.7915421,1.2035446,2.2984123  c-0.0865326,0.0903244-0.1778641,0.174118-0.2732391,0.2550125c-0.5075836-0.7204628-1.3442383-1.1932945-2.2906418-1.1932945  c-0.9463577,0-1.7829285,0.4727821-2.2905426,1.1931648C70.5703964,39.5836296,70.4790192,39.4998894,70.3924866,39.4095879z   M72.9563141,42.3959084c-0.6188583,0-1.1224747-0.5034103-1.1224747-1.1222687  c0-0.6188545,0.5036163-1.1224709,1.1224747-1.1224709s1.122467,0.5036163,1.122467,1.1224709  C74.0787811,41.892498,73.5751724,42.3959084,72.9563141,42.3959084z M78.2409897,37.1112289  c0,0.6188583-0.5036163,1.1224709-1.122467,1.1224709c-0.6188583,0-1.1220627-0.5036125-1.1220627-1.1224709  c0-0.6188545,0.5032043-1.1222649,1.1220627-1.1222649C77.7373734,35.9889641,78.2409897,36.4923744,78.2409897,37.1112289z   M72.9563141,31.8267593c0.6188583,0,1.122467,0.5034103,1.122467,1.1222649s-0.5036087,1.1222649-1.122467,1.1222649  s-1.1224747-0.5034103-1.1224747-1.1222649S72.3374557,31.8267593,72.9563141,31.8267593z M67.6716385,37.1112289  c0-0.6188545,0.5036163-1.1222649,1.122467-1.1222649c0.6188583,0,1.1220627,0.5034103,1.1220627,1.1222649  c0,0.6188583-0.5032043,1.1224709-1.1220627,1.1224709C68.1752548,38.2336998,67.6716385,37.7300873,67.6716385,37.1112289z\"/>\n<!-- <text x=\"0\" y=\"115\" fill=\"#000000\" font-size=\"5px\" font-weight=\"bold\" font-family=\"'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif\">Created by Ozza Okuonghae</text><text x=\"0\" y=\"120\" fill=\"#000000\" font-size=\"5px\" font-weight=\"bold\" font-family=\"'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif\">from the Noun Project</text> -->\n</svg>\n";

var sotomayor = "<svg xmlns=\"http://www.w3.org/2000/svg\" data-name=\"Sonia Sotomayor\" viewBox=\"0 0 100 125\" x=\"0px\" y=\"0px\"><title>Sonia Sotomayor</title><path d=\"M98.89363,98.97135c-.05269-1.1917-.15854-2.89816-.393-4.9385a55.44131,55.44131,0,0,0-2.78282-12.99816,36.21179,36.21179,0,0,0-4.4975-9.55539c-2.48822-3.56585-5.15377-5.73687-8.29638-8.29644a68.60952,68.60952,0,0,0-7.487-5.26113,88.84405,88.84405,0,0,0-9.7129-5.26113q-11.33166,11.534-22.66339,23.06807a53.424,53.424,0,0,0-2.02348-9.71284c-.48256-1.56871.59464-4.81017.04846-6.15617-1.792-.96869-1.34323-1.26251-2.41868-1.869a106.96844,106.96844,0,0,0-9.97324,4.38283C24.7175,64.432,24.898,64.205,22.42081,65.61115c-2.27724,1.29254-3.91011,2.38738-4.53224,2.81086a47.35478,47.35478,0,0,0-4.58668,3.468,23.47077,23.47077,0,0,0-3.468,3.468,22.22482,22.22482,0,0,0-1.79,2.68488,36.84011,36.84011,0,0,0-3.70288,8.91477,40.67047,40.67047,0,0,0-1.04252,6.25508c-.345,2.99133-.35768,4.791-.09021,5.75868,6.47283.01438,21.24361.02314,37.47471.02574a49.069,49.069,0,0,1-.02145-6.298,77.585,77.585,0,0,1,1.46986-9.84872c.36928-1.97593.76369-3.948,1.1726-5.86109a.56794.56794,0,0,1,.24747-.36058.57378.57378,0,0,1,.43211-.0783.57134.57134,0,0,1,.43695.67766c-.40746,1.91116-.79994,3.87163-1.16487,5.82822a75.77058,75.77058,0,0,0-1.45391,9.71435,48.1397,48.1397,0,0,0,.02513,6.2178l.0006.00888C64.42178,99.00059,89.51624,98.99219,98.89363,98.97135ZM16.935,76.86067c-.23829.64962-.50268,1.29634-.78641,1.92373a25.84619,25.84619,0,0,1-1.22867,2.37808c-.17159.30064-.34076.59839-.49688.9029-.19624.40215-.35236.75112-.449.97443A34.15468,34.15468,0,0,0,12.25181,90.03a.56825.56825,0,0,1-.56358.47852.58755.58755,0,0,1-.09135-.00773.56934.56934,0,0,1-.47175-.65639,35.18938,35.18938,0,0,1,1.801-7.2599c.14742-.33931.31418-.70182.46982-1.01987.17981-.35091.35719-.66219.52878-.96186a25.18831,25.18831,0,0,0,1.18324-2.28914c.27406-.60709.5283-1.22867.755-1.84639a.57667.57667,0,0,1,.73179-.33931h.00048a.56933.56933,0,0,1,.33979.73276Zm3.86051,5.54208-.13582-.0087.10875.059c-.04833.08894-.09087.16724-.12567.233a20.5,20.5,0,0,0-1.94645,9.24937.57157.57157,0,0,1-.9812.38861.56708.56708,0,0,1-.16144-.407,21.61559,21.61559,0,0,1,2.08082-9.76848c.04205-.07927.09522-.17691.15757-.291.4007-.73662,1.1465-2.10837,1.987-4.06593.465-1.0827.89178-2.19344,1.26927-3.29934a.57078.57078,0,0,1,1.05322-.06767.56257.56257,0,0,1,.028.436c-.38861,1.1378-.826,2.27561-1.30118,3.38151C21.96519,80.25378,21.17492,81.70576,20.79549,82.40275Zm7.53058-1.801-.07009.10247-.0029.00387-.05123.07444a14.884,14.884,0,0,0-.97636,1.58635,19.02676,19.02676,0,0,0-1.6603,5.13317l-.09377.40215a36.01456,36.01456,0,0,0-.8884,6.34734.57067.57067,0,0,1-.57035.54328.58492.58492,0,0,1-.4239-.18851.5661.5661,0,0,1-.14694-.41181,37.09608,37.09608,0,0,1,.9174-6.54841l.0928-.40118a20.11485,20.11485,0,0,1,1.76374-5.41061A16.33821,16.33821,0,0,1,27.311,80.06141a12.81831,12.81831,0,0,0,1.21321-2.0697,15.65489,15.65489,0,0,0,1.22771-3.93156.56984.56984,0,0,1,.65784-.465.57575.57575,0,0,1,.3717.23394.56577.56577,0,0,1,.0957.42728,16.795,16.795,0,0,1-1.31761,4.2177A13.43781,13.43781,0,0,1,28.32606,80.60179Zm9.13481-5.22307a27.95907,27.95907,0,0,1-2.18715,6.46238c-.44758.92706-.80429,1.537-1.11944,2.0755-.25714.43888-.492.842-.73179,1.334a16.36087,16.36087,0,0,0-1.40461,8.28364.574.574,0,0,1-.53313.60709l-.03287.001a.57288.57288,0,0,1-.57374-.53555,17.481,17.481,0,0,1,1.51675-8.85592c.26294-.53942.50945-.9609.77094-1.40751.30886-.52782.65687-1.1233,1.07835-1.99913a26.76438,26.76438,0,0,0,2.09773-6.19653.57128.57128,0,0,1,1.119.231Zm2.04263-3.04123c-1.34129-.0638-2.69032-.18657-4.01566-.36638a52.92816,52.92816,0,0,1-7.92209-1.55832c-.16531-.02707-4.31-.71826-6.91721.0725-.23636.0725-.46692.16047-.47562.16337l-1.26637.53072a.55222.55222,0,0,1-.43646.001.57052.57052,0,0,1-.00387-1.05467l1.27991-.53652c.074-.028.31369-.1189.57035-.19624,2.95278-.9,7.30485-.1305,7.48853-.09667a52.61712,52.61712,0,0,0,7.83557,1.54285c1.28668.174,2.59558.29388,3.89.35671a.57115.57115,0,0,1-.02707,1.14167ZM59.21593,74.7001a19.791,19.791,0,0,0-1.76036,4.11717,87.30357,87.30357,0,0,0-2.45541,10.48384.57593.57593,0,0,1-.56262.46885.64382.64382,0,0,1-.10344-.00967.572.572,0,0,1-.45725-.669,88.49139,88.49139,0,0,1,2.49118-10.625,20.94919,20.94919,0,0,1,1.86476-4.34917.56623.56623,0,0,1,.35284-.262.55142.55142,0,0,1,.43018.06284A.57156.57156,0,0,1,59.21593,74.7001ZM67.18249,73.28a62.24079,62.24079,0,0,0-6.008,20.36059.57231.57231,0,0,1-.56745.50462.50968.50968,0,0,1-.06574-.00387.56087.56087,0,0,1-.38281-.21267.57208.57208,0,0,1-.1189-.42051,63.42154,63.42154,0,0,1,6.11823-20.73374.57142.57142,0,0,1,.76369-.26.57348.57348,0,0,1,.261.76562Zm7.11586-.78883-.01353.03a49.02159,49.02159,0,0,0-3.62415,10.99812c-.22137.90483-.41278,1.66272-.57712,2.31137-.25424,1.00343-.45435,1.79516-.58,2.42835a55.92529,55.92529,0,0,0-.9783,7.60985.57176.57176,0,0,1-.57035.53748l-.03093-.001a.57.57,0,0,1-.53942-.60322,57.18048,57.18048,0,0,1,.99763-7.76645c.12954-.65155.32384-1.41718.59162-2.47571l.04157-.16531c.15757-.62449.33448-1.32438.53555-2.14607a50.02111,50.02111,0,0,1,3.71792-11.25333.57834.57834,0,0,1,.33641-.28228.57112.57112,0,0,1,.69312.77819Zm6.84422,1.86186a54.8414,54.8414,0,0,0-2.23791,6.26614A45.38975,45.38975,0,0,0,77.33959,87.881,43.06217,43.06217,0,0,0,77.00511,94.24a.57146.57146,0,1,1-1.14264.02513,44.21155,44.21155,0,0,1,.34414-6.52908,46.37185,46.37185,0,0,1,1.60085-7.43487,56.04461,56.04461,0,0,1,2.28334-6.39567.57455.57455,0,0,1,.31514-.30741.57184.57184,0,0,1,.73662.755Zm3.425,11.17986a50.57907,50.57907,0,0,1,1.60085-11.321.56665.56665,0,0,1,.26294-.348.56043.56043,0,0,1,.434-.06187.57159.57159,0,0,1,.40891.698A49.23338,49.23338,0,0,0,86.269,94.39077a.573.573,0,0,1-.47755.65252.65917.65917,0,0,1-.087.00677.56938.56938,0,0,1-.56552-.48528A50.65834,50.65834,0,0,1,84.56759,85.53292ZM51.70324,71.49646a.56669.56669,0,0,1,.03287-.80816.57622.57622,0,0,1,.3862-.15274h.02223a63.82715,63.82715,0,0,0,6.94379-.1479,38.3598,38.3598,0,0,0,4.0988-.50655c.97733-.16531,1.9769-.33448,3.73049-.50462a44.11244,44.11244,0,0,1,12.00349.14984,37.13492,37.13492,0,0,1,4.992,1.17454.57086.57086,0,1,1-.33834,1.09044,36.1801,36.1801,0,0,0-4.83832-1.13877,43.43861,43.43861,0,0,0-11.70381-.14017c-1.71686.16821-2.69515.33351-3.64155.493a39.32759,39.32759,0,0,1-4.21674.522,65.27518,65.27518,0,0,1-7.07236.1508A.56247.56247,0,0,1,51.70324,71.49646Z\"/><path d=\"M46.56618,52.61673a8.12132,8.12132,0,0,1-4.44924-1.30617.22373.22373,0,0,1,.24253-.376,7.72088,7.72088,0,0,0,2.06763.94,8.011,8.011,0,0,0,2.63638.28175,10.20692,10.20692,0,0,0,1.70514-.23729,15.045,15.045,0,0,0,2.19261-.61966.2238.2238,0,0,1,.15426.42017,15.49488,15.49488,0,0,1-2.25685.63779,10.71626,10.71626,0,0,1-1.77506.246C46.95642,52.609,46.78118,52.61673,46.56618,52.61673Z\"/><path d=\"M46.76029,49.81042a1.36641,1.36641,0,0,1-.17633-.01169,1.34644,1.34644,0,0,1-.68-.29071,1.451,1.451,0,0,0-.60218-.28142,4.82708,4.82708,0,0,0-1.42809.09483c-.43808.0543-.74769.09942-1.06648.14585-.1796.02622-.362.05277-.5718.08172-.50014.06894-1.0088.13055-1.51178.18332a.22114.22114,0,0,1-.24581-.19927.22366.22366,0,0,1,.19905-.24581c.49817-.05222,1.002-.11329,1.49735-.18157.20845-.02873.39-.05517.56853-.08117.32163-.04687.63386-.09231,1.07588-.147a5.011,5.011,0,0,1,1.58082-.08762,1.89745,1.89745,0,0,1,.76408.35385.89221.89221,0,0,0,1.13421.02775,2.2612,2.2612,0,0,1,.92774-.33867,2.59954,2.59954,0,0,1,1.23079.159,6.2716,6.2716,0,0,0,1.023.24712,6.69776,6.69776,0,0,0,1.9326-.00033.22149.22149,0,0,1,.2528.19031.22375.22375,0,0,1-.19031.2528,7.14823,7.14823,0,0,1-2.06151-.00033,6.72688,6.72688,0,0,1-1.09008-.26252,2.15622,2.15622,0,0,0-1.042-.142,1.82625,1.82625,0,0,0-.75862.28186A1.42283,1.42283,0,0,1,46.76029,49.81042Z\"/><path d=\"M38.13012,50.611a.22374.22374,0,0,1-.18813-.10215,3.06521,3.06521,0,0,1,.99831-4.29542.22373.22373,0,1,1,.22986.3839,2.61711,2.61711,0,0,0-.85235,3.66833.22389.22389,0,0,1-.18769.34533Z\"/><path d=\"M56.36932,50.08627a.22376.22376,0,0,1-.19621-.3308,2.98535,2.98535,0,0,0,.2445-2.24494,2.821,2.821,0,0,0-.84077-1.27318.22369.22369,0,1,1,.2941-.33714,3.26777,3.26777,0,0,1,.97362,1.47638,3.38664,3.38664,0,0,1-.27858,2.593A.22361.22361,0,0,1,56.36932,50.08627Z\"/><path d=\"M65.10829,42.69149a.22361.22361,0,0,1-.17392-.36412,1.69577,1.69577,0,0,0,.37516-1.04146,1.71562,1.71562,0,0,0-.45884-1.16688.22376.22376,0,0,1,.32687-.30568,2.16991,2.16991,0,0,1,.57945,1.47638,2.147,2.147,0,0,1-.47436,1.31841A.223.223,0,0,1,65.10829,42.69149Z\"/><path d=\"M31.0657,42.26553a.22385.22385,0,0,1-.18266-.09417,3.49871,3.49871,0,0,1-.47807-3.10691.22384.22384,0,0,1,.42607.13743,3.04961,3.04961,0,0,0,.41689,2.71034.22383.22383,0,0,1-.18223.35331Z\"/><path d=\"M50.86474,45.14739a.22374.22374,0,0,1-.1193-.41318,1.28409,1.28409,0,0,0,.41842-.41755,1.51425,1.51425,0,0,0,.16453-.97362,3.5483,3.5483,0,0,0-1.44666-2.12925.22383.22383,0,0,1,.26569-.3603A3.91248,3.91248,0,0,1,51.7739,43.301a1.93359,1.93359,0,0,1-.22811,1.24892,1.72943,1.72943,0,0,1-.56219.56317A.22246.22246,0,0,1,50.86474,45.14739Z\"/><path d=\"M42.40107,45.07026a.22252.22252,0,0,1-.14923-.057,2.21837,2.21837,0,0,1-.5528-.75687,2.23978,2.23978,0,0,1,.45513-2.47556.22373.22373,0,1,1,.32032.31245,1.793,1.793,0,0,0-.36642,1.98176,1.77572,1.77572,0,0,0,.44224.6048.22374.22374,0,0,1-.14923.39045Z\"/><path d=\"M40.49649,32.83748a3.58979,3.58979,0,0,0-1.4715-.31526,3.44963,3.44963,0,0,0-1.92113.65518c-.51235.35176-.99842.8716-.91667.99147.0774.11347.5883-.24379,1.40135-.4555a5.65173,5.65173,0,0,1,1.041-.13951,1.20708,1.20708,0,0,0-.24077.69494,1.23913,1.23913,0,0,0,2.47825,0,1.20948,1.20948,0,0,0-.07595-.37611c1.13376.42831,1.67172,1.11919,1.77244,1.01189C42.69627,34.76315,41.87778,33.44312,40.49649,32.83748Z\"/><path d=\"M57.11324,33.188a3.18026,3.18026,0,0,0-1.91485-.59271,3.48051,3.48051,0,0,0-1.50454.41036,2.78753,2.78753,0,0,0-.86622.59265c-.39731.41465-.64509.9673-.54709,1.04863.06664.05534.24578-.14724.74545-.41858.11292-.06132.22107-.11419.32318-.161a1.17121,1.17121,0,0,0-.03945.19539,1.2384,1.2384,0,1,0,2.4768,0,1.20362,1.20362,0,0,0-.19878-.63246,4.96779,4.96779,0,0,1,.97836.10477c.80913.1702,1.20094.46734,1.27659.36475C57.92467,33.98852,57.5549,33.51514,57.11324,33.188Z\"/><path d=\"M55.51672,29.37935a5.518,5.518,0,0,0-3.21305-.121,8.02553,8.02553,0,0,0-2.81772,1.13892.75193.75193,0,0,0-.343.56046.703.703,0,0,0-.00612.25393c.14874.93664,1.46043.43653,1.9294.126a14.71919,14.71919,0,0,1,1.35623-1.10233,4.55176,4.55176,0,0,1,1.631-.42464c.16685-.01521,1.625-.03558,1.48517-.25263a.69562.69562,0,0,0,.02914-.06727A.09528.09528,0,0,0,55.51672,29.37935Z\"/><path d=\"M42.08894,29.66317a13.09961,13.09961,0,0,0-2.42255-1.04857c-1.97874-.65859-3.9182-.77977-5.47491.602-.11974.10629.05282.267.176.20778a4.55313,4.55313,0,0,1,3.56825-.46291,5.70459,5.70459,0,0,1,1.52975.84323c.94293.66183,1.2253,1.16167,2.12235,1.47482a1.28679,1.28679,0,0,0,1.15305.02888.78927.78927,0,0,0,.3097-.74972C42.98438,30.18323,42.61017,29.94292,42.08894,29.66317Z\"/><path d=\"M79.03372,45.08355A10.79014,10.79014,0,0,0,78.011,41.94813a9.24752,9.24752,0,0,0-.70968-1.14c-.27424-.38728-.3459-.49948-.34547-.763a1.03194,1.03194,0,0,1,.264-.655,6.06257,6.06257,0,0,0,.50776-.90773,6.947,6.947,0,0,0,.41363-4.05016,10.00093,10.00093,0,0,0-1.09334-2.91284,18.096,18.096,0,0,0-.88562-1.5814l-.10791-.17739c-.47326-.78073-1.458-2.4049-2.21579-3.91374A33.60521,33.60521,0,0,1,72.07676,21.513c-.24361-.69657-.37949-1.13859-.52329-1.60653-.16694-.543-.35593-1.15859-.74442-2.27138-.49573-1.41935-.74442-2.13187-1.13527-3.025a21.81115,21.81115,0,0,0-2.2193-4.05173A18.39038,18.39038,0,0,0,63.54384,6.642a28.58689,28.58689,0,0,0-7.9172-4.32023,12.02677,12.02677,0,0,0-5.1954-.948,10.31694,10.31694,0,0,0-2.644.55,6.30179,6.30179,0,0,0-2.99078-.92175,7.37271,7.37271,0,0,0-3.29729.78955,26.30383,26.30383,0,0,0-4.48947,2.58326,29.591,29.591,0,0,0-4.29347,3.121A15.43311,15.43311,0,0,0,30.335,10.34846c-.07123.113-.11123.18343-.1737.294-.07625.13437-.18923.33375-.4558.77729q-.29753.49456-.59953.98664c-.3459.56624-.70376,1.1517-1.04464,1.73746a44.53874,44.53874,0,0,1-2.75152,4.12629c-.81191,1.11074-1.24148,1.605-1.69637,2.12831-.42891.49344-.87244,1.00361-1.64182,2.0442a18.981,18.981,0,0,0-3.13953,5.15673,14.46128,14.46128,0,0,0-.72672,5.36312c.09522,1.89763.239,4.76516,2.39052,6.90917A7.39939,7.39939,0,0,0,22.649,41.35512a15.50275,15.50275,0,0,0,.01662,3.60512,14.02946,14.02946,0,0,0,1.78773,5.50927,15.84483,15.84483,0,0,0,1.99992,2.62042,21.03362,21.03362,0,0,0,4.20955,3.8993,11.81516,11.81516,0,0,0,4.13765,2.02052,10.18884,10.18884,0,0,0,2.36412.27654,10.66372,10.66372,0,0,0,1.57711-.11836.55746.55746,0,0,0,.46456-.44939,11.27491,11.27491,0,0,0,1.96753,1.81679,11.89745,11.89745,0,0,0,5.25461,1.90113,15.1585,15.1585,0,0,0,2.13973.16452,10.62056,10.62056,0,0,0,4.49756-.94356,14.29051,14.29051,0,0,0,3.35281-2.29476c.26566-.24312.53924-.52389,1.08723-1.08663.8626-.88568,1.72719-1.81183,2.50393-2.68277.34173-.38324.64358-.72194.91782-1.03207a11.96254,11.96254,0,0,0,5.53483,2.89955,9.53775,9.53775,0,0,0,10.39756-3.58542,11.89621,11.89621,0,0,0,1.75522-3.21614,9.87008,9.87008,0,0,0,.6524-3.1376A10.23624,10.23624,0,0,0,79.03372,45.08355ZM66.48719,26.388A4.09889,4.09889,0,0,0,71.531,28.06925a.44727.44727,0,0,1,.58207.24826.44792.44792,0,0,1-.2482.58207,5.18077,5.18077,0,0,1-1.89.35852,4.92324,4.92324,0,0,1-1.632-.27672,5.02749,5.02749,0,0,1-2.62126-2.1297.44794.44794,0,0,1,.15074-.6144.44747.44747,0,0,1,.61482.15074ZM48.58956,6.38766a5.90759,5.90759,0,0,1,3.3893-.72255A6.98385,6.98385,0,0,1,56.091,7.895a20.42555,20.42555,0,0,1,2.59661,3.4632c.43785.65627.76279,1.1659,1.02385,1.57548a4.8912,4.8912,0,0,0,1.35247,1.68375,5.01222,5.01222,0,0,0,3.29209.74212.44746.44746,0,1,1,.0658.8925c-.20953.01535-.41671.02308-.6153.02308a5.60139,5.60139,0,0,1-3.25185-.92181,5.637,5.637,0,0,1-1.5898-1.92584c-.267-.419-.58908-.92416-1.02192-1.57239A19.67143,19.67143,0,0,0,55.477,8.54618a6.13806,6.13806,0,0,0-3.5873-1.99049,5.00628,5.00628,0,0,0-2.87538.6199.44756.44756,0,1,1-.42474-.78792ZM47.43,10.813V10.8129a.44853.44853,0,0,1,.62231.11558,33.43455,33.43455,0,0,0,7.35893,7.802,13.22494,13.22494,0,0,0,4.69574,2.53535,11.9398,11.9398,0,0,0,5.60878.14265.44754.44754,0,1,1,.18089.87661,13.55893,13.55893,0,0,1-2.73074.28415,12.5018,12.5018,0,0,1-3.29493-.44,14.052,14.052,0,0,1-4.99982-2.68519,34.33827,34.33827,0,0,1-7.55716-8.00927A.44856.44856,0,0,1,47.43,10.813ZM30.68988,15.1109v-.00012c.04175-.18573,1.06953-4.56155,5.011-5.70122a6.86048,6.86048,0,0,1,4.149.15624.44756.44756,0,1,1-.29388.8455,5.96445,5.96445,0,0,0-3.60693-.14217c-3.41969.98911-4.37691,4.99831-4.38609,5.03873a.4449.4449,0,0,1-.43634.34874.45292.45292,0,0,1-.0983-.01081A.44827.44827,0,0,1,30.68988,15.1109ZM22.60073,28.3131a.44744.44744,0,0,1,.21213-.86936,5.19725,5.19725,0,0,0,2.33621.0345,5.28434,5.28434,0,0,0,2.73708-1.60629,6.84633,6.84633,0,0,0,1.27949-2.41143l.05136-.13371a14.162,14.162,0,0,0,.79553-3.03634.4474.4474,0,1,1,.88537.12948,15.0502,15.0502,0,0,1-.84538,3.22817l-.05136.13346a7.60436,7.60436,0,0,1-1.45168,2.69135,6.09371,6.09371,0,0,1-3.20907,1.87938,5.97164,5.97164,0,0,1-1.27882.13745A6.12821,6.12821,0,0,1,22.60073,28.3131Zm2.405,4.44826a6.564,6.564,0,0,1-1.59916-.18941.44749.44749,0,0,1,.22506-.86622,5.56882,5.56882,0,0,0,4.61357-.89256A5.42707,5.42707,0,0,0,30.27559,27.359a.44743.44743,0,1,1,.88453.13558A6.332,6.332,0,0,1,28.787,31.52543,6.21153,6.21153,0,0,1,25.0057,32.76136ZM67.67714,51.42159a2.90462,2.90462,0,0,1-.85891.12839,3.52844,3.52844,0,0,1-2.48864-1.10584.5593.5593,0,1,1,.79795-.78393,2.27168,2.27168,0,0,0,2.21924.69252,2.47886,2.47886,0,0,0,1.415-2.38732,3.1788,3.1788,0,0,0-1.55034-2.55625,1.016,1.016,0,0,1-.34819.56207.862.862,0,0,1-.25.12428q-.08184.022-.16561.04193a1.80824,1.80824,0,0,1-.78351-.07033.5576.5576,0,0,0-.17564-.02507,9.98952,9.98952,0,0,0-.082-1.72471.55946.55946,0,0,0-1.1091.1479,8.1878,8.1878,0,0,1-.37429,3.86836,11.4321,11.4321,0,0,1-1.73746,2.92432,41.9835,41.9835,0,0,1-3.01483,3.59485c-.76212.85474-1.61511,1.76851-2.46985,2.64609-.52987.54407-.79577.81716-1.03763,1.03841a13.12326,13.12326,0,0,1-3.07053,2.10631,10.55526,10.55526,0,0,1-6.01957.68352,10.83628,10.83628,0,0,1-4.77217-1.718A18.26675,18.26675,0,0,1,38.844,56.639a27.028,27.028,0,0,1-3.27989-4.23263,22.03424,22.03424,0,0,1-1.628-3.25572,20.9332,20.9332,0,0,1-1.30837-5.16271.55932.55932,0,0,0-1.11043.13522c.05009.41151.11359.82042.18633,1.22728a1.72613,1.72613,0,0,1-1.336.17328c-.1215-.05111-.26191-.18174-.45586-.59059a2.80484,2.80484,0,0,0-.57084.71493,3.06448,3.06448,0,0,0-.13353,2.53656,2.52137,2.52137,0,0,0,1.74622,1.78585,2.19205,2.19205,0,0,0,1.59064-.455.55928.55928,0,1,1,.6695.89607,3.4535,3.4535,0,0,1-1.99357.69874,2.7833,2.7833,0,0,1-.44311-.0351,3.528,3.528,0,0,1-2.61625-2.49541,4.18592,4.18592,0,0,1,.20168-3.47431,4.02968,4.02968,0,0,1,1.12862-1.27187c-.09715-.29382-.20361-.63736-.32155-1.04289a13.52765,13.52765,0,0,1-.80314-3.85549,8.9763,8.9763,0,0,1,.302-2.24836,5.49153,5.49153,0,0,0,2.84916-.91722,6.05368,6.05368,0,0,0,2.22824-3.41794,12.01265,12.01265,0,0,0,.402-4.22961l-.00091-.68195c-.00085-2.53619-.00127-3.80915.07365-5.19014.24868-4.58112.99745-5.28808,1.31731-5.59005a2.6203,2.6203,0,0,1,1.89195-.818,2.7213,2.7213,0,0,1,1.94723,1.30287.6362.6362,0,0,0,1.0108.02175,3.88264,3.88264,0,0,1,2.71129-1.77232,4.11758,4.11758,0,0,1,2.757,1.1575c.992.74351,1.47331,1.40437,3.96111,5.43943.8316,1.34866,1.214,2.038,1.49319,2.54133a13.13739,13.13739,0,0,0,.83662,1.36389,22.2327,22.2327,0,0,0,3.65853,4.18079,9.32783,9.32783,0,0,0,5.34028,2.47064q.24542.016.48353.01577c.14549-.00006.288-.006.42915-.01438a7.959,7.959,0,0,0,1.83467,4.58148,7.57385,7.57385,0,0,0,1.6136,1.37247,9.83682,9.83682,0,0,0,1.01352.57742.55254.55254,0,0,0,.04423.12658,5.09329,5.09329,0,0,1,.52806,1.70145,3.65546,3.65546,0,0,1,.00224.84937,6.46167,6.46167,0,0,0-.00375,1.24686,6.719,6.719,0,0,0,.16234,1.0215c.01136.05009.02127.09449.03021.13709a4.44131,4.44131,0,0,1,2.59679,3.80051A3.53454,3.53454,0,0,1,67.67714,51.42159ZM70.19031,35.687a4.52877,4.52877,0,0,1-2.818-4.22217.44758.44758,0,0,1,.766-.31158.4443.4443,0,0,1,.12893.31732A3.57246,3.57246,0,0,0,74.3015,34.1235a.44743.44743,0,1,1,.61.6547,4.52265,4.52265,0,0,1-3.09325,1.219A4.38594,4.38594,0,0,1,70.19031,35.687ZM74.626,50.5767a4.14921,4.14921,0,0,1-1.83473,1.05872.44722.44722,0,0,1-.55343-.30735.44738.44738,0,0,1,.307-.55307,3.26868,3.26868,0,0,0,1.44576-.82822c1.07678-1.08681.97558-2.7595.9151-3.75894a7.822,7.822,0,0,0-1.05974-3.45891.44749.44749,0,1,1,.77523-.44722,8.7078,8.7078,0,0,1,1.17768,3.8512C75.86857,47.28207,75.98482,49.20525,74.626,50.5767Z\"/><path d=\"M46.74146,50.66135c-.03311,0-.06543-.00138-.09687-.00435a1.71041,1.71041,0,0,1-.31422-.069l-.11792-.03123c-.20787-.05466-.41633-.10695-.62479-.15924l-.31393-.07907a5.95592,5.95592,0,0,0-1.7175-.06454c-.51112.01947-1.02906.06553-1.54037.1368A.15179.15179,0,0,1,41.974,50.09c.5214-.07265,1.04942-.1196,1.56963-.13957a6.153,6.153,0,0,1,1.805.07364l.31294.07888c.20965.05258.41919.10517.62825.16022l.11841.03123a1.496,1.496,0,0,0,.2647.06029,2.40126,2.40126,0,0,0,.91548-.20372,4.24041,4.24041,0,0,1,1.24226-.09706c.67658-.01068,1.37945.01245,2.08875.06959a.15182.15182,0,0,1,.13917.16349.15365.15365,0,0,1-.16349.13917c-.69961-.05634-1.3923-.08016-2.058-.0686a4.92814,4.92814,0,0,0-1.12859.07235A2.98309,2.98309,0,0,1,46.74146,50.66135Z\"/><path d=\"M50.08224,45.21441a.35375.35375,0,0,0-.07369-.27451.56244.56244,0,0,0-.3051-.18306,1.49786,1.49786,0,0,0-.40681-.08136,1.59317,1.59317,0,0,0-.95623.19312,1.39671,1.39671,0,0,0-.34554.295,1.92973,1.92973,0,0,1-.73114.65736,1.89433,1.89433,0,0,1-1.00548.20457,2.00765,2.00765,0,0,1-1.41612-.9026,1.73171,1.73171,0,0,0-.75259-.54918,1.14654,1.14654,0,0,0-.41246-.04141,1.16859,1.16859,0,0,0-.58378.26123.12841.12841,0,0,0-.03556.05966.23551.23551,0,0,0-.0146.15452c.01022.03023.03147.0586.16821.13695a1.4642,1.4642,0,0,0,.16677.0879,8.662,8.662,0,0,1,1.33593.51206c.04972.02928.08793.05428.10327.06443a1.84477,1.84477,0,0,1,.19621.11346c.06814.04517.11448.08235.13066.095a2.14234,2.14234,0,0,0,.67378.335,2.42179,2.42179,0,0,0,.40392.07628q.09726.00875.19393.0087a2.26974,2.26974,0,0,0,1.62177-.701l.01147-.00032a2.55739,2.55739,0,0,0,.495-.06406c.337-.07485.48925-.0756,1.00761-.20636C49.9295,45.37048,50.04989,45.32011,50.08224,45.21441Z\"/>\n<!-- <text x=\"0\" y=\"115\" fill=\"#000000\" font-size=\"5px\" font-weight=\"bold\" font-family=\"'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif\">Created by Lorie Shaull</text><text x=\"0\" y=\"120\" fill=\"#000000\" font-size=\"5px\" font-weight=\"bold\" font-family=\"'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif\">from the Noun Project</text> -->\n</svg>\n";

var bird = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" x=\"0px\" y=\"0px\" viewBox=\"0 0 100 125\" enable-background=\"new 0 0 100 100\" xml:space=\"preserve\">\n    <path d=\"M88.213,23.058l8.344,3.51l-6.645-10.884c-0.908-3.583-4.145-6.237-8.01-6.237c-4.566,0-8.27,3.703-8.27,8.271  c0,0.424,0.038,0.84,0.1,1.247l-0.1-0.032c0,0,1.422,5.548-1.438,9.486C69.337,32.357,60.03,41.306,60.03,41.306L10.99,73.164  l-7.517,5.189l18.065-2.771c6.628,1.151,18.655,2.871,30.329,2.634c2.103,1.262,4.342,2.551,5.43,3.007l1.328,4.819h-5.754v2.685  h16.107v-2.685H61.41l-1.633-5.924c0.94-0.815,2.042-1.885,2.965-2.811c6.933-1.111,12.972-3.348,16.618-7.366  c4.556-5.023,6.479-10.884,7.006-16.503l0.16,0.036V24.577C87.156,24.15,87.722,23.638,88.213,23.058z\"\n    />\n    <!-- <text x=\"0\" y=\"115\" fill=\"#000000\" font-size=\"5px\" font-weight=\"bold\" font-family=\"'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif\">Created by Kari Gaynor</text>\n    <text x=\"0\" y=\"120\" fill=\"#000000\" font-size=\"5px\" font-weight=\"bold\" font-family=\"'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif\">from the Noun Project</text> -->\n</svg>\n";

var pipe = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" x=\"0px\" y=\"0px\" viewBox=\"0 0 30 37.5\" xml:space=\"preserve\">\n    <g transform=\"translate(-510 -320)\">\n        <g xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n            <path d=\"M538.879,322.685c-12.275,4.395-14.488,14.147-15.906,15.876c-1.416,1.729-1.826,0.816-1.826,0.816    c-1.127-4.973-1.943-6.799-1.943-6.799c-0.451-1.007-2.859-0.911-5.381,0.217c-2.521,1.127-4.199,2.857-3.748,3.865    c0,0,2.031,14.343,10.279,10.74c9.646-4.213,5.146-17.9,19.342-22.889L538.879,322.685z M514.23,333.707    c1.174-0.524,2.363-0.825,3.268-0.825c0.445,0,0.668,0.073,0.764,0.118c0,0,0.004,0.001,0.004,0.002    c-0.105,0.407-1.082,1.576-3.219,2.531c-1.174,0.524-2.365,0.825-3.268,0.825c-0.447,0-0.672-0.074-0.766-0.118    c0,0-0.002-0.001-0.002-0.002C511.119,335.83,512.096,334.662,514.23,333.707z\"\n            />\n        </g>\n    </g>\n    <text x=\"0\" y=\"45\" fill=\"#000000\" font-size=\"5px\" font-weight=\"bold\" font-family=\"'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif\">Created by Hea Poh Lin</text>\n    <text x=\"0\" y=\"50\" fill=\"#000000\" font-size=\"5px\" font-weight=\"bold\" font-family=\"'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif\">from the Noun Project</text>\n</svg>\n";

var spotify = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"168\" height=\"168\" viewBox=\"0 0 168 168\">\n  <defs>\n    <polygon id=\"spotify_icon_rgb_black-a\" points=\"0 167.94 167.487 167.94 167.487 .513 0 .513\"/>\n  </defs>\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <mask id=\"spotify_icon_rgb_black-b\" fill=\"#fff\">\n      <use xlink:href=\"#spotify_icon_rgb_black-a\"/>\n    </mask>\n    <path fill=\"#191414\" d=\"M133.28,74.753 C106.286,58.722 61.76,57.248 35.991,65.069 C31.852,66.325 27.476,63.988 26.223,59.851 C24.968,55.71 27.302,51.337 31.443,50.079 C61.025,41.1 110.199,42.834 141.275,61.281 C144.998,63.491 146.218,68.298 144.012,72.014 C141.804,75.736 136.993,76.963 133.28,74.753 Z M132.396,98.497 C130.502,101.57 126.484,102.534 123.415,100.647 C100.911,86.813 66.593,82.806 39.968,90.888 C36.516,91.931 32.869,89.985 31.82,86.538 C30.78,83.086 32.727,79.445 36.174,78.396 C66.589,69.166 104.4,73.636 130.248,89.521 C133.317,91.411 134.283,95.431 132.396,98.497 Z M122.149,121.3 C120.644,123.768 117.431,124.541 114.972,123.037 C95.307,111.018 70.555,108.304 41.405,114.962 C38.596,115.606 35.796,113.846 35.156,111.038 C34.512,108.229 36.266,105.429 39.081,104.788 C70.981,97.496 98.344,100.634 120.417,114.122 C122.878,115.625 123.653,118.84 122.149,121.3 Z M83.743,0.513 C37.494,0.513 0,38.006 0,84.255 C0,130.509 37.494,168 83.743,168 C129.994,168 167.487,130.509 167.487,84.255 C167.487,38.006 129.994,0.513 83.743,0.513 L83.743,0.513 Z\" mask=\"url(#spotify_icon_rgb_black-b)\"/>\n  </g>\n</svg>\n";

var cat = "\n<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" x=\"0px\" y=\"0px\" viewBox=\"0 0 100 125\" style=\"enable-background:new 0 0 100 100;\" xml:space=\"preserve\"><g><path d=\"M19.967,19.685l5.367,5.366c0.339,0.339,0.888,0.339,1.226,0l5.366-5.366l0.127-0.127c1.722-1.722,1.824-4.647,0.022-6.286   c-0.802-0.73-1.823-1.094-2.843-1.094c-1.085,0-2.168,0.411-2.991,1.233l-0.294,0.294l-0.181-0.181   c-1.447-1.44-3.739-1.786-5.436-0.651c-1.26,0.843-1.891,2.186-1.891,3.527c0,1.084,0.412,2.168,1.234,2.989L19.967,19.685z\"/><path d=\"M25.947,30.376c6.996,0,12.688-5.692,12.688-12.688S32.943,5,25.947,5s-12.688,5.691-12.688,12.688   S18.951,30.376,25.947,30.376z M25.947,7c5.893,0,10.688,4.794,10.688,10.688S31.84,28.376,25.947,28.376   c-5.894,0-10.688-4.795-10.688-10.688S20.053,7,25.947,7z\"/><path d=\"M82.219,64.954c0.122-1.134,0.508-5.316-0.042-8.206c-0.667-3.505-2.165-6.567-3.344-8.264   c-1.119-1.61-3.466-4.259-5.353-6.388c-1.028-1.16-2.076-2.343-2.574-2.972l0.382-1.515c0.184-0.727-0.129-1.467-0.779-1.842   c-0.524-0.302-1.137-0.281-1.639,0.007c-0.015,0.002-0.029,0.004-0.045,0.007c0.074-0.842,0.184-2.382,0.184-4.155   c0-1.432,1.212-4.495,2.187-6.957c0.644-1.628,1.253-3.166,1.564-4.302c0.389-1.409,1.327-7.393-1.603-8.752   c-1.844-0.845-5.466,1.316-10.384,4.461c-1.076,0.688-2.004,1.281-2.643,1.636c-2.598,1.44-8.226,6.839-9.295,7.875   c-0.979,0.326-4.855,1.707-9.978,4.672c-0.79-0.784-1.876-1.27-3.074-1.27c-2.411,0-4.372,1.961-4.372,4.372   c0,0.578,0.119,1.128,0.323,1.633c-2.416,1.826-4.726,3.809-6.864,5.921c-10.225,10.08-11.323,32.02-11.365,32.948   c-0.025,0.552,0.402,1.019,0.954,1.044c0.015,0.001,0.03,0.001,0.046,0.001c0.531,0,0.974-0.419,0.998-0.955   c0.01-0.22,1.107-22.087,10.772-31.614c2.064-2.039,4.293-3.954,6.624-5.719c0.772,0.683,1.774,1.111,2.883,1.111   c2.41,0,4.371-1.961,4.371-4.371c0-0.491-0.1-0.955-0.25-1.396c5.593-3.229,9.714-4.53,9.757-4.543   c0.151-0.047,0.29-0.129,0.403-0.239c0.064-0.063,6.454-6.29,9.038-7.722c0.693-0.385,1.646-0.994,2.75-1.7   c2.202-1.406,7.355-4.691,8.469-4.329c1.097,0.509,1.095,4.295,0.512,6.404c-0.283,1.032-0.872,2.521-1.496,4.097   c-1.144,2.891-2.327,5.88-2.327,7.693c0,2.155-0.176,4.015-0.225,4.488c-1.331,0.231-2.977,0.545-4.2,0.873   c-1.899,0.511-9.406,2.829-9.725,2.928c-0.528,0.163-0.824,0.723-0.661,1.25c0.133,0.43,0.528,0.705,0.955,0.705   c0.098,0,0.197-0.015,0.295-0.045c0.078-0.023,7.791-2.405,9.654-2.906c0.892-0.24,2.054-0.476,3.136-0.675l-4.878,4.753   c-0.805,0.634-6.193,4.942-7.444,7.602c-1.332,2.83-0.714,6.505-0.687,6.659c0.007,0.04,0.016,0.078,0.027,0.116l0.91,3.031   c0.13,0.434,0.527,0.713,0.958,0.713c0.095,0,0.192-0.014,0.288-0.042c0.529-0.159,0.829-0.717,0.67-1.245l-0.891-2.967   c-0.064-0.427-0.45-3.322,0.534-5.414c0.911-1.936,5.298-5.646,6.912-6.913c0.028-0.022,0.055-0.046,0.081-0.071l6.333-6.171   L66.129,49.87c-0.135,0.536,0.189,1.079,0.725,1.215c0.534,0.136,1.079-0.188,1.214-0.725l2.233-8.846   c0.451,0.52,1.006,1.148,1.681,1.909c1.852,2.089,4.156,4.688,5.207,6.201c1.062,1.528,2.413,4.3,3.021,7.498   c0.57,2.989-0.004,7.828-0.01,7.877c-0.022,0.184,0.007,0.371,0.085,0.539l4.404,9.543c-0.214,0.904-0.498,1.792-0.629,1.98   c-0.141,0.145-0.767,0.519-1.34,0.802c-0.288,0.142-0.49,0.413-0.543,0.729c-0.109,0.643-0.276,1.357-0.356,1.524   c-0.426,0.819-1.643,1.845-3.144,2.22c-0.414,0.103-0.859,0.17-1.312,0.21l0.635-1.456c0.166-0.38-0.008-0.821-0.388-0.987   s-0.822,0.008-0.987,0.388l-0.908,2.081c-0.596-0.029-1.151-0.096-1.619-0.188l2.998-4.058c0.246-0.333,0.176-0.803-0.157-1.049   c-0.333-0.245-0.803-0.176-1.049,0.158l-3.337,4.517c-0.399-0.13-0.828-0.275-1.261-0.425l3.319-3.098   c0.303-0.282,0.319-0.757,0.037-1.06c-0.283-0.302-0.757-0.32-1.06-0.036l-3.886,3.628c-0.275-0.1-0.526-0.192-0.706-0.259   c-0.292-0.108-0.618-0.075-0.882,0.092c-0.06,0.037-5.974,3.717-11.581,2.594c-5.473-1.095-11.132-2.228-15.179-12.569   c-0.201-0.514-0.78-0.77-1.295-0.567c-0.515,0.202-0.768,0.782-0.567,1.296c4.446,11.36,11.212,12.714,16.649,13.802   c0.881,0.177,1.763,0.253,2.628,0.253c3.092,0,5.977-0.973,7.925-1.833l-5.185,4.84c-0.303,0.282-0.319,0.757-0.037,1.06   c0.148,0.158,0.348,0.238,0.548,0.238c0.184,0,0.367-0.066,0.512-0.202l7.112-6.639c0.503,0.18,1.083,0.384,1.66,0.578   l-7.507,10.16c-0.246,0.333-0.176,0.803,0.157,1.049C64.09,94.952,64.246,95,64.401,95c0.229,0,0.457-0.105,0.604-0.305   l7.809-10.569c0.217,0.063,0.418,0.119,0.578,0.156c0.43,0.099,0.937,0.177,1.481,0.232l-4.116,9.436   c-0.166,0.38,0.008,0.821,0.388,0.987C71.241,94.98,71.343,95,71.443,95c0.289,0,0.565-0.168,0.688-0.45l4.347-9.965   c0.907-0.008,1.839-0.096,2.686-0.308c2.184-0.546,3.8-2.02,4.434-3.237c0.191-0.366,0.356-1.076,0.462-1.615   c0.569-0.305,1.261-0.726,1.561-1.11c0.526-0.674,0.944-2.414,1.099-3.132c0.046-0.212,0.021-0.433-0.07-0.63L82.219,64.954z    M35.783,35.733c-1.308,0-2.372-1.063-2.372-2.371s1.064-2.372,2.372-2.372c0.824,0,1.55,0.424,1.975,1.064   c0.002,0.004,0.002,0.009,0.005,0.013c0.002,0.003,0.005,0.004,0.006,0.007c0.242,0.372,0.385,0.813,0.385,1.288   C38.154,34.67,37.091,35.733,35.783,35.733z\"/><path d=\"M73.051,72.177c0.037,0.004,0.147,0.009,0.184,0.009c0.46,0,2.052-0.163,3.224-2.258c1.325-2.365,0.046-4.611-0.009-4.706   c-0.253-0.434-0.79-0.612-1.25-0.418l-4.698,1.971c-0.273,0.114-0.482,0.345-0.569,0.628c-0.087,0.284-0.043,0.592,0.119,0.84   l2.273,3.486C72.487,71.979,72.754,72.144,73.051,72.177z M75,67.056c0.098,0.513,0.101,1.203-0.287,1.896   c-0.385,0.688-0.789,0.993-1.078,1.128l-1.255-1.925L75,67.056z\"/></g>\n<!-- <text x=\"0\" y=\"115\" fill=\"#000000\" font-size=\"5px\" font-weight=\"bold\" font-family=\"'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif\">Created by Maxim Kulikov</text><text x=\"0\" y=\"120\" fill=\"#000000\" font-size=\"5px\" font-weight=\"bold\" font-family=\"'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif\">from the Noun Project</text> -->\n</svg>\n";

var banjo = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" x=\"0px\" y=\"0px\" viewBox=\"0 0 100 125\" enable-background=\"new 0 0 100 100\" xml:space=\"preserve\">\n    <g>\n        <path d=\"M45.958,0.931c4.131,0,7.489,3.354,7.489,7.489s-3.358,7.479-7.489,7.479c-4.128,0-7.479-3.343-7.479-7.479   S41.83,0.931,45.958,0.931z\" />\n    </g>\n    <g>\n        <rect x=\"79.859\" y=\"20.457\" transform=\"matrix(0.4477 0.8942 -0.8942 0.4477 68.6099 -59.6408)\" width=\"5.449\" height=\"10.523\" />\n    </g>\n    <g>\n        <g>\n            <path d=\"M64.771,21.019c-0.371-0.792-0.982-1.382-1.702-1.756c-1.012-0.764-2.655-1.305-5.194-1.465h-3.453v19.642l14.61-7.32    L64.771,21.019z\" />\n            <path d=\"M79.051,31.518c-0.035-0.506-0.173-0.993-0.397-1.441c-0.001,0-0.001,0-0.001-0.002c-0.417-0.83-1.126-1.517-2.064-1.869    c-1.979-0.743-4.183,0.259-4.924,2.237l-1.447,3.857L54.43,42.21c-1.439-4.534-5.23-8.026-9.932-9.05V17.798l-8.964,0.038    c-0.872,0.009-1.72,0.295-2.419,0.817L19.227,29.011c-1.062,0.792-1.679,2.045-1.656,3.371c0.023,1.326,0.681,2.558,1.77,3.314    l9.491,6.589c-0.391,1.258-0.602,2.593-0.602,3.978c0,6.23,4.274,11.464,10.04,12.967l0.056,40.637l9.337-0.005V60.284h3.45    v39.597l9.348-0.019l-0.016-0.442V53.236h4.339V39.083l2.703,5.771c0.09,0.193,0.199,0.374,0.317,0.546    c0.035,0.05,0.075,0.097,0.112,0.145c0.1,0.132,0.206,0.255,0.321,0.371c0.048,0.049,0.097,0.099,0.148,0.146    c0.162,0.147,0.333,0.285,0.517,0.402c0.019,0.01,0.038,0.018,0.056,0.03c0.18,0.11,0.371,0.201,0.566,0.28    c0.029,0.011,0.053,0.03,0.082,0.04c0.034,0.013,0.068,0.018,0.103,0.029c0.142,0.049,0.287,0.088,0.436,0.12    c0.063,0.014,0.127,0.031,0.19,0.041c0.18,0.03,0.362,0.046,0.548,0.05c0.022,0,0.044,0.005,0.065,0.005    c0.007,0,0.013-0.001,0.019-0.001c0.045-0.001,0.089-0.001,0.134-0.002c0.072-0.003,0.142-0.017,0.213-0.024    c0.094-0.009,0.187-0.016,0.279-0.031c0.102-0.018,0.2-0.044,0.3-0.069c0.082-0.022,0.165-0.041,0.245-0.067    c0.102-0.033,0.2-0.075,0.298-0.116c0.075-0.032,0.15-0.061,0.222-0.098c0.095-0.046,0.183-0.102,0.271-0.155    c0.072-0.045,0.147-0.084,0.216-0.133c0.081-0.058,0.155-0.121,0.23-0.184c0.07-0.059,0.143-0.112,0.209-0.175    c0.068-0.065,0.129-0.139,0.192-0.209c0.064-0.07,0.13-0.136,0.188-0.211c0.065-0.083,0.12-0.175,0.179-0.264    c0.047-0.071,0.097-0.137,0.139-0.212c0.095-0.168,0.178-0.345,0.248-0.53l4.294-11.446c0.096-0.256,0.16-0.516,0.2-0.776    c0.006-0.04,0.002-0.079,0.007-0.119c0.026-0.224,0.04-0.448,0.025-0.67C79.057,31.549,79.053,31.534,79.051,31.518z     M35.419,27.21v7.18c-0.644,0.339-1.251,0.735-1.829,1.17l-4.852-3.368L35.419,27.21z M30.573,46.263    c0-0.88,0.115-1.732,0.309-2.554l7.135,4.954c0.716,0.496,1.536,0.736,2.346,0.736c1.304,0,2.587-0.618,3.387-1.771    c1.296-1.869,0.834-4.435-1.035-5.733l-7.082-4.917c1.732-1.126,3.795-1.788,6.011-1.788c6.105,0,11.071,4.967,11.071,11.072    c0,6.103-4.966,11.071-11.071,11.071C35.54,57.334,30.573,52.366,30.573,46.263z\"\n            />\n        </g>\n    </g>\n    <!-- <text x=\"0\" y=\"115\" fill=\"#000000\" font-size=\"5px\" font-weight=\"bold\" font-family=\"'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif\">Created by Luis Prado</text><text x=\"0\" y=\"120\" fill=\"#000000\" font-size=\"5px\" font-weight=\"bold\" font-family=\"'Helvetica Neue', Helvetica, Arial-Unicode, Arial, Sans-serif\">from the Noun Project</text> -->\n</svg>\n";

var accessible = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 296.1 379.09\">\n    <title>accessible</title>\n    <g id=\"Layer_2\" data-name=\"Layer 2\">\n        <g id=\"Layer_1-2\" data-name=\"Layer 1\">\n            <path d=\"M289.71,171.89a22.56,22.56,0,0,0-17.38-6.77l-78.53,4.37L237,120.27a26.4,26.4,0,0,0,5.54-24.71,22.42,22.42,0,0,0-10-14.26c-.16-.12-103.3-60-103.3-60a22.52,22.52,0,0,0-26.3,2.67L52.52,68.88a22.52,22.52,0,1,0,30,33.61l38.2-34.07,31.58,18.34L96.54,150.24A114.85,114.85,0,0,0,36.3,180l29.11,29.11A74,74,0,0,1,170,313.68l29.11,29.11a115.18,115.18,0,0,0,19.56-129.57l30.4-1.69-7.39,90.7a22.52,22.52,0,0,0,20.62,24.28c.62.05,1.24.07,1.85.07a22.53,22.53,0,0,0,22.42-20.69L296,189.44A22.52,22.52,0,0,0,289.71,171.89Z\"\n            />\n            <path d=\"M248,75.4a37.7,37.7,0,1,0-37.7-37.7A37.7,37.7,0,0,0,248,75.4Z\" />\n            <path d=\"M115.19,338A74,74,0,0,1,53.92,222.36L24.5,192.94A115.15,115.15,0,0,0,186.15,354.6l-29.42-29.42A73.64,73.64,0,0,1,115.19,338Z\" />\n        </g>\n    </g>\n</svg>\n";

var aliza = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 584.18 680.52\"><defs><style>.cls-1{fill:none;stroke:#000;stroke-miterlimit:10;}</style></defs><title>aliza</title><g id=\"Layer_2\" data-name=\"Layer 2\"><g id=\"Layer_1-2\" data-name=\"Layer 1\"><path class=\"cls-1\" d=\"M230.37,175.65c-2.91,23.08-4.76,46.7.14,69.44a119.79,119.79,0,0,0,26.5,53c8.51,9.81,19,18.39,31.4,22.18,20.39,6.23,42.28-1.27,61.7-10.06,6.38-2.89,12.74-5.95,18.38-10.09,6.69-4.91,12.21-11.21,17.68-17.45,4.94-5.65,9.94-11.38,13.28-18.1s4.82-13.85,6.25-21.05a808,808,0,0,0,11.74-80.18\"/><path class=\"cls-1\" d=\"M353.76,237a15.53,15.53,0,0,1,5.19.68,5.26,5.26,0,0,1,3.48,3.65,7.43,7.43,0,0,1-.1,2.63A85.41,85.41,0,0,1,356.39,264\"/><path class=\"cls-1\" d=\"M340.41,144.91c5.9-1.6,12.09-1.75,18.2-1.87,4.94-.09,9.94-.16,14.78.86s9.58,3.24,12.75,7a21.52,21.52,0,0,1,3.27,5.56,30.17,30.17,0,0,1,1.73,17.33c-1.07,5.39-3.59,10.38-6.48,15a24,24,0,0,1-2.36,3.33c-2.86,3.24-7.05,4.93-11.18,6.21-6.06,1.89-12.42,3.16-18.73,2.56s-12.61-3.25-16.68-8.13a33,33,0,0,1-3.47-5.34c-4.41-8-7.89-17.26-7.21-26.59S331.65,147.29,340.41,144.91Z\"/><path class=\"cls-1\" d=\"M238.49,140c3.46-1.75,7.38-2.32,11.24-2.65a103.11,103.11,0,0,1,18.43.09,41.74,41.74,0,0,1,13.4,3.1,19.2,19.2,0,0,1,9.82,9.28c1.68,3.79,1.71,8.07,1.71,12.21,0,4.66,0,9.46-1.87,13.74-2,4.63-5.92,8.12-9.71,11.45a19.79,19.79,0,0,1-12.78,6.12c-5.95,1-12.33,2-17.82-.52-4.31-2-7.41-5.84-11-8.94-1.72-1.48-3.57-2.81-5.15-4.44-4-4.13-5.86-10-6-15.72C228.44,155.27,230.12,144.29,238.49,140Z\"/><path class=\"cls-1\" d=\"M236.14,133.62a71.27,71.27,0,0,1,53.41,5.7,41.42,41.42,0,0,0,7.4,3.58,32,32,0,0,0,8.55,1l15.59.44a16.43,16.43,0,0,0,4.28-.25A20.07,20.07,0,0,0,330,142c16.55-8.78,37-6.47,54.47.35,7.78,3,15.5,7,23.85,7.12l0,6.51c-3.48-.27-6.67,2.21-8.45,5.21s-2.46,6.5-3.38,9.86A66.12,66.12,0,0,1,384.28,195a29.23,29.23,0,0,1-4.28,4.46,28.08,28.08,0,0,1-8,4.28c-9.18,3.4-19.52,4.27-28.78,1.09S326,194,323.61,184.54c-1.19-4.73-1-9.78-2.71-14.35-1.34-3.61-3.85-7.22-2.89-10.94.27-1.06.82-2.1.65-3.18-.35-2.12-3-2.75-5.18-2.92l-6.92-.54a2.52,2.52,0,0,0-1.48.18,2.59,2.59,0,0,0-.95,1.87A70.69,70.69,0,0,1,291,183.9a32.1,32.1,0,0,1-8.32,8.05c-4.24,2.62-9.25,3.63-14.14,4.54a49.41,49.41,0,0,1-11.79,1.21c-9-.51-17.18-5.84-22.77-12.86s-8.86-15.62-11.22-24.29a41.14,41.14,0,0,0-2.86-8.4c-1.82-3.46-8-10.82-2.63-13.76,2.39-1.3,6.57-1,9.28-1.75C229.76,135.75,232.92,134.57,236.14,133.62Z\"/><path class=\"cls-1\" d=\"M336,161.62l9.75-2.44c3.91-1,8.05-2,11.91-.77,3.66,1.12,6.45,4,9.45,6.39s6.84,4.41,10.53,3.38\"/><path class=\"cls-1\" d=\"M338.45,154.87a29.43,29.43,0,0,1,33.15,4.43c1.89,1.79,3.56,3.84,5.69,5.33s4.94,2.35,7.36,1.4\"/><path class=\"cls-1\" d=\"M264.64,151.6c-4.5,3,.16,8.16,3.69,9.28a10.51,10.51,0,0,0,7.38-.2C287.16,155.61,270.43,147.69,264.64,151.6Z\"/><path class=\"cls-1\" d=\"M348.93,158.44a16.18,16.18,0,0,0-.67,4.63,5.46,5.46,0,0,0,1.93,4.12,7.91,7.91,0,0,0,3,1.18c2.34.56,4.81,1.06,7.12.36s4.3-3,3.79-5.35\"/><path class=\"cls-1\" d=\"M287.15,152.49a23.87,23.87,0,0,0-13.62-7.16,43.66,43.66,0,0,0-6.79-.36c-3.05,0-6.3.13-8.83,1.84a13.65,13.65,0,0,0-2.7,2.58,46.45,46.45,0,0,0-4.24,5.88,12,12,0,0,1-2.36,3.15,3.48,3.48,0,0,1-3.67.67\"/><path class=\"cls-1\" d=\"M287.42,155.5c-2.28.49-4.53-.78-6.62-1.82a39.34,39.34,0,0,0-15.2-4.06,6.46,6.46,0,0,0-3.22.4,8.43,8.43,0,0,0-2.69,2.72,18.19,18.19,0,0,1-9.08,6.42A14,14,0,0,1,239.68,158\"/><path class=\"cls-1\" d=\"M330.71,139a8.83,8.83,0,0,1,5.4-5.52A22.41,22.41,0,0,1,344,132.2a104.62,104.62,0,0,1,35.48,5.29c2,.66,4.32,1.88,4.28,4\"/><path class=\"cls-1\" d=\"M286.94,137c0-2.66-.24-5.7-2.34-7.33a8.94,8.94,0,0,0-4.5-1.4c-10.2-1.25-20.89-2.45-30.48,1.25\"/><path class=\"cls-1\" d=\"M269.47,218.79c-4.12,3.4-6.3,8.56-8.26,13.53a23.63,23.63,0,0,0-1.77,6.09,12.19,12.19,0,0,0,2.35,8.5\"/><path class=\"cls-1\" d=\"M281,274.79a279.3,279.3,0,0,1,34.39,4.29\"/><path class=\"cls-1\" d=\"M407,240c2.09,2,5.62,1.88,8.06.3s4-4.25,5-7,1.61-5.59,2.76-8.26c.92-2.13,2.17-4.11,3-6.28a8.93,8.93,0,0,0,.15-6.77\"/><path class=\"cls-1\" d=\"M415.86,211.25a6,6,0,0,0-.6,3.12,2.78,2.78,0,0,0,1.9,2.37c1.38.34,2.74-.77,3.4-2s.91-2.71,1.6-4c1.16-2.06,3.48-3.39,4.21-5.64.58-1.77,0-3.69-.37-5.51a30.18,30.18,0,0,1-.08-12.23\"/><path class=\"cls-1\" d=\"M347.37,168.26a103.51,103.51,0,0,0,22.33.11\"/><path class=\"cls-1\" d=\"M254.62,158.29l17.67,4.33\"/><path class=\"cls-1\" d=\"M239.66,140.7l-.54,13.41a4.21,4.21,0,0,1-.27,1.58c-.37.83-1.23,1.32-1.79,2-1.14,1.47-.85,3.57-1.5,5.31-.34.91-.93,1.7-1.26,2.62-.59,1.67-.22,3.49-.08,5.25s-.07,3.76-1.43,4.89l.31-.78\"/><path class=\"cls-1\" d=\"M376,239.75c3.52.66,7.13-.9,10-3.11s5.08-5,7.66-7.54\"/><path class=\"cls-1\" d=\"M236.06,223c1.36,2.1,4.3,2.26,6.58,3.29a16.75,16.75,0,0,1,3.58,2.44c3,2.48,6.16,5.08,7.78,8.64\"/><path class=\"cls-1\" d=\"M354.74,158.39a3.29,3.29,0,1,0,5.24,1.95\"/><path class=\"cls-1\" d=\"M272.68,152.39a2.62,2.62,0,0,0-2.45.57,2,2,0,0,0-.37,2.4,3,3,0,0,0,2.61,1.07,3.56,3.56,0,0,0,2.84-1c.66-.8.42-2.31-.59-2.53\"/><path class=\"cls-1\" d=\"M330.69,57.73a42.37,42.37,0,0,1,18,2.5c13.27,5.32,21.27,19,25.66,32.61,2.84,8.81,4.64,18.06,8.94,26.26s11.86,15.47,21.09,16.25\"/><path class=\"cls-1\" d=\"M319.33,49.39c5-6.9,14.71-7.79,23.21-8,6.75-.2,14.19-.17,19.29,4.26,2.57,2.23,4.21,5.32,5.74,8.36,13.56,26.78,24.15,55,36.92,82.13A151.24,151.24,0,0,0,416,157.2c4.59,6.73,10.15,12.86,13.77,20.17,4.27,8.63,5.59,18.37,6.84,27.92.62,4.69,1.23,9.44.67,14.13A29,29,0,0,1,417.84,243\"/><path class=\"cls-1\" d=\"M291.43,37c1.24-13.67,13.44-24.44,26.71-27.91s27.36-1,40.62,2.51c11.63,3.1,23.21,7.13,33.05,14.05,8.5,6,15.4,13.91,22.21,21.76,9.67,11.14,19.39,22.36,26.83,35.09,4.64,7.94,8.35,16.38,12,24.8L465,134.91a151.32,151.32,0,0,1,6.07,15.34,75.72,75.72,0,0,1,3.26,16.95,205.94,205.94,0,0,1-35.59,79.12,10.2,10.2,0,0,1-4.08,3.77c-4.83,1.92-9.46-3.76-14.65-4\"/><path class=\"cls-1\" d=\"M388.57,282.85c-1.85,9.6-3.7,19.28-3.65,29.06,0,4.6.47,9.21.12,13.79-.27,3.57-1,7.08-1.48,10.63-1.07,8.27-.55,16.66,0,25,1.21,19.35,2.43,38.75,6,57.81,1.76,9.45,4.09,18.81,5,28.38s.27,19.51-3.66,28.27S379.27,492,369.87,494\"/><path class=\"cls-1\" d=\"M413.82,266.49c4.82,2.65,7.74,7.85,9.25,13.14s1.85,10.84,2.91,16.23c4.28,21.59,21.24,40.17,42.34,46.39\"/><path class=\"cls-1\" d=\"M413.08,282.62a52.67,52.67,0,0,1,9.05,28.64c.23,15.44-6.34,30.73-3.88,46,2.16,13.36,11,24.64,20.36,34.41s19.74,18.92,26.37,30.72a73.59,73.59,0,0,1,8.53,28.18,190.33,190.33,0,0,1,.7,21.24l0,10\"/><path class=\"cls-1\" d=\"M403.61,324.18c-3.22,4.78-6.48,9.66-8.07,15.19-1.84,6.41-1.3,13.25-.33,19.84a160,160,0,0,0,8.67,33.38c10.44,27.57,28.52,52.32,34.61,81.16,2.85,13.5,2.93,27.71-.86,41S426.05,540.27,415,548.49\"/><path class=\"cls-1\" d=\"M285.07,39.09a41,41,0,0,0-10.63-7.86c-2.85-1.39-7.77-1.77-9.14-5.07-3-7.29,8.85-15.37,13.92-17.93C297.92-1.19,320.17-1,340.6,3.52c2.93.65,6.36,1.89,7,4.82\"/><path class=\"cls-1\" d=\"M219,136.29l-4.09-21c-1-5.16-2-10.44-1.2-15.63.88-5.58,3.8-10.6,5.84-15.87,5.66-14.66,5.09-32.58,16.23-43.67,7.19-7.16,17.69-9.67,27.7-11.28\"/><path class=\"cls-1\" d=\"M325,58A83.26,83.26,0,0,0,294,51c-5.41-.17-11,.23-15.91,2.44-5.38,2.41-9.62,6.77-13.38,11.31A123.14,123.14,0,0,0,237,132.35\"/><path class=\"cls-1\" d=\"M433.55,251.28c-2.17,5.78,2.84,11.63,7.67,15.49,16.16,12.94,36.12,23.18,44.89,41.93,3.59,7.67,5,16.15,7.21,24.3a112.9,112.9,0,0,0,16.24,34.47c7.76,11.1,19.19,21.49,32.73,21.16\"/><path class=\"cls-1\" d=\"M411,249.36c21,16,41.1,33.5,57.56,54.15s29.23,44.67,34.22,70.61c2,10.51,2.78,21.35,6.53,31.37s11.29,19.45,21.73,21.81\"/><path class=\"cls-1\" d=\"M407.14,269.89c7.42,8.82,10.34,20.43,14.46,31.2A136.71,136.71,0,0,0,438,331.6c10.1,14.17,22.9,26.41,31.64,41.45,5.32,9.16,9.05,19.23,15.1,27.92,4.87,7,11.18,13,15.25,20.49,6.16,11.32,6.6,24.77,6.89,37.66l1,42.47c.1,4.38.22,8.87,1.93,12.9s5.38,7.54,9.75,7.72\"/><path class=\"cls-1\" d=\"M241.91,281.24c-11.6,4.91-14.46,19.71-21.65,30.05-3.15,4.53-7.4,8.53-8.95,13.83-1.19,4.08-.63,8.44-.05,12.66l5.43,39.83a123.63,123.63,0,0,0,3.19,17.26c1.72,6,4.36,11.83,5.26,18a32.92,32.92,0,0,1-1.54,15.59L237,423.28c7.43-2.9,15.06-5.92,20.83-11.42s9.28-14.16,6.45-21.62c6.92,4.69,13.89,9.41,21.51,12.86,7.4,3.35,15.3,5.45,23.16,7.54l31.24,8.3q-37.09-22.18-72.32-47.29c-8.34-5.94-16.84-16-15.92-26.18-.49,0-.38.9.09,1a1.54,1.54,0,0,0,1.31-.51,22.14,22.14,0,0,0,7.51-14c.57-4.63-.34-9.29-.55-13.95a46.36,46.36,0,0,1,1.36-13.41\"/><path class=\"cls-1\" d=\"M264.23,401.07c8,2.31,15,7.27,23,9.49,4.82,1.34,9.86,1.65,14.86,1.95,15.61.94,36.5,6,51.75,1.6,5.53-1.58,10.68-4.46,16.34-5.5,3.33-.61,6.77-.58,10.06-1.41s2.33-11.54,3.48-14.72c-8,2-16.29,4-22.86,9-2.69,2-5,4.54-7.93,6.27-4,2.38-9,3.36-11.84,7\"/><path class=\"cls-1\" d=\"M223.72,304.65a80.41,80.41,0,0,0-10.54,1.79c-5.23,1.25-10.81,3.41-13.36,8.15-1.91,3.54-1.71,7.88-.61,11.75a28.25,28.25,0,0,0,12.45,16.31\"/><path class=\"cls-1\" d=\"M227.43,296a52.11,52.11,0,0,0-34.57,6c-5.41,3.1-10.21,7.15-15.55,10.36-20.41,12.28-46.21,11.15-68.24,20.23-21.74,9-38.53,27.55-49.07,48.57S44.61,425.64,41.56,449c-1.34,10.22-2.57,21.22-3.62,31.48A130.69,130.69,0,0,1,36,494c-6.73,32.24-18.12,63.41-23.87,95.83C6.85,619.64,6.39,650.21.49,679.95\"/><path class=\"cls-1\" d=\"M494.28,331.31c14.63,10.45,31.65,17.7,44.5,30.28,13.07,12.79,20.72,30,28.07,46.74,5.28,12,10.63,24.37,11.49,37.48.59,9-1,17.92-1.64,26.88-.85,11.08-.38,22.21.09,33.31l6.89,162.73-.31-6.08\"/><path class=\"cls-1\" d=\"M513.3,519.89c7.36,12.82,8.57,28.14,9.6,42.89,1.75,24.84,3.32,50.79-6.49,73.69-6.2,14.48-17,28.35-15.24,44\"/><path class=\"cls-1\" d=\"M159.93,491.57c-15.63,14.25-19.37,37.29-19.64,58.44a266.89,266.89,0,0,0,6.65,62.62c4.61,20.22,11.64,40.85,7.76,61.23\"/><path class=\"cls-1\" d=\"M391.5,479a18.37,18.37,0,0,1-18.89,25,24.07,24.07,0,0,0,19.25,5.11,62.2,62.2,0,0,1-15,29.14c11.88,5.61,24.71,10.61,37.78,9.29a41.13,41.13,0,0,0,20-7.63c.05,4.29,4.94,7.09,9.24,6.93s8.24-2.26,12.35-3.47,9.13-1.33,12.11,1.76a60.2,60.2,0,0,0,24.22-27.86,24.31,24.31,0,0,1,.24,18.34l12.89-19.75c3-4.62,6.11-9.44,6.82-14.9,1.41-10.81-6.76-20.89-6.44-31.79.35-12,10.85-22.75,8.25-34.42-1-4.33-3.62-9.12-1.14-12.8A17.23,17.23,0,0,1,516.2,419c5.86-5.23,6.33-15.37,1-21.12\"/><path class=\"cls-1\" d=\"M311.33,34.48a77.5,77.5,0,0,1,52.85-1.58,38.63,38.63,0,0,1,11.23,5.54c9.81,7.43,12.94,20.49,17.74,31.82,14.31,33.75,47.46,57.49,58.72,92.37a82.63,82.63,0,0,1-4.61,61.46\"/><path class=\"cls-1\" d=\"M248.61,286a316.51,316.51,0,0,0,2.23,58.68c.55,4.17-1.31,7.62-.22,11.69a141.77,141.77,0,0,0,12.94,32\"/><path class=\"cls-1\" d=\"M145.42,618.68a176.49,176.49,0,0,1-6.06,60.74\"/><path class=\"cls-1\" d=\"M265.42,237.52c3.64,5.63,9.61,9.44,15.93,11.67s13,3,19.7,3.76c17.36,1.88,36.11,3,51.08-5.94a416.8,416.8,0,0,1-87.76-8.66l11.35,13.09c4.56,5.26,9.36,10.7,15.78,13.4,4.84,2,10.23,2.33,15.46,2.05a75.09,75.09,0,0,0,44.81-18.11\"/><path class=\"cls-1\" d=\"M317.51,205.56c1.8-1.86,5.06-1.63,7.08,0a10.2,10.2,0,0,1,3.28,6.84,7.46,7.46,0,0,1-.63,4.62c-1.13,2-3.57,2.84-5.83,2.81a29,29,0,0,1-6.64-1.32,4.67,4.67,0,0,0-2.49-.13c-1.15.35-1.86,1.46-2.72,2.31-2.76,2.74-7.1,2.84-11,2.78-3.54-.06-7.9-.68-9.09-4-.37-1-.47-2.38-1.46-2.86-.8-.38-1.72,0-2.6.12-2.59.28-4.71-2.47-4.7-5.07s1.5-5,3.09-7c2.63-3.42,5.66-6.56,7.81-10.29s3.35-8.31,1.94-12.39\"/></g></g></svg>";

/* src/App.html generated by Svelte v1.54.1 */
const examples = {
	bunny,
	n64,
	sotomayor,
	coordinator,
	banjo,
	bird,
	accessible,
	cat
};

const hiddenExamples = {
	pipe,
	spotify,
	aliza
};

function props(scale, numPoints, translateX, translateY, radius, coordType, color) {
	return { scale, numPoints, translateX, translateY, radius, coordType, color };
}

function data() {
	return {
		step: 1,
		examples,
		hiddenExamples,
		svgPreview: null,
		numPoints: 1000,
		scale: 1,
		translateX: 20,
		translateY: 20,
		radius: 4,
		color: '#F037A5',
		coordType: 'outline',
		imageForDownload: null,
		errorMessage: false,
		newSVG: true,
		secretSVG: null,
		coords: null,
		innerWidth: null
	};
}

var methods = {

	initialUpdate() {

		this.set({
			scale: 1,
			radius: 4,
			translateX: 20,
			translateY: 20,
			numPoints: 1000,
			coordType: 'outline',
			newSVG: true,
			svgTextError: false
		});

		this.update();
		this.refs.canvasHolder.scrollLeft = 0;
		this.refs.canvasHolder.scrollTop = 0;
	},

	//MAIN UPDATE METHOD CALLED WHENEVER A NEW SVG IS UPLOADED OR ANY CONTROLS ARE EDITED
	update() {
		let paths = this.refs.input.refs.svgHolder.getElementsByTagName('path');
		//check for error / missing svg
		if (paths.length === 0) {
			this.set({ svgTextError: true });
		} else {
			const scale = +this.get('scale');
			const numPoints = this.get('numPoints');
			const translateX = +this.get('translateX');
			const translateY = +this.get('translateY');

			let flatCoords = pathsToCoords(paths, scale, numPoints, translateX, translateY);
			// If this is a newSVG that has just been uploaded, takes a guess at a scale and num points that will make it look good. If necessary, and resets flatCoords
			const newSVG = this.get('newSVG');
			if (newSVG) {
				flatCoords = this.scaleNewSVG(flatCoords, paths, translateX, translateY);
			}

			const coordType = this.get('coordType');
			if (coordType === 'inside') {
				//only calculates fill coords if necessary
				const fillCoords = getFillCoords(flatCoords, this.get('numPoints'));

				this.drawDotsToCanvas(fillCoords);
				this.set({ coords: fillCoords });
			} else {
				this.drawDotsToCanvas(flatCoords);
				this.set({ coords: flatCoords });
			}
		}
	},

	drawDotsToCanvas(dotsToDraw) {
		const canvas = this.refs.canvas;
		const screenScale = window.devicePixelRatio || 1;
		canvas.width = 1000 * screenScale;
		canvas.height = 1000 * screenScale;
		canvas.style.width = '1000px';
		canvas.style.height = '1000px';

		const ctx = canvas.getContext('2d');
		const color = this.get('color');
		const radius = this.get('radius');

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		dotsToDraw.forEach(d => {

			ctx.fillStyle = color === 'random' ? `rgb(${Math.round(Math.random() * 255)}, ${Math.round(Math.random() * 255)}, ${Math.round(Math.random() * 255)})` : color;
			ctx.strokeStyle = 'transparent';
			ctx.beginPath();
			ctx.arc(d[0] * screenScale, d[1] * screenScale, radius, 0, 2 * Math.PI, true);
			ctx.fill();
			ctx.closePath();
		});
		const imageForDownload = canvas.toDataURL();
		this.set({ imageForDownload });
	},

	scaleNewSVG(flatCoords, paths, translateX, translateY) {
		const xMax = getCoordsMax(flatCoords, 0);
		const guessAtNewScale = Math.ceil(600 / xMax);
		const scaledLengthAllPaths = getTotalLengthAllPaths(paths) * guessAtNewScale;
		const guessAtNumPoints = Math.round(scaledLengthAllPaths / 10);
		const newFlatCoords = pathsToCoords(paths, guessAtNewScale, guessAtNumPoints, translateX, translateY);
		this.set({ scale: guessAtNewScale, numPoints: guessAtNumPoints });
		this.set({ newSVG: false });
		return newFlatCoords;
	}
};

function oncreate() {
	//observes changes to any controls
	this.observe('props', props => {
		//prevents double update on new svg, and is just listening then for controls
		if (!this.get('newSVG')) {
			this.update();
		}
	});
}

function encapsulateStyles(node) {
	setAttribute(node, "svelte-948642203", "");
}

function add_css() {
	var style = createElement("style");
	style.id = 'svelte-948642203-style';
	style.textContent = "h2[svelte-948642203],[svelte-948642203] h2{margin-bottom:30px}h3[svelte-948642203],[svelte-948642203] h3{margin-top:0}a[svelte-948642203],[svelte-948642203] a{cursor:pointer;color:#222326;border-bottom:solid 1px #222326}a[svelte-948642203]:hover,[svelte-948642203] a:hover{color:#fff;border-bottom:solid 1px #fff}ol[svelte-948642203],[svelte-948642203] ol{list-style-position:inside;width:100%;padding:0}ul[svelte-948642203],[svelte-948642203] ul{padding:0 30px}li[svelte-948642203],[svelte-948642203] li{cursor:pointer;padding:20px 30px;width:100%;font-size:20px;font-weight:900}[svelte-948642203].all,[svelte-948642203] .all{width:100vw;height:100vh;display:flex}[svelte-948642203].control-panels,[svelte-948642203] .control-panels{display:flex;width:650px;background-color:#FAE62D;height:100%}[svelte-948642203].active-step-panel,[svelte-948642203] .active-step-panel{padding:30px;width:350px;position:relative;overflow:scroll}[svelte-948642203].image-preview,[svelte-948642203] .image-preview{height:100vh;width:calc(100vw - 650px);overflow:scroll}";
	appendNode(style, document.head);
}

function create_main_fragment(state, component) {
	var div,
	    div_1,
	    nav_updating = {},
	    text,
	    div_2,
	    svginput_updating = {},
	    text_1,
	    refinement_updating = {},
	    text_2,
	    text_3,
	    text_6,
	    div_3,
	    canvas,
	    text_9,
	    if_block_anchor;

	function onwindowresize(event) {
		component.set({
			innerWidth: this.innerWidth
		});
	}
	window.addEventListener("resize", onwindowresize);

	var nav_initial_data = {};
	if ('step' in state) {
		nav_initial_data.step = state.step;
		nav_updating.step = true;
	}
	var nav = new Nav({
		root: component.root,
		data: nav_initial_data,
		_bind: function (changed, childState) {
			var state = component.get(),
			    newState = {};
			if (!nav_updating.step && changed.step) {
				newState.step = childState.step;
			}
			nav_updating = assign({}, changed);
			component._set(newState);
			nav_updating = {};
		}
	});

	component.root._beforecreate.push(function () {
		var state = component.get(),
		    childState = nav.get(),
		    newState = {};
		if (!childState) return;
		if (!nav_updating.step) {
			newState.step = childState.step;
		}
		nav_updating = { step: true };
		component._set(newState);
		nav_updating = {};
	});

	var svginput_initial_data = {
		examples: state.examples,
		hiddenExamples: state.hiddenExamples,
		svgTextError: state.svgTextError,
		step: state.step
	};
	if ('secretSVG' in state) {
		svginput_initial_data.secretSVG = state.secretSVG;
		svginput_updating.secretSVG = true;
	}
	var svginput = new SVGInput({
		root: component.root,
		data: svginput_initial_data,
		_bind: function (changed, childState) {
			var state = component.get(),
			    newState = {};
			if (!svginput_updating.secretSVG && changed.secretSVG) {
				newState.secretSVG = childState.secretSVG;
			}
			svginput_updating = assign({}, changed);
			component._set(newState);
			svginput_updating = {};
		}
	});

	component.root._beforecreate.push(function () {
		var state = component.get(),
		    childState = svginput.get(),
		    newState = {};
		if (!childState) return;
		if (!svginput_updating.secretSVG) {
			newState.secretSVG = childState.secretSVG;
		}
		svginput_updating = { secretSVG: true };
		component._set(newState);
		svginput_updating = {};
	});

	svginput.on("readySVG", function (event) {
		component.initialUpdate();
	});

	component.refs.input = svginput;

	var refinement_initial_data = { step: state.step };
	if ('numPoints' in state) {
		refinement_initial_data.numPoints = state.numPoints;
		refinement_updating.numPoints = true;
	}
	if ('scale' in state) {
		refinement_initial_data.scale = state.scale;
		refinement_updating.scale = true;
	}
	if ('translateX' in state) {
		refinement_initial_data.translateX = state.translateX;
		refinement_updating.translateX = true;
	}
	if ('translateY' in state) {
		refinement_initial_data.translateY = state.translateY;
		refinement_updating.translateY = true;
	}
	if ('radius' in state) {
		refinement_initial_data.radius = state.radius;
		refinement_updating.radius = true;
	}
	if ('color' in state) {
		refinement_initial_data.color = state.color;
		refinement_updating.color = true;
	}
	if ('coordType' in state) {
		refinement_initial_data.coordType = state.coordType;
		refinement_updating.coordType = true;
	}
	var refinement = new Refinement({
		root: component.root,
		data: refinement_initial_data,
		_bind: function (changed, childState) {
			var state = component.get(),
			    newState = {};
			if (!refinement_updating.numPoints && changed.numPoints) {
				newState.numPoints = childState.numPoints;
			}

			if (!refinement_updating.scale && changed.scale) {
				newState.scale = childState.scale;
			}

			if (!refinement_updating.translateX && changed.translateX) {
				newState.translateX = childState.translateX;
			}

			if (!refinement_updating.translateY && changed.translateY) {
				newState.translateY = childState.translateY;
			}

			if (!refinement_updating.radius && changed.radius) {
				newState.radius = childState.radius;
			}

			if (!refinement_updating.color && changed.color) {
				newState.color = childState.color;
			}

			if (!refinement_updating.coordType && changed.coordType) {
				newState.coordType = childState.coordType;
			}
			refinement_updating = assign({}, changed);
			component._set(newState);
			refinement_updating = {};
		}
	});

	component.root._beforecreate.push(function () {
		var state = component.get(),
		    childState = refinement.get(),
		    newState = {};
		if (!childState) return;
		if (!refinement_updating.numPoints) {
			newState.numPoints = childState.numPoints;
		}

		if (!refinement_updating.scale) {
			newState.scale = childState.scale;
		}

		if (!refinement_updating.translateX) {
			newState.translateX = childState.translateX;
		}

		if (!refinement_updating.translateY) {
			newState.translateY = childState.translateY;
		}

		if (!refinement_updating.radius) {
			newState.radius = childState.radius;
		}

		if (!refinement_updating.color) {
			newState.color = childState.color;
		}

		if (!refinement_updating.coordType) {
			newState.coordType = childState.coordType;
		}
		refinement_updating = { numPoints: true, scale: true, translateX: true, translateY: true, radius: true, color: true, coordType: true };
		component._set(newState);
		refinement_updating = {};
	});

	var coordsexport = new CoordsExport({
		root: component.root,
		data: {
			step: state.step,
			coords: state.coords,
			imageForDownload: state.imageForDownload
		}
	});

	var credits = new Credits({
		root: component.root,
		data: {
			hiddenExamples: state.hiddenExamples,
			step: state.step
		}
	});

	credits.on("secretSVG", function (event) {
		component.set({ secretSVG: event.id });
	});

	var if_block = state.innerWidth <= 650 && create_if_block(state, component);

	return {
		c: function create() {
			div = createElement("div");
			div_1 = createElement("div");
			nav._fragment.c();
			text = createText("\n\n    ");
			div_2 = createElement("div");
			svginput._fragment.c();
			text_1 = createText("\n\n      \n    ");
			refinement._fragment.c();
			text_2 = createText("\n\n    \n    ");
			coordsexport._fragment.c();
			text_3 = createText("\n\n    \n    ");
			credits._fragment.c();
			text_6 = createText("\n  ");
			div_3 = createElement("div");
			canvas = createElement("canvas");
			text_9 = createText("\n");
			if (if_block) if_block.c();
			if_block_anchor = createComment();
			this.h();
		},

		h: function hydrate() {
			encapsulateStyles(div);
			div_2.className = "active-step-panel";
			div_1.className = "control-panels";
			canvas.width = "1000";
			canvas.height = "1000";
			div_3.className = "image-preview";
			div.className = "all";
			setStyle(div, "display", state.innerWidth > 650 ? "flex" : "none");
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			appendNode(div_1, div);
			nav._mount(div_1, null);
			appendNode(text, div_1);
			appendNode(div_2, div_1);
			svginput._mount(div_2, null);
			appendNode(text_1, div_2);
			refinement._mount(div_2, null);
			appendNode(text_2, div_2);
			coordsexport._mount(div_2, null);
			appendNode(text_3, div_2);
			credits._mount(div_2, null);
			appendNode(text_6, div);
			appendNode(div_3, div);
			appendNode(canvas, div_3);
			component.refs.canvas = canvas;
			component.refs.canvasHolder = div_3;
			insertNode(text_9, target, anchor);
			if (if_block) if_block.m(target, anchor);
			insertNode(if_block_anchor, target, anchor);
		},

		p: function update(changed, state) {
			var nav_changes = {};
			if (!nav_updating.step && changed.step) {
				nav_changes.step = state.step;
				nav_updating.step = true;
			}
			nav._set(nav_changes);
			nav_updating = {};

			var svginput_changes = {};
			if (changed.examples) svginput_changes.examples = state.examples;
			if (changed.hiddenExamples) svginput_changes.hiddenExamples = state.hiddenExamples;
			if (changed.svgTextError) svginput_changes.svgTextError = state.svgTextError;
			if (changed.step) svginput_changes.step = state.step;
			if (!svginput_updating.secretSVG && changed.secretSVG) {
				svginput_changes.secretSVG = state.secretSVG;
				svginput_updating.secretSVG = true;
			}
			svginput._set(svginput_changes);
			svginput_updating = {};

			var refinement_changes = {};
			if (changed.step) refinement_changes.step = state.step;
			if (!refinement_updating.numPoints && changed.numPoints) {
				refinement_changes.numPoints = state.numPoints;
				refinement_updating.numPoints = true;
			}
			if (!refinement_updating.scale && changed.scale) {
				refinement_changes.scale = state.scale;
				refinement_updating.scale = true;
			}
			if (!refinement_updating.translateX && changed.translateX) {
				refinement_changes.translateX = state.translateX;
				refinement_updating.translateX = true;
			}
			if (!refinement_updating.translateY && changed.translateY) {
				refinement_changes.translateY = state.translateY;
				refinement_updating.translateY = true;
			}
			if (!refinement_updating.radius && changed.radius) {
				refinement_changes.radius = state.radius;
				refinement_updating.radius = true;
			}
			if (!refinement_updating.color && changed.color) {
				refinement_changes.color = state.color;
				refinement_updating.color = true;
			}
			if (!refinement_updating.coordType && changed.coordType) {
				refinement_changes.coordType = state.coordType;
				refinement_updating.coordType = true;
			}
			refinement._set(refinement_changes);
			refinement_updating = {};

			var coordsexport_changes = {};
			if (changed.step) coordsexport_changes.step = state.step;
			if (changed.coords) coordsexport_changes.coords = state.coords;
			if (changed.imageForDownload) coordsexport_changes.imageForDownload = state.imageForDownload;
			coordsexport._set(coordsexport_changes);

			var credits_changes = {};
			if (changed.hiddenExamples) credits_changes.hiddenExamples = state.hiddenExamples;
			if (changed.step) credits_changes.step = state.step;
			credits._set(credits_changes);

			if (changed.innerWidth) {
				setStyle(div, "display", state.innerWidth > 650 ? "flex" : "none");
			}

			if (state.innerWidth <= 650) {
				if (!if_block) {
					if_block = create_if_block(state, component);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.u();
				if_block.d();
				if_block = null;
			}
		},

		u: function unmount() {
			detachNode(div);
			detachNode(text_9);
			if (if_block) if_block.u();
			detachNode(if_block_anchor);
		},

		d: function destroy$$1() {
			window.removeEventListener("resize", onwindowresize);

			nav.destroy(false);
			svginput.destroy(false);
			if (component.refs.input === svginput) component.refs.input = null;
			refinement.destroy(false);
			coordsexport.destroy(false);
			credits.destroy(false);
			if (component.refs.canvas === canvas) component.refs.canvas = null;
			if (component.refs.canvasHolder === div_3) component.refs.canvasHolder = null;
			if (if_block) if_block.d();
		}
	};
}

// (42:0) {{#if innerWidth <= 650}}
function create_if_block(state, component) {

	var smallwindowwarning = new SmallWindowWarning({
		root: component.root
	});

	return {
		c: function create() {
			smallwindowwarning._fragment.c();
		},

		m: function mount(target, anchor) {
			smallwindowwarning._mount(target, anchor);
		},

		u: function unmount() {
			smallwindowwarning._unmount();
		},

		d: function destroy$$1() {
			smallwindowwarning.destroy(false);
		}
	};
}

function App(options) {
	init(this, options);
	this.refs = {};
	this._state = assign(data(), options.data);
	this._state.innerWidth = window.innerWidth;
	this._recompute({ scale: 1, numPoints: 1, translateX: 1, translateY: 1, radius: 1, coordType: 1, color: 1 }, this._state);

	if (!document.getElementById("svelte-948642203-style")) add_css();

	var _oncreate = oncreate.bind(this);

	if (!options.root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment(this._state, this);

	this.root._oncreate.push(_oncreate);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(App.prototype, methods, proto);

App.prototype._recompute = function _recompute(changed, state) {
	if (changed.scale || changed.numPoints || changed.translateX || changed.translateY || changed.radius || changed.coordType || changed.color) {
		if (differs(state.props, state.props = props(state.scale, state.numPoints, state.translateX, state.translateY, state.radius, state.coordType, state.color))) changed.props = true;
	}
};

// Copyright (c) 2017-2018 Spotify AB
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

window.app = new App({
  target: document.querySelector('main')
});

}());
