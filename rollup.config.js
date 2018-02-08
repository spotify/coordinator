import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import globals from 'rollup-plugin-node-globals';
import babel from 'rollup-plugin-babel';
import serve from 'rollup-plugin-serve';
import string from 'rollup-plugin-string';
// import uglify from 'rollup-plugin-uglify';
// import { minify } from 'uglify-es';


export default {
  input: 'src/main.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife'
  },
  plugins: [
    svelte(),
    // uglify({}, minify),
    resolve({
    }),
    string({
      include: '**/*.svg'
    }),
    commonjs({
      ignoreGlobal: true
    }),
    globals(),
    babel({
      exclude: 'node_modules/**'
    }),
    serve({
      contentBase: '',
      host: 'localhost',
      port: 8989
    })
  ]
};
