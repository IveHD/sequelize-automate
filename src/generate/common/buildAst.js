const t = require('@babel/types');
const _ = require('lodash');
const { bigCamelCase } = require('../../util/wordCase');
const { processAttributesProperties, processOptionsByDefinition, getTypeKeyword } = require('./index');

const buildModelClassProperty = (field, key) => {
  const type = getTypeKeyword(field.type);
  return Object.assign(
    t.classProperty(t.identifier(key), null, t.tsTypeAnnotation(type)),
    field.allowNull ? {
      optional: true,
    } : {
      definite: true,
    },
  );
};

const buildImports = () => [t.importDeclaration(
  [t.importSpecifier(t.identifier('Sequelize'), t.identifier('Sequelize'))],
  t.stringLiteral('@fdfe/zebra-sequelize-client'),
), t.importDeclaration(
  [t.importDefaultSpecifier(t.identifier('zebraClient'))],
  t.stringLiteral('@/lib/zebra'),
)];

const buildDataTypeAndModel = () => t.variableDeclaration('const', [
  t.variableDeclarator(
    t.objectPattern(
      [
        t.objectProperty(t.identifier('DataTypes'), t.identifier('DataTypes'), false, true),
        t.objectProperty(t.identifier('Model'), t.identifier('Model'), false, true),
      ],
    ),
    t.identifier('Sequelize'),
  ),
]);

const buildModelClass = (definition) => t.classDeclaration(
  t.identifier(bigCamelCase(definition.tableName)),
  t.identifier('Model'),
  t.classBody(_.map(definition.attributes, (field, key) => buildModelClassProperty(field, key))),
);

const buildAttributes = (definition) => t.variableDeclaration('const', [
  t.variableDeclarator(t.identifier('attributes'), processAttributesProperties(definition.attributes)),
]);

const buildOptions = (definition) => t.variableDeclaration('const', [
  t.variableDeclarator(t.identifier('options'), processOptionsByDefinition(definition)),
]);

const buildInit = (definition) => t.expressionStatement(
  t.callExpression(
    t.memberExpression(
      t.identifier(bigCamelCase(definition.tableName)),
      t.identifier('init'),
    ),
    [
      t.identifier('attributes'), t.identifier('options'),
    ],
  ),
);

const buildExports = (definition) => t.exportDefaultDeclaration(
  t.identifier(bigCamelCase(definition.tableName)),
);

module.exports = {
  buildModelClassProperty,
  buildImports,
  buildDataTypeAndModel,
  buildModelClass,
  buildAttributes,
  buildOptions,
  buildInit,
  buildExports,
};
