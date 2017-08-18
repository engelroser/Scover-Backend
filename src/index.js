import http from 'http';
import express from 'express';
import mailer from 'express-mailer';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import initializeDb from './db';
import middleware from './middleware';
import api from './api';
import config from './config.json';
import auth from './auth';
import basicAuth from 'basic-auth';
import s3proxy from 's3-proxy';

let app = express();
app.server = http.createServer(app);

app.use('/$', (req, res, next) => {
  let user = basicAuth(req);
  if (user && user.name == "admin" && user.pass == "admin321!")
    return next();
  else {
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    return res.send(401);
  }
});

// expose static aws resources
app.use('/', express.static(__dirname+'/../public'));

app.get('/static/*', (req,res,next)=>{req.baseUrl="/static"; next()}, s3proxy(config.s3));


// logger
app.use(morgan('dev'));

// 3rd party middleware
app.use(cors({
	exposedHeaders: config.corsHeaders
}));

app.use(bodyParser.json({
	limit : config.bodyLimit
}));

app.use(bodyParser.urlencoded({extended:true}));

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

mailer.extend(app, config.mail);

// connect to db
initializeDb( db => {

	// auth
	let a = auth({config, db});
	app.use(a.initialize());
	app.use(a.authenticate());
	app.use(a.extractDeviceToken());
	app.post('/signup', a.register());
	app.post('/signin', a.token());
	app.post('/passwordreset', a.emailPasswordReset(app.mailer));
	let pwdReset = a.passwordReset();
	app.get('/passwordreset/:token', pwdReset);
	app.post('/passwordreset/:token', pwdReset);

	// internal middleware
	app.use(middleware({ config, db }));

	// api router
	app.use('/api', api({ config, db }));

	app.server.listen(process.env.PORT || config.port);

	console.log(`Started on port ${app.server.address().port}`);
});

export default app;
