const low = require('lowdb')
const helmet = require('helmet');
const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const refresh = require('passport-oauth2-refresh');
const strategy = require('passport-twitch.js').Strategy;
require('dotenv').config();

const app = express();
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ users: [] }).write()

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(helmet());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(bodyParser.urlencoded({ extended: true}));
app.use(express.static('./static'));
passport.serializeUser((u,d) => {
     d(null,u);
});

passport.deserializeUser((u,d) => {
     let find = db.get('users').find({ id: "u.id" }).value()
     if(typeof find !== "undefined"){
          d(null,u);
     }
});

let TwitchStrategy = new strategy({
          clientID: process.env.TWITCH_ID,
          clientSecret: process.env.TWITCH_SECRET,
          callbackURL: "http://localhost:3000/auth/twitch/callback",
          scope: ["user_read"]
     }, (accesstoken, refreshToken, profile, done) => {
          return done(null, profile);
});

passport.use(TwitchStrategy);
refresh.use(TwitchStrategy);

app.get('/', (req, res) => {
     res.render('index.ejs')
});
    
app.get('/login', passport.authenticate('twitch.js'));

app.get('/check', async(req, res) => {
     
     console.log(req.cookies.auth)
     if(typeof req.cookies.auth === "undefined"){
          console.log("not loged in")
          res.send("Necesitas logear")
     }else{
          console.log("loged in ")
          let find = await db.get('users').find({ _id: req.cookies.auth.toString() }).value()
          console.log(find)
          res.json(find)
     }
})
  
app.get('/auth/twitch/callback', passport.authenticate('twitch.js', { failureRedirect: '/' }), (req, res) => {
     let user = {
          _id: Date.now().toString(),
          id: req.session.passport.user.id,
          user: req.session.passport.user.login,
          avatar: req.session.passport.user.profile_image_url
     }
     let find = db.get('users').find({ id: user.id }).value()
     if(typeof find == "undefined"){
          db.get('users').push( user ).write()
          res.cookie('auth', user._id, {
               maxAge: 60000
          });
          res.redirect('/');
     }else{
          res.redirect('/');
     }
});

app.post('/makeguess', (req,res)=>{
     let lat = req.body.lat;
     let long = req.body.long;
     let id = req.body.id;
     res.json(req.body)
})

app.listen( 3000, ()=>{
     console.log("Running");
})
