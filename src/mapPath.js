/* eslint prefer-template: off */
import defaultResolvePath from './resolvePath';

const _ = {
  StringLiteral: {
    getSourcePath(nodePath) {
      return nodePath.node.value;
    },
    getReplacer(nodePath, modulePath, state) {
      return state.types.stringLiteral(modulePath);
    },
  },
  BinaryExpression: {
    getSourcePath(nodePath) {
      return nodePath.node.left.value;
    },
    getReplacer(nodePath, modulePath, state) {
      return state.types.binaryExpression(
        nodePath.node.operator,
        state.types.stringLiteral(modulePath + '/'),
        nodePath.node.right
      );
    },
  },
  TemplateLiteral: {
    getSourcePath(nodePath) {
      return nodePath.node.quasis[0].value.raw;
    },
    getReplacer(nodePath, modulePath, state) {
      const [quasiPath, ...rest] = nodePath.node.quasis;
      const fullModulePath = modulePath + '/';
      const newQuasiPath = state.types.templateElement(
        { raw: fullModulePath, cooked: fullModulePath },
        quasiPath.tail
      );

      return state.types.templateLiteral([newQuasiPath, ...rest], nodePath.node.expressions);
    },
  },
};

function isValidNodePath(nodePath, state) {
  if (state.types.isStringLiteral(nodePath)) return true;

  if (state.types.isBinaryExpression(nodePath)) {
    return state.types.isStringLiteral(nodePath.node.left);
  }

  if (state.types.isTemplateLiteral(nodePath)) {
    return true;
  }

  return false;
}

export default function mapPathString(nodePath, state) {
  if (!isValidNodePath(nodePath, state)) {
    return;
  }

  const { getSourcePath, getReplacer } = _[nodePath.node.type];
  const currentFile = state.file.opts.filename;
  const resolvePath = state.normalizedOpts.customResolvePath || defaultResolvePath;
  const modulePath = resolvePath(getSourcePath(nodePath), currentFile, state.opts);

  if (modulePath) {
    if (nodePath.node.pathResolved) {
      return;
    }

    nodePath.replaceWith(getReplacer(nodePath, modulePath, state));
    nodePath.node.pathResolved = true;
  }
}
