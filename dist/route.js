import compose from 'koa-compose'
import pathToRegExp from 'path-to-regexp'
import concatRegExp from 'concat-regexp'

export default class Route{
  constructor(path, methods, middleware, name, opts) {
    this.name = name || null;
    this.opts = opts;
    this.methods = [];
    methods.forEach(method => {
      var l = this.methods.push(method.toUpperCase());
      if(this.methods[l-1] === 'GET') {
        this.methods.unshift('HEAD');
      }
    }, this);

    this.paramNames = [];

    this.fns = {
      params:{},
      middleware:[]
    };

    if (path instanceof RegExp) {
      this.regexp = path;
    } else {
      this.path = path;
      this.regexp = pathToRegExp(path, this.paramNames, opts);
    }

    middleware.forEach(fn => {
      var type = (typeof fn);
      if (type !== 'function') {
        throw new Error(
          methods.toString() + " `" + (name || path) + "`: `middleware` "
          + "must be a function, not `" + type + "`"
        );
      }
    });

    this.middleware = middleware.length > 1 ? compose(middleware) : middleware[0];

    this.fns.middleware = middleware;
  }

  match(path) {
    return this.regexp.test(path);
  }

   safeDecodeURIComponent(text) {
    try {
      return decodeURIComponent(text);
    } catch (e) {
      return text;
    }
  }

  params(path, captures) {
    var params = {};

    for(let len = captures.length, i=0; i<len; i++) {
      if(this.paramNames[i]) {
        var c = captures[i];
        params[this.paramNames[i].name] = c ? this.safeDecodeURIComponent(c) : c;
      }
    }

    return params;
  }

  captures(path) {
    return path.match(this.regexp).slice(1);
  }

  url(params) {
    var args = params;
    var url = this.path || this.regexp.source;

    if (typeof params != 'object') {
      args = Array.prototype.slice.call(arguments);
    }

    if (args instanceof Array) {
      for(let len = args.length, i=0; i < len; i++) {
        url = url.replace(/:[^\/]+/, args[i]);
      }
    } else {
      for(let key in args) {
        url = url.replace(':' + key, args[key]);
      }
    }

    url.split('/').forEach(component => {
      url = url.replace(component, encodeURIComponent(component));
    });

    return url;
  }

  param(param, fn) {
    var middleware = [];

    this.fns.params[param] = function *(next) {
      yield *fn.call(this, this.params[param], next);
    }

    this.paramNames.forEach(param => {
      var fn = this.fns.params[param.name];
      if(fn) {
        middleware.push(fn);
      }
    }, this);

    this.middleware = compose(middleware.concat(this.fns.middleware));

    return this;
  }

  setPrefix(prefix) {
    if(this.path) {
      this.path = prefix + this.path;
      this.paramNames = [];
      this.regexp = pathToRegExp(this.path, this.paramNames, this.opts);
    } else {
      var source = this.regexp.source;
      var flags = this.regexp.ignoreCase ? 'i' : '';
      var path = new RegExp(source.replace(/^\^/, ''), flags);
      prefix = new RegExp(('^' + prefix).replace(/\//g, '\\/'));
      this.regexp = concatRegExp(prefix, path);
    }

    return this;
  }
}
