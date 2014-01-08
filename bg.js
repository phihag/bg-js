var TEXT_ACTIVE_DELAY = 2000;
var TEXT_FADING_TIME = 5000;

var CLOCK_DISABLED = 0;
var CLOCK_SIMPLE = CLOCK_DISABLED + 1;
var CLOCK_EXTENDED = CLOCK_SIMPLE + 1;
var CLOCK_SIMPLE_BOTTOM_RIGHT = CLOCK_EXTENDED + 1;
var CLOCK_SIMPLE_BOTTOM_RIGHT_BRIGHT = CLOCK_SIMPLE_BOTTOM_RIGHT + 1;
var CLOCK_EXTENDED_BOTTOM_RIGHT = CLOCK_SIMPLE_BOTTOM_RIGHT_BRIGHT + 1;
var CLOCK_ANALOG = CLOCK_EXTENDED_BOTTOM_RIGHT + 1;
var CLOCK_ANALOG_EXTENDED = CLOCK_ANALOG + 1;
var CLOCK_STATE_COUNT = CLOCK_ANALOG_EXTENDED + 1;
var CLOCK_NAMES = ['Disabled', 'Simple', 'Extended', 'Simple bottom right', 'Bright simple bottom right', 'Bottom right', 'Analog', 'Extended analog'];

var WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

var defaultSettings = {
	silentMode:false,
	clockMode:CLOCK_DISABLED,
	hideCursor:true,
	invertedColors:false,
	background:'#000'
};

var settings;
var isFirstRun = true;
var dialogCancelFuncs = [];

function _restoreSettings() {
	settings = {}
	for (k in defaultSettings) {
		settings[k] = defaultSettings[k];
	}
}
_restoreSettings();

function messages_clean() {
	$('#messages').remove();
}

function settings_set(val) {
	silent_set(val.silentMode);
	invc_set(val.invertedColors);
	clock_set(val.clockMode);
	hideCursor_set(val.hideCursor);
}

function settings_load() {
	try {
		if (typeof(localStorage) != 'undefined' && localStorage != null) {
			var settingsStr = localStorage.getItem('bgSettings');
			if (typeof(settingsStr) == 'string') {
				isFirstRun = false;
				var storedSettings = JSON.parse(settingsStr);
				settings_set(storedSettings);
			}
		}
	} catch (e) {
		message('Error while loading settings: ' + e);
	}
}

function settings_save() {
	try {
		if (typeof(localStorage) != 'undefined' && localStorage != null) {
			var settingsStr = JSON.stringify(settings);
			localStorage.setItem('bgSettings', settingsStr);
		}
	} catch(e) {
		message('Error while saving settings: ' + e);
	}
}

function message(line) {
	if (settings.silentMode) return;
	var msgField = $('#messages');
	if (msgField.size() == 0) {
		msgField = $('<div id="messages"></div>');
		$('body').append(msgField);
	}
	
	var newField = $('<div />');
	newField.text(line);
	msgField.append(newField);
	
	window.setTimeout(function() {
		newField.fadeOut(TEXT_FADING_TIME, function() {
			newField.remove();
		})
	}, TEXT_ACTIVE_DELAY);
}

function ui_silent_toggle() {
	var val = !settings.silentMode;
	silent_set(val);
	message('Silent mode ' + (val ? 'enabled' : 'disabled'));
}

function silent_set(val) {
	if (val == settings.silentMode) return;
	settings.silentMode = val;
	if (val) {
		$('#messages').remove();
	}
}

function _resizeToFit(elem, fontSizeGuess, avw, avh) {
	var fontSize = fontSizeGuess;
	
	var setFontSize = function() {
		elem.css('font-size', fontSize + 'px');
		elem.css('line-height', 'inherit');
	}
	
	setFontSize();
	if ((elem.width() > avw) || (elem.height() > avh)) {
		do {
			fontSize--;
			setFontSize();
		} while ((fontSize > 0) && ((elem.width() > avw) || (elem.height() > avh)));
	} else {
		do {
			fontSize++;
			setFontSize();
		} while ((fontSize < 2*fontSizeGuess+128) && (elem.width() < avw) && (elem.height() < avh));
		fontSize -= 1;
		setFontSize();
	}
}

var clock_timeout = false;
function clock_set(newState) {
	var oldState = settings.clockMode;
	if (newState == oldState) return;
	settings.clockMode = newState;
	
	if (clock_timeout != false) {
		window.clearTimeout(clock_timeout);
		clock_timeout = false;
	}
	switch (oldState) {
	case CLOCK_DISABLED:
		break;
	case CLOCK_SIMPLE:
		$(window).unbind('resize', _simpleClock_fit);
		break;
	case CLOCK_ANALOG:
		$(window).unbind('analog', _clock_configAnalog);
		break;
	}
	if (oldState != CLOCK_DISABLED) {
		$('#clock').remove();
	}
	
	switch (newState) {
	case CLOCK_DISABLED:
		break;
	case CLOCK_SIMPLE:
		var clockField = $('<div id="clock" class="clock-simple"></div>');
		$('body').append(clockField);
		
		_simpleClock_fit();
		$(window).resize(_simpleClock_fit);
		break;
	case CLOCK_EXTENDED:
		$('body').append($('<div id="clock" class="clock-extended"><div class="time" /><div class="date" /></div>'));
		break;
	case CLOCK_SIMPLE_BOTTOM_RIGHT:
		$('body').append($('<div id="clock" class="clock-simple-bottom-right"></div>'));
		break;
	case CLOCK_SIMPLE_BOTTOM_RIGHT_BRIGHT:
		$('body').append($('<div id="clock" class="clock-simple-bottom-right clock-bright"></div>'));
		break;
	case CLOCK_EXTENDED_BOTTOM_RIGHT:
		$('body').append($('<div id="clock" class="clock-extended-bottom-right"><div class="time" /><div class="date" /></div>'));
		break;
	case CLOCK_ANALOG:
	case CLOCK_ANALOG_EXTENDED:
		$('body').append($('<canvas id="clock" class="clock-analog" />'));
		$(window).resize(_clock_configAnalog);
		_clock_configAnalog();
		return;
	}
	
	clock_update();
}

function _clock_rect(c, mx, my, width, length, angle) {
	c.beginPath();

	x = mx + width * Math.sin(angle + 0.5 * Math.PI) / 2;
	y = my - width * Math.cos(angle + 0.5 * Math.PI) / 2;
	c.moveTo(x, y);
	
	x = x - width * Math.sin(angle + 0.5 * Math.PI);
	y = y + width * Math.cos(angle + 0.5 * Math.PI);
	c.lineTo(x, y);
	
	x += length * Math.sin(angle);
	y -= length * Math.cos(angle);
	c.lineTo(x, y);
	
	x += width * Math.sin(angle + 0.5 * Math.PI);
	y -= width * Math.cos(angle + 0.5 * Math.PI)
	c.lineTo(x, y);
	
	x = mx + width * Math.sin(angle + 0.5 * Math.PI) / 2;
	y = my - width * Math.cos(angle + 0.5 * Math.PI) / 2;
	c.lineTo(x, y);
	
	c.fill();
	c.closePath();
}

function clock_update() {
	if (clock_timeout !== false) {
		window.clearTimeout(clock_timeout);
	}
	var now = new Date();
	function clockStrFormat(x) {return (x < 10 ? '0' : '') + x;}
	switch (settings.clockMode) {
	case CLOCK_SIMPLE:
	case CLOCK_SIMPLE_BOTTOM_RIGHT:
	case CLOCK_SIMPLE_BOTTOM_RIGHT_BRIGHT:
		var clockField = $('#clock');
		var clockStr = clockStrFormat(now.getHours()) + ':' + clockStrFormat(now.getMinutes());
		clockField.text(clockStr);
		
		clock_timeout = window.setTimeout(clock_update, (60 - now.getSeconds()) * 1000 + (1000 - now.getMilliseconds()));
		break;
	case CLOCK_EXTENDED:
		var timeField = $('#clock>.time');
		var dateField = $('#clock>.date');
		
		var timeStr = clockStrFormat(now.getHours()) + ':' + clockStrFormat(now.getMinutes()) + ':';
		timeField.text(timeStr);
		var secField = $('<span/>');
		secField.text(clockStrFormat(now.getSeconds()));
		timeField.append(secField);
		
		var dateStr = WEEKDAY[now.getDay()] + ', ' + now.getDate() + '.' + (now.getMonth()+1) + '.' + now.getFullYear();
		dateField.text(dateStr);
		clock_timeout = window.setTimeout(clock_update, 1000 - now.getMilliseconds());
		break;
	case CLOCK_EXTENDED_BOTTOM_RIGHT:
		var timeFieldx = $('#clock>.time');
		var dateFieldx = $('#clock>.date');
		
		var timeStr = clockStrFormat(now.getHours()) + ':' + clockStrFormat(now.getMinutes());
		timeFieldx.text(timeStr);
		
		var dateStr = WEEKDAY[now.getDay()] + ', ' + now.getDate() + '.' + (now.getMonth()+1) + '.' + now.getFullYear();
		dateFieldx.text(dateStr);
		clock_timeout = window.setTimeout(clock_update, (60 - now.getSeconds()) * 1000 + (1000 - now.getMilliseconds()));
		break;
	
	case CLOCK_DISABLED:
		break;
	case CLOCK_ANALOG:
	case CLOCK_ANALOG_EXTENDED:
		var clockCanvas = $('#clock')[0];
		var c;
		try {
			c = clockCanvas.getContext('2d');
		} catch(e) {
			message('Can\'t paint clock: 2D canvas context not supported');
			return;
		}
		
		var x; var y; // temporary variables
		var w = clockCanvas.width;
		var h = clockCanvas.height;
		var mx = w / 2;
		var my = h / 2;
		var s = Math.min(w, h);
		var r = s * 0.9 / 2;
		var FULL_CIRCLE = 2 * Math.PI;
		
		var dotRadius = 0.004 * s;
		var smallDotRadius = dotRadius * 0.8;
		
		var inverted = settings.invertedColors;
		
		c.clearRect(0, 0, w, h);
		c.fillStyle = inverted ? '#fff' : '#000';
		c.rect(0, 0, w, h);
		
		// Dots and numbers
		c.font = Math.round(s * 0.05) + 'px sans-serif';
		c.textAlign = 'center';
		c.textBaseline = 'middle';
		for (var minute = 1;minute <= 60;minute++) {
			var cr;
			if (minute % 5 != 0) {
				c.fillStyle = inverted ? '#ddd' : '#111';
				cr = dotRadius;
			} else {
				c.fillStyle = inverted ? '#f0f0f0' : '#0a0a0a';
				cr = smallDotRadius;
			}
			var carc = minute * FULL_CIRCLE / 60;
			
			x = mx + r * Math.sin(carc);
			y = my - r * Math.cos(carc);
			
			c.beginPath();
			c.arc(x, y, cr, 0, FULL_CIRCLE);
			c.fill();
			c.closePath();
			
			if (minute % 5 == 0) {
				var hour = minute / 5;
				c.fillStyle = inverted ? '#aaa' : '#444';
				c.strokeStyle = c.fillStyle;
				c.fillText(hour, x, y);
			}
		}
		
		// hour hand
		var hourHandWidth = s * 0.020;
		var hourHandLength = 0.5 * r;
		var harc = now.getHours() * FULL_CIRCLE / 12;
		c.fillStyle = inverted ? '#bbd' : '#222232';
		_clock_rect(c, mx, my, hourHandWidth, hourHandLength, harc);
		
		// minute hand
		var minuteHandWidth = s * 0.015;
		var minuteHandLength = 0.9 * r;
		var marc = now.getMinutes() * FULL_CIRCLE / 60;
		c.fillStyle = inverted ? '#aac' : '#444452';
		_clock_rect(c, mx, my, minuteHandWidth, minuteHandLength, marc);
	
		// hide ugly rectangles
		c.beginPath();
		c.arc(mx, my, hourHandWidth * 1.2, 0, FULL_CIRCLE);
		c.fill();
		c.closePath();
		
		if (settings.clockMode == CLOCK_ANALOG_EXTENDED) {
			var secHandWidth = s * 0.005;
			var secHandLength = 0.95 * r;
			var sarc = now.getSeconds() * FULL_CIRCLE / 60;
			c.fillStyle = inverted ? '#caa' : '#524444';
			_clock_rect(c, mx, my, secHandWidth, secHandLength, sarc);
			
			// hide ugly rectangles
			c.beginPath();
			c.arc(mx, my, secHandWidth * 1.2, 0, FULL_CIRCLE);
			c.fill();
			c.closePath();
			
			clock_timeout = window.setTimeout(clock_update, (1000 - now.getMilliseconds()));
		} else {
			clock_timeout = window.setTimeout(clock_update, (60 - now.getSeconds()) * 1000 + (1000 - now.getMilliseconds()));
		}
		break;
	}
}

function _simpleClock_fit() {
	var clockField = $('#clock');
	var textField = $('<span style="white-space:pre;position:absolute;left:0;top:0;"/>');
	textField.text('04:44');
	clockField.append(textField);
	var avh = $(window).height();
	var avw = $(window).width();
	var facMax = 0.925;
	var facMin = 0.8;
	var wfac = Math.max(facMin, Math.min(facMax, facMin + (avw-1000) * (facMax-facMin) / 1000));
	avw *= wfac;
	var fontSizeGuess = Math.min(avw * 0.4, avh);
	_resizeToFit(textField, fontSizeGuess, avw, avh);
	clockField.css('font-size', textField.css('font-size'));
	var pad = Math.floor((avh - textField.height()) / 2);
	clockField.css('top', pad + 'px');
	textField.remove();
}

function _clock_configAnalog() {
	var clockCanvas = $('#clock')[0];
	clockCanvas.width = window.innerWidth;
	clockCanvas.height = window.innerHeight;
	clock_update();
}

function ui_clock_toggle(incr) {
	var val = (settings.clockMode + incr + CLOCK_STATE_COUNT * Math.abs(incr)) % CLOCK_STATE_COUNT;
	message((val != CLOCK_DISABLED) ? CLOCK_NAMES[val] + ' clock enabled' : 'Clock disabled');
	clock_set(val);
}

function invc_set(val) {
	if (val == settings.invertedColors) return;
	settings.invertedColors = val;
	
	if (val) {
		$('html').addClass('inverted');
	} else {
		$('html').removeClass('inverted');
	}
	clock_update();
}

function ui_invc_toggle() {
	var val = !settings.invertedColors;
	invc_set(val);
	message('Colors ' + (val ? 'inverted' : 'restored to default') + '.');
}

function hideCursor_set(val) {
	if (settings.hideCursor == val) return;
	settings.hideCursor = val;
	if (val) {
		$('html').addClass('nocursor');
	} else {
		$('html').removeClass('nocursor');
	}
}

function ui_hideCursor_toggle() {
	var val = !settings.hideCursor;
	hideCursor_set(val);
	message('Cursor ' + (val ? 'hidden' : 'visible (move mouse to find it)') + '.');
}

function cancelAll() {
	for (var i = 0;i < dialogCancelFuncs.length;i++) {
		dialogCancelFuncs[i]();
	}
}

function onKeyDown(ev) {
	if (ev.ctrlKey || ev.metaKey) {
		return true;
	}
	
	switch(ev.keyCode) {
	case 46: // Delete
		messages_clean();
		break;
	case 8: // Backspace
		settings_set(defaultSettings);
		message('Default settings restored.');
		break;
	case 27: // Esc
		cancelAll();
		clock_set(CLOCK_DISABLED);
		silent_set(false);
		invc_set(false);
		hideCursor_set(true);
		messages_clean();
		settings_save();
		break;
	case 83: // s
		ui_silent_toggle();
		settings_save();
		break;
	case 67: // c
		ui_clock_toggle(ev.shiftKey ? -1 : 1);
		settings_save();
		break;
	case 73: // i
		ui_invc_toggle();
		settings_save();
		break;
	case 85:
		ui_hideCursor_toggle();
		settings_save();
		break;
	case 0: // Alt Gr
	case 9: // Tab
	case 16: // Shift
	case 17: // Ctrl
	case 18: // Alt
	case 91: // Win
	case 116: // F5
	case 122: // F11
		return true;
	case 72: // h
		message(
			'Esc - Restore a black screen\n' +
			'Backspace - Restore default settings\n' +
			'Del - Delete all messages\n' +
			'c - Toggle clock mode (Simple, Extended, Off).\n' +
			's - Toggle silent mode.\n' +
			'u - Show/Hide cursor.\n' +
			'h - This help message\n'
		);
		break;
	default:
		message('Unrecognized key #' + ev.keyCode + '. Press h for help');
	}
	return false;
}

function onUpdateReady() {
	message('You can now update bg-js: Press F5 to reload');
	applicationCache.swapCache();
}

$(function() {
	$(document).keydown(onKeyDown);
	settings_load();
	
	if (!isFirstRun && typeof(applicationCache) != 'undefined') {
		applicationCache.addEventListener('updateready', onUpdateReady, false);
	}
});
