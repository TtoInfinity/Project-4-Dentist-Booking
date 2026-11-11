const express = require('express');
const dotenv = require('dotenv');
dotenv.config({path: './config/config.env'});
const cookieParser=require('cookie-parser');
const connectDB = require('./config/db');
connectDB();


const app=express();
//Body parser
app.use(express.json()) ;
//Cookie parser
app.use (cookieParser());

const hospitals =require('./routes/hospitals');
const appointments = require('./routes/appointments');
const auth = require('./routes/auth');
const dentists = require('./routes/dentists');
const reviews = require('./routes/reviews');
app.use('/api/v1/hospitals',hospitals);
app.use('/api/v1/appointments', appointments) ;
app.use('/api/v1/auth',auth);
app.use('/api/v1/dentists', dentists);
app.use('/api/v1/reviews', reviews);

const PORT=process.env.PORT || 5003;

const server = app.listen (PORT, console.log('Server running in ', process.env.NODE_ENV, ' mode on port ', PORT));

process.on('unhandledRejection', (err,promise) => {
    console.log(`Error: ${err.message}`); //Close server & exit process
    server.close(()=>process.exit(1)); 
});

app.set('query parser', 'extended') ;