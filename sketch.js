let fruits = [];
let fruitImages = {};
let spawnTimer = 0;
let spawnInterval = 40;

let video;
let model;
let predictions = [];

let videoScale = 0.8;

let trails = [];

let targetWord = "教育科技學系";
let revealedLetters = [];
let showCompleteMessage = false;

function preload() {
  fruitImages["orange"] = [loadImage("assets/orange.jpg"), loadImage("assets/orange_cut.jpg")];
  fruitImages["strawberry"] = [loadImage("assets/strawberry.jpg"), loadImage("assets/strawberry_cut.jpg")];
  fruitImages["apple"] = [loadImage("assets/apple.jpg"), loadImage("assets/apple_cut.jpg")];
  fruitImages["watermelon"] = [loadImage("assets/watermelon.jpg"), loadImage("assets/watermelon_cut.png")];
}

async function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  video = createCapture(VIDEO);
  video.size(width * videoScale, height * videoScale);
  video.hide();

  model = await handpose.load();

  noCursor();
  frameRate(30);

  for (let i = 0; i < targetWord.length; i++) {
    revealedLetters.push(false);
  }
}

async function detectHands() {
  if (model && video.loadedmetadata) {
    predictions = await model.estimateHands(video.elt);
  }
}

function draw() {
  background("#023047");

  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, width / 2, height / 2, width * videoScale, height * videoScale);
  pop();

  detectHands();

  spawnTimer++;
  if (spawnTimer > spawnInterval) {
    spawnRandomFruit();
    spawnTimer = 0;
  }

  for (let fruit of fruits) {
    fruit.update();
    fruit.display();
  }

  updateTrails();

  if (predictions.length > 0) {
    let hand = predictions[0];
    let tip = hand.landmarks[8];
    let fingerX = width - tip[0];
    let fingerY = tip[1];

    addTrailPoint(fingerX, fingerY);

    noStroke();
    fill(255, 0, 0);
    ellipse(fingerX, fingerY, 20);

    for (let fruit of fruits) {
      if (!fruit.cutState && fruit.isHit(fingerX, fingerY)) {
        fruit.cut();
        revealNextLetter();
      }
    }
  }

  fruits = fruits.filter(f => f.y < height + 150);

  displayHangman();
}

// ---------- 痕跡 ----------
function addTrailPoint(x, y) {
  trails.push({ x, y, lifetime: 90 });
}

function updateTrails() {
  noFill();
  strokeWeight(6);
  trails = trails.filter(t => t.lifetime > 0);
  for (let t of trails) {
    let alpha = map(t.lifetime, 0, 90, 0, 255);
    stroke(255, 255, 255, alpha);
    point(t.x, t.y);
    t.lifetime--;
  }
}

// ---------- 生水果 ----------
function spawnRandomFruit() {
  let names = Object.keys(fruitImages);
  let name = random(names);
  let [whole, cut] = fruitImages[name];

  let x = random(100, width - 100);
  let y = -50;
  let vx = random(-1, 1);
  let vy = random(-2, 0);
  let gravity = 0.3;

  fruits.push(new Fruit(name, whole, cut, x, y, vx, vy, gravity));
}

class Fruit {
  constructor(name, imgWhole, imgCut, x, y, vx, vy, gravity) {
    this.name = name;
    this.imgWhole = imgWhole;
    this.imgCut = imgCut;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.gravity = gravity;

    this.cutState = false;
    this.size = 120;
    this.cutOffsetX = 0;
    this.cutOffsetY = 0;
    this.splitSpeed = 4;
  }

  update() {
    if (!this.cutState) {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
    } else {
      this.cutOffsetX += this.splitSpeed;
      this.x += this.vx * 0.5;
      this.y += this.vy;
      this.vy += this.gravity * 0.5;
    }
  }

  display() {
    if (!this.cutState) {
      image(this.imgWhole, this.x, this.y, this.size, this.size);
    } else {
      image(this.imgCut, this.x - this.cutOffsetX, this.y + this.cutOffsetY, this.size, this.size);
      image(this.imgCut, this.x + this.cutOffsetX, this.y - this.cutOffsetY, this.size, this.size);
    }
  }

  isHit(px, py) {
    return dist(this.x, this.y, px, py) < this.size / 2;
  }

  cut() {
    this.cutState = true;
    this.cutOffsetX = 0;
    this.cutOffsetY = 0;
  }
}

// ---------- Hangman 顯示 ----------
function displayHangman() {
  let displayWord = "";
  for (let i = 0; i < targetWord.length; i++) {
    displayWord += revealedLetters[i] ? targetWord[i] : "＿";
  }

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(56);
  text(displayWord, width / 2, height - 50);

  if (showCompleteMessage) {
    let wiggle = sin(frameCount * 0.3) * 20;
    let r = random(150, 255);
    let g = random(150, 255);
    let b = random(150, 255);
    fill(r, g, b);
    textSize(80);
    text("🎉 完成拼字！", width / 2, height / 2 + wiggle);
  }
}

function revealNextLetter() {
  for (let i = 0; i < revealedLetters.length; i++) {
    if (!revealedLetters[i]) {
      revealedLetters[i] = true;
      break;
    }
  }

  if (revealedLetters.every(l => l)) {
    showCompleteMessage = true;
  }
}
