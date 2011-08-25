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

/* ---------------------------------------------------------------------------*/

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

/* ---------------------------------------------------------------------------*/

/**
 * Highlights the object when under the mouse.
 *
 * @author gman (8/24/2011)
 */
function HighlightWhenUnderMouse(gameObj) {
  GameComponent.call(this, gameObj);
  gameObj.addPublicProperties({
    lightColor: new Float32Array([1, 1, 1, 1]),
    mouseIsOver: false
  });
  this.red = new Float32Array([1, 0, 0, 1]);
  this.white = new Float32Array([1, 1, 1, 1]);
  g_game.sys['aiManager'].addComponent(this);
};

tdl.base.inherit(HighlightWhenUnderMouse, GameComponent);

HighlightWhenUnderMouse.prototype.process = function(elapsedTime) {
  var pp = this.gameObj.publicProperties;
  pp.lightColor.set(pp.mouseIsOver ? this.red : this.white);
};

/* ---------------------------------------------------------------------------*/

function createCirclePathEnemy() {
  var g = new GameObject();
  var model = g_game.sys['modelManager'].getModel("cube");
  g.addComponent("ai", new CirclePathFollower(g));
  g.addComponent("mouseTarget", new MouseTarget(g, 1.0));
  g.addComponent("highlightWhenUnderMouse", new HighlightWhenUnderMouse(g));
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
      { time: 10, type: createCirclePathEnemy },
      { time: 11, type: createCirclePathEnemy },
      { time: 12, type: createCirclePathEnemy },
      { time: 13, type: createCirclePathEnemy },
      { time: 14, type: createCirclePathEnemy },
      { time: 15, type: createCirclePathEnemy },
    ]
  };

  g_game.addSystem("enemyLauncher", new EnemyLauncher(level1.enemies));

  return true;
}

