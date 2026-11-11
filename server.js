const express = require('express');
const fs = require('fs');
const dotenv = require('dotenv');
const configPath = fs.existsSync('./config/config.env')
  ? './config/config.env'
  : './__tests__/config.env';
dotenv.config({ path: configPath });
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const app = express();
//Body parser
app.use(express.json());
//Cookie parser
app.use(cookieParser());

const dentists = require('./routes/dentists');
const bookings = require('./routes/bookings');
const discounts = require('./routes/discounts');
const reviews = require('./routes/reviews');
const hospitals = require('./routes/hospitals');
const appointments = require('./routes/appointments');
const auth = require('./routes/auth');

app.use('/api/v1/dentists', dentists);
app.use('/api/v1/bookings', bookings);
app.use('/api/v1/discounts', discounts);
app.use('/api/v1/reviews', reviews);
app.use('/api/v1/hospitals', hospitals);
app.use('/api/v1/appointments', appointments);
app.use('/api/v1/auth', auth);

const PORT = process.env.PORT || 5003;

if (require.main === module) {
  const server = app.listen(
    PORT,
    console.log('Server running in ', process.env.NODE_ENV, ' mode on port ', PORT)
  );

  process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`); //Close server & exit process
    server.close(() => process.exit(1));
  });
}

app.set('query parser', 'extended');

module.exports = app;
