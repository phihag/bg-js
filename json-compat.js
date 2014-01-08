if (typeof(JSON) == 'undefined') {
var JSON = {parse: eval};
JSON.stringify = function(obj) {
	switch (typeof(obj)) {
	case 'boolean':
	case 'number':
		return obj.toString();
	case 'string':
		var res = '"';
		for (var i = 0;i < obj.length;i++) {
			var cc = obj.charCodeAt(i);
			if (cc == 34 || cc == 92) { // double quotes (") || backslash (\)
				res += '\\' + String.fromCharCode(cc);
			} else if (cc <= 0x1f) {
				var hexStr = cc.toString(16);
				while (hexStr.length < 4) hexStr = '0' + hexStr;
				res += '\\u' + hexStr;
			} else {
				res += String.fromCharCode(cc);
			}
		}
		res += '"';
		return res;
	case 'object':
		if (obj == null) return 'null';
		var first = true;
		var res;
		
		if (toString.call(obj) === "[object Array]") {
			res = '[';
			for (var i = 0;i < obj.length;i++) {
				if (first) {
					first = false;
				} else {
					res += ',';
				}
				JSON.stringify(obj[i]);
			}
			res += ']';
			return res;
		}
		
		res = '{';
		for (k in obj) {
			if (first) {
				first = false;
			} else {
				res += ',';
			}
			res += JSON.stringify(k);
			res += ':';
			res += JSON.stringify(obj[k]);
		}
		res += '}';
		
		return res;
	default:
		throw 'Cannot serialize objects of type "' + typeof(obj) + '"';
	}
};
}
