const _ = require('lodash');
const { parse } = require('@babel/parser');
const { default: generate } = require('@babel/generator');
const t = require('@babel/types');
const { default: traverse } = require('@babel/traverse');
const fs = require('fs');
const nunjucks = require('nunjucks');
const { getFilePath } = require('../util/path');
const buildAst = require('./common/buildAst');

nunjucks.configure({ autoescape: false });
const {
  processAttributesProperties,
  processOptionsByDefinition,
} = require('./common/index');

/**
 * Generate codes
 * @param {object} definition
 * @param {object} options
 */
function generateCode(definition, options) {
  const { modelFileName } = definition;
  let ast;
  const filePath = getFilePath(options.dir, `${modelFileName}.ts`);
  if (options.fileUpdateType === 'INCREMENT' && fs.existsSync(filePath)) { // 如果是增量更新且历史文件存在
    const preCode = fs.readFileSync(filePath, 'utf-8');
    const preAst = parse(preCode, {
      sourceType: 'module',
      plugins: ['typescript'],
    });
    traverse(preAst, {
      ClassBody: (path) => {
        const { node } = path;
        const newBody = node.body.filter((n) => !definition.attributes[n.key.name]);
        _.forInRight(definition.attributes, (field, key) => {
          const prop = buildAst.buildModelClassProperty(field, key);
          newBody.unshift(prop);
        });
        node.body = newBody;
      },
      VariableDeclarator: (path) => {
        const { node } = path;
        if (t.isIdentifier(node.id, { name: 'attributes' })) {
          node.init = processAttributesProperties(definition.attributes);
        }
        if (t.isIdentifier(node.id, { name: 'initOptions' })) {
          node.init = processOptionsByDefinition(definition);
        }
      },
    });
    ast = preAst;
  } else {
    const importPart = buildAst.buildImports();
    const dataTypeAndModel = buildAst.buildDataTypeAndModel();
    const modelClass = buildAst.buildModelClass(definition);
    const attributes = buildAst.buildAttributes(definition);
    const initOptions = buildAst.buildOptions(definition);
    const initCall = buildAst.buildInit(definition);
    const exportsPart = buildAst.buildExports(definition);
    const body = [
      ...importPart, dataTypeAndModel, modelClass, attributes,
      initOptions, initCall, exportsPart];
    ast = t.program(body);
  }
  const { code } = generate(ast, {
    jsescOption: {
      minimal: true,
      quotes: 'single',
    },
  });
  return code;
}

function process(definitions, options) {
  const modelCodes = definitions.map((definition) => {
    const { modelFileName } = definition;
    const fileType = 'model';
    const file = `${modelFileName}.ts`;
    const code = generateCode(definition, options);
    return {
      file,
      code,
      fileType,
    };
  });
  const codes = _.concat([], modelCodes);
  return codes;
}
module.exports = process;
