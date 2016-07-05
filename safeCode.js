/*
  Copyright (C) 2013, Daishi Kato <daishi@axlight.com>
  All rights reserved.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
  "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
  A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
  HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
  SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var esprima = require('esprima');
var escodegen = require('escodegen');
var _ = require('underscore');

var root = {};

root.parse = function(data) {
  return esprima.parse(data);
};

root.unshift = function(lst, itm) {
  if (Array.isArray(itm)) {
    itm = itm.reverse();
  } else {
    itm = [itm];
  }
  for (var i = 0; i < itm.length; i++) {
    lst.unshift(itm[i]);
  }
};

root.ast_loop_checker = function(varname, limit) {
  var ast = root.parse('if (' + varname + '++ > ' + limit + ') throw new Error(\'too many loops\');');
  return ast.body;
};

root.collect_all_identifiers = function(node) {
  var ids = [];
  var walk = function(node) {
    if (node && (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression')) {
      return;
    } else if (node && node.type === 'Identifier') {
      ids.push(node.name);
    } else if (node instanceof Object) {
      _.each(node, walk);
    }
  };
  walk(node);
  return ids;
};

root.transform = function(ast, varname, limit) {
  limit = limit || 1000000;
  var exclude_ids = root.collect_all_identifiers(ast);
  if (exclude_ids.indexOf(varname) >= 0) {
    throw new Error('varname used in the code');
  }
  var loop_checker = root.ast_loop_checker(varname, limit);
  var walk = function(node) {
    if (node && node.type === 'BlockStatement') {
      _.each(node.body, walk);
      root.unshift(node.body, loop_checker);
    } else if (node && node.type === 'TryStatement') {
      _.each(node.block, walk);
      var newnode = node.block;
      _.each(node, function(value, key) {
        delete node[key];
      });
      _.extend(node, newnode);
    } else if (node instanceof Object) {
      _.each(node, walk);
    }
  };
  walk(ast);
  return ast;
};

root.generate = function(ast) {
  return escodegen.generate(ast);
};

root.makeSafeCode = function(data, varname, limit) {
  return root.generate(root.transform(root.parse(data), varname, limit));
};

exports.makeSafeCode = root.makeSafeCode;
