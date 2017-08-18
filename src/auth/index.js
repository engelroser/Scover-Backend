import passport from 'passport';
import passportJWT from 'passport-jwt';
import jwt from 'jwt-simple';
import fb from 'fb-node';
import google from 'googleapis';

const googleInfo = token =>
  new Promise( (resolve, reject) => {
    google.oauth2('v2').userinfo.v2.me.get( { access_token: token }, (err, info) => {
      if (err) {
        return reject(err);
      }
      resolve( {id: info.id, firstName: info.given_name, lastName: info.family_name} );
    });
  });

const fbInfo = token => {
  fb.token = token;
  return (
    fb.get('/me?fields=id,first_name,last_name')
    .then(({json:{id:fbId, first_name:firstName, last_name:lastName}}) => ({fbId, firstName, lastName}) )
  );
}

export default ({ config, db }) => {

  const ExtractJwt = passportJWT.ExtractJwt;
  const Strategy = passportJWT.Strategy;
  const params = {
    secretOrKey: config.jwtSecret,
    jwtFromRequest: ExtractJwt.fromExtractors([
      ExtractJwt.fromHeader('x-auth-token'),
      ()=> jwt.encode({anon:true}, config.jwtSecret)
    ])
  };

  var strategy = new Strategy(params, function(payload, done) {

    let user = payload.user || null;
    console.log(payload);
    if (user) {
      return done(null, user);
    } else {
      return done(null, {anon:true});
    }
  });

  passport.use(strategy);

  const User = db.models['user'];
  const DeviceToken = db.models['deviceToken'];

  return {
    extractDeviceToken: function() {
      return (req,res,next) => {
        const token = req.headers['x-push-token'];
        if (token && req.user && req.user.id) {
          User.findById(req.user.id)
          .then(u=> DeviceToken.findOrCreate({where:{userId:u.id}}))
          .then(([dt])=> dt.token != token ? dt.update({token}) : null)
        }
        next();
      }
    },
    initialize: function() {
      return passport.initialize();
    },
    authenticate: function() {
      return passport.authenticate("jwt", config.jwtSession);
    },
    register: function() {
      return (req, res) => {
        if (req.body.email && req.body.password) {
          const {password, email, firstName, lastName} = req.body;
          User.count({
            where: {email},
          })
          .then((c) => {
            if (0==c) {
              User.create({email,password,firstName,lastName})
              .then(function(user) {
                const payload = {user:{id: user.id, email: user.email}};
                const token = jwt.encode(payload, config.jwtSecret);
                res.json({ token });
              });
            } else {
              res.sendStatus(403);
            }
          });
        } else {
            res.sendStatus(401);
        }
    	};
    },
    token: function() {
      return (req, res) => {
        if (req.body.email && req.body.password) {
          const email = req.body.email;
          const password = req.body.password;
          User.findOne({
            where: {email,password},
            attributes: ['id','email','firstName','lastName']
          })
          .then(function(user) {
            if (user) {
              const {id, email, firstName, lastName} = user;
              const token = jwt.encode({user:{id, email}}, config.jwtSecret);
              res.json({ token, user:{firstName, lastName} });
            } else {
              res.sendStatus(401);
            }
          });
        }
        else if (req.body.gtoken) {
          googleInfo(req.body.gtoken)
          .then( googleInfo => Promise.all([
              User.findOrCreate({where:{gId: googleInfo.id}}),
              googleInfo.firstName,
              googleInfo.lastName
            ])
          )
          .then( ([[user, created], firstName, lastName]) => created ? user.update({firstName, lastName}) : user )
          .then(function(user) {
            const payload = {user:{id: user.id, email: user.email}};
            const token = jwt.encode(payload, config.jwtSecret);
            res.json({ token });
          })
          .catch( e => {
            console.error(e);
            res.sendStatus(400);
          });
        } else if (req.body.fbtoken) {
          fbInfo(req.body.fbtoken)
          .then( fbInfo => Promise.all([
              User.findOrCreate({where:{fbId: fbInfo.fbId}}),
              fbInfo.firstName,
              fbInfo.lastName
            ])
          )
          .then( ([[user, created], firstName, lastName]) => created ? user.update({firstName, lastName}) : user )
          .then(function(user) {
            const payload = {user:{id: user.id, email: user.email}};
            const token = jwt.encode(payload, config.jwtSecret);
            res.json({ token });
          })
          .catch( e => {
            console.error(e);
            res.sendStatus(400);
          });
        } else {
            res.sendStatus(401);
        }

    	};
    },
    emailPasswordReset: function(mailer) {
      return (req, res) => {
        if (req.body.email) {
          const email = req.body.email;
          User.findOne({
            where: {email},
            attributes: ['id','email']
          })
          .then(function(user) {
            if (user) {
              const token = jwt.encode({user}, config.jwtSecret);
              const link = req.protocol + '://' + req.get('host') + '/passwordreset/'+token
              mailer.send('passwordRecoveryEmail', {
                  to: user.email,
                  subject: 'Scover Password Recovery',
                  link
                }, function (err) {
                  if (err) {
                    console.error(err);
                    res.sendStatus(500);
                    return;
                  }
                  res.sendStatus(200);;
                });
            } else {
              res.sendStatus(404);
            }
          });
        } else {
          res.sendStatus(400);
        }
      };
    },
    passwordReset: function() {
      return (req, res) => {
        const {user: u} = jwt.decode(req.params.token, config.jwtSecret);
        User.findOne({where:{...u}})
        .then(user => {
          if (user) {
            if (req.method=='GET') {
              res.render('passwordRecoveryForm');
            } else {
              if (req.body.password && req.body.password == req.body.confirm) {
                user.update({password: req.body.password}).then(u=>res.render('passwordRecoveryDone'));
              } else {
                res.sendStatus(400);
              }
            }
          } else {
            res.sendStatus(404);
          }
        });
      }
    }
  };
};
