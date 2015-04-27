var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _HttpError = require('http-errors');

var _HttpError2 = _interopRequireWildcard(_HttpError);

var _methods = require('methods');

var _methods2 = _interopRequireWildcard(_methods);

var _Route = require('./route');

var _Route2 = _interopRequireWildcard(_Route);

var Router = (function () {
  function Router(app, opts) {
    var _this = this;

    _classCallCheck(this, Router);

    if (app && !app.use) {
      opts = app;
      app = null;
    }

    this.opts = opts || {};
    this.methods = this.opts.methods || ['HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE'];

    this.namedMiddleware = {};

    this.params = {};
    this.stack = {
      middleware: [],
      routes: []
    };

    if (app) this.extendApp(app);

    _methods2.default.forEach(function (method) {
      _this[method] = function (name, path, middleware) {
        var args = Array.prototype.slice.call(arguments);
        if (typeof path === 'string' || path instanceof RegExp) {
          args.splice(2, 0, [method]);
        } else {
          args.splice(1, 0, [method]);
        }

        this.register.apply(this, args);
        return this;
      };
    });
  }

  _createClass(Router, [{
    key: 'registerMiddleware',
    value: function registerMiddleware(name, middleware) {
      this.namedMiddleware[name] = middleware;
    }
  }, {
    key: 'group',
    value: function group(routeMeta, func) {
      var routeMeta = routeMeta;

      if (routeMeta.prefix) {
        this.opts.prefix = routeMeta.prefix;
      }

      if (routeMeta.middleware) {
        this.opts.partialMiddleware = routeMeta.middleware;
      }

      func.apply(this);

      this.opts.prefix = null;
      this.opts.partialMiddleware = null;
    }
  }, {
    key: 'use',
    value: function use(middleware) {
      this.stack.middleware.push.apply(this.stack.middleware, arguments);
      return this;
    }
  }, {
    key: 'prefix',
    value: (function (_prefix) {
      function prefix(_x) {
        return _prefix.apply(this, arguments);
      }

      prefix.toString = function () {
        return _prefix.toString();
      };

      return prefix;
    })(function (prefix) {
      this.opts.prefix = prefix;

      this.stack.routes.forEach(function (route) {
        route.setPrefix(prefix);
      });

      return this;
    })
  }, {
    key: 'routes',
    value: function routes() {
      var router = this;

      return function* dispatch(next) {
        var method = this.method;
        var path = router.opts.routerPath || this.routerPath || this.path;
        var matched = router.match(path);
        var route = matched.filter(function (route) {
          return ~route.methods.indexOf(method);
        }).shift();

        if (this.matched) {
          this.matched.push.apply(this.matched, matched);
        } else {
          this.matched = matched;
        }

        if (route) {
          this.captures = route.captures(path);
          this.params = route.params(path, this.captures);
          this.route = route;

          next = this.route.middleware.call(this, next);

          for (var i = router.stack.middleware.length - 1; i >= 0; --i) {
            next = router.stack.middleware[i].call(this, next);
          }

          yield* next;
        } else {
          return yield* next;
        }
      };
    }
  }, {
    key: 'middleware',
    value: function middleware() {
      return this.routes();
    }
  }, {
    key: 'allowedMethods',
    value: function allowedMethods(options) {
      options = options || {};
      var implemented = this.methods;

      return function* allowedMethods(next) {
        yield* next;

        var allowed = {};

        if (!this.status || this.status === 404) {
          this.matched.forEach(function (route) {
            route.methods.forEach(function (method) {
              allowed[method] = method;
            });
          });

          var allowedArr = Object.keys(allowed);

          if (! ~implemented.indexOf(this.method)) {
            if (options.throw) {
              throw new _HttpError2.default.NotImplemeted();
            } else {
              this.status = 501;
              this.set('Allow', allowedArr);
            }
          } else if (allowedArr.length) {
            if (this.method === 'OPTIONS') {
              this.status = 204;
            } else if (!allowed[this.method]) {
              if (options.throw) {
                throw new _HttpError2.default.MethodNotAllowed();
              } else {
                this.status = 405;
              }
            }
            this.set('Allow', allowedArr);
          }
        }
      };
    }
  }, {
    key: 'all',
    value: function all(name, path, middleware) {
      var args = Array.prototype.slice.call(arguments);
      args.splice(typeof path === 'function' ? 1 : 2, 0, _methods2.default);

      this.register.apply(this, args);
      return this;
    }
  }, {
    key: 'redirect',
    value: function redirect(source, destination, code) {
      if (source instanceof RegExp || source[0] != '/') {
        source = this.url(source);
      }

      if (destination instanceof RegExp || destination[0] != '/') {
        destination = this.url(destination);
      }

      return this.all(source, function* () {
        this.redirect(destination);
        this.status = code || 301;
      });
    }
  }, {
    key: 'register',
    value: function register(name, path, methods, middleware) {
      var _this2 = this;

      if (path instanceof Array) {
        middleware = Array.prototype.slice.call(arguments, 2);
        methods = path;
        path = name;
        name = null;
      } else {
        middleware = Array.prototype.slice.call(arguments, 3);
      }

      if (typeof middleware[0] === 'object') {
        var _name = middleware[0].middleware.split('|');

        if (_name.length > 0) {
          middleware.shift();
          for (var len = _name.length, i = len - 1; i >= 0; i--) {
            middleware.unshift(this.namedMiddleware[_name[i]]);
          }
        }
      }

      if (this.opts.partialMiddleware) {
        var _name2 = this.opts.partialMiddleware.split('|');

        if (_name2.length > 0) {
          for (var len = _name2.length, i = len - 1; i >= 0; i--) {
            middleware.unshift(this.namedMiddleware[_name2[i]]);
          }
        }
      }

      var route = new _Route2.default(path, methods, middleware, name, this.opts);

      if (this.opts.prefix) {
        route.setPrefix(this.opts.prefix);
      }

      Object.keys(this.params).forEach(function (param) {
        route.param(param, _this2.params[param]);
      }, this);

      this.stack.routes.push(route);

      return route;
    }
  }, {
    key: 'route',
    value: function route(name) {
      var routes = this.stack.routes;

      for (var len = routes.length, i = 0; i < len; i++) {
        if (routes[i].name === name) {
          return routes[i];
        }
      }

      return false;
    }
  }, {
    key: 'url',
    value: function url(name, params) {
      var route = this.route(name);

      if (route) {
        var args = Array.prototype.slice.call(arguments, 1);
        return route.url.apply(route, args);
      }

      return new Error('No route found for name: ' + name);
    }
  }, {
    key: 'match',
    value: function match(path) {
      var routes = this.stack.routes;

      var matched = [];

      for (var len = routes.length, i = 0; i < len; i++) {
        if (routes[i].match(path)) {
          matched.push(routes[i]);
        }
      }

      return matched;
    }
  }, {
    key: 'param',
    value: (function (_param) {
      function param(_x2, _x3) {
        return _param.apply(this, arguments);
      }

      param.toString = function () {
        return _param.toString();
      };

      return param;
    })(function (param, middleware) {
      this.params[param] = middleware;
      this.stack.routes.forEach(function (route) {
        route.param(param, middleware);
      });

      return this;
    })
  }, {
    key: 'extendApp',
    value: function extendApp(app) {
      var router = this;

      app.url = router.url.bind(router);
      app.router = router;

      ['all', 'redirect', 'register', 'del', 'param'].concat(_methods2.default).forEach(function (method) {
        app[method] = function () {
          router[method].apply(router, arguments);
          return this;
        };
      });

      return app;
    }
  }]);

  return Router;
})();

exports.default = Router;
module.exports = exports.default;
//# sourceMappingURL=router.js.map