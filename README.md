routers
=================
Using babel enhance [koa-router][1].Add namespace and named middleware.

## Added function
1. Named middleware
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
[1]:https://github.com/alexmingoia/koa-router
