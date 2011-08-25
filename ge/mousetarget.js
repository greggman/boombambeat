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
 * @fileoverview This file contains the 'MouseTarget' implemenation.
 */

tdl.provide('ge.mousetarget');

tdl.require('tdl.math');
tdl.require('tdl.fast');
tdl.require('ge.gamesystem');

(function(){
/**
 * Checks when the mouse is over it.
 * @constructor
 * @param gameObj
 */
ge.MouseTarget = function(gameObj, radius) {
  ge.GameComponent.call(this, gameObj);
  g_game.sys['aiManager'].addComponent(this);
  this.inputManager = g_game.sys['inputManager'];
  this.renderer = g_game.sys['renderer'];
  gameObj.addPublicProperties({
    mouseTargetRadius: radius,
    world: new Float32Array(16),
    mouseIsOver: false
  });
};

tdl.base.inherit(ge.MouseTarget, ge.GameComponent);


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

ge.MouseTarget.prototype.process = function(elapsedTime) {
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
      pp.mouseTargetRadius);
  pp.mouseIsOver = near !== undefined;
};

}());

