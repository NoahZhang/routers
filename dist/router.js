import HttpError from 'http-errors'
import methods from 'methods'
import Route from './route'

export default class Router{
  constructor(app, opts) {
    if(app && !app.use) {
      opts = app;
      app = null;
    }

    if(!(this instanceof Router)) {
      if (app) {
        var router = new Router(app, opts);
        app.use(router.allowMethods());
        return router.routes();
      } else {
        return new Router(app, opts);
      }
    }

    this.opts = opts || {};
    this.methods = this.opts.methods || [
      'HEAD',
      'OPTIONS',
      'GET',
      'PUT',
      'PATCH',
      'POST',
      'DELETE'
    ];

    this.params = {};
    this.stack = {
      middleware: [],
      routes: []
    };

    if(app) this.extendApp(app);

    methods.forEach(method => {
      this[method] = function(name, path, middleware) {
        var args = Array.prototype.slice.call(arguments);
        if((typeof path === 'string') || (path instanceof RegExp)) {
          args.splice(2, 0, [method]);
        } else {
          args.splice(1, 0, [method]);
        }

        this.register.apply(this, args);
        return this;
      }
    });
  }

  use(middleware) {
    this.stack.middleware.push.apply(this.stack.middleware, arguments);
    return this;
  }

  prefix(prefix) {
    this.opts.prefix = prefix;

    this.stack.routes.forEach(route => {
      route.setPrefix(prefix);
    });

    return this;
  }

  routes() {
    var router = this;

    return function *dispatch(next) {
      var method = this.method;
      var path = router.opts.routerPath || this.routerPath || this.path;
      var matched = router.match(path);
      var route = matched.filter(route => {
        return ~route.methods.indexOf(method);
      }).shift();

      if(this.matched) {
        this.matched.push.apply(this.matched, matched);
      } else {
        this.matched = matched;
      }

      if(route) {
        this.captures = route.captures(path);
        this.params = route.params(path, this.captures);
        this.route = route;

        next = this.route.middleware.call(this, next);

        for(let i = router.stack.middleware.length - 1; i >= 0; --i) {
          next = router.stack.middleware[i].call(this, next);
        }

        yield *next;
      } else {
        return yield *next;
      }
    }
  }

  middleware() {
    return this.routes();
  }

  allowedMethods(options) {
    options = options || {};
    var implemented = this.methods;

    return function *allowedMethods(next) {
      yield *next;

      var allowed = {};

      if(!this.status || this.status === 404) {
        this.matched.forEach(route => {
          route.methods.forEach(method => {
            allowed[method] = method;
          });
        });

        var allowedArr = Object.keys(allowed);

        if (!~implemented.indexOf(this.method)) {
          if(options.throw) {
            throw new HttpError.NotImplemeted();
          } else {
            this.status = 501;
            this.set('Allow', allowedArr);
          }
        } else if (allowedArr.length) {
          if (this.method === 'OPTIONS') {
            this.status = 204;
          } else if(!allowed[this.method]) {
            if (options.throw) {
              throw new HttpError.MethodNotAllowed();
            } else {
              this.status = 405;
            }
          }
          this.set('Allow', allowedArr);
        }
      }
    };
  }

  all(name, path, middleware) {
    var args = Array.prototype.slice.call(arguments);
    args.splice(typeof path === 'function' ? 1 : 2, 0, methods);

    this.register.apply(this, args);
    return this;
  }

  redirect(source, destination, code) {
    if (source instanceof RegExp || source[0] != '/') {
      source = this.url(source);
    }

    if (destination instanceof RegExp || destination[0] != '/') {
      destination = this.url(destination);
    }

    return this.all(source, function *(){
      this.redirect(destination);
      this.status = code || 301;
    });
  }

  register(name, path, methods, middleware) {
    if(path instanceof Array) {
      middleware = Array.prototype.slice.call(arguments, 2);
      methods = path;
      path = name;
      name = null;
    } else {
      middleware = Array.prototype.slice.call(arguments, 3);
    }

    var route = new Route(path, methods, middleware, name, this.opts);

    if(this.opts.prefix) {
      route.setPrefix(this.opts.prefix);
    }

    Object.keys(this.params).forEach(param => {
      route.param(param, this.params[param]);
    }, this);

    this.stack.routes.push(route);

    return route;
  }

  route(name) {
    var routes = this.stack.routes;

    for(let len = routes.length, i = 0; i<len; i++) {
      if(routes[i].name === name) {
        return routes[i];
      }
    }

    return false;
  }

  url(name, params) {
    var route = this.route(name);

    if(route) {
      var args = Array.prototype.slice.call(arguments, 1);
      return route.url.apply(route, args);
    }

    return new Error("No route found for name: " + name);
  }

  match(path) {
    var routes = this.stack.routes;

    var matched = [];

    for(let len = routes.length, i = 0; i < len; i++) {
      if(routes[i].match(path)) {
        matched.push(routes[i]);
      }
    }

    return matched;
  }

  param(param, middleware) {
    this.params[param] = middleware;
    this.stack.routes.forEach(route => {
      route.param(param, middleware);
    });

    return this;
  }

  extendApp(app) {
    var router = this;

    app.url = router.url.bind(router);
    app.router = router;

    ['all', 'redirect', 'register', 'del', 'param']
    .concat(methods)
    .forEach(method => {
      app[method] = function() {
        router[method].apply(router, arguments);
        return this;
      };
    });

    return app;
  }
}
