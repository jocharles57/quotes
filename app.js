var express = require("express");
var engines = require("consolidate");
var bodyParser = require("body-parser");
var MongoClient = require("mongodb").MongoClient;
var assert = require("assert");

var app = express();

app.engine = ('pug', engines.pug);
app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({ extended: true })); 

// Handler for internal server errors
function errorHandler(err, req, res, next) {
    console.error(err.message);
    console.error(err.stack);
    res.status(500).render('error_template', { error: err });
}

app.use(express.static('./public'));

/* Allow cross-origin resource sharing. */
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


// Mongodb connection variables.
var db_name = 'quotes';
var mongo_connection_string = 'mongodb://localhost:27017/' + db_name;
// If deployed to Openshift server.
if (process.env.OPENSHIFT_MONGODB_DB_URL) {
  mongo_connection_string = process.env.OPENSHIFT_MONGODB_DB_URL + db_name;
}

MongoClient.connect(mongo_connection_string, function(err, db) {
  
  assert.equal(null, err);
  console.log("Successfully connected to MongoDB.");
  
  var collection = db.collection('barry');
  
  // get and post routes here.
  app.get("/", function(req, res) {
    res.render("index");
  });
  
  app.post("/add_quote", function(req, res) {
    var author = req.body.author;
    var quote = req.body.quote;
    
    collection.insert({"author": author, "quote": quote});
    res.send("Quote added to database");
  });
  
  // Display list of quotes.
  app.get('/quotes', function(req, res) {
    collection.find({}).toArray(function(err, docs) {
      res.render('quotes', {list : docs });
    });
  });
  
  // Get random quote.
  app.get('/random', function(req, res) {
    collection.count({}, function(err, count) {
        //console.log("count: " + count);
        var skipAmount = Math.floor(Math.random() * count);
        //console.log("skipAmount: " + skipAmount);
        collection.find({}, {"_id": 0}).skip(skipAmount).limit(1).toArray(function(err, docs) {
          //res.render('random', {quote: docs[0].quote});
          res.json(docs[0]);
        });
    });
  });

  app.get('/health', function(req, res) {
    res.writeHead(200);
    res.end();
  });

  // Openshift server deployment || local development.
  var port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
  var ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

  var server = app.listen(port, ip_address, function() {
    console.log("Express server listening on %s, port %s", ip_address, port);
  });
});


app.use(errorHandler);
  

