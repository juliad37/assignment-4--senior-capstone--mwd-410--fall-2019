const express = require(`express`);
const app = express();
const bodyParser = require(`body-parser`);
const bcrypt = require(`bcrypt`);
const session = require(`express-session`);
const cookie = require(`cookie-parser`);
const saltRounds = 10;
const mongoDB = require(`mongodb`);
const mongoClient = mongoDB.MongoClient;
const HOST = `localhost`;
const dbPort = `27017`;
const dbURL = `mongodb://${HOST}`;
const dbName = `project`;
const dbCollection = `users`;
const dbCollection2 = `crtiques`;
const PORT = 3000;
const port = (process.env.PORT || PORT);
const colors = {
    reset: `\x1b[0m`,
    red: `\x1b[31m`,
    green: `\x1b[32m`,
    yellow: `\x1b[33m`,
};

let db;



mongoClient.connect(`${dbURL}:${dbPort}`,{ useUnifiedTopology: true }, (err, client) => {
    if (err) {
        return console.log(err);
    } else {
        db = client.db(dbName);

        console.log(`MongoDB successfully connected:`);
        console.log(`\tMongo URL:`, colors.green, dbURL, colors.reset);
        console.log(`\tMongo port:`, colors.green, dbPort, colors.reset);
        console.log(`\tMongo database name:`,
            colors.green, dbName, colors.reset, `\n`);
    }
});

app.listen(port, HOST, () => {
    console.log(`Host successfully connected:`);
    console.log(`\tServer URL:`, colors.green, `localhost`, colors.reset);
    console.log(`\tServer port:`, colors.green, port, colors.reset);
    console.log(`\tVisit http://localhost:${port}\n`);
});

// Express’ way of setting a variable. In this case, “view engine” to “njk”.


app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

app.set('view engine', 'ejs');



// Express middleware to parse incoming, form-based request data before processing
// form data.
app.use(bodyParser.urlencoded({extended: true}));

// Express middleware to parse incoming request bodies before handlers.
app.use(bodyParser.json());

// Express middleware to server HTML, CSS, and JS files.
app.use(express.static(`views`));

app.use(express.urlencoded());

app.use(session({
    key: 'user',
    secret: 'ccritique',
    resave: false,
    saveUninitialized: false
}));

/**
 * Note:
 *    — All req(uests) are from the client/browser.
 *    — All res(ponses) are to the client/browser.
 */

/**
 * This router handles all GET requests to the root of the web site.
 */


let urlencodedParser = bodyParser.urlencoded({ extended: false });

app.get('/', function (req, res) {
    res.render('html/signup.html');
});

app.get('/signup.html', function (req, res) {
    res.render('html/signup.html');
});

//submitting user records into db
app.post('/signup', urlencodedParser , function (req, res) {
    let email = req.body.email;
    let firstName = req.body.fname;
    let lastName = req.body.lname;
    let username = req.body.usrname;
    let password = req.body.pwd;

    bcrypt.genSalt(10, function(err, salt){
       bcrypt.hash(password, salt, function(err, hash) {
           db.collection(dbCollection).insertOne({firstName, lastName, email, username, password: hash}, (err) => {
               console.log(req.body);
               if (err) {
                   return console.log(err);
               } else {
                   console.log(
                       `Inserted a user into Mongo via an HTML form using POST.\n`);
                   res.redirect(`html/explore.html`);
               }
           });
       });
    });
});

app.get('/explore.html', function (req, res) {
    res.render('html/explore.html');
});

app.get('/login.html', function (req, res) {
    res.render('html/login.html');
});

app.post('/login', urlencodedParser , function (req, res) {

    let password = req.body.pass;

    db.collection(dbCollection).findOne({username: req.body.user}, function(err, user){
        console.log(req.body);
        if (err) {
            return console.log(err);
        }
        if (!user){
            console.log('invalid account login');
            res.redirect("html/login.html");
        } else {
            console.log("comparing pwd now");
            console.log(password);
            console.log(user.password);

            bcrypt.compare(password, user.password, function(err, match){
               if(err){
                   console.log(err);
               }
               if(match){
                   console.log("valid account holder");
                   req.session.userId = user.username;
                   req.session.userPwd = user.password;
                   console.log("req.session");

                   res.redirect(`html/explore.html`);
               }
               else {
                   console.log("failed login attempt");
                   res.redirect(`html/signup.html`);
               }
            });
        }
    });
});

app.get('/settings.html', function (req, res) {
    res.render('html/settings.html');
});

app.get('/reset', function (req, res) {
    res.render('html/settings.html');
});

app.post('/reset', urlencodedParser , function (req, res) {
    console.log("active");
    let currentUser = req.session.userId;
    let previousPwd = req.session.userPwd;
    let newPwd = req.body.updatedpwd;
    bcrypt.genSalt(10, function(err, salt){
        bcrypt.hash(newPwd, salt, function(err, hash) {
            db.collection(dbCollection).updateOne({password: previousPwd}, {$set: {password: hash}}, (err) => {
                console.log(req.body);
                if (err) {
                    return console.log(err);
                } else {
                    console.log(
                        `Updated a user pwd Mongo via an HTML form using POST.\n`);
                    res.render('html/settings.html');
                    console.log("password successfully reset");
                }
            });
        })
    });
});

app.post('/delete', function (req, res) {
    let currentUser = req.session.userId;
    db.collection(dbCollection).deleteOne({username: currentUser}, (err) => {
       if (err){
           console.log(err);
       } else {
           console.log("a user has been deleted");

           req.session.destroy();
           res.clearCookie('user', {path: '/'});
           res.redirect('html/signup.html');
       }
    });
});

app.get('/profile.html', function (req, res) {
    res.render('html/profile.html');
});

// submitting critiques into db
app.post('/profile', urlencodedParser , function (req, res) {
    db.collection(dbCollection2).insertOne(req.body, (err) => {
        console.log(req.body);

        if (err) {
            return console.log(err);
        } else {
            console.log(
                `Inserted a critique into Mongo via an HTML form using POST.\n`);

            res.redirect(`html/profile.html`);
        }
    });
});



