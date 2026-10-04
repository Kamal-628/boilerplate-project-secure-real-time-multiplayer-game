import Player from './Player.mjs';
import Collectible from './Collectible.mjs';

const socket = io();

const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');

let myId = null;
let players = [];
let collectibles = [];

const keys = {};

window.addEventListener('keydown', (event) => {
  keys[event.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

socket.on('welcome', (data) => {
  myId = data.id;
  updateGame(data);
});

socket.on('gameState', (data) => {
  updateGame(data);
});

function updateGame(data) {
  players = data.players || [];
  collectibles = data.collectibles || [];
}

function drawPlayer(player) {
  context.fillStyle = player.id === myId ? '#00ff00' : '#ff0000';

  context.fillRect(
    player.x,
    player.y,
    20,
    20
  );

  context.fillStyle = '#000';
  context.font = '10px Arial';
  context.fillText(
    `Score: ${player.score}`,
    player.x - 5,
    player.y - 5
  );
}

function drawCollectible(item) {
  context.fillStyle = '#ffff00';

  context.fillRect(
    item.x,
    item.y,
    20,
    20
  );
}

function drawRank() {
  const playerObjects = players.map(
    player => new Player(player)
  );

  const me = playerObjects.find(
    player => player.id === myId
  );

  if (!me) return;

  context.fillStyle = '#000';
  context.font = '14px Arial';

  context.fillText(
    me.calculateRank(playerObjects),
    10,
    20
  );
}

function sendMovement(direction) {
  socket.emit('movePlayer', {
    direction: direction,
    speed: 5
  });
}

function gameLoop() {
  if (keys.w || keys.arrowup) {
    sendMovement('up');
  }

  if (keys.s || keys.arrowdown) {
    sendMovement('down');
  }

  if (keys.a || keys.arrowleft) {
    sendMovement('left');
  }

  if (keys.d || keys.arrowright) {
    sendMovement('right');
  }

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  collectibles.forEach(drawCollectible);
  players.forEach(drawPlayer);
  drawRank();

  requestAnimationFrame(gameLoop);
}

gameLoop();