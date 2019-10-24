const low = require('lowdb')
const axios = require('axios');
const helmet = require('helmet');
const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const refresh = require('passport-oauth2-refresh');
const strategy = require('passport-twitch.js').Strategy;
require('dotenv').config();

const app = express();
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ users: [], actualGame:[], winnerBoard:[], actualAdress:{} , status: false }).write()

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

app.get('/', async(req, res) => {
     let statusGame = await db.get('status').value()
     let find = await db.get('users').find({ _id: req.cookies.auth }).value()
     if(typeof find !== "undefined"){
          if(statusGame){
               res.render('index.ejs')
          }else{
               res.send("Game not available")
          }
     }else{
          res.send("Logeate")
     }
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

app.post('/startgame', async(req,res)=>{
     let actualAdressSplited = req.body.adress.split(" ").join("+");
     console.log(actualAdressSplited)
     let actualAdress = {}
     axios.get(`https://nominatim.openstreetmap.org/search?q=${actualAdressSplited}&format=json&polygon=1&addressdetails=1`)
          .then(async (response) => {
               actualAdress = {lat : response.data[0].lat, long: response.data[0].lon}
               console.log(actualAdress)
               console.log(response.data[0])
               console.log(`https://nominatim.openstreetmap.org/search?q=${actualAdressSplited}&format=json&polygon=1&addressdetails=1`)
               let find = await db.get('users').find({ _id: req.cookies.auth.toString() }).value()
               if(find.admin){
                    res.send("eres admin : TRUE")
                    db.update('status',value => true).write()
                    db.update('actualAdress', value => actualAdress).write()
               }else{
                    res.send("no eres admin")
               }
     })
})

app.post('/getposibles', async(req,res)=>{
     let actualAdressSplited = req.body.adress.split(" ").join("+");
     axios.get(`https://nominatim.openstreetmap.org/search?q=${actualAdressSplited}&format=json&polygon=1&addressdetails=1`)
          .then(async (response) => {
               let find = await db.get('users').find({ _id: req.cookies.auth.toString() }).value()
               if(find.admin){
                    console.log(response.data);
                    res.send(response.data)
               }else{
                    res.send("no eres admin")
               }
     })
})

app.get('/drawwinner', async(req,res)=>{
     let find = await db.get('users').find({ _id: req.cookies.auth.toString() }).value()
     if(find.admin){
          res.send("eres admin : FALSE")
          db.update('status',value => false).write()
     }else{
          res.send("no eres admin")
     }
})

app.get('/admin', async(req,res)=>{
     let find = await db.get('users').find({ _id: req.cookies.auth.toString() }).value()
     if(find.admin){
          res.render("admin.ejs")
     }else{
          res.send("no eres admin")
     }
})
  
app.get('/auth/twitch/callback', passport.authenticate('twitch.js', { failureRedirect: '/' }), (req, res) => {
     console.log(req.session.passport.user)
     let user = {
          _id: null,
          id: req.session.passport.user.id,
          user: req.session.passport.user.login,
          avatar: req.session.passport.user.profile_image_url,
          admin: false,
     }

     let find = db.get('users').find({ id: user.id }).value()
     if(typeof find == "undefined"){
          user._id = Date.now().toString()
          db.get('users').push( user ).write()
          res.cookie('auth', user._id, {
               maxAge: 6000000000
          });
          res.redirect('/');
     }else{
          user._id = find._id
          res.cookie('auth', user._id, {
               maxAge: 6000000000
          });
          res.redirect('/');
     }
});

app.post('/makeguess', async (req,res)=>{
     let lat = req.body.lat;
     let long = req.body.long;
     let user = db.get('users').find({ _id: req.cookies.auth }).value();
     let actualGameDb = db.get('actualGame').find({ id: user.id }).value();
     console.log(actualGameDb)
     console.log(req.body)
     if(typeof actualGameDb == "undefined"){
          db.get('actualGame').push( {lat: lat, long: long, id: user.id} ).write()
     }else{
          db.get('actualGame')
          .find({ id: user.id })
          .assign( {lat: lat, long: long, id: user.id} ) 
          .write()
     }
     res.json(req.body)
})


app.listen(3000, ()=>{
     console.log("Running");
})
