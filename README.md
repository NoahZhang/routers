routers
=================
Using babel enhance [koa-router][1].Add namespace and named middleware.

## Added function
1. Named middleware

**Example**  
Basic usage:

```javascript
 var router = new Router();
 var middlewareCount = 0;
 
 var middlewareA = function *(next) {
   middlewareCount++;
   yield next;
 };
 
 var middlewareB = function *(next) {
   middlewareCount++;
   yield next;
 };

 router.registerMiddleware("A", middlewareA);
 router.registerMiddleware("B", middlewareB);

 router.get('/users/:id', {middleware: 'A|B'}, function *() {
   this.body = { hello: 'world' };
 });
```
2. Route group

**Example**  
Basic usage:

```javascript
 var router = new Router();

 router.group({prefix: '/things/:thing_id'}, function() {
   router.get('/', function *() {
     this.body = 'test';
   });

   router.get('/users/:id', function *() {
     this.body = 'test';
   });
 });

```

## TODO
1. Middleware group
2. Controller maybe not
3. CORS
[1]:https://github.com/alexmingoia/koa-router
