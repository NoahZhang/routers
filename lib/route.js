var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _compose = require('koa-compose');

var _compose2 = _interopRequireWildcard(_compose);

var _pathToRegExp = require('path-to-regexp');

var _pathToRegExp2 = _interopRequireWildcard(_pathToRegExp);

var _concatRegExp = require('concat-regexp');

var _concatRegExp2 = _interopRequireWildcard(_concatRegExp);

var Route = (function () {
  function Route(path, methods, middleware, name, opts) {
    var _this = this;

    _classCallCheck(this, Route);

    this.name = name || null;
    this.opts = opts;
    this.methods = [];
    methods.forEach(function (method) {
      var l = _this.methods.push(method.toUpperCase());
      if (_this.methods[l - 1] === 'GET') {
        _this.methods.unshift('HEAD');
      }
    }, this);

    this.paramNames = [];

    this.fns = {
      params: {},
      middleware: []
    };

    if (path instanceof RegExp) {
      this.regexp = path;
    } else {
      this.path = path;
      this.regexp = _pathToRegExp2.default(path, this.paramNames, opts);
    }

    middleware.forEach(function (fn) {
      var type = typeof fn;
      if (type !== 'function') {
        throw new Error(methods.toString() + ' `' + (name || path) + '`: `middleware` ' + 'must be a function, not `' + type + '`');
      }
    });

    this.middleware = middleware.length > 1 ? _compose2.default(middleware) : middleware[0];

    this.fns.middleware = middleware;
  }

  _createClass(Route, [{
    key: 'match',
    value: function match(path) {
      return this.regexp.test(path);
    }
  }, {
    key: 'safeDecodeURIComponent',
    value: function safeDecodeURIComponent(text) {
      try {
        return decodeURIComponent(text);
      } catch (e) {
        return text;
      }
    }
  }, {
    key: 'params',
    value: (function (_params) {
      function params(_x, _x2) {
        return _params.apply(this, arguments);
      }

      params.toString = function () {
        return _params.toString();
      };

      return params;
    })(function (path, captures) {
      var params = {};

      for (var len = captures.length, i = 0; i < len; i++) {
        if (this.paramNames[i]) {
          var c = captures[i];
          params[this.paramNames[i].name] = c ? this.safeDecodeURIComponent(c) : c;
        }
      }

      return params;
    })
  }, {
    key: 'captures',
    value: function captures(path) {
      return path.match(this.regexp).slice(1);
    }
  }, {
    key: 'url',
    value: (function (_url) {
      function url(_x3) {
        return _url.apply(this, arguments);
      }

      url.toString = function () {
        return _url.toString();
      };

      return url;
    })(function (params) {
      var args = params;
      var url = this.path || this.regexp.source;

      if (typeof params != 'object') {
        args = Array.prototype.slice.call(arguments);
      }

      if (args instanceof Array) {
        for (var len = args.length, i = 0; i < len; i++) {
          url = url.replace(/:[^\/]+/, args[i]);
        }
      } else {
        for (var key in args) {
          url = url.replace(':' + key, args[key]);
        }
      }

      url.split('/').forEach(function (component) {
        url = url.replace(component, encodeURIComponent(component));
      });

      return url;
    })
  }, {
    key: 'param',
    value: (function (_param) {
      function param(_x4, _x5) {
        return _param.apply(this, arguments);
      }

      param.toString = function () {
        return _param.toString();
      };

      return param;
    })(function (param, fn) {
      var _this2 = this;

      var middleware = [];

      this.fns.params[param] = function* (next) {
        yield* fn.call(this, this.params[param], next);
      };

      this.paramNames.forEach(function (param) {
        var fn = _this2.fns.params[param.name];
        if (fn) {
          middleware.push(fn);
        }
      }, this);

      this.middleware = _compose2.default(middleware.concat(this.fns.middleware));

      return this;
    })
  }, {
    key: 'setPrefix',
    value: function setPrefix(prefix) {
      if (this.path) {
        this.path = prefix + this.path;
        this.paramNames = [];
        this.regexp = _pathToRegExp2.default(this.path, this.paramNames, this.opts);
      } else {
        var source = this.regexp.source;
        var flags = this.regexp.ignoreCase ? 'i' : '';
        var path = new RegExp(source.replace(/^\^/, ''), flags);
        prefix = new RegExp(('^' + prefix).replace(/\//g, '\\/'));
        this.regexp = _concatRegExp2.default(prefix, path);
      }

      return this;
    }
  }]);

  return Route;
})();

exports.default = Route;
module.exports = exports.default;
//# sourceMappingURL=route.js.map