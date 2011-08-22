tdl.provide('bbb.boombambeat');

bbb.boombambeat = bbb.boombambeat || {};

// globals
var gl;                   // the gl context.
var canvas;               // the canvas.
var math;                 // the math lib.
var fast;                 // the fast math lib.
var mat4;                 // the matrix functions of the fast math lib.
var g_logGLCalls = true;  // whether or not to log webgl calls
var g_debug = false;      // whether or not to debug.
var g_drawOnce = false;   // draw just one frame.

//g_drawOnce = true;
//g_debug = true;

var g_eyeSpeed          = 0.5;
var g_eyeHeight         = 2;
var g_eyeRadius         = 9;

function ValidateNoneOfTheArgsAreUndefined(functionName, args) {
  for (var ii = 0; ii < args.length; ++ii) {
    if (args[ii] === undefined) {
      tdl.error("undefined passed to gl." + functionName + "(" +
                tdl.webgl.glFunctionArgsToString(functionName, args) + ")");
    }
  }
}

function logMat4(label, mat) {
  tdl.log(
    "----[ " + label + " ]-------------------\n" +
    "    " + mat[0] + "," + mat[1] + "," + mat[2] + "," + mat[3] + ",\n" +
    "    " + mat[4] + "," + mat[5] + "," + mat[6] + "," + mat[7] + ",\n" +
    "    " + mat[8] + "," + mat[9] + "," + mat[10] + "," + mat[11] + ",\n" +
    "    " + mat[12] + "," + mat[13] + "," + mat[14] + "," + mat[15] + "\n" +
    "");
}

function Log(msg) {
  if (g_logGLCalls) {
    tdl.log(msg);
  }
}

function LogGLCall(functionName, args) {
  if (g_logGLCalls) {
    ValidateNoneOfTheArgsAreUndefined(functionName, args)
    tdl.log("gl." + functionName + "(" +
                tdl.webgl.glFunctionArgsToString(functionName, args) + ")");
  }
}

// A target is something the player can shoot.
function Target(blackboard) {
  this.blackboard = blackboard;
  this.position = new Float32Array(3);
  this.radius = 1;
}


var IntersectRaySphere = (function() {
  var fast = tdl.fast;
  var math = tdl.math;
  var q = new Float32Array(3);
  var rayVector = new Float32Array(3);

  return function(ray, sphereCenter, sphereRadius) {
    fast.subVector(q, sphereCenter, ray.start);
    fast.subVector(rayVector, ray.end, ray.start);
    var c = math.length(q);
    var v = fast.dot(q, rayVector);
    var d = sphereRadius * sphereRadius - (c * c - v * v);

    // If there was no intersection, return -1
    if (d < 0) {
      return -1;
    }

    // Return the distance to the [first] intersecting point
    return v - Math.sqrt(d);
  }
}());

/**
 * Checks if ray collides with target.
 * @param {!Ray} ray Ray to check with.
 * @return {boolean}
 */
Target.prototype.collide = function(ray) {
  return IntersectRaySphere(ray, this.position, this.radius) >= 0.0;
};

Player = function() {
  renderer.createMeshRendererComponent(this);
  physics.createPhyicsComponent(this);
}


function CirclePathFollower(gameObj) {
  GameComponent.call(this, gameObj);
  this.clock = 0;
  gameObj.addPublicProperties({
    position: [0, 0, 0],
    world: new Float32Array(16)
  });
};

tdl.base.inherit(CirclePathFollower, GameComponent);

CirclePathFollower.prototype.process = function(elapsedTime) {
  this.clock += elapsedTime;
  var pp = this.gameObj.publicProperties;
  pp.position[0] = Math.sin(this.clock * 4);
  pp.position[1] = Math.cos(this.clock * 4);

  //mat4.scaling(m4t0, [scale, scale, scale]);
  mat4.translation(pp.world, pp.position);
  //mat4.mul(world, m4t0, m4t1);
};

function createCirclePathEnemy() {
  var g = new GameObject();
  var model = g_game.sys['modelManager'].getModel("cube");
  g.addComponent(
      "ai", g_game.sys['aiManager'].createCirclePathFollower(g));
  g.addComponent(
      "modelRenderer", g_game.sys['renderer'].createModelRenderer(g, model));
  return g;
}


function initialize() {
  math = tdl.math;
  fast = tdl.fast;
  mat4 = fast.matrix4;
  canvas = document.getElementById("canvas");
  g_game = new Game();

  g_game.addSystem("aiManager", new AIManager());
  g_game.addSystem("renderer", new Renderer(canvas));
  g_game.addSystem("modelManager", new ModelManager());
  g_game.addSystem(
      "fpsCounter", new FPSCounter(document.getElementById("fps")));

  var level1 = {
    enemies: [
      { time:  0, type: createCirclePathEnemy },
      { time:  2, type: createCirclePathEnemy },
      { time:  3, type: createCirclePathEnemy },
      { time:  5, type: createCirclePathEnemy },
      { time:  6, type: createCirclePathEnemy },
      { time:  7, type: createCirclePathEnemy }
    ]
  };

  g_game.addSystem("enemyLauncher", new EnemyLauncher(level1.enemies));

  return true;
}

