module.exports = {
  'env': {
    'node': true,
    'es2015': true,
  },
  'extends': 'esnext',
  'parserOptions': {
    'ecmaVersion': 'es2015'
  },
  'rules': {
    'indent': ['error', 2],
    'import/no-commonjs': 'off',
    'import/no-nodejs-modules': 'off',
    'no-prototype-builtins': 'off',
    'semi': ['error', 'always'],
  }
};
