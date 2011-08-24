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

tdl.base.inherit(CirclePathFollower, GameComponent);

/**
 * Calculate the intersection of a ray and a sphere
 *
 * point1 + mu1 (point2 - point1)
 * point1 + mu2 (point2 - point1)
 *
 * Return undefined.
 */
var raySphereIntersection = function (point1, point2, center, radius) {
  var kEpsilon = 0.0001;
  var dp = [
      point2[0] - point1[0],
      point2[1] - point1[1],
      point2[2] - point1[2]];
  var a = dp[0] * dp[0] +
          dp[1] * dp[1] +
          dp[2] * dp[2];
  var b = 2 * (dp[0] * (point1[0] - center[0]) +
               dp[1] * (point1[1] - center[1]) +
               dp[2] * (point1[2] - center[2]));
  var c = center[0] * center[0] +
          center[1] * center[1] +
          center[2] * center[2];
  c += point1[0] * point1[0] +
       point1[1] * point1[1] +
       point1[2] * point1[2];
  c -= 2 * (center[0] * point1[0] +
            center[1] * point1[1] +
            center[2] * point1[2]);
  c -= radius * radius;
  var bb4ac = b * b - 4 * a * c;
  if (Math.abs(a) < kEpsilon || bb4ac < 0) {
    return;
  }

  var sq = Math.sqrt(bb4ac);
  var mu1 = (-b + sq) / (2 * a);
  var mu2 = (-b - sq) / (2 * a);

  var m = Math.max(mu1, mu2);
  return math.addVector(point1, math.mulScalarVector(m, dp));
};

/**
 * Checks if ray collides with target.
 * @param {!Ray} ray Ray to check with.
 * @return {boolean}
 */
Target.prototype.collide = function(ray) {
  return intersectRaySphere(ray, this.position, this.radius) >= 0.0;
};

/**
 * Checks when the mouse is over it.
 * @constructor
 * @param gameObj
 */
function MouseTarget(gameObj) {
  GameComponent.call(this, gameObj);
  g_game.sys['aiManager'].addComponent(this);
  this.inputManager = g_game.sys['inputManager'];
  this.renderer = g_game.sys['renderer'];
  gameObj.addPublicProperties({
    world: new Float32Array(16),
    lightColor: new Float32Array([1, 1, 1, 1])
  });

  this.red = new Float32Array([1, 0, 0, 1]);
  this.gray = new Float32Array([1, 1, 1, 1]);
}

tdl.base.inherit(MouseTarget, GameComponent);

var clientPositionToWorldRay = function(
    clientXPosition,
    clientYPosition,
    clientWidth,
    clientHeight,
    viewProjectionInverse) {
  // normScreenX, normScreenY are in frustum coordinates.
  var normScreenX = clientXPosition / (clientWidth * 0.5) - 1;
  var normScreenY = -(clientYPosition / (clientHeight * 0.5) - 1);

  var matrix = viewProjectionInverse;

  // Apply inverse view-projection matrix to get the ray in world coordinates.
  return {
      near: math.matrix4.transformPoint(
          matrix, [normScreenX, normScreenY, 0]),
      far: math.matrix4.transformPoint(
          matrix, [normScreenX, normScreenY, 1])
  };
};

MouseTarget.prototype.process = function(elapsedTime) {
  var inputManager = this.inputManager;
  var canvas = this.renderer.canvas;
  var pp = this.gameObj.publicProperties;

  // TODO(gman): Optimization. This ray is the same for all MouseTarget
  // objects.
  var ray = clientPositionToWorldRay(
      inputManager.mouseX,
      inputManager.mouseY,
      canvas.clientWidth,
      canvas.clientHeight,
      this.renderer.getViewProjectionInverse());
  var near = raySphereIntersection(
      ray.near, ray.far,
      [pp.world[12], pp.world[13], pp.world[14]],
      1);
  pp.lightColor.set(near ? this.red : this.gray);
};

Player = function() {
  renderer.createMeshRendererComponent(this);
  physics.createPhyicsComponent(this);
}

/**
 * Follows a cirucular path.
 * @constructor
 */
function CirclePathFollower(gameObj) {
  GameComponent.call(this, gameObj);
  this.clock = 0;
  gameObj.addPublicProperties({
    position: [0, 0, 0],
    world: new Float32Array(16)
  });
  g_game.sys['aiManager'].addComponent(this);
};

tdl.base.inherit(CirclePathFollower, GameComponent);

CirclePathFollower.prototype.process = function(elapsedTime) {
  this.clock += elapsedTime;
  var pp = this.gameObj.publicProperties;
  pp.position[0] = Math.sin(this.clock) * 3;
  pp.position[1] = Math.cos(this.clock) * 3;

  //mat4.scaling(m4t0, [scale, scale, scale]);
  mat4.translation(pp.world, pp.position);
  //mat4.mul(world, m4t0, m4t1);
};

function createCirclePathEnemy() {
  var g = new GameObject();
  var model = g_game.sys['modelManager'].getModel("cube");
  g.addComponent("ai", new CirclePathFollower(g));
  g.addComponent("mouseTarget", new MouseTarget(g));
  g.addComponent("modelRender", new ModelRenderer(g, model));
  return g;
}


function initialize() {
  math = tdl.math;
  fast = tdl.fast;
  mat4 = fast.matrix4;
  canvas = document.getElementById("canvas");
  g_game = new Game();

  g_game.addSystem("inputManager", new InputManager(canvas));
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
      { time:  7, type: createCirclePathEnemy },

      { time:  8, type: createCirclePathEnemy },
      { time:  9, type: createCirclePathEnemy },
      { time:  10, type: createCirclePathEnemy },
      { time:  11, type: createCirclePathEnemy },
      { time:  12, type: createCirclePathEnemy },
      { time:  13, type: createCirclePathEnemy },
      { time:  14, type: createCirclePathEnemy },
      { time:  15, type: createCirclePathEnemy },
    ]
  };

  g_game.addSystem("enemyLauncher", new EnemyLauncher(level1.enemies));

  return true;
}

