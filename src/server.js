const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const passport = require('passport');
const refresh = require('passport-oauth2-refresh');
const strategy = require('passport-twitch.js').Strategy;
require('dotenv').config();

const app = express();

app.use(session({
     key: process.env.SESSION_KEY,
     secret: process.env.SESSION_SECRET,
     resave: true,
     saveUninitialized: true,
     cookie:{
          secure: true
     }
}));

app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());

passport.serializeUser((u,d) => {
     d(null,u);
});

passport.deserializeUser((u,d) => {
     d(null,u);
});

let TwitchStrategy = new _strategy({
          clientID: process.env.TWITCH_ID,
          clientSecret: process.env.TWITCH_SECRET,
          callbackURL: "http://localhost:3000/auth/twitch/callback",
          scope: ["guilds", "connections", "email"]
     }, (accesstoken, refreshToken, profile, done) => {
          console.log(profile);
          return done(null, profile);
});

passport.use(TwitchStrategy);
refresh.use(TwitchStrategy);

app.get('/', (req, res) => {
     if(!req.session.user){
          res.redirect('/login');
     }else{
          res.send(`Hello ${req.session.user.display_name}`);
     }
});
    
app.get('/login', passport.authenticate('twitch.js'));
  
app.get('/auth/twitch/callback', passport.authenticate('twitch.js', { failureRedirect: '/' }), (req, res) => {
     req.session.user = req.user;
     console.log(req.user);
     console.log(req.query);
     res.redirect('/');
});

app.listen( 3000, ()=>{
     console.log("Running");
})