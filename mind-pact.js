(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['MP'], factory);
	} else {
		root.MP = factory(root.b);
	}
}(this, function(__global) {
	var QuotedString = /"(?:\.|(\\\")|[^\""\n])*"|'(?:\.|(\\\')|[^\''\n])*'/g, //引号字符串
		$NULL = null,
		$UNDEFINED,
		$TRUE = !$UNDEFINED,
		$FALSE = !$TRUE,
		_placeholder = function(prefix) {
			return (prefix || "@") + Math.random().toString(36).substr(2)
		},
		$ = {
			//判断是否为字符串
			isS: function(str) {
				return typeof str === "string"
			},
			//判断是否为数组
			isA: function(obj) {
				return obj instanceof Array;
			},
			//判断是否为函数
			isF: function(obj) {
				return typeof obj === "function"
			},
			//Object.assign
			assign: Object.assign || function(target) {
				'use strict';
				if (target == null) {
					throw new TypeError('Cannot convert undefined or null to object');
				}

				target = Object(target);
				for (var index = 1; index < arguments.length; index++) {
					var source = arguments[index];
					if (source != null) {
						for (var key in source) {
							if (Object.prototype.hasOwnProperty.call(source, key)) {
								target[key] = source[key];
							}
						}
					}
				}
				return target;
			}
		};

	//JS对象的获取
	//\[\]hash取值现在已经在model.get中支持
	var _obj_get_reg = /([^\^\~\+\-\*\/\%\=\&\|\?\:\s\(\)\{\}\:\;\'\"\,\<\>\@\#\!]+)/g;
	var const_key = {
		"true": $TRUE,
		"false": $FALSE,
		"undefined": $UNDEFINED,
		"null": $NULL,
		"NaN": NaN,
	}

	function MP(basedata) {
		var self = this;
		if (!(self instanceof MP)) {
			return new MP(basedata);
		}
		//不对baseData做特殊处理，支持任意类型包括空类型的数据，且数据类型可任意更改
		self._database = basedata;
	};
	var Key_Getter_Factory_Cache = MP._Factory_Cache = {};
	var PLA = MP.PLA = "PLA"; //_placeholder("PLA");

	function PLA_Handle(match, vm, context) {
		if (match.T === 0) {
			return vm.get(match.V)
		}
		if (match.T === 1) {
			return match.V
		}
	}
	MP.default_content = {};
	MP.formatKey = function(key, context) {
		if (!key) {
			var res = [];
			res.__context = context;
			return res;
		}
		context = context ? $.assign({}, MP.default_content, context) : $.assign({}, MP.default_content);

		var _exp_fun_prefix = _placeholder("_F")
		var _str_ph = _placeholder("_s");
		var _release_ph_reg = new RegExp(_str_ph + "[\\d]+" + _str_ph, "g");
		var _release_ph_foo = function(str) {
			return str.replace(_release_ph_reg, function(matchPh) {
				return _str_maps[matchPh];
			})
		};
		var _str_maps = {};
		var index = 0;
		key = key.replace(QuotedString, function(matchStr) {
			index += 1;
			var key = _str_ph + index + _str_ph;
			_str_maps[key] = matchStr;
			return key;
		});

		function _format_key(str, layer) {
			var res = [];
			var i = 0;
			var pre_i = 0;
			var len = str.length;
			var col = 0;
			var c;
			do {
				c = str.charAt(i);
				if (col === 0) {
					if (c === ".") {
						res.push(_release_ph_foo(str.substring(pre_i, i)));
						pre_i = i + 1;
					} else if (c === "[") {
						col += 1;
						pre_i !== i && res.push(_release_ph_foo(str.substring(pre_i, i)));
						pre_i = i + 1;
					}
				} else {
					if (c === "[") {
						col += 1;
					} else if (c === "]") {
						col -= 1;
						if (col === 0) {
							var exp_str = str.substring(pre_i, i);
							var exp_matchs = [];
							var exp_pattern = exp_str.replace(_obj_get_reg, function(matchStr) {
								var exp_match_index = exp_matchs.length;
								// 如果是字符串、数字等变量，或者true、false等常量，直接返回，不直接支持正则
								// 全局的函数或者对象比如Math、String等，必须使用外部特定声明
								// 正则使用外部声明函数来进行替代，避免表达式模式过于复杂
								if (_release_ph_reg.test(matchStr)) {
									// 获取实际字符串值
									matchStr = _release_ph_foo(matchStr);
									exp_matchs.push({
										T: 1,
										// 删除字符串两边的引号
										V: matchStr.substr(1, matchStr.length - 2)
									});
								} else if (isFinite(matchStr)) {
									exp_matchs.push({
										T: 1,
										V: +matchStr
									});
								} else if (const_key.hasOwnProperty(matchStr)) {
									exp_matchs.push({
										T: 1,
										V: const_key[matchStr]
									});
								} else if (matchStr.indexOf("__context.") === 0 || matchStr === "__context" ||
									matchStr.indexOf("__vm.") === 0 || matchStr === "__vm" ||
									matchStr.indexOf("__global.") === 0 || matchStr === "__global") { //表达式中的关键字
									return matchStr;
								} else {
									// 要注意的是，除了被格式化的paths_str，其它默认使用JS表达式的，是要注意不支持obj.1这样的数字写法
									var child_res = _format_key(matchStr, layer + 1);
									if (context.hasOwnProperty(child_res[0])) {
										return "__context." + matchStr
									} else {
										exp_matchs.push({
											T: 0,
											V: child_res
										});
									}
								}
								return PLA + "(matchs[" + exp_match_index + "],__vm,__context)";
							});

							// console.log("exp_pattern:", exp_pattern)
							// console.log("exp_matchs:", exp_matchs)

							var exp_fun = (
								Key_Getter_Factory_Cache[exp_pattern] ||
								(Key_Getter_Factory_Cache[exp_pattern] = new Function("matchs,__context,__global," + PLA, "return function(__vm){return " + exp_pattern + "}"))
							)(exp_matchs, context, __global, PLA_Handle);

							res.push(exp_fun);


							if (str.charAt(i + 1) === ".") {
								i += 1;
								// console.warn(key, "at ", i, "]" + c, "must be", "].");
							}
							// console.log(i, len, res)
							pre_i = i + 1;
						}
					}
				}
				i += 1;
			} while (i < len);
			// console.log("~:",pre_i,i,len,str.substring(pre_i, i));
			(pre_i < i) && res.push(_release_ph_foo(str.substring(pre_i, i)));
			return res;
		}
		var res = _format_key(key, 0);
		res.__context = context;
		return res;
	};

	MP.prototype = {
		set: function(paths, value, context) {
			var self = this;
			var database = self._database;
			var res = database;
			if (!$.isA(paths)) {
				paths = MP.formatKey(paths, context);
			}
			var path;
			var his_paths = [];
			for (var i = 0, len = paths.length; i < len; i += 1) {
				path = paths[i];
				if (!$.isS(path)) {
					path = path(self)
				}
				if (i === len - 1) {
					var res_last_item = res[path];
					if (res_last_item && res_last_item.T === CTK) {
						var pre_path_str = his_paths.join(".");
						res_last_item.S.call(this, path, value, pre_path_str, pre_path_str + "." + path);
					} else {
						res[path] = value;
					}
				} else {
					if (!res[path]) {
						// 整数型的属性默认使用数组来进行创建
						res = res[path] = /^[0-9]+$/.test(path) ? [] : {}
					} else {
						res = res[path]
						if (res && res.T === CTK) {
							var pre_path_str = his_paths.join(".");
							res = res.G.call(this, path, pre_path_str, pre_path_str + "." + path);
						}
					}
				}
				his_paths.push(path);
			}
			return paths;
		},
		get: function(paths, context) {
			var self = this;
			var database = self._database;
			var res = database;
			if (!$.isA(paths)) {
				paths = MP.formatKey(paths, context);
			}
			var path;
			var his_paths = [];
			for (var i = 0, len = paths.length; i < len && res; i += 1) {
				path = paths[i];
				if ($.isF(path)) {
					path = path(self)
				}
				res = res[path];
				if (res && res.T === CTK) {
					var pre_path_str = his_paths.join(".")
					res = res.G.call(this, path, pre_path_str, pre_path_str + "." + path)
				}
				his_paths.push(path);
			}
			return res;
		},
		setSource: function(paths, value, context) {
			//注意：这种做法会导致中间某个值如果也是CustomType，那么它会无法工作
			CTK = PL_CTK;
			var res = this.set(paths, value, context)
			CTK = MP.CTK;
			return res;
		},
		getSource: function(paths, context) {
			CTK = PL_CTK;
			var res = this.get(paths, context)
			CTK = MP.CTK;
			return res;
		}
	};

	var CTK = MP.CTK = "@Costom-Type-Key@";
	var PL_CTK = _placeholder("CTK");
	/*
	 * 使用鸭子类型来实现自定义数据
	 * 在setter、getter等表达式在使用字符串表达的时候，能使得JSON能正确的运作
	 */
	var c_id = 0;

	function CustomType(getter, setter) {
		var type_err = " must\n be : expression(string) \n or : [ expression(string) [, context(any)] ] \n or : function";
		if ($.isS(getter) || ($.isA(getter) && $.isS(getter[0]))) {
			if ($.isS(getter)) {
				var getter_context = {
					//关键字占位
					__id: c_id++,
					$cur_key: $NULL,
					$pre_path_str: $NULL,
					$full_path_str: $NULL,
				};
				var path_str = getter;
			} else {
				var path_str = getter[0];
				// 无需关注值的顺序，后面运行的时候会动态赋值
				getter_context = $.assign(getter_context, getter[1]);
			}
			var _getter_paths = MP.formatKey("[" + path_str + "]", getter_context);
			getter_context = _getter_paths.__context;
			var _inner_getter = _getter_paths[0];
			getter = function($cur_key, $pre_path_str, $full_path_str) {
				if (!res.L) {
					getter_context.$cur_key = $cur_key;
					getter_context.$pre_path_str = $pre_path_str;
					getter_context.$full_path_str = $full_path_str;
					getter_context.$cur_value = res.V;
					res.L = $TRUE;
					res.V = _inner_getter(this);
					res.L = $FALSE;
				}
				return res.V;
			}
		} else if (!$.isF(getter)) {
			throw TypeError("getter" + type_err)
		}
		if (!setter) {
			setter = function($cur_key, $new_value) {
				res.V = $new_value
			};
		} else if ($.isS(setter) || ($.isA(setter) && $.isS(setter[0]))) {
			var setter_context = {
				//关键字占位
				$cur_key: $NULL,
				$new_value: $NULL,
				$old_value: $NULL,
				$pre_path_str: $NULL,
				$full_path_str: $NULL
			};
			if ($.isS(setter)) {
				var path_str = setter;
			} else {
				var path_str = setter[0];
				// 无需关注值的顺序，后面运行的时候会动态赋值
				setter_context = $.assign(setter_context, setter[1]);
			}
			var _setter_paths = MP.formatKey("[" + path_str + "]", setter_context);
			setter_context = _setter_paths.__context;
			var _inner_setter = _setter_paths[0];
			setter = function($cur_key, $new_value, $pre_path_str, $full_path_str) {
				if (res.L) {
					res.V = $new_value
				} else {
					setter_context.$cur_key = $cur_key;
					setter_context.$new_value = $new_value;
					setter_context.$old_value = res.V;
					setter_context.$pre_path_str = $pre_path_str;
					setter_context.$full_path_str = $full_path_str;
					var setter_key = _inner_setter(this);
					if (setter_key === $UNDEFINED || setter_key === $NULL || setter_key === $FALSE) {
						res.V = $new_value
					} else {
						res.L = $TRUE;
						vm.set(setter_key, $new_value);
						res.L = $FALSE;
					}
				}
			}
		} else if (!$.isF(setter)) {
			throw TypeError("setter" + type_err)
		}
		var res = {
			T: CTK,
			G: getter,
			S: setter,
			//lock，避免setter、getter运行无限循环
			L: $FALSE,
			// 用来缓存上一次Setter、Getter返回的数据
			V: $NULL
		};
		return res;
	};
	MP.CustomType = CustomType;

	return MP;
}));