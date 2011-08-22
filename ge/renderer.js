/*
 * Copyright 2011, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains the 'Renderer' implemenation.
 */

tdl.provide('ge.renderer');

tdl.require('tdl.fast');
tdl.require('tdl.math');
tdl.require('tdl.webgl');

tdl.require('ge.modelrenderer');
tdl.require('ge.gamesystem');

/**
 * A module for Renderer.
 * @namespace
 */
ge.renderer = ge.renderer || {};

(function() {
  var math = tdl.math;
  var fast = tdl.fast;
  var mat4 = fast.matrix4;

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



