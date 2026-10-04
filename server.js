require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const socket = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();

app.use(helmet());

app.use((req, res, next) => {
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'PHP 7.4.3');
  next();
});

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({ origin: '*' }));

app.route('/').get(function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

fccTestingRoutes(app);

app.use(function (req, res) {
  res.status(404).type('text').send('Not Found');
});

const portNum = process.env.PORT || 3000;

const httpServer = app.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);

  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');

    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

const io = socket(httpServer);

const players = {};
let collectibles = [
  {
    id: Date.now(),
    x: 300,
    y: 200,
    value: 1
  }
];

function createPlayer(id) {
  return {
    id: id,
    x: Math.floor(Math.random() * 600),
    y: Math.floor(Math.random() * 440),
    score: 0
  };
}

function broadcastState() {
  io.emit('gameState', {
    players: Object.values(players),
    collectibles: collectibles
  });
}

io.on('connection', function (client) {
  console.log(`Player connected: ${client.id}`);

  players[client.id] = createPlayer(client.id);

  client.emit('welcome', {
    id: client.id,
    players: Object.values(players),
    collectibles: collectibles
  });

  broadcastState();

  client.on('movePlayer', function (data) {
    const player = players[client.id];

    if (!player || !data) return;

    const allowedDirections = ['up', 'down', 'left', 'right'];

    if (!allowedDirections.includes(data.direction)) {
      return;
    }

    let speed = Number(data.speed);

    if (!Number.isFinite(speed)) {
      speed = 5;
    }

    speed = Math.max(0, Math.min(speed, 10));

    if (data.direction === 'up') {
      player.y -= speed;
    }

    if (data.direction === 'down') {
      player.y += speed;
    }

    if (data.direction === 'left') {
      player.x -= speed;
    }

    if (data.direction === 'right') {
      player.x += speed;
    }

    player.x = Math.max(0, Math.min(620, player.x));
    player.y = Math.max(0, Math.min(460, player.y));

    for (let i = collectibles.length - 1; i >= 0; i--) {
      const item = collectibles[i];

      const collision =
        player.x < item.x + 20 &&
        player.x + 20 > item.x &&
        player.y < item.y + 20 &&
        player.y + 20 > item.y;

      if (collision) {
        player.score += item.value;
        collectibles.splice(i, 1);

        collectibles.push({
          id: Date.now() + Math.random(),
          x: Math.floor(Math.random() * 620),
          y: Math.floor(Math.random() * 460),
          value: 1
        });
      }
    }

    broadcastState();
  });

  client.on('disconnect', function () {
    console.log(`Player disconnected: ${client.id}`);

    delete players[client.id];

    broadcastState();
  });
});

module.exports = app;