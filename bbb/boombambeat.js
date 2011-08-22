tdl.require('tdl.buffers');
tdl.require('tdl.fast');
tdl.require('tdl.fps');
tdl.require('tdl.log');
tdl.require('tdl.math');
tdl.require('tdl.models');
tdl.require('tdl.primitives');
tdl.require('tdl.programs');
tdl.require('tdl.textures');
tdl.require('tdl.webgl');

window.onload = initialize;

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

function GameComponent(gameObject) {
  this.gameObj = gameObject;
}

GameComponent.prototype.clearObject = function() {
  this.gameObj = null;
};


Player = function() {
  renderer.createMeshRendererComponent(this);
  physics.createPhyicsComponent(this);
}

/**
 * This is the base for game objects.
 * @constructor
 */
function GameObject() {
  this.components = {};
  this.publicProperties = {};
}

GameObject.prototype.addComponent = function(name, component) {
  this.components[name] = component;
};

GameObject.prototype.removeComponent = function(name) {
  var component = this.components[name];
  delete this.components[name];
  component.clearGameObject(this);
};

GameObject.prototype.addPublicProperties = function(obj) {
  // TODO(gman): this probably needs to be a deep copy.
  var pp = this.publicProperties;
  for (var prop in obj) {
    if (pp[prop] == undefined) {
      pp[prop] = obj[prop];
    }
  }
};

/**
 * This is main game.
 * @constructor
 */
function Game() {
  this.objects = [];
  this.systems = [];
  this.sys = {};  // systems by name
  this.objectsToRemove = [];
  this.tickCount = 0;

  this.then = (new Date()).getTime() * 0.001;
  this.tick();
};

Game.prototype.tick = function() {
  ++this.tickCount;
  var now = (new Date()).getTime() * 0.001;
  var elapsedTime = now - this.then;
  this.then = now;

  this.process(elapsedTime);

  if (!g_drawOnce) {
    var that = this;
    tdl.webgl.requestAnimationFrame(function() {
      that.tick();
    }, canvas);
  }

  // turn off logging after 1 frame.
  g_logGLCalls = false;
};

Game.prototype.process = function(elapsedTime) {
  var numSystems = this.systems.length;
  for (var ii = 0; ii < numSystems; ++ii) {
    this.systems[ii].process(elapsedTime);
  }

  var numToRemove = this.objectsToRemove.length;
  for (var ii = 0; ii < numToRemove; ++ii) {
    this.objects.splice(this.indexOf(this.objectsToRemove[ii]), 1);
  }
  this.objectsToRemove = [];
};

Game.prototype.addSystem = function(name, system) {
  this.systems.push(system);
  this.sys[name] = system;
};

Game.prototype.addObject = function(object) {
  this.objects.push(object);
};

Game.prototype.removeObject = function(object) {
  this.objectsToRemove.push(object);
};

/**
 * This is a base for game systems.
 * @constructor
 */
function GameSystem() {
  this.components = [];
  this.componentsToRemove = [];
}

GameSystem.prototype.addComponent = function(component) {
  this.components.push(component);
};

GameSystem.prototype.removeComponent = function(component) {
  this.objecstToRemove.push(component);
};

GameSystem.prototype.process = function(elapsedTime) {
  var numToRemove = this.componentsToRemove.length;
  for (var ii = 0; ii < numToRemove; ++ii) {
    this.components.splice(this.indexOf(this.componentsToRemove[ii]), 1);
  }
  this.componentsToRemove = [];
};

function ModelManager() {
  this.models = {};

  /**
   * Sets up sphere.
   */
  function setupSphere() {
    var textures = {
      diffuseSampler: tdl.textures.loadTexture('assets/sometexture.png')};
    var program = tdl.programs.loadProgramFromScriptTags(
        'sphereVertexShader',
        'sphereFragmentShader');
    var arrays = tdl.primitives.createSphere(0.4, 10, 12);

    return new tdl.models.Model(program, arrays, textures);
  }

  function setupCube() {
    var textures = {
      diffuseSampler: tdl.textures.loadTexture('assets/sometexture.png')};
    var program = tdl.programs.loadProgramFromScriptTags(
        'sphereVertexShader',
        'sphereFragmentShader');
    var arrays = tdl.primitives.createCube(1);
    return new tdl.models.Model(program, arrays, textures);
  }

  this.models.sphere = setupSphere();
  this.models.cube = setupCube();
};

ModelManager.prototype.process = function() {
};

ModelManager.prototype.getModel = function(name) {
  return this.models[name];
};

(function() {
  // pre-allocate a bunch of arrays
  var projection = new Float32Array(16);
  var view = new Float32Array(16);
  var worldInverse = new Float32Array(16);
  var worldInverseTranspose = new Float32Array(16);
  var viewProjection = new Float32Array(16);
  var worldViewProjection = new Float32Array(16);
  var viewInverse = new Float32Array(16);
  var viewProjectionInverse = new Float32Array(16);
  var eyePosition = new Float32Array(3);
  var target = new Float32Array(3);
  var up = new Float32Array([0,1,0]);
  var lightWorldPos = new Float32Array(3);
  var v3t0 = new Float32Array(3);
  var v3t1 = new Float32Array(3);
  var v3t2 = new Float32Array(3);
  var v3t3 = new Float32Array(3);
  var m4t0 = new Float32Array(16);
  var m4t1 = new Float32Array(16);
  var m4t2 = new Float32Array(16);
  var m4t3 = new Float32Array(16);
  var zero4 = new Float32Array(4);
  var one4 = new Float32Array([1,1,1,1]);
  var clock = 0;
  var lastModel;

  // Sphere uniforms.
  var sphereConst = {
    viewInverse: viewInverse,
    lightWorldPos: lightWorldPos,
    specular: one4,
    shininess: 50,
    specularFactor: 0.2};
  var spherePer = {
    lightColor: new Float32Array([1,1,1,1]),
    worldViewProjection: worldViewProjection,
    worldInverse: worldInverse,
    worldInverseTranspose: worldInverseTranspose};


  Renderer = function(canvas) {
    GameSystem.call(this);
    this.canvas = canvas;

    gl = tdl.webgl.setupWebGL(canvas);
    if (!gl) {
      return false;
    }
    if (g_debug) {
      gl = tdl.webgl.makeDebugContext(gl, undefined, LogGLCall);
    }
  };

  tdl.base.inherit(Renderer, GameSystem);

  Renderer.prototype.createModelRenderer = function(gameObject, model) {
    var component = new ModelRenderer(gameObject, model);
    gameObject.addComponent('modelRenderer', component);
    this.addComponent(component);
  };

  Renderer.prototype.drawPrep = function(model) {
    if (model != lastModel) {
      lastModel = model;
      model.drawPrep(sphereConst);
    }
  };

  Renderer.prototype.computeMatrices = function(world) {
    mat4.mul(worldViewProjection, world, viewProjection);
    mat4.inverse(worldInverse, world);
    mat4.transpose(worldInverseTranspose, worldInverse);
  };

  Renderer.prototype.draw = function(model, per) {
    this.computeMatrices(per.world);
    model.draw(spherePer, per);
  };

  Renderer.prototype.process = function(elapsedTime) {

    lastModel = null;
    clock += elapsedTime;
    eyePosition[0] = Math.sin(clock * g_eyeSpeed) * g_eyeRadius;
    eyePosition[1] = g_eyeHeight;
    eyePosition[2] = Math.cos(clock * g_eyeSpeed) * g_eyeRadius;

    gl.colorMask(true, true, true, true);
    gl.depthMask(true);
    gl.clearColor(0,0,Math.random() * 0.3,0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    mat4.perspective(
        projection,
        math.degToRad(60),
        canvas.clientWidth / canvas.clientHeight,
        1,
        5000);
    mat4.lookAt(
        view,
        eyePosition,
        target,
        up);
    mat4.mul(viewProjection, view, projection);
    mat4.inverse(viewInverse, view);
    mat4.inverse(viewProjectionInverse, viewProjection);

    mat4.getAxis(v3t0, viewInverse, 0); // x
    mat4.getAxis(v3t1, viewInverse, 1); // y;
    mat4.getAxis(v3t2, viewInverse, 2); // z;
    fast.mulScalarVector(v3t0, 10, v3t0);
    fast.mulScalarVector(v3t1, 10, v3t1);
    fast.mulScalarVector(v3t2, 10, v3t2);
    fast.addVector(lightWorldPos, eyePosition, v3t0);
    fast.addVector(lightWorldPos, lightWorldPos, v3t1);
    fast.addVector(lightWorldPos, lightWorldPos, v3t2);

  //      view: view,
  //      projection: projection,
  //      viewProjection: viewProjection,

    var numToProcess = this.components.length;
    for (var ii = 0; ii < numToProcess; ++ii) {
      this.components[ii].draw(this);
    }

  //  Log("--Draw sphere---------------------------------------");
  //  sphere.drawPrep(sphereConst);
  //  var model = sphere;
  //  var across = 3;
  //  var lightColor = spherePer.lightColor;
  //  var half = (across - 1) * 0.5;
  //  for (var xx = 0; xx < across; ++xx) {
  //    if (xx >= across / 2) {
  //      model = cube;
  //      model.drawPrep(sphereConst);
  //    }
  //    for (var yy = 0; yy < across; ++yy) {
  //      for (var zz = 0; zz < across; ++zz) {
  //        lightColor[0] = xx / across;
  //        lightColor[1] = yy / across;
  //        lightColor[2] = zz / across;
  //        var scale = (xx + yy + zz) % 4 / 4 + 0.5;
  //        mat4.scaling(m4t0, [scale, scale, scale]);
  //        mat4.translation(m4t1, [xx - half, yy - half, zz - half]);
  //        mat4.mul(world, m4t0, m4t1);
  //        mat4.mul(worldViewProjection, world, viewProjection);
  //        mat4.inverse(worldInverse, world);
  //        mat4.transpose(worldInverseTranspose, worldInverse);
  //        model.draw(spherePer);
  //      }
  //    }
  //  }

    // Set the alpha to 255.
    gl.colorMask(false, false, false, true);
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };
}());

function ModelRenderer(gameObj, model) {
  GameComponent.call(this, gameObj);
  this.model = model;
  gameObj.addPublicProperties({
    world: new Float32Array(16)
  });

  var pp = gameObj.publicProperties;
  this.per = {
    world: pp.world
  };
}

ModelRenderer.prototype.draw = function(renderer) {
  renderer.drawPrep(this.model);
  renderer.draw(this.model, this.per);
};

function FPSCounter(element) {
  this.fpsTimer = new tdl.fps.FPSTimer();
  this.fpsElem = element;
}

FPSCounter.prototype.process = function(elapsedTime) {
  this.fpsTimer.update(elapsedTime);
  this.fpsElem.innerHTML = this.fpsTimer.averageFPS;
};

/**
 * Launches enemies
 * @constructor
 */
function EnemyLauncher(enemyList) {
  this.enemyList = enemyList;
  this.clock = 0;
  this.index = 0;
}

EnemyLauncher.prototype.process = function(elapsedTime) {
  this.clock += elapsedTime;
  while (this.index < this.enemyList.length &&
         this.clock >= this.enemyList[this.index].time) {
    var enemyInfo = this.enemyList[this.index++];
    g_game.addObject(enemyInfo.type());
  }
};

/**
 * Runs all the AI components.
 * @constructor
 */
function AIManager() {
  GameSystem.call(this);
};

tdl.base.inherit(AIManager, GameSystem);

AIManager.prototype.process = function(elapsedTime) {
  var numToProcess = this.components.length;
  for (var ii = 0; ii < numToProcess; ++ii) {
    this.components[ii].process(elapsedTime);
  }
  GameSystem.prototype.process.call(this, elapsedTime);
};

AIManager.prototype.createCirclePathFollower = function(gameObj) {
  var component = new CirclePathFollower(gameObj);
  gameObj.addComponent('circlePathFollower', component);
  this.addComponent(component);
};

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

